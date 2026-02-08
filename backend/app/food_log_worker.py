import logging
import os
import time
import tempfile
import requests
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Set
from ultralytics import YOLO
from dotenv import load_dotenv

# Import the database we created in Part 2
from nutrition_data import get_nutrition

load_dotenv()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
BUCKET_NAME = os.getenv("SUPABASE_BUCKET", "food-images").strip()
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
CONF_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))
MODEL_PATH = os.getenv("MODEL_PATH", "best.pt")

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
UTENSIL_CLASSES = {"fork", "spoon", "knife"}

# GLOBAL CACHE: Stores file IDs that we have already handled in this session.
# This prevents the script from analyzing the same file 100 times.
PROCESSED_CACHE: Set[str] = set()

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

# --- SUPABASE HELPERS ---

def fetch_recent_logs(food_name: str, minutes: int = 30) -> bool:
    """Checks if a specific food class was logged in the last X minutes."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/food_logs"
    cutoff_time = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    
    params = {
        "select": "id",
        "food_name": f"eq.{food_name}",
        "created_at": f"gt.{cutoff_time}",
        "limit": "1"
    }
    
    try:
        r = requests.get(url, headers=get_headers(), params=params, timeout=10)
        r.raise_for_status()
        return len(r.json()) > 0
    except Exception as e:
        logging.error(f"Error checking recent logs: {e}")
        return False

def check_food_status(food_name: str, minutes: int = 30) -> bool:
    """Returns True if food is finished (not detected recently), False if still eating."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/food_logs"
    cutoff_time = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    
    params = {
        "select": "id",
        "food_name": f"eq.{food_name}",
        "created_at": f"gt.{cutoff_time}",
        "food_status": "is.false",  # Look for 'unfinished' entries
        "limit": "1"
    }
    
    try:
        r = requests.get(url, headers=get_headers(), params=params, timeout=10)
        r.raise_for_status()
        return len(r.json()) == 0  # If 0 found, it means food is likely finished.
    except Exception as e:
        logging.error(f"Error checking food status: {e}")
        return True

def list_new_images(bucket: str) -> List[Dict]:
    """Lists the top 10 newest files in the bucket."""
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/list/{bucket}"
    
    payload = {
        "prefix": "",
        "limit": 10,
        "offset": 0,
        "sortBy": {
            "column": "created_at", 
            "order": "desc"
        }
    }
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    r = requests.post(url, json=payload, headers=headers, timeout=10)
    
    if r.status_code != 200:
        logging.error(f"List images failed: {r.status_code} - {r.text}")
        r.raise_for_status()
        
    return r.json()

def check_if_image_processed(image_full_url: str) -> bool:
    """Checks if this URL is already in the database."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/food_logs"
    params = {"select": "id", "image_url": f"eq.{image_full_url}", "limit": "1"}
    r = requests.get(url, headers=get_headers(), params=params)
    return len(r.json()) > 0

def insert_log(row: Dict):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/food_logs"
    r = requests.post(url, json=[row], headers=get_headers())
    r.raise_for_status()

# --- IMAGE & MODEL ---

def download_image(filename: str) -> bytes:
    clean_name = filename.lstrip('/')
    # Handle spaces in filenames properly
    safe_name = urllib.parse.quote(clean_name) 
    
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/authenticated/{BUCKET_NAME}/{safe_name}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return r.content

def run_inference(model: YOLO, image_bytes: bytes) -> Tuple[List[Dict], bool]:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        results = model(tmp_path, conf=CONF_THRESHOLD, verbose=False)
        if not results: return [], False
        
        detections = []
        has_utensil = False
        
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            name = model.names[cls_id] 
            conf = float(box.conf[0])
            
            if name.lower() in UTENSIL_CLASSES:
                has_utensil = True
            else:
                detections.append({"name": name, "conf": conf})
                
        return detections, has_utensil
    finally:
        if os.path.exists(tmp_path): os.remove(tmp_path)

# --- MAIN WORKER ---

def process_image(model: YOLO, file_obj: Dict):
    name = file_obj.get("name")
    file_id = file_obj.get("id", name) # Use ID if available, else name
    
    if not name or os.path.splitext(name)[1].lower() not in IMAGE_EXTENSIONS:
        return

    # 1. MEMORY CHECK (Using File ID)
    if file_id in PROCESSED_CACHE:
        return

    # Construct Public URL
    safe_name = urllib.parse.quote(name)
    image_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{BUCKET_NAME}/{safe_name}"

    # 2. DB CHECK
    if check_if_image_processed(image_url):
        # Already in DB, add to memory cache so we don't ask DB again
        PROCESSED_CACHE.add(file_id)
        return 

    logging.info(f"Processing new image: {name}")
    
    try:
        img_bytes = download_image(name) 
        detections, has_utensil = run_inference(model, img_bytes)
    except Exception as e:
        logging.error(f"Failed to process image {name}: {e}")
        return 

    # 3. Handle No Detections
    if not detections:
        logging.info(f"No food detected in {name}. Skipping.")
        PROCESSED_CACHE.add(file_id) # Mark handled
        return 

    best_det = max(detections, key=lambda x: x['conf'])
    food_class = best_det['name']
    
    # 4. Check 30-Minute Rule
    if fetch_recent_logs(food_class, minutes=30):
        logging.info(f"Skipping {food_class}: Logged within last 30 minutes.")
        PROCESSED_CACHE.add(file_id) # Mark handled
        return 

    # 5. Food Status Check
    food_status = check_food_status(food_class, minutes=30)
    
    # 6. Prepare Data
    nutrition = get_nutrition(food_class)
    nutrients = nutrition.get("nutrients", {})
    
    row = {
        "food_name": food_class,
        "image_url": image_url,
        "confidence": best_det['conf'],
        "utensil": has_utensil,
        "food_status": food_status,
        "portion_g": nutrition.get("serving_g"),
        "energy_kcal": nutrients.get("energy_kcal"),
        "protein_g": nutrients.get("protein_g"),
        "carbs_g": nutrients.get("carbs_g"),
        "fat_g": nutrients.get("fat_g"),
        "fiber_g": nutrients.get("fiber_g"),
        "sugar_g": nutrients.get("sugar_g"),
        "sodium_mg": nutrients.get("sodium_mg"),
        "potassium_mg": nutrients.get("potassium_mg"),
        "magnesium_mg": nutrients.get("magnesium_mg"),
        "calcium_mg": nutrients.get("calcium_mg"),
        "fluid_ml": nutrients.get("fluid_ml"),
        "caffeine_mg": nutrients.get("caffeine_mg"),
    }

    insert_log(row)
    PROCESSED_CACHE.add(file_id) # Add to cache on success
    logging.info(f"Logged {food_class} successfully (Status: {food_status})")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials missing.")
    
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
    logging.info(f"Loading model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    
    logging.info("Worker started.")
    
    while True:
        try:
            # Heartbeat log to show it's alive
            logging.info(f"[Heartbeat] Scanning for new images... (Cache: {len(PROCESSED_CACHE)})")
            
            files = list_new_images(BUCKET_NAME)
            for f in files:
                process_image(model, f)
                
        except Exception as e:
            logging.error(f"Cycle error: {e}")
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()