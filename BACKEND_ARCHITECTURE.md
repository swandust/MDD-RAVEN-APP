# RAVEN App — Backend Architecture Documentation

## Overview

The backend is a Python service responsible for **automated food detection and nutrition logging**. It processes food images uploaded by the user, runs a custom YOLOv8 model, looks up nutrition data, and writes structured log entries directly into Supabase.

There are two distinct components:

| Component | File | Role |
|---|---|---|
| **Worker daemon** | `food_log_worker.py` | Polls the Supabase storage bucket on a loop; auto-detects and logs food from newly uploaded images |
| **HTTP API** | `main.py` + `detection.py` | FastAPI server for on-demand detection via direct file upload or image URL |

In the current architecture, the **worker is the primary pipeline**. The HTTP API (`main.py`) is a secondary interface.

---

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI HTTP server (on-demand detection)
│   ├── detection.py         # YOLO wrapper used by main.py
│   ├── food_log_worker.py   # Polling worker daemon (main pipeline)
│   ├── nutrition_data.py    # Static nutrition database (keyed by YOLO class name)
│   ├── model_classes.txt    # Ground truth list of model output classes
│   └── test.py              # Local dev script: prints model class names
├── Dockerfile               # Container build for the HTTP API
└── requirements.txt         # Python dependencies
```

---

## Component 1: Food Log Worker (`food_log_worker.py`)

### Purpose

A long-running background process that automatically logs food for users. It watches the `food-images` Supabase Storage bucket, detects food in any new photo, and inserts a row into `food_logs`.

### How It Runs

```bash
# Locally
cd backend
python -m app.food_log_worker

# In production (Docker or VM)
# Set env vars and run the same command
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SUPABASE_URL` | required | Your project's Supabase REST URL |
| `SUPABASE_SERVICE_ROLE_KEY` | required | Service role key (bypasses RLS for reading storage and writing logs) |
| `SUPABASE_BUCKET` | `food-images` | Storage bucket name |
| `MODEL_PATH` | `best.pt` | Path to the trained YOLOv8 `.pt` weights file |
| `POLL_INTERVAL_SECONDS` | `30` | Seconds between each scan of the bucket |
| `CONFIDENCE_THRESHOLD` | `0.25` | Minimum YOLO confidence to accept a detection |

> **Note:** Uses `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) to authenticate with the storage API and write to `food_logs` without being blocked by RLS.

---

### Main Loop Flow

```
Every POLL_INTERVAL seconds:
    list_new_images(bucket)      → top 10 newest files in food-images bucket
        for each file:
            process_image(model, file_obj)
```

### `process_image()` — Step-by-Step

```
1. MEMORY CHECK
   → If file_id is in PROCESSED_CACHE (in-process set), skip.

2. DB CHECK
   → Query food_logs WHERE image_url = <this file's public URL>
   → If found, add to PROCESSED_CACHE and skip (already logged).

3. DOWNLOAD
   → Authenticated GET to /storage/v1/object/authenticated/{bucket}/{filename}
   → Uses service role key in Authorization header.

4. YOLO INFERENCE (run_inference)
   → Write bytes to a temp .jpg file.
   → model(tmp_path, conf=CONF_THRESHOLD)
   → Separate detections into:
       - Utensils (fork, spoon, knife) → set has_utensil = True
       - Food items → collect {name, confidence}
   → Delete temp file.

5. NO DETECTION GUARD
   → If no food detected, mark as handled and skip.

6. BEST DETECTION
   → Pick the detection with the highest confidence score.

7. 30-MINUTE DEDUP RULE
   → Query food_logs WHERE food_name = <class> AND created_at > (now - 30 min)
   → If a recent log exists, skip to avoid double-logging the same meal.

8. FOOD STATUS CHECK
   → Query food_logs WHERE food_name = <class> AND food_status = false AND created_at > (now - 30 min)
   → food_status = true  → food is considered finished/consumed
   → food_status = false → food is still in progress

9. NUTRITION LOOKUP
   → get_nutrition(food_class) from NUTRITION_DB (nutrition_data.py)
   → Returns serving_g + full nutrient dict for the detected class.

10. INSERT INTO food_logs
    → POST /rest/v1/food_logs with all nutrition fields populated.
    → Marks file_id in PROCESSED_CACHE.
```

