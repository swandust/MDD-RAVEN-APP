

from ultralytics import YOLO

# Load your model
model = YOLO(r"C:\Users\ASUS\OneDrive - Nanyang Technological University\Documents\NTU\Y4 S1\MDD\Mobile Health App UI\nutrition-image-app\backend\uploads\best.pt")


# Print all class names
print("Model class names:")
for i, name in model.names.items():
    print(f"{i}: {name}")

# Check if 'orange' is in the model
if 'orange' in model.names.values():
    print("✓ 'orange' is in the model")
else:
    print("✗ 'orange' is NOT in the model")
    print("Available classes:", list(model.names.values()))