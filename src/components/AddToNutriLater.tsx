// Scratchpad notes for the NutriLater detection flow.
// Keep this file as non-executable reference to avoid TS build errors.
export {};

/*
// Add this state to track detection results
const [detectionResults, setDetectionResults] = useState<{
  [imageUrl: string]: {
    detections: Array<any>;
    total_nutrition: any;
    loading: boolean;
    error?: string;
  };
}>({});

// Function to detect food in an image
const detectFoodInImage = async (imageUrl: string) => {
  try {
    // Set loading state
    setDetectionResults(prev => ({
      ...prev,
      [imageUrl]: { ...prev[imageUrl], loading: true, error: undefined }
    }));

    // Send image to backend
    const formData = new FormData();

    // Fetch image from proxy and convert to blob
    const imageResponse = await fetch(imageUrl);
    const blob = await imageResponse.blob();
    formData.append('file', blob, 'image.jpg');

    const response = await fetch('http://localhost:8000/api/detect', {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header for FormData
    });

    if (!response.ok) {
      throw new Error(`Detection failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Update state with results
    setDetectionResults(prev => ({
      ...prev,
      [imageUrl]: {
        detections: data.detections,
        total_nutrition: data.total_nutrition,
        loading: false,
      }
    }));

    // Optional: Update food entries with detected foods
    if (data.detected_foods && data.detected_foods.length > 0) {
      console.log('Detected foods:', data.detected_foods);
      // You can auto-add these to foodEntries here
    }

    return data;
  } catch (error) {
    console.error('Detection error:', error);
    setDetectionResults(prev => ({
      ...prev,
      [imageUrl]: {
        ...prev[imageUrl],
        loading: false,
        error: 'Failed to detect food'
      }
    }));
  }
};

// Modify your image display to include detection button
<img
  src={imgSrc}
  alt={`Detected Food Image ${index + 1}`}
  className="w-full h-32 object-cover rounded-xl shadow-md"
/>;
<Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">
  Auto-Detected
</Badge>
// Add a detection button
<button
  onClick={() => detectFoodInImage(imgSrc)}
  className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
  disabled={detectionResults[imgSrc]?.loading}
>
  {detectionResults[imgSrc]?.loading ? 'Detecting...' : 'Detect Food'}
</button>;

// Add a section to show detection results
{detectionResults[imgSrc] && !detectionResults[imgSrc].loading && (
  <div className="mt-2 p-2 bg-white/80 rounded">
    <p className="text-sm font-semibold">Detected:</p>
    {detectionResults[imgSrc].detections?.map((det, idx) => (
      <span
        key={idx}
        className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1"
      >
        {det.class} ({det.confidence})
      </span>
    ))}
  </div>
)}
*/