---

### Database Interactions

| Operation | Table / Endpoint | Auth Method |
|---|---|---|
| Check if already logged | `food_logs` SELECT | Service role key |
| Check 30-min dedup | `food_logs` SELECT | Service role key |
| Check food status | `food_logs` SELECT | Service role key |
| Insert new log | `food_logs` INSERT | Service role key |
| List bucket files | `food-images` Storage LIST | Service role key |
| Download image | `food-images` Storage GET (authenticated) | Service role key |

> All calls use raw `requests` HTTP calls against the Supabase REST and Storage APIs — no Supabase Python SDK is used.

---

### `food_logs` Row Written by the Worker

```python
{
    "food_name":    "chicken_rice",       # YOLO class name (snake_case)
    "image_url":    "<public storage URL>",
    "confidence":   0.87,                 # float, 0.0–1.0
    "utensil":      True,                 # fork/spoon/knife detected?
    "food_status":  True,                 # True = finished, False = in progress
    "portion_g":    350,                  # from NUTRITION_DB serving_g
    "energy_kcal":  607,
    "protein_g":    22,
    "carbs_g":      70,
    "fat_g":        25,
    "fiber_g":      2.5,
    "sugar_g":      3,
    "sodium_mg":    1200,
    "potassium_mg": None,                 # null if not in NUTRITION_DB entry
    "magnesium_mg": None,
    "calcium_mg":   None,
    "fluid_ml":     None,
    "caffeine_mg":  None,
}
```

> Note: `profile_id` is **not set by the worker** — it is `null` for auto-detected entries. The frontend associates logs with the user via `profile_id` when the user manually logs food.

---

## Component 2: HTTP API (`main.py` + `detection.py`)

### Purpose

A FastAPI server for on-demand food detection. Accepts an image upload (or URL) and returns detection results without writing to the database — the caller decides what to do with the response.

### Running Locally

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Endpoints

#### `POST /api/detect`

Accepts a multipart file upload.

**Request:**
```
Content-Type: multipart/form-data
Body: file=<image bytes>
```

**Response:**
```json
{
    "success": true,
    "filename": "20260323_120000_image.jpg",
    "detections": [ ... ],
    "message": "Food detection completed successfully"
}
```

#### `POST /api/detect-url`

Accepts a public image URL as a query parameter. Downloads and runs detection.

#### `GET /api/health`

Health check — returns `{"status": "healthy"}`.

---

### `detection.py` — YOLO Wrapper (used by HTTP API)

A simpler YOLO wrapper than the one in `food_log_worker.py`. Uses a hardcoded `FOOD_CATEGORIES` dict (class id → name) and a basic `FOOD_NUTRITION` dict. This is separate from the richer `nutrition_data.py` used by the worker.

**Key difference from the worker:**
- Uses integer class IDs mapped via its own `FOOD_CATEGORIES` dict (may diverge from actual model class names)
- Returns bounding box coordinates and area
- Does **not** write to the database

---

## YOLO Model (`best.pt`)

A custom-trained YOLOv8 model. The 13 output classes are:

| ID | Class | Type |
|---|---|---|
| 0 | `chicken_rice` | Food |
| 1 | `hokkien_prawn_mee` | Food |
| 2 | `char_siew_pau` | Food |
| 3 | `popiah` | Food |
| 4 | `apple` | Food |
| 5 | `egg_tart` | Food |
| 6 | `ice_cream_vanilla` | Food |
| 7 | `ice_cream_chocolate` | Food |
| 8 | `chicken_wing` | Food |
| 9 | `fish_and_chips` | Food |
| 10 | `spoon` | Utensil |
| 11 | `fork` | Utensil |
| 12 | `orange` | Food |

