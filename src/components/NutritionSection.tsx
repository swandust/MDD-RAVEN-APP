import { useEffect, useState } from 'react';
import { Edit2, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';

interface FoodEntry {
  time: string;
  foodName: string;
  calories: number;
  sodium: number;
  gluten: boolean;
  sugar: number;
  protein: number;
  carbs: number;
  fiber: number;
  autoDetected: boolean;
}

interface NutritionPlateProps {
  darkMode: boolean;
  protein: number;
  carbs: number;
  fiber: number;
  sugar: number;
  caloriesData: { current: number; goal: number };
  sodiumData: { current: number; goal: number };
  sugarData: { current: number; goal: number };
}

// Nutrition Plate Component
function NutritionPlate({ darkMode, protein, carbs, fiber, sugar, caloriesData, sodiumData, sugarData }: NutritionPlateProps) {
  const plateSize = 280;
  const centerX = plateSize / 2;
  const centerY = plateSize / 2;
  const radius = 110;
  
  // Calculate overall balance
  const overallBalance = Math.round((protein + carbs + fiber) / 3);
  
  // Normalize percentages for plate visualization (cap at 100% each)
  const normalizedProtein = Math.min(protein, 100);
  const normalizedCarbs = Math.min(carbs, 100);
  const normalizedFiber = Math.min(fiber, 100);
  const normalizedSugar = Math.min(sugar, 100);
  
  // Calculate total for proportional segments
  const total = normalizedProtein + normalizedCarbs + normalizedFiber + normalizedSugar;
  
  // Create segments
  const segments = [
    { percentage: normalizedProtein, color: '#36B3A8', label: '🥩 Protein' },
    { percentage: normalizedCarbs, color: '#FFB44C', label: '🍚 Carbs' },
    { percentage: normalizedFiber, color: '#8BD36D', label: '🥦 Veg/Fiber' },
    { percentage: normalizedSugar, color: '#C69AFF', label: '🍬 Sugar' },
  ];
  
  // Create paths for each segment
  const createSegmentPath = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };
  
  let currentAngle = -90; // Start from top
  
  return (
    <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 via-white to-blue-50 border-purple-200'} border rounded-3xl p-6 shadow-sm mb-4`}>
      {/* Plate Visualization */}
      <div className="flex justify-center items-center mb-6 relative">
        <svg width={plateSize} height={plateSize} viewBox={`0 0 ${plateSize} ${plateSize}`}>
          <defs>
            {/* Shadow filter for depth */}
            <filter id="plateShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Inner shadow for segments */}
            <filter id="innerShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="1"/>
              <feComposite operator="arithmetic" k2="-1" k3="1"/>
              <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
            </filter>
          </defs>
          
          {/* Plate base circle */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={radius + 10} 
            fill={darkMode ? '#1e293b' : '#ffffff'}
            stroke={darkMode ? '#475569' : '#e2e8f0'}
            strokeWidth="3"
            filter="url(#plateShadow)"
          />
          
          {/* Segments */}
          {segments.map((segment, index) => {
            const segmentAngle = (segment.percentage / total) * 360;
            const path = createSegmentPath(currentAngle, currentAngle + segmentAngle);
            const angle = currentAngle;
            currentAngle += segmentAngle;
            
            return (
              <motion.path
                key={index}
                d={path}
                fill={segment.color}
                opacity="0.85"
                filter="url(#innerShadow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              />
            );
          })}
          
          {/* Center circle for text */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={65} 
            fill={darkMode ? '#1e293b' : '#ffffff'}
            stroke={darkMode ? '#475569' : '#e2e8f0'}
            strokeWidth="2"
          />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div 
              className="mb-1"
              style={{ 
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
                fontSize: '18px',
                fontWeight: 600,
                color: darkMode ? '#94a3b8' : '#64748b'
              }}
            >
              🍽 Balanced Nutrition
            </div>
            <div 
              className="text-sm"
              style={{ 
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
                fontWeight: 500,
                color: darkMode ? '#64748b' : '#94a3b8'
              }}
            >
              {overallBalance}% Complete
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Metric Dots */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}
          >
            Calories: <strong>{caloriesData.current}</strong> / {caloriesData.goal} kcal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}
          >
            Sodium: <strong>{sodiumData.current}</strong> / {sodiumData.goal} mg
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}
          >
            Sugar: <strong>{sugarData.current.toFixed(1)}</strong> / {sugarData.goal} g
          </span>
        </div>
      </div>
      
      {/* Footer Insight */}
      <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-700/50' : 'bg-emerald-50'} border ${darkMode ? 'border-slate-600' : 'border-emerald-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif' }}
        >
          ✅ Protein and carbs balanced. Reduce sodium slightly.
        </p>
      </div>
    </Card>
  );
}

