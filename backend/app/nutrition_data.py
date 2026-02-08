from typing import Dict, Any


# Structure: "yolo_class_name": { ... details ... }
NUTRITION_DB: Dict[str, Dict[str, Any]] = {
    # --- MAINS ---
    "chicken_rice": {
        "serving_g": 350,
        "nutrients": { 
            "energy_kcal": 607, 
            "protein_g": 22, 
            "carbs_g": 70, 
            "fat_g": 25, 
            "sodium_mg": 1200,
            "fiber_g": 2.5,
            "sugar_g": 3
        },
    },
    "hokkien_prawn_mee": {
        "serving_g": 400,
        "nutrients": { 
            "energy_kcal": 600,   # adjusted up to match typical plate
            "protein_g": 32,      # higher protein from seafood/egg
            "carbs_g": 63,
            "fat_g": 21,
            "sodium_mg": 1800,
            "fiber_g": 4,
            "sugar_g": 6
        },
    },
    "char_siew_pau": {
        "serving_g": 100,
        "nutrients": { 
            "energy_kcal": 280, 
            "protein_g": 8, 
            "carbs_g": 45, 
            "fat_g": 8, 
            "sodium_mg": 350,
            "fiber_g": 1.5,
            "sugar_g": 12
        },
    },
    "popiah": {
        "serving_g": 150,
        "nutrients": { 
            "energy_kcal": 180, 
            "protein_g": 4, 
            "carbs_g": 30, 
            "fat_g": 5, 
            "sodium_mg": 450,
            "fiber_g": 3,
            "sugar_g": 8
        },
    },
    "apple": {
        "serving_g": 182,  # medium apple
        "nutrients": { 
            "energy_kcal": 95, 
            "protein_g": 0.5, 
            "carbs_g": 25, 
            "fat_g": 0.3, 
            "sodium_mg": 2,
            "fiber_g": 4.4,
            "sugar_g": 19,
            "potassium_mg": 195,
            "magnesium_mg": 9,
            "calcium_mg": 11
        },
    },
    "orange": {
        "serving_g": 180,  # ~1 cup sections or medium orange
        "nutrients": {
            "energy_kcal": 85,
            "protein_g": 1.7,
            "carbs_g": 21.2,
            "fat_g": 0.2,
            "sodium_mg": 0,
            "fiber_g": 4.3,
            "sugar_g": 16.8,
            "potassium_mg": 325,
            "magnesium_mg": 18,
            "calcium_mg": 72
        },
    },
    "egg_tart": {
        "serving_g": 50,
        "nutrients": { 
            "energy_kcal": 200, 
            "protein_g": 4, 
            "carbs_g": 20, 
            "fat_g": 12, 
            "sodium_mg": 100,
            "sugar_g": 10
        },
    },
    "ice_cream_vanilla": {
        "serving_g": 66,  # one scoop
        "nutrients": { 
            "energy_kcal": 137, 
            "protein_g": 2.3, 
            "carbs_g": 16, 
            "fat_g": 7, 
            "sodium_mg": 53,
            "sugar_g": 14,
            "calcium_mg": 84
        },
    },
    "ice_cream_chocolate": {
        "serving_g": 66,  # one scoop
        "nutrients": { 
            "energy_kcal": 143, 
            "protein_g": 2.5, 
            "carbs_g": 17, 
            "fat_g": 7, 
            "sodium_mg": 55,
            "sugar_g": 14,
            "calcium_mg": 86,
            "caffeine_mg": 3
        },
    },
    "chicken_wing": {
        "serving_g": 90,  # one wing with skin
        "nutrients": { 
            "energy_kcal": 200, 
            "protein_g": 18, 
            "carbs_g": 0, 
            "fat_g": 14, 
            "sodium_mg": 100,
            "potassium_mg": 150
        },
    },
    "fish_and_chips": {
        "serving_g": 300,
        "nutrients": { 
            "energy_kcal": 800, 
            "protein_g": 25, 
            "carbs_g": 80, 
            "fat_g": 40, 
            "sodium_mg": 900,
            "fiber_g": 5,
            "sugar_g": 2
        },
    },
    # Existing entries (kept for reference)
    "laksa": {
        "serving_g": 500,
        "nutrients": { 
            "energy_kcal": 590, 
            "protein_g": 20, 
            "carbs_g": 60, 
            "fat_g": 30, 
            "sodium_mg": 1600 
        },
    },
    "nasi_lemak": {
        "serving_g": 400,
        "nutrients": { 
            "energy_kcal": 650, 
            "protein_g": 18, 
            "carbs_g": 75, 
            "fat_g": 30, 
            "sodium_mg": 900 
        },
    },
    "roti_prata": {
        "serving_g": 120,  # 2 small pieces (~60 g each)
        "nutrients": { 
            "energy_kcal": 450,  # adjusted upwards for 2 pieces
            "protein_g": 8,
            "carbs_g": 55,
            "fat_g": 22,
            "sodium_mg": 400 
        },
    },
    "satay": {
        "serving_g": 150,  # 5 sticks with sauce
        "nutrients": { 
            "energy_kcal": 320,  # adjusted to include typical peanut sauce
            "protein_g": 26,
            "carbs_g": 10,
            "fat_g": 18,
            "sodium_mg": 500 
        },
    },
    # --- DRINKS ---
    "kopi_c": {
        "serving_g": 200,
        "nutrients": { 
            "energy_kcal": 90,  # adjusted to align with typical references
            "protein_g": 2,
            "carbs_g": 14,
            "fat_g": 3,
            "caffeine_mg": 90 
        },
    },
    "teh_c": {
        "serving_g": 200,
        "nutrients": { 
            "energy_kcal": 100, 
            "protein_g": 1, 
            "carbs_g": 14, 
            "fat_g": 4, 
            "caffeine_mg": 40 
        },
    },
    "bubble_tea": {
        "serving_g": 500,
        "nutrients": { 
            "energy_kcal": 330,  # closer to common 320–350 kcal range
            "protein_g": 2,
            "carbs_g": 60,
            "fat_g": 10,
            "sugar_g": 55  # bumped to reflect typical full-sugar serving
        },
    },
}


# Helper to normalize names (e.g., "Chicken Rice" -> "chicken_rice")
def get_nutrition(class_name: str) -> Dict[str, Any]:
    key = class_name.strip().lower().replace(" ", "_").replace("-", "_")
    return NUTRITION_DB.get(key, {})