Utensil detections (classes 10–11) are **not logged as food** — they only set the `utensil = true` flag on the food log row.

---

## Nutrition Database (`nutrition_data.py`)

A static Python dict `NUTRITION_DB` keyed by YOLO class name (snake_case). Each entry contains:

```python
"chicken_rice": {
    "serving_g": 350,
    "nutrients": {
        "energy_kcal": 607,
        "protein_g":   22,
        "carbs_g":     70,
        "fat_g":       25,
        "sodium_mg":   1200,
        "fiber_g":     2.5,
        "sugar_g":     3
    }
}
```

The `get_nutrition(class_name)` helper normalises the input (lowercased, spaces→underscores) before lookup. If the class is not found, it returns `{}` — all nutrient fields in the inserted row will be `null`.

Not all entries include every nutrient. Fields like `potassium_mg`, `magnesium_mg`, `calcium_mg`, `fluid_ml`, and `caffeine_mg` are only present for entries where they are meaningful (e.g. `caffeine_mg` for coffee drinks).

---

## Docker (`Dockerfile`)

The Dockerfile containerises the FastAPI HTTP API (not the worker):

```dockerfile
FROM python:3.9-slim
# Installs libgl1 (required by OpenCV) and libglib2.0
# Copies requirements.txt → pip install
# Copies app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

To also containerise the worker, a separate `CMD` or a `docker-compose.yml` with two services would be needed.

---

## How the Backend Links to the Database

```
User (mobile app)
    │
    └── uploads photo to Supabase Storage bucket: food-images
            │
            ▼
    food_log_worker.py (polls every 30s)
            │
            ├── LIST   /storage/v1/object/list/food-images
            ├── GET    /storage/v1/object/authenticated/food-images/{file}
            ├── SELECT food_logs WHERE image_url = ...       (dedup check)
            ├── SELECT food_logs WHERE food_name = ...       (30-min rule)
            └── INSERT food_logs { food_name, nutrition, image_url, ... }
                        │
                        ▼
                public.food_logs
                        │
                        ▼
        NutritionSection.tsx reads food_logs by profile_id + date
        HomeDashboard.tsx   reads food_logs for daily sodium + fluid totals
        HydrationTracker.tsx reads food_logs for daily fluid totals
```

### Key Constraint: `profile_id` is null for worker-inserted rows

The worker does not know which user uploaded the image — it inserts rows without a `profile_id`. The frontend is responsible for linking food logs to users (e.g. by setting `profile_id` when the user manually confirms or edits the log). Queries that filter by `profile_id = auth.uid()` will **not** return worker-inserted rows unless `profile_id` is set.

---

## Running the Full Backend Locally

```bash
cd backend

# 1. Create a .env file
cat > .env <<EOF
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_BUCKET=food-images
MODEL_PATH=best.pt
POLL_INTERVAL_SECONDS=30
CONFIDENCE_THRESHOLD=0.25
EOF

# 2. Install dependencies
pip install -r requirements.txt

# 3a. Run the worker daemon
python -m app.food_log_worker

# 3b. OR run the HTTP API
uvicorn app.main:app --reload --port 8000
```

---

## Dependencies (`requirements.txt`)

| Package | Purpose |
|---|---|
| `fastapi` | HTTP API framework |
| `uvicorn[standard]` | ASGI server |
| `ultralytics` | YOLOv8 model loading and inference |
| `opencv-python` | Image I/O (used by ultralytics internally) |
| `numpy` | Tensor/array operations |
| `requests` | HTTP calls to Supabase REST + Storage APIs |
| `python-multipart` | Multipart form parsing for `/api/detect` |

`python-dotenv` is used by the worker (`load_dotenv()`) but is not listed in `requirements.txt` — it should be added.