export function NutritionSection({ darkMode }: { darkMode: boolean }) {
  const [foodEntries] = useState<FoodEntry[]>([
    { time: '08:15', foodName: 'Chicken Rice', calories: 650, sodium: 720, gluten: true, sugar: 4.2, protein: 35, carbs: 75, fiber: 3, autoDetected: true },
    { time: '12:30', foodName: 'Apple Tart', calories: 320, sodium: 80, gluten: false, sugar: 25.0, protein: 4, carbs: 45, fiber: 2, autoDetected: true },
    { time: '19:00', foodName: 'Grilled Fish', calories: 480, sodium: 410, gluten: true, sugar: 2.1, protein: 42, carbs: 28, fiber: 5, autoDetected: true },
  ]);

  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);
        
        // Fetch the HTML from your proxy (this shows the PHP gallery page)
        const response = await fetch('/raven-proxy/uploads/');
        const html = await response.text();
        
        console.log('Raw HTML:', html); // Debug: Check what you're getting
        
        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Option 1: Look for <a> tags that link to .jpg files
        // This is better if your PHP gallery has clickable links
        const links = Array.from(doc.querySelectorAll('a[href*=".jpg"], a[href*=".jpeg"]'));
        
        let imageUrls: string[] = [];
        
        if (links.length > 0) {
          // Extract href attributes from <a> tags
          imageUrls = links
            .map(link => {
              const href = link.getAttribute('href');
              if (!href) return null;
              
              // If it's already a full URL, use it
              if (href.startsWith('http')) return href;
              
              // If it's a relative URL, make it absolute through the proxy
              return `/raven-proxy/uploads/${href.replace(/^\/+/, '')}`;
            })
            .filter((url): url is string => url !== null && url.includes('.jpg'));
            
          console.log('Found images from <a> tags:', imageUrls);
        } else {
          // Option 2: Fallback - look for image filenames in text
          const textContent = doc.body.textContent || '';
          const imageRegex = /\b(\d{4}\.\d{2}\.\d{2}_\d{2}:\d{2}:\d{2}_esp32-cam\.jpg)\b/g;
          const matches = [...textContent.matchAll(imageRegex)];
          
          if (matches.length > 0) {
            const uniqueFiles = [...new Set(matches.map(m => m[1]))];
            imageUrls = uniqueFiles.map(filename => 
              `/raven-proxy/uploads/${filename}`
            );
            console.log('Found images from regex:', imageUrls);
          }
        }
        
        if (imageUrls.length > 0) {
          setImages(imageUrls);
        } else {
          console.warn('No image files found in HTML');
          setImageError('No food images detected yet. Upload images from the ESP32.');
        }
        
        setLoadingImages(false);
      } catch (err) {
        console.error('Error fetching images:', err);
        setImageError('Failed to load images. The ESP32 may not be connected.');
        setLoadingImages(false);
      }
    };

    fetchImages();
    
    // Optional: Refresh images every 30 seconds for real-time updates
    const intervalId = setInterval(fetchImages, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  

  // Calculate daily totals
  const dailyTotals = foodEntries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      sodium: acc.sodium + entry.sodium,
      sugar: acc.sugar + entry.sugar,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fiber: acc.fiber + entry.fiber,
    }),
    { calories: 0, sodium: 0, sugar: 0, protein: 0, carbs: 0, fiber: 0 }
  );

  // Daily goals
  const goals = {
    calories: 2000,
    sodium: 2300,
    sugar: 50,
    protein: 80,
    carbs: 250,
    fiber: 30,
  };

  // Calculate percentages
  const percentages = {
    calories: (dailyTotals.calories / goals.calories) * 100,
    sodium: (dailyTotals.sodium / goals.sodium) * 100,
    sugar: (dailyTotals.sugar / goals.sugar) * 100,
    protein: (dailyTotals.protein / goals.protein) * 100,
    carbs: (dailyTotals.carbs / goals.carbs) * 100,
    fiber: (dailyTotals.fiber / goals.fiber) * 100,
  };

  // Get feedback message
  const getFeedbackMessage = () => {
    if (percentages.sugar > 100) {
      return { text: 'Try reducing sugar intake tomorrow.', type: 'warning' };
    }
    if (percentages.sodium > 80) {
      return { text: 'High sodium today — consider lower-sodium options.', type: 'warning' };
    }
    if (percentages.calories >= 80 && percentages.calories <= 110 && percentages.sodium < 80) {
      return { text: 'You ate well today — great balance!', type: 'success' };
    }
    return { text: 'Keep up your healthy choices!', type: 'success' };
  };

  const feedback = getFeedbackMessage();

  // Calculate overall nutrition balance
  const overallBalance = Math.round((percentages.protein + percentages.carbs + percentages.fiber) / 3);

  return (
    <div className={`p-5 space-y-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl mb-1">Nutrition Tracking</h1>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Auto-recognized meals & nutrition analysis
        </p>
      </div>

      {/* Daily Nutrition Summary */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
          <h3 className="text-lg">Daily Nutrition Summary</h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} rounded-xl p-3`}>
            <div className="text-xs text-slate-500 mb-1">Calories</div>
            <div className="text-2xl">{dailyTotals.calories}</div>
            <div className="text-xs text-slate-500">of {goals.calories} kcal</div>
            <div className={`text-xs mt-1 ${percentages.calories > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
              {Math.round(percentages.calories)}%
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} rounded-xl p-3`}>
            <div className="text-xs text-slate-500 mb-1">Sodium</div>
            <div className="text-2xl">{dailyTotals.sodium}</div>
            <div className="text-xs text-slate-500">of {goals.sodium} mg</div>
            <div className={`text-xs mt-1 ${percentages.sodium > 80 ? 'text-red-500' : 'text-emerald-500'}`}>
              {Math.round(percentages.sodium)}%
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} rounded-xl p-3`}>
            <div className="text-xs text-slate-500 mb-1">Sugar</div>
            <div className="text-2xl">{dailyTotals.sugar.toFixed(1)}</div>
            <div className="text-xs text-slate-500">of {goals.sugar} g</div>
            <div className={`text-xs mt-1 ${percentages.sugar > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
              {Math.round(percentages.sugar)}%
            </div>
          </div>
        </div>

      </Card>

      {/* Nutrition Plate Visualization */}
      <NutritionPlate 
        darkMode={darkMode}
        protein={percentages.protein}
        carbs={percentages.carbs}
        fiber={percentages.fiber}
        sugar={percentages.sugar}
        caloriesData={{ current: dailyTotals.calories, goal: goals.calories }}
        sodiumData={{ current: dailyTotals.sodium, goal: goals.sodium }}
        sugarData={{ current: dailyTotals.sugar, goal: goals.sugar }}
      />

      {/* Feedback Message */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className={`${
          feedback.type === 'success'
            ? darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
            : darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300'
        } border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm ${
                feedback.type === 'success'
                  ? darkMode ? 'text-emerald-200' : 'text-emerald-800'
                  : darkMode ? 'text-amber-200' : 'text-amber-800'
              }`}>
                💬 {feedback.text}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Auto-Recognized Food Log Table */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <h3 className="text-lg mb-4">Today's Meals</h3>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <th className={`text-left py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Time</th>
                <th className={`text-left py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Food Detected</th>
                <th className={`text-right py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cal</th>
                <th className={`text-right py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Na</th>
                <th className={`text-center py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Glu</th>
                <th className={`text-right py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sugar</th>
                <th className={`text-center py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {foodEntries.map((entry, index) => (
                <tr 
                  key={index}
                  className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}
                >
                  <td className="py-3 px-2 text-sm">{entry.time}</td>
                  <td className="py-3 px-2 text-sm">{entry.foodName}</td>
                  <td className="py-3 px-2 text-sm text-right">{entry.calories}</td>
                  <td className="py-3 px-2 text-sm text-right">{entry.sodium}</td>
                  <td className="py-3 px-2 text-center">
                    <Badge className={`${
                      entry.gluten 
                        ? 'bg-red-100 text-red-800 border-red-300' 
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    } border text-xs px-2 py-0`}>
                      {entry.gluten ? '✓' : '✗'}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-sm text-right">{entry.sugar.toFixed(1)}g</td>
                  <td className="py-3 px-2 text-center">
                    <button className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`mt-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="flex items-center justify-center gap-4">
            <span>🍱 Auto-recognized meals</span>
            <span>✏️ Click to edit</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-red-500">✓ Contains Gluten</span> | <span className="text-emerald-500">✗ Gluten-Free</span>
          </div>
        </div>
      </Card>

      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <h3 className="text-lg mb-4">Detected Food Images</h3>
        {loadingImages ? (
          <p className="text-center text-slate-500">Loading images...</p>
        ) : imageError ? (
          <p className="text-center text-red-500">{imageError}</p>
        ) : images.length === 0 ? (
          <p className="text-center text-slate-500">No images found in the remote folder.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {images.map((imgSrc, index) => (
              <motion.div
                key={imgSrc}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative"
              >
                <img
                  src={imgSrc}
                  alt={`Detected Food Image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-xl shadow-md"
                />
                <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">
                  Auto-Detected
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
        <div className={`mt-4 text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Images fetched from remote device uploads. Add more via the demo site.
        </div>
      </Card>
    </div>
  );
}
