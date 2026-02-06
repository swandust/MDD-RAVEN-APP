import logging
import os
import time
import tempfile
from typing import Dict, List, Optional

import requests
from ultralytics import YOLO


from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

NUTRITION_DB: Dict[str, Dict[str, float]] = {
    "bubble_milk_tea": {"portion_g": 500, "energy_kcal": 280, "sodium_mg": 45},
    "chicken_rice": {"portion_g": 318, "energy_kcal": 557, "sodium_mg": 1399},
    "hokkien_prawn_mee": {"portion_g": 442, "energy_kcal": 522, "sodium_mg": 1423},
    "char_siew_pau": {"portion_g": 54, "energy_kcal": 143, "sodium_mg": 198},
    "popiah": {"portion_g": 162, "energy_kcal": 243, "sodium_mg": 635},
    "apple": {"portion_g": 180, "energy_kcal": 93, "sodium_mg": 2},
    "egg_tart": {"portion_g": 59, "energy_kcal": 208, "sodium_mg": 110},
    "ice_cream_vanilla": {"portion_g": 240, "energy_kcal": 497, "sodium_mg": 192},
    "ice_cream_chocolate": {"portion_g": 240, "energy_kcal": 518, "sodium_mg": 182},
    "chicken_wing": {"portion_g": 38, "energy_kcal": 84, "sodium_mg": 184},
    "fish_and_chips": {"portion_g": 337, "energy_kcal": 1010, "sodium_mg": 2024},
}

ALIASES: Dict[str, str] = {
    "boba": "bubble_milk_tea",
    "bubble_tea": "bubble_milk_tea",
    "boba_milk_tea": "bubble_milk_tea",
    "milk_tea": "bubble_milk_tea",
    "char_siew_pao": "char_siew_pau",
    "egg_tart": "egg_tart",
    "hokkien_mee": "hokkien_prawn_mee",
    "prawn_mee": "hokkien_prawn_mee",
    "chicken_wings": "chicken_wing",
    "fish_chips": "fish_and_chips",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def normalize_label(label: str) -> str:
    return label.strip().lower().replace(" ", "_").replace("-", "_")


def map_food_name(label: str) -> Optional[str]:
    norm = normalize_label(label)
    if norm in NUTRITION_DB:
        return norm
    if norm in ALIASES:
        return ALIASES[norm]
    return None


def build_public_url(supabase_url: str, bucket: str, path: str) -> str:
    base = supabase_url.rstrip("/")
    return f"{base}/storage/v1/object/public/{bucket}/{path}"


def list_storage_objects(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    prefix: str,
    limit: int,
    offset: int,
) -> List[Dict]:
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/list/{bucket}"
    payload = {
        "prefix": prefix,
        "limit": limit,
        "offset": offset,
        "sortBy": {"column": "created_at", "order": "desc"},
    }
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def image_already_logged(supabase_url: str, supabase_key: str, image_url: str) -> bool:
    url = f"{supabase_url.rstrip('/')}/rest/v1/food_logs"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Accept": "application/json",
    }
    params = {"select": "id", "image_url": f"eq.{image_url}", "limit": "1"}
    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    return len(response.json()) > 0


def insert_food_logs(
    supabase_url: str,
    supabase_key: str,
    rows: List[Dict],
) -> None:
    if not rows:
        return
    url = f"{supabase_url.rstrip('/')}/rest/v1/food_logs"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    response = requests.post(url, json=rows, headers=headers, timeout=30)
    response.raise_for_status()


def download_image(image_url: str) -> bytes:
    response = requests.get(image_url, timeout=60)
    response.raise_for_status()
    return response.content


def load_model(model_path: str) -> YOLO:
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")
    return YOLO(model_path)


def detect_foods(
    model: YOLO,
    image_bytes: bytes,
    conf_threshold: float,
) -> List[Dict]:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
        tmp_file.write(image_bytes)
        temp_path = tmp_file.name

    try:
        results = model(temp_path, conf=conf_threshold, verbose=False)
        if not results:
            return []
        result = results[0]
        names = getattr(result, "names", None) or getattr(model, "names", {})

        detections = []
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            label = names.get(class_id, str(class_id))
            mapped_name = map_food_name(label)
            if not mapped_name:
                continue
            detections.append(
                {
                    "food_name": mapped_name,
                    "confidence": round(confidence, 4),
                }
            )
        return detections
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


def select_best_detections(detections: List[Dict]) -> List[Dict]:
    best_by_food: Dict[str, Dict] = {}
    for det in detections:
        name = det["food_name"]
        if name not in best_by_food or det["confidence"] > best_by_food[name]["confidence"]:
            best_by_food[name] = det
    return list(best_by_food.values())


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    bucket = os.getenv("SUPABASE_BUCKET", "food-images")
    prefix = os.getenv("SUPABASE_PREFIX", "")
    poll_interval = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
    conf_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))
    list_limit = int(os.getenv("STORAGE_LIST_LIMIT", "100"))
    max_pages = int(os.getenv("STORAGE_MAX_PAGES", "10"))
    log_top_only = os.getenv("LOG_TOP_ONLY", "false").lower() == "true"

    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set.")

    model_path = os.getenv(
        "MODEL_PATH",
        os.path.join(os.path.dirname(__file__), "..", "uploads", "best.pt"),
    )
    model_path = os.path.abspath(model_path)
    model = load_model(model_path)

    processed_urls = set()

    while True:
        try:
            logging.info("Checking Supabase bucket for new images...")
            objects: List[Dict] = []
            offset = 0
            for _ in range(max_pages):
                batch = list_storage_objects(
                    supabase_url, supabase_key, bucket, prefix, list_limit, offset
                )
                if not batch:
                    break
                objects.extend(batch)
                if len(batch) < list_limit:
                    break
                offset += list_limit

            for obj in objects:
                name = obj.get("name") or ""
                if not name:
                    continue
                if prefix and not name.startswith(prefix):
                    path = f"{prefix.rstrip('/')}/{name}"
                else:
                    path = name

                if not os.path.splitext(path)[1].lower() in IMAGE_EXTENSIONS:
                    continue

                image_url = build_public_url(supabase_url, bucket, path)
                if image_url in processed_urls:
                    continue

                if image_already_logged(supabase_url, supabase_key, image_url):
                    processed_urls.add(image_url)
                    continue

                logging.info("Processing image %s", image_url)
                image_bytes = download_image(image_url)
                detections = detect_foods(model, image_bytes, conf_threshold)
                if not detections:
                    processed_urls.add(image_url)
                    logging.info("No known foods detected for %s", image_url)
                    continue

                if log_top_only:
                    detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)[:1]
                else:
                    detections = select_best_detections(detections)

                rows = []
                for det in detections:
                    nutrition = NUTRITION_DB.get(det["food_name"])
                    if not nutrition:
                        continue
                    rows.append(
                        {
                            "food_name": det["food_name"],
                            "portion_g": nutrition["portion_g"],
                            "energy_kcal": nutrition["energy_kcal"],
                            "sodium_mg": nutrition["sodium_mg"],
                            "image_url": image_url,
                            "confidence": det["confidence"],
                        }
                    )

                insert_food_logs(supabase_url, supabase_key, rows)
                processed_urls.add(image_url)
                logging.info("Inserted %d rows for %s", len(rows), image_url)

        except Exception:
            logging.exception("Worker cycle failed")

        time.sleep(poll_interval)


if __name__ == "__main__":
    main()
