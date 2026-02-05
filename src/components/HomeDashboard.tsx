import { useState, useEffect } from 'react';
import { RefreshCw, Heart, Activity, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

export function HomeDashboard({ darkMode }: { darkMode: boolean }) {
  const [heartRate, setHeartRate] = useState(72);
  const [systolic, setSystolic] = useState(118);
  const [diastolic, setDiastolic] = useState(76);
  const [showAlert, setShowAlert] = useState(false);
  const [ecgData, setEcgData] = useState<number[]>([]);

  // Simulate ECG waveform data
  useEffect(() => {
    const generateECGPoint = () => {
      const baseValue = 50;
      const noise = Math.random() * 10;
      const spike = Math.random() > 0.9 ? 40 : 0;
      return baseValue + noise + spike;
    };

    const interval = setInterval(() => {
      setEcgData(prev => {
        const newData = [...prev, generateECGPoint()];
        return newData.slice(-30); // Keep last 30 points
      });
    }, 100);

    // Initialize data
    setEcgData(Array.from({ length: 30 }, generateECGPoint));

    return () => clearInterval(interval);
  }, []);

  // Check for abnormal vitals
  useEffect(() => {
    if (heartRate > 100 || systolic > 140) {
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }
  }, [heartRate, systolic]);

  const handleRefresh = () => {
    // Simulate new vitals
    setHeartRate(Math.floor(Math.random() * 40) + 65);
    setSystolic(Math.floor(Math.random() * 30) + 110);
    setDiastolic(Math.floor(Math.random() * 20) + 70);
  };

  const statusColor = heartRate > 100 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
  const statusText = heartRate > 100 ? 'Caution: Elevated HR' : 'Stable';

  return (
    <div className={`p-5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl mb-2">Hi Chi Wei 👋</h1>
        <Badge className={`${statusColor} border rounded-full px-3 py-1`}>
          {statusText}
        </Badge>
      </div>

      {/* Warning Banner */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4"
          >
            <Card className={`${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'} border-2 p-4 rounded-2xl`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className={`${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                    <strong>⚠️ Possible syncope detected.</strong>
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    Sit or lie down immediately.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg">Vital Signs</h2>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className={`rounded-full ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Vital Cards Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Heart Rate */}
        <Card className={`${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-blue-800' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-blue-800' : 'bg-blue-100'} p-2 rounded-full`}>
              <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
            </div>
            <span className="text-xs text-slate-500">Heart Rate</span>
          </div>
          <div className="text-3xl mb-1">{heartRate}</div>
          <div className="text-xs text-slate-500">bpm</div>
        </Card>

        {/* Blood Pressure */}
        <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-purple-800' : 'bg-purple-100'} p-2 rounded-full`}>
              <Activity className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            </div>
            <span className="text-xs text-slate-500">Blood Pressure</span>
          </div>
          <div className="text-3xl mb-1">{systolic}/{diastolic}</div>
          <div className="text-xs text-slate-500">mmHg</div>
        </Card>
      </div>

      {/* ECG Waveform */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`${darkMode ? 'bg-emerald-800' : 'bg-emerald-100'} p-2 rounded-full`}>
            <Activity className={`w-4 h-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
          </div>
          <span className="text-sm">ECG Waveform</span>
        </div>
        <div className="h-24 flex items-end gap-0.5">
          {ecgData.map((value, index) => (
            <div
              key={index}
              className={`flex-1 ${darkMode ? 'bg-emerald-400' : 'bg-emerald-500'} rounded-t-sm transition-all duration-100`}
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
      </Card>

      {/* Postural Change Indicator */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`${darkMode ? 'bg-amber-800' : 'bg-amber-100'} p-2 rounded-full`}>
            <ArrowUpDown className={`w-4 h-4 ${darkMode ? 'text-amber-300' : 'text-amber-600'}`} />
          </div>
          <span className="text-sm">Postural Change</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Lying Down</div>
            <div className="text-xl">68 bpm</div>
            <div className="text-xs text-slate-500">115/72 mmHg</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Standing</div>
            <div className="text-xl">{heartRate} bpm</div>
            <div className="text-xs text-slate-500">{systolic}/{diastolic} mmHg</div>
          </div>
        </div>
        <div className={`mt-3 text-sm ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
          ΔHR: +{heartRate - 68} bpm
        </div>
      </Card>
    </div>
  );
}
