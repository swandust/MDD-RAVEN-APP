import { useState } from 'react';
import { Droplet, CheckCircle2, Camera } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { motion } from 'motion/react';

interface FluidEntry {
  time: string;
  amount: number;
  editable: boolean;
  autoDetected: boolean;
}

export function HydrationTracker({ darkMode }: { darkMode: boolean }) {
  const [fluidEntries] = useState<FluidEntry[]>([
    { time: '08:00', amount: 0.25, editable: true, autoDetected: true },
    { time: '10:30', amount: 0.40, editable: true, autoDetected: true },
    { time: '13:00', amount: 0.30, editable: true, autoDetected: true },
    { time: '15:45', amount: 0.35, editable: true, autoDetected: true },
    { time: '18:20', amount: 0.50, editable: true, autoDetected: true },
  ]);

  const goal = 3.0;
  const currentIntake = fluidEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const percentage = Math.min((currentIntake / goal) * 100, 100);

  const getHydrationStatus = () => {
    if (percentage >= 100) return { 
      text: '✅ Goal Achieved!', 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isFull: true 
    };
    if (percentage >= 90) return { 
      text: '✅ Good Hydration', 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isFull: false 
    };
    return { 
      text: '⚠️ Below 3L target', 
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      isFull: false 
    };
  };

  const status = getHydrationStatus();

  // Animated Water Bottle Component
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
        <svg
          width={bottleWidth}
          height={bottleHeight}
          viewBox={`0 0 ${bottleWidth} ${bottleHeight}`}
          className="relative"
        >
          <defs>
            {/* Gradient for water fill - #4FB7F3 to #AEE2FF */}
            <linearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4FB7F3" stopOpacity="1" />
              <stop offset="100%" stopColor="#AEE2FF" stopOpacity="1" />
            </linearGradient>
            
            {/* Gradient for bottle highlights */}
            <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
            </linearGradient>

            {/* Clip path for bottle shape */}
            <clipPath id="bottleClip">
              {/* Bottle cap */}
              <rect x="75" y="10" width="50" height="15" rx="3" />
              {/* Bottle neck */}
              <rect x="70" y="25" width="60" height="35" rx="5" />
              {/* Main bottle body */}
              <rect x="60" y="60" width="80" height="260" rx="15" />
            </clipPath>
          </defs>

          {/* Empty bottle background tint - #EAF5FF at 60% */}
          <rect 
            x="60" 
            y="60" 
            width="80" 
            height="260" 
            rx="15"
            fill={darkMode ? '#1e3a5f' : '#EAF5FF'}
            opacity="0.6"
          />

          {/* Bottle outline (glass effect) */}
          <g>
            {/* Bottle cap */}
            <rect 
              x="75" 
              y="10" 
              width="50" 
              height="15" 
              rx="3"
              fill={darkMode ? '#334155' : '#e0e7ff'}
              stroke={darkMode ? '#475569' : '#c7d2fe'}
              strokeWidth="2"
            />
            
            {/* Bottle neck */}
            <rect 
              x="70" 
              y="25" 
              width="60" 
              height="35" 
              rx="5"
              fill="none"
              stroke={darkMode ? '#475569' : '#c7d2fe'}
              strokeWidth="2.5"
              opacity="0.5"
            />
            
            {/* Main bottle body */}
            <rect 
              x="60" 
              y="60" 
              width="80" 
              height="260" 
              rx="15"
              fill="none"
              stroke={darkMode ? '#475569' : '#c7d2fe'}
              strokeWidth="2.5"
              opacity="0.5"
            />
          </g>

          {/* Water fill with animation */}
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
            
            {/* Smooth curved wave at top of water */}
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
                transition={{
                  d: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  opacity: { duration: 0.5 }
                }}
              />
            )}
          </g>

          {/* Highlight effect on bottle */}
          <rect
            x="68"
            y="70"
            width="18"
            height="230"
            rx="9"
            fill="url(#highlightGradient)"
            opacity="0.5"
          />

          {/* Volume tick marks and labels on the right side */}
          {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((volume) => {
            const markY = bottleBodyBottom - ((volume / goal) * bodyHeight);
            const isGoal = volume === goal;
            return (
              <g key={volume}>
                {/* Tick mark */}
                <line
                  x1="145"
                  y1={markY}
                  x2={isGoal ? "155" : "150"}
                  y2={markY}
                  stroke={darkMode ? '#64748b' : isGoal ? '#6366f1' : '#94a3b8'}
                  strokeWidth={isGoal ? "2" : "1.5"}
                />
                {/* Label */}
                <text
                  x="158"
                  y={markY + 3.5}
                  fontSize="10"
                  fill={darkMode ? '#94a3b8' : isGoal ? '#6366f1' : '#64748b'}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
                  fontWeight={isGoal ? "600" : "400"}
                >
                  {volume.toFixed(1)}L
                </text>
              </g>
            );
          })}

          {/* Dotted goal line at 3L */}
          <line
            x1="60"
            y1={bottleBodyTop}
            x2="140"
            y2={bottleBodyTop}
            stroke={darkMode ? '#6366f1' : '#818cf8'}
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.6"
          />

          {/* Gentle droplet effects rising in water */}
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
              transition={{
                duration: 2.5 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.9,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Sparkle effect when goal achieved */}
          {status.isFull && (
            <>
              <motion.circle
                cx="100"
                cy="80"
                r="3"
                fill="#fbbf24"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0,
                }}
              />
              <motion.circle
                cx="120"
                cy="120"
                r="2"
                fill="#fbbf24"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.5,
                }}
              />
            </>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className={`p-5 pb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl mb-1">Hydration Tracker</h1>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Automatic fluid detection & monitoring
        </p>
      </div>

      {/* Water Bottle Visualization Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-200'} border rounded-3xl p-6 shadow-sm mb-8`}>
        <WaterBottle />

        {/* Label below bottle - 16px spacing */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div 
            className="mb-4"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: darkMode ? '#94a3b8' : '#64748b'
            }}
          >
            {currentIntake.toFixed(1)} L / {goal.toFixed(1)} L ({Math.round(percentage)}%)
          </div>
        </motion.div>

        {/* Status Badge */}
        <div className="flex justify-center mb-4">
          <Badge className={`${status.color} border rounded-full px-4 py-1.5`}>
            {status.text}
          </Badge>
        </div>

        {/* Helper Text */}
        {currentIntake < goal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center"
          >
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              You need <strong>{(goal - currentIntake).toFixed(1)} L</strong> more to reach your goal 💧
            </p>
          </motion.div>
        )}

        {status.isFull && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-sm text-emerald-600">
              🎉 Excellent work! You've reached your daily hydration goal!
            </p>
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

        {/* Timeline-style log */}
        <div className="space-y-3">
          {fluidEntries.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                darkMode ? 'bg-slate-700/50' : 'bg-gradient-to-r from-cyan-50/50 to-blue-50/50'
              } border ${
                darkMode ? 'border-slate-600' : 'border-cyan-100'
              }`}
            >
              {/* Time indicator */}
              <div className="flex flex-col items-center flex-shrink-0 w-16">
                <div className="text-xs text-slate-500">{entry.time}</div>
                <div className={`mt-1 w-2 h-2 rounded-full ${
                  darkMode ? 'bg-cyan-400' : 'bg-cyan-500'
                }`} />
              </div>

              {/* Vertical line */}
              {index < fluidEntries.length - 1 && (
                <div className={`absolute left-[4.5rem] mt-12 w-0.5 h-8 ${
                  darkMode ? 'bg-slate-600' : 'bg-cyan-200'
                }`} />
              )}

              {/* Amount and icon */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <span className="text-sm">{entry.amount.toFixed(2)} L</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Water intake detected</div>
              </div>

              {/* Auto-detected badge */}
              {entry.autoDetected && (
                <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Summary footer */}
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} text-center`}>
          <div className="text-xs text-slate-500">
            <span>{fluidEntries.length} detections today</span>
            <span className="mx-2">•</span>
            <span>Total: {currentIntake.toFixed(1)} L</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
