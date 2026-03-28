// homedashboard.tsx (rewritten)

import { useState, useEffect } from 'react';
import { Heart, Activity, AlertTriangle, Bell, X, Calendar, Beaker, Droplet } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlertContext } from '../context/AlertContext';

export function HomeDashboard({ darkMode }: { darkMode: boolean }) {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there';
  const [heartRate, setHeartRate] = useState(72);
  const [systolic, setSystolic] = useState(118);
  const [diastolic, setDiastolic] = useState(76);
  const [statusText, setStatusText] = useState('Stable');
  const [systolicHistory, setSystolicHistory] = useState<number[]>([]);
  const [heartRateHistory, setHeartRateHistory] = useState<number[]>([]);
  const [hoveredBP, setHoveredBP] = useState<number | null>(null);
  const [hoveredHR, setHoveredHR] = useState<number | null>(null);
  const [vitalsTimestamp, setVitalsTimestamp] = useState<string | null>(null);
  const [todayDate] = useState(new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }));

  const { activeAlert, dismissAlert } = useAlertContext();

  // New states for nutrition data
  const [dailySodium, setDailySodium] = useState(0);
  const [sodiumGoal, setSodiumGoal] = useState(3000);
  const [dailyWater, setDailyWater] = useState(0);
  const [waterGoal] = useState(2500); // ml
  const [loadingNutrition, setLoadingNutrition] = useState(true);

  const fetchVitals = async () => {
    const { data, error } = await supabase
      .from('processed_vitals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (data && !error && data.length > 0) {
      const latest = data[0];
      setHeartRate(latest.heart_rate);
      setSystolic(latest.systolic);
      setDiastolic(latest.diastolic);
      setStatusText(latest.status);
      setVitalsTimestamp(latest.created_at);

      // Update trend graphs
      const systolicValues = data.map(item => item.systolic).reverse();
      const heartRateValues = data.map(item => item.heart_rate).reverse();
      
      setSystolicHistory(systolicValues);
      setHeartRateHistory(heartRateValues);
    }
  };

  // Fetch today's nutrition data
  const fetchTodayNutrition = async () => {
    try {
      setLoadingNutrition(true);
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Fetch today's food logs
      const { data: logsData, error: logsError } = await supabase
        .from('food_logs')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
      
      if (logsError) throw logsError;
      
      // Calculate totals
      let sodiumTotal = 0;
      let waterTotal = 0;
      
      logsData?.forEach(log => {
        // Helper function to get portion multiplier
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
        
        const multiplier = getPortionMultiplier(log.food_status, log.serving_desc);
        
        // Convert to numbers safely
        const sodium = Number(log.sodium_mg) || 0;
        const water = Number(log.fluid_ml) || 0;
        
        sodiumTotal += sodium * multiplier;
        waterTotal += water * multiplier;
      });
      
      setDailySodium(sodiumTotal);
      setDailyWater(waterTotal);
      
      // Fetch sodium goal from daily_intake
      const dateStr = today.toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: intakeData } = await supabase
          .from('daily_intake')
          .select('daily_sodium_goal')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .single();
        
        if (intakeData?.daily_sodium_goal) {
          setSodiumGoal(intakeData.daily_sodium_goal);
        }
      }
      
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoadingNutrition(false);
    }
  };

  useEffect(() => {
    fetchVitals();
    fetchTodayNutrition();
    
    // Poll for updates every 5 seconds for vitals, every 30 seconds for nutrition
    const vitalsInterval = setInterval(fetchVitals, 5000);
    const nutritionInterval = setInterval(fetchTodayNutrition, 30000);
    
    return () => {
      clearInterval(vitalsInterval);
      clearInterval(nutritionInterval);
    };
  }, []);

  const statusColor = statusText.includes('Caution') 
    ? 'bg-amber-100 text-amber-800 border-amber-300' 
    : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  // Calculate POTS-related metrics
  const pulsePressure = systolic - diastolic;

  // Calculate percentages for progress bars
  const sodiumPercentage = Math.min((dailySodium / sodiumGoal) * 100, 100);
  const waterPercentage = Math.min((dailyWater / waterGoal) * 100, 100);

  return (
    <div className={`p-5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
    
      {/* Header with Date */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl">Hi {displayName} 👋</h1>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{todayDate}</span>
          </div>
        </div>
        <Badge className={`${statusColor} border rounded-full px-3 py-1`}>
          {statusText}
        </Badge>
      </div>

      {/* POTS Alert Card */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            key={activeAlert.timestamp}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className="mb-4"
          >
            <Card
              className={`
                border-2 p-4 rounded-2xl
                ${activeAlert.severity === 'critical'
                  ? darkMode
                    ? 'bg-red-900/40 border-red-600'
                    : 'bg-red-50 border-red-400'
                  : darkMode
                    ? 'bg-amber-900/30 border-amber-600'
                    : 'bg-amber-50 border-amber-300'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {activeAlert.severity === 'critical' ? (
                    <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                  ) : (
                    <Bell className="w-5 h-5 text-amber-600" />
                  )}
                </div>

                <div className="flex-1">
                  <p className={`font-bold ${
                    activeAlert.severity === 'critical'
                      ? darkMode ? 'text-red-200' : 'text-red-800'
                      : darkMode ? 'text-amber-200' : 'text-amber-800'
                  }`}>
                    {activeAlert.severity === 'critical' ? '🚨 Critical POTS Alert' : '⚠️ Warning POTS Alert'}
                  </p>

                  <p className={`text-sm mt-1 ${
                    activeAlert.severity === 'critical'
                      ? darkMode ? 'text-red-300' : 'text-red-700'
                      : darkMode ? 'text-amber-300' : 'text-amber-700'
                  }`}>
                    {activeAlert.severity === 'critical'
                      ? `Your heart rate jumped by +${activeAlert.deltaHR} bpm. Sit or lie down immediately — high fainting risk!`
                      : `Your heart rate increased by +${activeAlert.deltaHR} bpm. Sit down if you feel dizzy, lightheaded, or unwell.`
                    }
                  </p>

                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(activeAlert.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                <button
                  onClick={dismissAlert}
                  className={`flex-shrink-0 p-1 rounded-full hover:bg-black/10 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vital Cards - Updated with matching background */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className={`${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-blue-800' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-500'}`} />
            <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Heart Rate</span>
          </div>
          <div className="text-3xl mb-1">{heartRate} <span className="text-xs">bpm</span></div>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pulse Pressure: {pulsePressure} mmHg</div>
          {vitalsTimestamp && (
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date(vitalsTimestamp).toLocaleString()}
            </div>
          )}
        </Card>

        <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-500'}`} />
            <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Blood Pressure</span>
          </div>
          <div className="text-3xl mb-1">{systolic}/{diastolic} <span className="text-xs">mmHg</span></div>
          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>MAP: {Math.round(diastolic + (systolic - diastolic)/3)} mmHg</div>
          {vitalsTimestamp && (
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date(vitalsTimestamp).toLocaleString()}
            </div>
          )}
        </Card>
      </div>

      {/* New Sodium and Water Intake Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className={`${darkMode ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border-orange-800' : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Beaker className={`w-4 h-4 ${darkMode ? 'text-orange-300' : 'text-orange-500'}`} />
              <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Sodium Intake</span>
            </div>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Today</span>
          </div>
          
          {loadingNutrition ? (
            <div className="animate-pulse">
              <div className="h-8 bg-slate-700/50 rounded mb-2"></div>
              <div className="h-4 bg-slate-700/50 rounded"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl mb-1">{Math.round(dailySodium).toLocaleString()}<span className="text-xs"> mg</span></div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>
                Goal: {sodiumGoal.toLocaleString()} mg ({Math.round(sodiumPercentage)}%)
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className={`h-2 rounded-full ${sodiumPercentage > 100 ? 'bg-red-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(sodiumPercentage, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between">
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {sodiumPercentage > 100 ? '⚠️ Over goal' : 'On track'}
                </span>
                <span className={`text-xs ${sodiumPercentage > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {Math.round(sodiumPercentage)}%
                </span>
              </div>
            </>
          )}
        </Card>

        <Card className={`${darkMode ? 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-cyan-800' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-500'}`} />
              <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Water Intake</span>
            </div>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Today</span>
          </div>
          
          {loadingNutrition ? (
            <div className="animate-pulse">
              <div className="h-8 bg-slate-700/50 rounded mb-2"></div>
              <div className="h-4 bg-slate-700/50 rounded"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl mb-1">{Math.round(dailyWater)}<span className="text-xs"> ml</span></div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>
                Goal: {waterGoal.toLocaleString()} ml ({Math.round(waterPercentage)}%)
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className="h-2 rounded-full bg-cyan-500"
                  style={{ width: `${Math.min(waterPercentage, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between">
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {waterPercentage < 60 ? '⚠️ Drink more water' : 'Hydrated'}
                </span>
                <span className={`text-xs ${waterPercentage < 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {Math.round(waterPercentage)}%
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Blood Pressure Trend Graph */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-500'}`} />
          <span className="text-sm font-medium">Blood Pressure Trend (Systolic)</span>
        </div>
        <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Normal: 90–140 mmHg · <span className="text-green-500 font-medium">Green = normal</span> · <span className="text-yellow-500 font-medium">Yellow = low</span> · <span className="text-red-500 font-medium">Red = high</span>
        </p>

        {/* Tooltip */}
        <div className="relative">
          <AnimatePresence>
            {hoveredBP !== null && systolicHistory[hoveredBP] !== undefined && (
              <motion.div
                key={hoveredBP}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={`absolute -top-9 z-10 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg pointer-events-none
                  ${systolicHistory[hoveredBP] > 140
                    ? 'bg-red-500 text-white'
                    : systolicHistory[hoveredBP] < 90
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-green-500 text-white'}`}
                style={{ left: `${(hoveredBP / (systolicHistory.length - 1)) * 88}%` }}
              >
                {systolicHistory[hoveredBP]} mmHg &nbsp;
                {systolicHistory[hoveredBP] > 140 ? '⚠️ High' : systolicHistory[hoveredBP] < 90 ? '⚠️ Low' : '✓ Normal'}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-32 flex items-end gap-1">
            {systolicHistory.map((value, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min((value / 200) * 100, 100)}%` }}
                className={`flex-1 rounded-t-sm cursor-pointer transition-opacity
                  ${value > 140 ? 'bg-red-500' : value < 90 ? 'bg-yellow-400' : 'bg-green-500'}
                  ${hoveredBP !== null && hoveredBP !== index ? 'opacity-40' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredBP(index)}
                onMouseLeave={() => setHoveredBP(null)}
                onTouchStart={() => setHoveredBP(index)}
                onTouchEnd={() => setHoveredBP(null)}
              />
            ))}
          </div>
        </div>

        <div className={`flex justify-between text-xs mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
          <span>Earlier</span>
          <span>Now</span>
        </div>
      </Card>

      {/* Heart Rate Trend Graph */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-blue-800' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-1">
          <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-500'}`} />
          <span className="text-sm font-medium">Heart Rate Trend</span>
        </div>
        <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Normal resting: 60–100 bpm · <span className="text-green-500 font-medium">Green = normal</span> · <span className="text-yellow-500 font-medium">Yellow = low</span> · <span className="text-red-500 font-medium">Red = high</span>
        </p>

        {/* Tooltip */}
        <div className="relative">
          <AnimatePresence>
            {hoveredHR !== null && heartRateHistory[hoveredHR] !== undefined && (
              <motion.div
                key={hoveredHR}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={`absolute -top-9 z-10 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg pointer-events-none
                  ${heartRateHistory[hoveredHR] > 100
                    ? 'bg-red-500 text-white'
                    : heartRateHistory[hoveredHR] < 60
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-green-500 text-white'}`}
                style={{ left: `${(hoveredHR / (heartRateHistory.length - 1)) * 88}%` }}
              >
                {heartRateHistory[hoveredHR]} bpm &nbsp;
                {heartRateHistory[hoveredHR] > 100 ? '⚠️ Elevated' : heartRateHistory[hoveredHR] < 60 ? '⚠️ Low' : '✓ Normal'}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-32 flex items-end gap-1">
            {heartRateHistory.map((value, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min((value / 180) * 100, 100)}%` }}
                className={`flex-1 rounded-t-sm cursor-pointer transition-opacity
                  ${value > 100 ? 'bg-red-500' : value < 60 ? 'bg-yellow-400' : 'bg-green-500'}
                  ${hoveredHR !== null && hoveredHR !== index ? 'opacity-40' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredHR(index)}
                onMouseLeave={() => setHoveredHR(null)}
                onTouchStart={() => setHoveredHR(index)}
                onTouchEnd={() => setHoveredHR(null)}
              />
            ))}
          </div>
        </div>

        <div className={`flex justify-between text-xs mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
          <span>Earlier</span>
          <span>Now</span>
        </div>
      </Card>

      {/* POTS Metrics Card - Updated background */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-amber-800' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'} border rounded-2xl p-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className={`w-4 h-4 ${darkMode ? 'text-amber-300' : 'text-amber-500'}`} />
          <span className="text-sm font-medium">POTS Metrics</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'} mb-1`}>Current Readings</div>
            <div className="text-xl">{heartRate} bpm</div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{systolic}/{diastolic} mmHg</div>
          </div>
          <div>
            <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-500'} mb-1`}>Pulse Pressure</div>
            <div className={`text-xl font-bold ${pulsePressure < 40 ? 'text-red-500' : 'text-emerald-500'}`}>
              {pulsePressure} mmHg
            </div>
            <div className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {pulsePressure < 40 ? 'Narrow (<40)' : 'Normal (40-60)'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
