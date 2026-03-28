import { useEffect, useState } from 'react';
import { Droplet, CheckCircle2, Camera, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { motion } from 'motion/react';
import { supabase } from '../contexts/AuthContext';

// Types
interface FluidEvent {
  id: number;
  created_at: string;
  type: 'consumption' | 'refill';
  amount: number;
  manual: boolean;
  bottle_weight?: number;
}

interface HydrationTrackerProps {
  darkMode: boolean;
  esp32Url?: string; // e.g., "http://192.168.1.100" or "https://xyz.ngrok-free.app"
}

export function HydrationTracker({ darkMode, esp32Url }: HydrationTrackerProps) {
  const [fluidEvents, setFluidEvents] = useState<FluidEvent[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refillAmount, setRefillAmount] = useState('');
  const [showRefillInput, setShowRefillInput] = useState(false);
  const [taring, setTaring] = useState(false);
  const [refilling, setRefilling] = useState(false);

  const goal = 3.0; // liters
  // Filter only today's consumption events for total intake
  const currentIntake = fluidEvents
    .filter(e => e.type === 'consumption')
    .reduce((sum, e) => sum + e.amount, 0);
  const percentage = Math.min((currentIntake / goal) * 100, 100);

  const getHydrationStatus = () => {
    if (percentage >= 100) return { text: '✅ Goal Achieved!', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', isFull: true };
    if (percentage >= 90) return { text: '✅ Good Hydration', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', isFull: false };
    return { text: '⚠️ Below 3L target', color: 'bg-amber-100 text-amber-800 border-amber-300', isFull: false };
  };
  const status = getHydrationStatus();

  // Helper: get today's date range in UTC (ISO strings)
  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  // ---------- Data Fetching ----------
  const fetchFluidEvents = async () => {
    try {
      const { start, end } = getTodayRange();
      const { data, error } = await supabase
        .from('fluid_events')
        .select('*')
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setFluidEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch fluid events:', err);
    }
  };

  const fetchCurrentWeight = async () => {
    try {
      const { data, error } = await supabase
        .from('current_state')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // ignore no rows
      if (data) setCurrentWeight(data.weight_kg);
    } catch (err) {
      console.error('Failed to fetch current weight:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchFluidEvents(), fetchCurrentWeight()]);
      setLoading(false);
    };
    init();

    // Realtime subscription for new fluid events
    const eventsSubscription = supabase
      .channel('fluid_events_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fluid_events' }, (payload) => {
        const newEvent = payload.new as FluidEvent;
        // Only add if it's today's event (to keep the list clean)
        const todayStart = new Date().setHours(0,0,0,0);
        const eventDate = new Date(newEvent.created_at).getTime();
        if (eventDate >= todayStart) {
          setFluidEvents(prev => [newEvent, ...prev]);
        }
      })
      .subscribe();

    // Realtime subscription for current weight updates
    const weightSubscription = supabase
      .channel('current_state_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'current_state' }, (payload) => {
        setCurrentWeight(payload.new.weight_kg);
      })
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      weightSubscription.unsubscribe();
    };
  }, []);

  // ---------- ESP32 Interaction ----------
  const handleTare = async () => {
    if (!esp32Url) { alert('No ESP32 URL configured.'); return; }
    setTaring(true);
    try {
      const response = await fetch(`${esp32Url}/tare`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      if (!response.ok) throw new Error('Tare failed');
      setTimeout(fetchCurrentWeight, 500);
    } catch (err) {
      console.error(err);
      alert('Failed to tare the scale. Check ESP32 connection.');
    } finally {
      setTaring(false);
    }
  };

  const handleManualRefill = async () => {
    const amount = parseFloat(refillAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount in liters');
      return;
    }
    if (!esp32Url) { alert('No ESP32 URL configured.'); return; }
    setRefilling(true);
    try {
      const response = await fetch(`${esp32Url}/refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ amount })
      });
      if (!response.ok) throw new Error('Manual refill failed');
      setRefillAmount('');
      setShowRefillInput(false);
      // The ESP32 will insert an event; our realtime subscription will pick it up
    } catch (err) {
      console.error(err);
      alert('Failed to log refill. Check ESP32 connection.');
    } finally {
      setRefilling(false);
    }
  };

  // ---------- Water Bottle Component (unchanged) ----------
  const WaterBottle = () => {
    const bottleHeight = 360;
    const bottleWidth = 200;
    const bottleBodyTop = 60;
    const bottleBodyBottom = 320;
    const bodyHeight = bottleBodyBottom - bottleBodyTop;
    const fillHeight = (percentage / 100) * bodyHeight;
    const waterTopY = bottleBodyBottom - fillHeight;
    
    return (
      <div className="relative flex justify-center items-center py-8">
        <svg width={bottleWidth} height={bottleHeight} viewBox={`0 0 ${bottleWidth} ${bottleHeight}`} className="relative">
          <defs>
            <linearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4FB7F3" stopOpacity="1" />
              <stop offset="100%" stopColor="#AEE2FF" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
            </linearGradient>
            <clipPath id="bottleClip">
              <rect x="75" y="10" width="50" height="15" rx="3" />
              <rect x="70" y="25" width="60" height="35" rx="5" />
              <rect x="60" y="60" width="80" height="260" rx="15" />
            </clipPath>
          </defs>

          <rect x="60" y="60" width="80" height="260" rx="15" fill={darkMode ? '#1e3a5f' : '#EAF5FF'} opacity="0.6" />
          <g>
            <rect x="75" y="10" width="50" height="15" rx="3" fill={darkMode ? '#334155' : '#e0e7ff'} stroke={darkMode ? '#475569' : '#c7d2fe'} strokeWidth="2" />
            <rect x="70" y="25" width="60" height="35" rx="5" fill="none" stroke={darkMode ? '#475569' : '#c7d2fe'} strokeWidth="2.5" opacity="0.5" />
            <rect x="60" y="60" width="80" height="260" rx="15" fill="none" stroke={darkMode ? '#475569' : '#c7d2fe'} strokeWidth="2.5" opacity="0.5" />
          </g>

          <g clipPath="url(#bottleClip)">
            <motion.rect
              x="60"
              y={waterTopY}
              width="80"
              height={fillHeight}
              fill="url(#waterGradient)"
              initial={{ height: 0, y: bottleBodyBottom }}
              animate={{ height: fillHeight, y: waterTopY }}
              transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
            />
            {fillHeight > 5 && (
              <motion.path
                d={`M 60 ${waterTopY} Q 80 ${waterTopY - 4} 100 ${waterTopY} T 140 ${waterTopY} L 140 ${bottleBodyBottom} L 60 ${bottleBodyBottom} Z`}
                fill="url(#waterGradient)"
                initial={{ opacity: 0 }}
                animate={{
                  d: [
                    `M 60 ${waterTopY} Q 80 ${waterTopY - 4} 100 ${waterTopY} T 140 ${waterTopY} L 140 ${bottleBodyBottom} L 60 ${bottleBodyBottom} Z`,
                    `M 60 ${waterTopY} Q 80 ${waterTopY - 6} 100 ${waterTopY} T 140 ${waterTopY} L 140 ${bottleBodyBottom} L 60 ${bottleBodyBottom} Z`,
                    `M 60 ${waterTopY} Q 80 ${waterTopY - 4} 100 ${waterTopY} T 140 ${waterTopY} L 140 ${bottleBodyBottom} L 60 ${bottleBodyBottom} Z`,
                  ],
                  opacity: 1
                }}
                transition={{ d: { duration: 3, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.5 } }}
              />
            )}
          </g>

          <rect x="68" y="70" width="18" height="230" rx="9" fill="url(#highlightGradient)" opacity="0.5" />

          {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((volume) => {
            const markY = bottleBodyBottom - ((volume / goal) * bodyHeight);
            const isGoal = volume === goal;
            return (
              <g key={volume}>
                <line x1="145" y1={markY} x2={isGoal ? "155" : "150"} y2={markY} stroke={darkMode ? '#64748b' : isGoal ? '#6366f1' : '#94a3b8'} strokeWidth={isGoal ? "2" : "1.5"} />
                <text x="158" y={markY + 3.5} fontSize="10" fill={darkMode ? '#94a3b8' : isGoal ? '#6366f1' : '#64748b'} fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" fontWeight={isGoal ? "600" : "400"}>{volume.toFixed(1)}L</text>
              </g>
            );
          })}

          <line x1="60" y1={bottleBodyTop} x2="140" y2={bottleBodyTop} stroke={darkMode ? '#6366f1' : '#818cf8'} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />

          {fillHeight > 20 && [0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={75 + i * 20}
              cy={bottleBodyBottom}
              r={2.5}
              fill="#ffffff"
              opacity="0.5"
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: [-10, -fillHeight + 20],
                opacity: [0, 0.5, 0],
                r: [2.5, 3, 1.5]
              }}
              transition={{ duration: 2.5 + i * 0.5, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
            />
          ))}

          {status.isFull && (
            <>
              <motion.circle cx="100" cy="80" r="3" fill="#fbbf24" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
              <motion.circle cx="120" cy="120" r="2" fill="#fbbf24" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
            </>
          )}
        </svg>
      </div>
    );
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        <Loader2 className="animate-spin w-8 h-8" />
        <span className="ml-2">Loading your hydration data...</span>
      </div>
    );
  }

  return (
    <div className={`p-5 pb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header with buttons */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl mb-1">Hydration Tracker</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Automatic fluid detection & monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTare}
            disabled={taring}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} disabled:opacity-50`}
            title="Tare scale (set empty bottle as zero)"
          >
            {taring ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowRefillInput(!showRefillInput)}
            className={`p-2 rounded-full ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
            title="Manual refill"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Manual refill input */}
      {showRefillInput && (
        <div className="mb-4 flex gap-2 items-center">
          <input
            type="number"
            step="0.01"
            value={refillAmount}
            onChange={(e) => setRefillAmount(e.target.value)}
            placeholder="Amount in liters (e.g., 0.5)"
            className={`flex-1 px-3 py-2 border rounded-md ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
          />
          <button
            onClick={handleManualRefill}
            disabled={refilling}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
          >
            {refilling && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Refill
          </button>
        </div>
      )}

      {/* Water Bottle Visualization Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200'} border rounded-3xl p-6 shadow-sm mb-8`}>
        <WaterBottle />

        <motion.div className="text-center mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
          <div className="mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif', fontSize: '16px', fontWeight: 600, color: darkMode ? '#94a3b8' : '#64748b' }}>
            {currentIntake.toFixed(1)} L / {goal.toFixed(1)} L ({Math.round(percentage)}%)
          </div>
        </motion.div>

        <div className="flex justify-center mb-4">
          <Badge className={`${status.color} border rounded-full px-4 py-1.5`}>{status.text}</Badge>
        </div>

        {currentWeight !== null && (
          <div className="text-center text-sm text-slate-500 mt-2">
            Current bottle water: {currentWeight.toFixed(2)} kg
          </div>
        )}

        {currentIntake < goal && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="text-center">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              You need <strong>{(goal - currentIntake).toFixed(1)} L</strong> more to reach your goal 💧
            </p>
          </motion.div>
        )}

        {status.isFull && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <p className="text-sm text-emerald-600">🎉 Excellent work! You've reached your daily hydration goal!</p>
          </motion.div>
        )}
      </Card>

      {/* Today's Fluid Log */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-3xl p-4 shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm">Today's Fluid Log</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Camera className="w-3.5 h-3.5" />
            <span>Auto-detected</span>
          </div>
        </div>

        {fluidEvents.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">No hydration events yet. Start drinking! 💧</p>
        ) : (
          <div className="space-y-3">
            {fluidEvents.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  darkMode ? 'bg-slate-700/50' : 'bg-gradient-to-r from-cyan-50/50 to-blue-50/50'
                } border ${darkMode ? 'border-slate-600' : 'border-cyan-100'}`}
              >
                <div className="flex flex-col items-center flex-shrink-0 w-16">
                  <div className="text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`mt-1 w-2 h-2 rounded-full ${darkMode ? 'bg-cyan-400' : 'bg-cyan-500'}`} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span className="text-sm">
                      {entry.type === 'consumption' ? '-' : '+'}{entry.amount.toFixed(2)} L
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {entry.type === 'consumption' ? 'Water intake' : 'Water refill'} {entry.manual && '(manual)'}
                  </div>
                </div>

                {entry.type === 'consumption' && !entry.manual && (
                  <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} text-center`}>
          <div className="text-xs text-slate-500">
            <span>{fluidEvents.filter(e => e.type === 'consumption').length} consumptions today</span>
            <span className="mx-2">•</span>
            <span>Total: {currentIntake.toFixed(1)} L</span>
          </div>
        </div>
      </Card>
    </div>
  );
}