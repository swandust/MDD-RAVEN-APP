import os
from ultralytics import YOLO
import requests
import tempfile
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_model():
    # Test with a simple image
    test_image_url = "https://www.allrecipes.com/thmb/8YlGcP5Dk5vv5s7nC8rQ3YH5J5Y=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/AR-RM-23137-ChickenRice-ddmfs-3x4-7485-691e576f4c444e0998c77ec9cf61690d.jpg"
    
    # Download test image
    logging.info(f"Downloading test image...")
    response = requests.get(test_image_url)
    image_bytes = response.content
    
    # Check current directory
    current_dir = os.getcwd()
    files = os.listdir(current_dir)
    logging.info(f"Current directory: {current_dir}")
    logging.info(f"Files: {files}")
    
    # Try to load the model
    model_path = "best.pt"
    if not os.path.exists(model_path):
        logging.error(f"Model file {model_path} not found!")
        # Check for other possible model files
        pt_files = [f for f in files if f.endswith('.pt') or f.endswith('.bt')]
        logging.info(f"Found model files: {pt_files}")
        if pt_files:
            model_path = pt_files[0]
            logging.info(f"Trying with {model_path}")
    
    logging.info(f"Loading model from: {model_path}")
    try:
        model = YOLO(model_path)
        logging.info(f"✓ Model loaded successfully!")
        
        # Check model info
        logging.info(f"Model info:")
        logging.info(f"  - Model class names: {model.names}")
        logging.info(f"  - Number of classes: {len(model.names) if model.names else 'Unknown'}")
        logging.info(f"  - Model task: {model.task}")
        
        # Save model class names to a file for inspection
        if model.names:
            with open('model_classes.txt', 'w') as f:
                for i, name in model.names.items():
                    f.write(f"{i}: {name}\n")
            logging.info(f"✓ Saved class names to model_classes.txt")
        
    except Exception as e:
        logging.error(f"Failed to load model: {e}")
        return
    
    # Run detection
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
        tmp_file.write(image_bytes)
        temp_path = tmp_file.name
    
    try:
        logging.info(f"Running detection on test image...")
        results = model(temp_path, conf=0.25, verbose=False)
        
        if results:
            result = results[0]
            
            logging.info(f"Detection results:")
            logging.info(f"  - Number of detections: {len(result.boxes) if result.boxes else 0}")
            
            if result.boxes and len(result.boxes) > 0:
                for i, box in enumerate(result.boxes):
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    label = model.names.get(class_id, str(class_id))
                    logging.info(f"    Detection {i+1}: Class ID={class_id}, Label='{label}', Confidence={confidence:.4f}")
            else:
                logging.warning("  No detections found!")
                
            # Also try with lower confidence threshold
            logging.info(f"Trying with lower confidence threshold (0.1)...")
            results_low = model(temp_path, conf=0.1, verbose=False)
            if results_low and results_low[0].boxes:
                result_low = results_low[0]
                logging.info(f"  Detections with conf=0.1: {len(result_low.boxes)}")
                for i, box in enumerate(result_low.boxes):
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    label = model.names.get(class_id, str(class_id))
                    if confidence >= 0.1:  # Only show above 0.1
                        logging.info(f"    Low-threshold detection {i+1}: Label='{label}', Confidence={confidence:.4f}")
        else:
            logging.warning("No results returned from model!")
            
    except Exception as e:
        logging.error(f"Error during detection: {e}")
    finally:
        try:
            os.remove(temp_path)
        except:
            pass

def test_with_local_image():
    """Test with a local image if available"""
    logging.info("\n" + "="*50)
    logging.info("Testing with local images...")
    
    # Check for images in uploads directory
    uploads_dir = "uploads"
    if os.path.exists(uploads_dir):
        image_files = [f for f in os.listdir(uploads_dir) 
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        
        if image_files:
            logging.info(f"Found {len(image_files)} images in {uploads_dir}:")
            for img in image_files[:3]:  # Test up to 3 images
                logging.info(f"  Testing with: {img}")
                test_single_image(os.path.join(uploads_dir, img))
        else:
            logging.info(f"No images found in {uploads_dir}")
    else:
        logging.info(f"{uploads_dir} directory doesn't exist")

def test_single_image(image_path):
    """Test detection on a single image"""
    if not os.path.exists(image_path):
        logging.error(f"Image not found: {image_path}")
        return
    
    model_path = "best.pt"
    if not os.path.exists(model_path):
        logging.error("Model file not found!")
        return
    
    try:
        model = YOLO(model_path)
        results = model(image_path, conf=0.25, verbose=False)
        
        if results and results[0].boxes:
            result = results[0]
            logging.info(f"  Detections for {os.path.basename(image_path)}:")
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                label = model.names.get(class_id, str(class_id))
                logging.info(f"    - '{label}' (confidence: {confidence:.4f})")
        else:
            logging.info(f"  No detections for {os.path.basename(image_path)}")
            
    except Exception as e:
        logging.error(f"  Error: {e}")

if __name__ == "__main__":
    logging.info("Starting model debug...")
    test_model()
    test_with_local_image()