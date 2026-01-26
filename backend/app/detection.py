import cv2
import numpy as np
from ultralytics import YOLO
import os
from typing import List, Dict
import json

# Food categories mapping (customize based on your model)
FOOD_CATEGORIES = {
    0: "apple",
    1: "banana",
    2: "sandwich",
    3: "pizza",
    4: "burger",
    5: "salad",
    6: "chicken",
    7: "rice",
    8: "fish",
    9: "cake",
    # Add more based on your model
}

# Nutrition database (simplified - you'll want a real database)
FOOD_NUTRITION = {
    "apple": {"calories": 95, "carbs": 25, "protein": 0.5, "fat": 0.3},
    "banana": {"calories": 105, "carbs": 27, "protein": 1.3, "fat": 0.4},
    "pizza": {"calories": 285, "carbs": 36, "protein": 12, "fat": 10},
    "burger": {"calories": 354, "carbs": 30, "protein": 17, "fat": 19},
    # Add more...
}

class FoodDetector:
    def __init__(self, model_path: str = "best.pt"):
        self.model = YOLO(model_path)
        
    def detect(self, image_path: str, conf_threshold: float = 0.25):
        """Run YOLO detection on image"""
        results = self.model(image_path, conf=conf_threshold)
        
        detections = []
        for result in results:
            for box in result.boxes:
                # Get detection info
                xyxy = box.xyxy[0].tolist()  # Bounding box
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                
                # Get class name
                class_name = FOOD_CATEGORIES.get(class_id, f"unknown_{class_id}")
                
                # Get nutrition info
                nutrition = FOOD_NUTRITION.get(class_name, {
                    "calories": 200,  # Default values
                    "carbs": 25,
                    "protein": 10,
                    "fat": 8
                })
                
                detection = {
                    "class": class_name,
                    "confidence": round(confidence, 2),
                    "bbox": [round(x, 2) for x in xyxy],
                    "nutrition": nutrition,
                    "area": self._calculate_area(xyxy)
                }
                detections.append(detection)
        
        return detections
    
    def _calculate_area(self, bbox):
        """Calculate area of bounding box (for portion estimation)"""
        x1, y1, x2, y2 = bbox
        return round((x2 - x1) * (y2 - y1), 2)

# Global detector instance
detector = None

async def detect_food(image_path: str) -> List[Dict]:
    """Main function to detect food in image"""
    global detector
    
    # Lazy load model
    if detector is None:
        model_path = "best.pt"
        if not os.path.exists(model_path):
            model_path = os.path.join(os.path.dirname(__file__), "..", "best.pt")
        detector = FoodDetector(model_path)
    
    # Run detection
    detections = detector.detect(image_path)
    
    # Calculate total nutrition
    total_nutrition = {
        "calories": 0,
        "carbs": 0,
        "protein": 0,
        "fat": 0
    }
    
    for det in detections:
        for key in total_nutrition:
            total_nutrition[key] += det["nutrition"].get(key, 0)
    
    return {
        "detections": detections,
        "total_nutrition": total_nutrition,
        "count": len(detections),
        "detected_foods": list(set([d["class"] for d in detections]))
    }