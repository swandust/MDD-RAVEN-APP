// nutritionsection.tsx (rewritten)

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, Save, Sliders, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { motion } from 'motion/react';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jtwzikkmixrtwwcogljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0d3ppa2ttaXhydHd3Y29nbGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Njk2NzEsImV4cCI6MjA4MzE0NTY3MX0.fY2YCKBsXUfEoWGP0l7zuUQFPxxzz9R2ws6w3Nd2kp0'
const supabase = createClient(supabaseUrl, supabaseKey)

// ===== SODIUM GOAL TOGGLE COMPONENT =====
interface SodiumGoalToggleProps {
  darkMode: boolean;
  currentGoal: number;
  onGoalChange: (goal: number) => void;
}

function SodiumGoalToggle({ darkMode, currentGoal, onGoalChange }: SodiumGoalToggleProps) {
  const [localGoal, setLocalGoal] = useState(currentGoal);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    setLocalGoal(currentGoal);
  }, [currentGoal]);
  
  const handleSliderChange = (value: number[]) => {
    setLocalGoal(value[0]);
  };
  
  const handleSliderBlur = async () => {
    if (localGoal !== currentGoal) {
      setIsSaving(true);
      try {
        await onGoalChange(localGoal);
      } catch (error) {
        console.error('Failed to save sodium goal:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  return (
    <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'} border rounded-2xl p-4 mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h4 className="font-medium">Daily Sodium Goal</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            {localGoal.toLocaleString()} mg
          </span>
          {isSaving && <Save className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
      </div>
      
      <div className="space-y-3">
        <Slider
          value={[localGoal]}
          min={3000}
          max={10000}
          step={100}
          onValueChange={handleSliderChange}
          onPointerUp={handleSliderBlur}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-slate-500">
          <span>3,000 mg</span>
          <span>10,000 mg</span>
        </div>
        
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Drag to adjust your daily sodium target. Goal saves when you stop sliding.
        </p>
      </div>
    </Card>
  );
}

// ===== DATE FILTER COMPONENT =====
// ===== DATE FILTER COMPONENT (FIXED TEXT CONTRAST) =====
interface DateFilterProps {
  darkMode: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

function DateFilter({ darkMode, selectedDate, onDateChange }: DateFilterProps) {
  const [isToday, setIsToday] = useState(true);
  
  useEffect(() => {
    const today = new Date();
    setIsToday(
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);
  
  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };
  
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    const today = new Date();
    if (newDate <= today) {
      onDateChange(newDate);
    }
  };
  
  const setToday = () => {
    onDateChange(new Date());
  };
  
  const quickDateOptions = [
    { label: 'Today', daysAgo: 0 },
    { label: 'Yesterday', daysAgo: 1 },
    { label: 'This Week', daysAgo: 0, isWeek: true },
  ];

  return (
    <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border rounded-2xl p-4 mb-4`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`} />
          <h4 className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            Date Filter
          </h4>
        </div>
        <Badge className={`${isToday ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border text-xs`}>
          {isToday ? '📅 Current Day' : '📅 Viewing Past'}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousDay}
            className={`flex items-center gap-1 ${darkMode ? '' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          
          <div className="text-center">
            <div className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {formatDate(selectedDate)}
            </div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              {selectedDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextDay}
            disabled={selectedDate.toDateString() === new Date().toDateString()}
            className={`flex items-center gap-1 ${darkMode ? '' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} ${selectedDate.toDateString() === new Date().toDateString() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick Date Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {quickDateOptions.map((option) => {
            let date = new Date();
            let isSelected = false;
            
            if (option.isWeek) {
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              isSelected = selectedDate.toDateString() === startOfWeek.toDateString();
            } else {
              date.setDate(date.getDate() - option.daysAgo);
              isSelected = option.daysAgo === 0 
                ? isToday 
                : selectedDate.toDateString() === date.toDateString();
            }
            
            return (
              <Button
                key={option.label}
                size="sm"
                onClick={() => {
                  if (option.isWeek) {
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    onDateChange(startOfWeek);
                  } else {
                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() - option.daysAgo);
                    onDateChange(newDate);
                  }
                }}
                className={isSelected ? 
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium" : 
                  `${darkMode ? 
                    'bg-slate-600 text-white hover:bg-slate-500 font-medium' : 
                    'bg-purple-200 text-purple-900 hover:bg-purple-300 font-medium'
                  }`
                }
              >
                {option.label}
              </Button>
            );
          })}
        </div>
                
        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={setToday}
            className={`w-full ${darkMode ? 'text-slate-100 bg-purple-900/30 hover:bg-purple-800/50 border border-purple-700' : 'text-slate-900 bg-purple-100 hover:bg-purple-200 border border-purple-300'}`}
          >
            Return to Today
          </Button>
        )}
      </div>
    </Card>
  );
}
// ===== NUTRITION PLATE COMPONENT =====
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

function NutritionPlate({ darkMode, protein, carbs, fiber, sugar, caloriesData, sodiumData, sugarData }: NutritionPlateProps) {
  const plateSize = 280;
  const centerX = plateSize / 2;
  const centerY = plateSize / 2;
  const radius = 110;
  
  const overallBalance = Math.round((protein + carbs + fiber) / 3);
  const normalizedProtein = Math.min(protein, 100);
  const normalizedCarbs = Math.min(carbs, 100);
  const normalizedFiber = Math.min(fiber, 100);
  const normalizedSugar = Math.min(sugar, 100);
  
  const total = normalizedProtein + normalizedCarbs + normalizedFiber + normalizedSugar;
  const safeTotal = total === 0 ? 1 : total;
  
  const segments = [
    { percentage: normalizedProtein, color: '#36B3A8', label: '🥩 Protein' },
    { percentage: normalizedCarbs, color: '#FFB44C', label: '🍚 Carbs' },
    { percentage: normalizedFiber, color: '#8BD36D', label: '🥦 Veg/Fiber' },
    { percentage: normalizedSugar, color: '#C69AFF', label: '🍬 Sugar' },
  ];
  
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
  
  let currentAngle = -90;
  
  return (
    <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 via-white to-blue-50 border-purple-200'} border rounded-3xl p-6 shadow-sm mb-4`}>
      <div className="flex justify-center items-center mb-6 relative">
        <svg width={plateSize} height={plateSize} viewBox={`0 0 ${plateSize} ${plateSize}`}>
          <defs>
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
            
            <filter id="innerShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="1"/>
              <feComposite operator="arithmetic" k2="-1" k3="1"/>
              <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
            </filter>
          </defs>
          
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={radius + 10} 
            fill={darkMode ? '#1e293b' : '#ffffff'}
            stroke={darkMode ? '#475569' : '#e2e8f0'}
            strokeWidth="3"
            filter="url(#plateShadow)"
          />
          
          {segments.map((segment, index) => {
            const segmentAngle = (segment.percentage / safeTotal) * 360;
            const path = createSegmentPath(currentAngle, currentAngle + segmentAngle);
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
          
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={65} 
            fill={darkMode ? '#1e293b' : '#ffffff'}
            stroke={darkMode ? '#475569' : '#e2e8f0'}
            strokeWidth="2"
          />
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="mb-1" style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
              fontSize: '18px',
              fontWeight: 600,
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              🍽 Balanced Nutrition
            </div>
            <div className="text-sm" style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
              fontWeight: 500,
              color: darkMode ? '#64748b' : '#94a3b8'
            }}>
              {overallBalance}% Complete
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Calories: <strong>{caloriesData.current}</strong> / {caloriesData.goal} kcal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Sodium: <strong>{sodiumData.current}</strong> / {sodiumData.goal} mg
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Sugar: <strong>{sugarData.current.toFixed(1)}</strong> / {sugarData.goal} g
          </span>
        </div>
      </div>
    </Card>
  );
}

// ===== MAIN COMPONENT =====
interface FoodLogEntry {
  id: number | string;
  created_at: string;
  food_name: string;
  portion_g: number | string | null;
  energy_kcal: number | string | null;
  sodium_mg: number | string | null;
  image_url: string | null;
  confidence: number | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
  fiber_g: number | string | null;
  sugar_g: number | string | null;
  potassium_mg: number | string | null;
  magnesium_mg: number | string | null;
  calcium_mg: number | string | null;
  fluid_ml: number | string | null;
  caffeine_mg: number | string | null;
  serving_desc: string | null;
  food_status: boolean | null;
  utensil: boolean | null;
}

export function NutritionSection({ darkMode }: { darkMode: boolean }) {
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  
  const [foodImages, setFoodImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dailyIntake, setDailyIntake] = useState<any>(null);
  const [sodiumGoal, setSodiumGoal] = useState<number>(3000);
  const [sodiumGoalMet, setSodiumGoalMet] = useState<boolean>(false);
  const [, setLoadingDailyIntake] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRangeLogs, setDateRangeLogs] = useState<FoodLogEntry[]>([]);

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toNumber = (value: number | string | null) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const formatValue = (value: number | string | null) => {
    if (value == null) return '-';
    const num = Number(value);
    return Number.isFinite(num) ? num : '-';
  };

  const getPortionMultiplier = (food_status: boolean | null, serving_desc: string | null): number => {
    if (food_status === true) return 1;
    
    switch (serving_desc) {
      case 'untouched': return 0;
      case 'quarter': return 0.25;
      case 'half': return 0.5;
      case 'three quarters': return 0.75;
      default: return 0;
    }
  };
   // Function to fetch food images from Supabase bucket
  const fetchFoodImages = async () => {
    try {
      setLoadingImages(true);
      setImageError(null);
      
      // List files from the food-images bucket
      const { data: files, error } = await supabase.storage
        .from('food-images')
        .list('', {
          limit: 10,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) throw error;
      
      // Get public URLs for each image
      const imageUrls = await Promise.all(
        files.map(async (file) => {
          const { data } = supabase.storage
            .from('food-images')
            .getPublicUrl(file.name);
          return data.publicUrl;
        })
      );
      
      setFoodImages(imageUrls.filter(url => url));
      
    } catch (err) {
      console.error('Error fetching food images:', err);
      setImageError('Failed to load images from storage.');
    } finally {
      setLoadingImages(false);
    }
  };


  const fetchFoodLogs = async () => {
    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFoodLogs(data ?? []);
      setLogError(null);
    } catch (err) {
      console.error('Error fetching food logs:', err);
      setLogError('Failed to load food logs from Supabase.');
    } finally {
      setLoadingLogs(false);
    }
  };

    // Combine fetch functions
  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchFoodLogs(),
      fetchFoodImages(),
      fetchDailyIntake(selectedDate)
    ]);
  }, [selectedDate]);

  useEffect(() => {
    fetchAllData();
    
    // Set up polling for new data (every 30 seconds)
    const intervalId = setInterval(fetchAllData, 30000);
    
    // Set up real-time subscription for food_logs table
    const foodLogsSubscription = supabase
      .channel('food-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'food_logs'
        },
        () => {
          fetchFoodLogs(); // Refresh logs when there's a change
        }
      )
      .subscribe();
    
    // Set up real-time subscription for storage changes (if available)
    const storageSubscription = supabase
      .channel('storage-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'storage',
          table: 'objects',
          filter: 'bucket_id=eq=food-images'
        },
        () => {
          fetchFoodImages(); // Refresh images when new ones are uploaded
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(foodLogsSubscription);
      supabase.removeChannel(storageSubscription);
    };
  }, [selectedDate, fetchAllData]);

  // Filter logs for today
  const getTodayLogs = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return foodLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= today && logDate < tomorrow;
    });
  }, [foodLogs]);

  // Calculate today's logs
  const todayLogs = getTodayLogs();

  const fetchDailyIntake = useCallback(async (date: Date) => {
    try {
      setLoadingDailyIntake(true);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('daily_intake')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily intake:', error);
      }
      
      if (data) {
        setDailyIntake(data);
        setSodiumGoal(data.daily_sodium_goal || 3000);
        setSodiumGoalMet(data.sodium_goal_met || false);
      } else {
        const defaultIntake = {
          user_id: user.id,
          date: dateStr,
          daily_sodium_goal: 3000,
          sodium_goal_met: false,
        };
        
        const { data: newIntake } = await supabase
          .from('daily_intake')
          .insert([defaultIntake])
          .select()
          .single();
        
        if (newIntake) {
          setDailyIntake(newIntake);
          setSodiumGoal(newIntake.daily_sodium_goal);
          setSodiumGoalMet(newIntake.sodium_goal_met);
        }
      }
    } catch (error) {
      console.error('Error in fetchDailyIntake:', error);
    } finally {
      setLoadingDailyIntake(false);
    }
  }, []);

  const updateSodiumGoalInDB = async (newGoal: number) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const sodiumGoalMet = dailyIntake?.sodium_mg_total >= newGoal;
      
      const updates = {
        daily_sodium_goal: newGoal,
        sodium_goal_met: sodiumGoalMet,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('daily_intake')
        .update(updates)
        .eq('user_id', user.id)
        .eq('date', dateStr);
      
      if (error) throw error;
      
      setSodiumGoal(newGoal);
      setSodiumGoalMet(sodiumGoalMet);
      
      await fetchDailyIntake(selectedDate);
      
      return true;
    } catch (error) {
      console.error('Error updating sodium goal:', error);
      return false;
    }
  };

  const filterLogsByDateRange = useCallback((date: Date, logs: FoodLogEntry[]) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startOfDay && logDate <= endOfDay;
    });
  }, []);

  useEffect(() => {
    fetchFoodLogs();
    fetchDailyIntake(selectedDate);
    
    const intervalId = setInterval(() => {
      fetchFoodLogs();
      fetchDailyIntake(selectedDate);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [selectedDate, fetchDailyIntake]);

  useEffect(() => {
    const filteredLogs = filterLogsByDateRange(selectedDate, foodLogs);
    setDateRangeLogs(filteredLogs);
  }, [foodLogs, selectedDate, filterLogsByDateRange]);

  const dailyTotals = dateRangeLogs.reduce(
    (acc, e) => {
      const multiplier = getPortionMultiplier(e.food_status, e.serving_desc);
      
      return {
        calories: acc.calories + toNumber(e.energy_kcal) * multiplier,
        sodium: acc.sodium + toNumber(e.sodium_mg) * multiplier,
        sugar: acc.sugar + toNumber(e.sugar_g) * multiplier,
        protein: acc.protein + toNumber(e.protein_g) * multiplier,
        carbs: acc.carbs + toNumber(e.carbs_g) * multiplier,
        fiber: acc.fiber + toNumber(e.fiber_g) * multiplier,
        fluid: acc.fluid + toNumber(e.fluid_ml) * multiplier,
        potassium: acc.potassium + toNumber(e.potassium_mg) * multiplier,
        magnesium: acc.magnesium + toNumber(e.magnesium_mg) * multiplier,
        caffeine: acc.caffeine + toNumber(e.caffeine_mg) * multiplier,
      };
    },
    { calories: 0, sodium: 0, sugar: 0, protein: 0, carbs: 0, fiber: 0, fluid: 0, potassium: 0, magnesium: 0, caffeine: 0 }
  );

  const logCount = dateRangeLogs.length;

  const goals = {
    calories: 2000,
    sodium: sodiumGoal,
    sugar: 50,
    protein: 80,
    carbs: 250,
    fiber: 30,
    pots_fluid: 2500,
    pots_sodium: 4000,
    pots_potassium: 3500,
    pots_magnesium: 320,
  };

  const potsPct = {
    fluid: (dailyTotals.fluid / goals.pots_fluid) * 100,
    sodium: (dailyTotals.sodium / goals.pots_sodium) * 100,
    potassium: (dailyTotals.potassium / goals.pots_potassium) * 100,
    magnesium: (dailyTotals.magnesium / goals.pots_magnesium) * 100,
  };

  const potsAlerts: string[] = [];
  if (potsPct.fluid < 60) potsAlerts.push("Hydration is low — space fluids through the day.");
  if (potsPct.sodium < 60) potsAlerts.push("Sodium is low for your POTS plan — consider electrolytes/salty foods if approved.");
  if (potsPct.potassium < 50) potsAlerts.push("Potassium is low — add fruit/veg if tolerated.");
  if (potsPct.magnesium < 50) potsAlerts.push("Magnesium is low — consider nuts/whole grains/legumes.");
  if (dailyTotals.caffeine > 200) potsAlerts.push("Caffeine is high — may worsen symptoms for some people.");

  const percentages = {
    calories: (dailyTotals.calories / goals.calories) * 100,
    sodium: (dailyTotals.sodium / goals.sodium) * 100,
    sugar: (dailyTotals.sugar / goals.sugar) * 100,
    protein: (dailyTotals.protein / goals.protein) * 100,
    carbs: (dailyTotals.carbs / goals.carbs) * 100,
    fiber: (dailyTotals.fiber / goals.fiber) * 100,
  };

  const getFeedbackMessage = () => {
    if (sodiumGoalMet) {
      return { text: '🎉 Sodium goal met for today! Great job!', type: 'success' };
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

  const formatSelectedDate = () => {
    const today = new Date();
    if (selectedDate.toDateString() === today.toDateString()) {
      return "Today";
    }
    return selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`p-5 space-y-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl mb-1">Nutrition Tracking</h1>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Auto-recognized meals & nutrition analysis
        </p>
      </div>

      {/* Date Filter */}
      <DateFilter 
        darkMode={darkMode} 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
      />

      {/* Sodium Goal Toggle */}
      <SodiumGoalToggle 
        darkMode={darkMode} 
        currentGoal={sodiumGoal}
        onGoalChange={updateSodiumGoalInDB}
      />

      {/* Daily Nutrition Summary */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            <h3 className="text-lg">Daily Nutrition Summary</h3>
          </div>
          <Badge className={`${darkMode ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-purple-100 text-purple-800 border-purple-300'} border`}>
            {formatSelectedDate()}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} rounded-xl p-3`}>
            <div className="text-xs text-slate-500 mb-1">Calories</div>
            <div className="text-2xl">{Math.round(dailyTotals.calories)}</div>
            <div className="text-xs text-slate-500">of {goals.calories} kcal</div>
            <div className={`text-xs mt-1 ${percentages.calories > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
              {Math.round(percentages.calories)}%
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} rounded-xl p-3`}>
            <div className="text-xs text-slate-500 mb-1">Sodium</div>
            <div className="text-2xl">{Math.round(dailyTotals.sodium)}</div>
            <div className="text-xs text-slate-500">of {goals.sodium.toLocaleString()} mg</div>
            <div className={`text-xs mt-1 ${percentages.sodium > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
              {Math.round(percentages.sodium)}%
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} rounded-xl p-3`}>
            <div className="text-xs text-slate-500 mb-1">Entries</div>
            <div className="text-2xl">{logCount}</div>
            <div className="text-xs text-slate-500">logged meals</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className={`text-xs ${potsPct.fluid < 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
              💧 {Math.round(potsPct.fluid)}%
            </div>
            <div className="text-xs text-slate-500">Hydration</div>
          </div>
          <div className="text-center">
            <div className={`text-xs ${potsPct.potassium < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
              🍌 {Math.round(potsPct.potassium)}%
            </div>
            <div className="text-xs text-slate-500">Potassium</div>
          </div>
          <div className="text-center">
            <div className={`text-xs ${potsPct.magnesium < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
              🥜 {Math.round(potsPct.magnesium)}%
            </div>
            <div className="text-xs text-slate-500">Magnesium</div>
          </div>
          <div className="text-center">
            <div className={`text-xs ${dailyTotals.caffeine > 200 ? 'text-amber-500' : 'text-emerald-500'}`}>
              ☕ {dailyTotals.caffeine}mg
            </div>
            <div className="text-xs text-slate-500">Caffeine</div>
          </div>
        </div>
      </Card>

      {/* POTS Alerts */}
      {potsAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`${darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300'} border rounded-2xl p-4 shadow-sm mb-4`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className={`text-sm ${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>
                  POTS Considerations:
                </p>
                {potsAlerts.map((alert, index) => (
                  <p key={index} className={`text-xs ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                    • {alert}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Nutrition Plate Visualization */}
      <NutritionPlate 
        darkMode={darkMode}
        protein={percentages.protein}
        carbs={percentages.carbs}
        fiber={percentages.fiber}
        sugar={percentages.sugar}
        caloriesData={{ current: Math.round(dailyTotals.calories), goal: goals.calories }}
        sodiumData={{ current: Math.round(dailyTotals.sodium), goal: goals.sodium }}
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

      {/* Food Log Table */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">Meals for {formatSelectedDate()}</h3>
          <Badge className={`${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
            {logCount} meals
          </Badge>
        </div>
        
        {loadingLogs ? (
          <p className="text-center text-slate-500 py-8">Loading food logs...</p>
        ) : logError ? (
          <p className="text-center text-red-500 py-8">{logError}</p>
        ) : dateRangeLogs.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No food logs for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <th className={`text-left py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Time</th>
                  <th className={`text-left py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Food</th>
                  <th className={`text-left py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                  <th className={`text-right py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Portion</th>
                  <th className={`text-right py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cal</th>
                  <th className={`text-right py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Na</th>
                  <th className={`text-center py-2 px-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Conf</th>
                </tr>
              </thead>
              <tbody>
                {dateRangeLogs.map((entry) => {
                  const multiplier = getPortionMultiplier(entry.food_status, entry.serving_desc);
                  const isLogged = entry.food_status === true;
                  
                  return (
                    <tr 
                      key={entry.id}
                      className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}
                    >
                      <td className="py-3 px-2 text-sm">{formatTime(entry.created_at)}</td>
                      <td className="py-3 px-2 text-sm">{entry.food_name}</td>
                      <td className="py-3 px-2">
                        {isLogged ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs px-2 py-0">
                            Logged
                          </Badge>
                        ) : entry.serving_desc ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 border text-xs px-2 py-0">
                            {entry.serving_desc}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-800 border-slate-300 border text-xs px-2 py-0">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        {multiplier > 0 ? `×${multiplier}` : '-'}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        {formatValue((Number(entry.energy_kcal) || 0) * multiplier)}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        {formatValue((Number(entry.sodium_mg) || 0) * multiplier)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {entry.confidence != null ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs px-2 py-0">
                            {Math.round(entry.confidence * 100)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Bottom Bar with Daily Totals */}
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Daily Totals for {formatSelectedDate()}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Calories</div>
                    <div className={`text-lg font-bold ${percentages.calories > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {Math.round(dailyTotals.calories)}
                    </div>
                    <div className={`text-xs ${percentages.calories > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {Math.round(percentages.calories)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Sodium</div>
                    <div className={`text-lg font-bold ${percentages.sodium > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {Math.round(dailyTotals.sodium)}
                    </div>
                    <div className={`text-xs ${percentages.sodium > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {Math.round(percentages.sodium)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Meals</div>
                    <div className="text-lg font-bold">{logCount}</div>
                  </div>
                </div>
              </div>
              
              {sodiumGoalMet && (
                <div className={`mt-3 p-2 rounded-lg ${darkMode ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className={`text-sm ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                      🎉 Sodium goal met! ({Math.round(dailyTotals.sodium)}/{sodiumGoal} mg)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
      
        {/* Recent Food Images from Supabase Bucket - UPDATED */}
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg">Food Images for {formatSelectedDate()}</h3>
            <Badge className={`${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
              {dateRangeLogs.filter(log => log.image_url).length} images
            </Badge>
          </div>
          
          {loadingLogs ? (
            <p className="text-center text-slate-500 py-4">Loading images...</p>
          ) : dateRangeLogs.filter(log => log.image_url).length === 0 ? (
            <p className="text-center text-slate-500 py-4">No food images found for this date.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {dateRangeLogs
                .filter(log => log.image_url)
                .map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="relative group overflow-hidden rounded-xl"
                  >
                    <img
                      src={log.image_url || ''}
                      alt={`Food: ${log.food_name}`}
                      className="w-full h-40 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200/374151/FFFFFF?text=Image+Not+Found';
                      }}
                    />
                    {/* Black overlay on hover - NEW */}
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-xl"></div>
                    
                    <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">
                      Auto-Detected
                    </Badge>
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white group-hover:text-gray-300 transition-colors duration-300">
                      <p className="text-xs truncate">{log.food_name}</p>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
          
          <div className={`mt-4 text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Images from food logs for the selected date
            {dateRangeLogs.filter(log => log.image_url).length > 0 && (
              <span className="block mt-1">
                Showing {dateRangeLogs.filter(log => log.image_url).length} images
              </span>
            )}
          </div>
        </Card>
        {/* Recent Food Images from Supabase Bucket */}
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg">Recent Food Images</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchFoodImages}
              disabled={loadingImages}
              className="flex items-center gap-1"
            >
              {loadingImages ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          {loadingImages ? (
            <p className="text-center text-slate-500 py-4">Loading images...</p>
          ) : imageError ? (
            <p className="text-center text-red-500 py-4">{imageError}</p>
          ) : foodImages.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No food images found in the storage bucket.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {foodImages.map((imgSrc, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="relative group"
                >
                  <img
                    src={imgSrc}
                    alt={`Detected Food Image ${index + 1}`}
                    className="w-full h-40 object-cover rounded-xl shadow-md group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200/374151/FFFFFF?text=Image+Not+Found';
                    }}
                  />
                  <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">
                    Auto-Detected
                  </Badge>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-xl">
                    <p className="text-white text-xs truncate">
                      {todayLogs[index]?.food_name || `Food Image ${index + 1}`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          <div className={`mt-4 text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Images from Supabase storage bucket: food-images
            {foodImages.length > 0 && (
              <span className="block mt-1">
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </Card>
      </div>
    );
  }