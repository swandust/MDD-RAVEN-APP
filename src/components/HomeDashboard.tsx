import { useState, useEffect } from 'react';
import { RefreshCw, Heart, Activity, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient('https://jtwzikkmixrtwwcogljp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0d3ppa2ttaXhydHd3Y29nbGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Njk2NzEsImV4cCI6MjA4MzE0NTY3MX0.fY2YCKBsXUfEoWGP0l7zuUQFPxxzz9R2ws6w3Nd2kp0');

export function HomeDashboard({ darkMode }: { darkMode: boolean }) {
  const [heartRate, setHeartRate] = useState(72);
  const [systolic, setSystolic] = useState(118);
  const [diastolic, setDiastolic] = useState(76);
  const [statusText, setStatusText] = useState('Stable');
  const [showAlert, setShowAlert] = useState(false);
  const [bpHistory, setBpHistory] = useState<number[]>([]);

  const fetchVitals = async () => {
    const { data, error } = await supabase
      .from('processed_vitals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setHeartRate(data.heart_rate);
      setSystolic(data.systolic);
      setDiastolic(data.diastolic);
      setStatusText(data.status);
      
      // Update trend graph with systolic values
      setBpHistory(prev => [...prev, data.systolic].slice(-30));
    }
  };

  useEffect(() => {
    fetchVitals();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchVitals, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setShowAlert(systolic > 140 || heartRate > 100);
  }, [heartRate, systolic]);

  const statusColor = statusText.includes('Caution') 
    ? 'bg-amber-100 text-amber-800 border-amber-300' 
    : 'bg-emerald-100 text-emerald-800 border-emerald-300';

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
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-4">
            <Card className={`${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'} border-2 p-4 rounded-2xl`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className={`${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                    <strong>⚠️ Possible syncope detected.</strong>
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Sit or lie down immediately.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vital Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Heart Rate</span>
          </div>
          <div className="text-3xl mb-1">{heartRate} <span className="text-xs">bpm</span></div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-slate-500">BP</span>
          </div>
          <div className="text-3xl mb-1">{systolic}/{diastolic} <span className="text-xs">mmHg</span></div>
        </Card>
      </div>

      {/* BP Trend Waveform */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">Systolic Trend (mmHg)</span>
        </div>
        <div className="h-24 flex items-end gap-1">
          {bpHistory.map((value, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${(value / 200) * 100}%` }}
              className={`flex-1 ${darkMode ? 'bg-emerald-400' : 'bg-emerald-500'} rounded-t-sm`}
            />
          ))}
        </div>
      </Card>

      {/* Postural Info */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpDown className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Postural Change Tracking</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Current Vitals</div>
            <div className="text-xl">{heartRate} bpm</div>
            <div className="text-xs text-slate-500">{systolic}/{diastolic} mmHg</div>
          </div>
          <div className="flex flex-col justify-end">
            <div className={`text-sm font-bold ${heartRate > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
              ΔHR: +{heartRate - 68} bpm
            </div>
            <div className="text-[10px] text-slate-400">Baseline: 68 bpm</div>
          </div>
        </div>
      </Card>
    </div>
  );
}