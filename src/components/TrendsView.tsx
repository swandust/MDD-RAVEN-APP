import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Heart, Activity, Droplet, UtensilsCrossed, TrendingUp, AlertTriangle, CheckCircle2, Info, ArrowUp, Share2, FileDown, FileSpreadsheet, Wind } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export function TrendsView({ darkMode }: { darkMode: boolean }) {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');

  // Mock data for 7 days
  const weekData = [
    { day: 'Mon', date: 'Nov 6', hr: 72, hrStanding: 108, bp: 118, water: 2.8, sodium: 2100, symptoms: 2 },
    { day: 'Tue', date: 'Nov 7', hr: 78, hrStanding: 118, bp: 122, water: 2.4, sodium: 2400, symptoms: 3 },
    { day: 'Wed', date: 'Nov 8', hr: 68, hrStanding: 102, bp: 115, water: 3.1, sodium: 1900, symptoms: 1 },
    { day: 'Thu', date: 'Nov 9', hr: 75, hrStanding: 112, bp: 120, water: 2.9, sodium: 2000, symptoms: 1 },
    { day: 'Fri', date: 'Nov 10', hr: 82, hrStanding: 125, bp: 125, water: 2.1, sodium: 2600, symptoms: 4 },
    { day: 'Sat', date: 'Nov 11', hr: 70, hrStanding: 105, bp: 116, water: 3.0, sodium: 1850, symptoms: 1 },
    { day: 'Sun', date: 'Nov 12', hr: 73, hrStanding: 110, bp: 119, water: 2.7, sodium: 2200, symptoms: 2 },
  ];

  // Mock data for 30 days with events
  const monthData = [
    { day: 1, hr: 87 }, { day: 2, hr: 89 }, { day: 3, hr: 85 }, { day: 4, hr: 88 }, { day: 5, hr: 90 },
    { day: 6, hr: 86 }, { day: 7, hr: 91 }, { day: 8, hr: 102, event: 'dizzy', eventLabel: '⚠️ Dizzy Episode – HR rose to 102 bpm' },
    { day: 9, hr: 93 }, { day: 10, hr: 87 }, { day: 11, hr: 85 }, { day: 12, hr: 89 }, { day: 13, hr: 86 },
    { day: 14, hr: 88 }, { day: 15, hr: 92 }, { day: 16, hr: 88, event: 'lowHydration', eventLabel: '💧 Low Hydration – 88 bpm baseline' },
    { day: 17, hr: 90 }, { day: 18, hr: 86 }, { day: 19, hr: 85 }, { day: 20, hr: 87 }, { day: 21, hr: 89 },
    { day: 22, hr: 91 }, { day: 23, hr: 82, event: 'medication', eventLabel: '💊 Medication Taken – stabilized 82 bpm' },
    { day: 24, hr: 84 }, { day: 25, hr: 86 }, { day: 26, hr: 85 }, { day: 27, hr: 88 }, { day: 28, hr: 87 },
    { day: 29, hr: 89 }, { day: 30, hr: 86 }
  ];

  // Calculate averages and trends
  const avgHR = Math.round(weekData.reduce((sum, d) => sum + d.hr, 0) / weekData.length);
  const avgStandingHR = Math.round(weekData.reduce((sum, d) => sum + d.hrStanding, 0) / weekData.length);
  const avgPosturalChange = avgStandingHR - avgHR;
  const avgWater = (weekData.reduce((sum, d) => sum + d.water, 0) / weekData.length).toFixed(1);
  const avgSodium = Math.round(weekData.reduce((sum, d) => sum + d.sodium, 0) / weekData.length);
  const daysMetGoal = weekData.filter(d => d.water >= 2.5).length;

  // 30-day stats
  const minHR = Math.min(...monthData.map(d => d.hr));
  const maxHR = Math.max(...monthData.map(d => d.hr));
  const avgHR30 = Math.round(monthData.reduce((sum, d) => sum + d.hr, 0) / monthData.length);

  // Correlations for insights
  const goodDays = weekData.filter(d => d.symptoms <= 2);
  const avgSodiumGoodDays = goodDays.length > 0 ? Math.round(goodDays.reduce((sum, d) => sum + d.sodium, 0) / goodDays.length) : 0;
  const avgWaterGoodDays = goodDays.length > 0 ? (goodDays.reduce((sum, d) => sum + d.water, 0) / goodDays.length).toFixed(1) : '0.0';

  // Custom tooltip for 30-day chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 shadow-lg`}>
          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Day {data.day}: {data.hr} bpm
          </p>
          {data.event && (
            <p className="text-xs text-purple-500 mt-1">{data.eventLabel}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-5 pb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header with Export Dropdown */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl mb-1">Trends & Insights</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Understanding your POTS patterns
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className={`rounded-2xl ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Export & Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className={`rounded-xl ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <DropdownMenuItem className={`${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} cursor-pointer`}>
              <FileDown className="w-4 h-4 mr-2" />
              📄 Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem className={`${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} cursor-pointer`}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              📊 Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem className={`${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} cursor-pointer`}>
              <Share2 className="w-4 h-4 mr-2" />
              💬 Share with Healthcare Provider
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTimeRange('week')}
          className={`flex-1 py-2 px-4 rounded-xl transition-all ${
            timeRange === 'week'
              ? darkMode
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : darkMode
              ? 'bg-slate-800 text-slate-400 border border-slate-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`flex-1 py-2 px-4 rounded-xl transition-all ${
            timeRange === 'month'
              ? darkMode
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : darkMode
              ? 'bg-slate-800 text-slate-400 border border-slate-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          30 Days
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-100'} p-1.5 rounded-lg`}>
              <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
            </div>
            <span className="text-xs text-slate-500">Avg HR</span>
          </div>
          <div className="text-2xl">{timeRange === 'week' ? avgHR : avgHR30}</div>
          <div className="text-xs text-slate-500">bpm resting</div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-rose-900' : 'bg-rose-100'} p-1.5 rounded-lg`}>
              <ArrowUp className={`w-4 h-4 ${darkMode ? 'text-rose-300' : 'text-rose-600'}`} />
            </div>
            <span className="text-xs text-slate-500">ΔHR Stand</span>
          </div>
          <div className="text-2xl">+{avgPosturalChange}</div>
          <div className="text-xs text-slate-500">bpm change</div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-cyan-900' : 'bg-cyan-100'} p-1.5 rounded-lg`}>
              <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
            </div>
            <span className="text-xs text-slate-500">Avg Water</span>
          </div>
          <div className="text-2xl">{avgWater}L</div>
          <div className="text-xs text-slate-500">{daysMetGoal}/7 days met</div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-purple-900' : 'bg-purple-100'} p-1.5 rounded-lg`}>
              <UtensilsCrossed className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            </div>
            <span className="text-xs text-slate-500">Avg Sodium</span>
          </div>
          <div className="text-2xl">{avgSodium}</div>
          <div className="text-xs text-slate-500">mg/day</div>
        </Card>
      </div>

      {/* Improved Heart Rate Trend (Last 30 Days) */}
      {timeRange === 'month' && (
        <>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 via-white to-white border-purple-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm">Heart Rate Trend (Last 30 Days)</div>
                <div className="text-xs text-slate-500">Monitor your daily patterns</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="day" 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '11px' }}
                  label={{ value: 'Days (1–30)', position: 'insideBottom', offset: -5, style: { fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' } }}
                />
                <YAxis 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '11px' }}
                  domain={[60, 120]}
                  label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="hr" 
                  stroke={darkMode ? '#a78bfa' : '#8b5cf6'} 
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.event === 'dizzy') {
                      return <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={2} />;
                    } else if (payload.event === 'lowHydration') {
                      return <circle cx={cx} cy={cy} r={6} fill="#06b6d4" stroke="#fff" strokeWidth={2} />;
                    } else if (payload.event === 'medication') {
                      return <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />;
                    }
                    return <circle cx={cx} cy={cy} r={3} fill={darkMode ? '#a78bfa' : '#8b5cf6'} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex justify-end gap-4 mt-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-purple-400' : 'bg-purple-500'}`} />
                <span className="text-slate-500">🟣 Heart Rate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-500">🔶 Symptom Episode</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-slate-500">🔵 Hydration Note</span>
              </div>
            </div>

            {/* Footer Stats */}
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-purple-100'} flex justify-center gap-6 text-xs`}>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Min: <strong>{minHR} bpm</strong></span>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Max: <strong>{maxHR} bpm</strong></span>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Avg: <strong>{avgHR30} bpm</strong></span>
            </div>
          </Card>

          {/* Symptoms & Episodes Summary */}
          <div className="mb-8">
            <h3 className="text-sm mb-3">Symptoms & Episodes Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'} border rounded-2xl p-4 shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${darkMode ? 'bg-amber-900' : 'bg-amber-100'} p-1.5 rounded-lg`}>
                    <Wind className={`w-4 h-4 ${darkMode ? 'text-amber-300' : 'text-amber-600'}`} />
                  </div>
                  <span className="text-xs text-slate-500">Lightheadedness</span>
                </div>
                <div className="text-xl mb-1">🌀 2 episodes</div>
                <div className="text-xs text-slate-500">this week</div>
              </Card>

              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'} border rounded-2xl p-4 shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${darkMode ? 'bg-cyan-900' : 'bg-cyan-100'} p-1.5 rounded-lg`}>
                    <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
                  </div>
                  <span className="text-xs text-slate-500">Low Fluid Intake</span>
                </div>
                <div className="text-xl mb-1">💧 1 episode</div>
                <div className="text-xs text-slate-500">linked to symptoms</div>
              </Card>
            </div>
            
            <div className={`mt-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="flex items-start gap-2">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'} flex-shrink-0`} />
                <div className="text-xs">
                  <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                    Symptoms improved on days with ≥2.8 L water intake
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 7-Day Charts */}
      {timeRange === 'week' && (
        <>
          {/* Heart Rate Trends Chart */}
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-100'} p-2 rounded-full`}>
                  <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <div>
                  <div className="text-sm">Heart Rate Trends</div>
                  <div className="text-xs text-slate-500">Resting vs Standing</div>
                </div>
              </div>
              <Badge className={`${avgPosturalChange < 35 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border rounded-full px-3 py-0.5 text-xs`}>
                {avgPosturalChange < 35 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Good
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Monitor
                  </>
                )}
              </Badge>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="day" 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '12px' }}
                  domain={[60, 130]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="hr" 
                  stroke={darkMode ? '#60a5fa' : '#3b82f6'} 
                  strokeWidth={2}
                  name="Resting HR"
                  dot={{ fill: darkMode ? '#60a5fa' : '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="hrStanding" 
                  stroke={darkMode ? '#f87171' : '#ef4444'} 
                  strokeWidth={2}
                  name="Standing HR"
                  dot={{ fill: darkMode ? '#f87171' : '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="flex justify-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`} />
                <span className="text-slate-500">Resting</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-red-400' : 'bg-red-500'}`} />
                <span className="text-slate-500">Standing</span>
              </div>
            </div>
          </Card>

          {/* Hydration & Symptoms Correlation */}
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${darkMode ? 'bg-cyan-900' : 'bg-cyan-100'} p-2 rounded-full`}>
                  <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
                </div>
                <div>
                  <div className="text-sm">Hydration Impact</div>
                  <div className="text-xs text-slate-500">Daily intake & symptoms</div>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="day" 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="water" fill={darkMode ? '#22d3ee' : '#06b6d4'} radius={[8, 8, 0, 0]} name="Water (L)" />
              </BarChart>
            </ResponsiveContainer>

            <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-cyan-50'}`}>
              <div className="flex items-start gap-2">
                <Info className={`w-4 h-4 mt-0.5 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'} flex-shrink-0`} />
                <div className="text-xs">
                  <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                    You had fewer symptoms on days with ≥2.8L of water intake. Keep it up!
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Sodium Intake Pattern */}
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${darkMode ? 'bg-purple-900' : 'bg-purple-100'} p-2 rounded-full`}>
                  <UtensilsCrossed className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                </div>
                <div>
                  <div className="text-sm">Sodium Intake</div>
                  <div className="text-xs text-slate-500">Target: 2000-2500 mg/day</div>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="day" 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke={darkMode ? '#94a3b8' : '#64748b'} 
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sodium" 
                  stroke={darkMode ? '#c084fc' : '#a855f7'} 
                  fill={darkMode ? '#581c87' : '#f3e8ff'} 
                  strokeWidth={2}
                  name="Sodium (mg)"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex justify-center mt-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div className="text-xs text-slate-500">Weekly Average:</div>
                <div className="text-sm">{avgSodium} mg/day</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* AI-Powered Insights */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-800' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
          <h3 className="text-lg">AI-Powered Insights</h3>
        </div>

        <div className="space-y-3">
          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Excellent Progress
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Your postural HR change improved by 18% this week when maintaining 2.8L+ hydration
                </div>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Pattern Detected
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Days with sodium {avgSodiumGoodDays}mg showed 35% fewer symptoms
                </div>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Area for Improvement
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Friday showed highest symptoms (4/10). Low hydration (2.1L) may be a factor
                </div>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
            <div className="flex items-start gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Recommendation
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Your best days averaged {avgWaterGoodDays}L water and {avgSodiumGoodDays}mg sodium
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Alerts Timeline */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className={`w-5 h-5 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
          <h3 className="text-lg">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {[
            {
              time: '2:30 PM',
              icon: <Heart className="w-4 h-4" />,
              bgColor: darkMode ? 'bg-amber-900' : 'bg-amber-100',
              textColor: darkMode ? 'text-amber-300' : 'text-amber-600',
              message: 'Heart rate elevated after standing',
              detail: 'ΔHR: +38 bpm (baseline: 72 → 110 bpm)',
            },
            {
              time: '12:45 PM',
              icon: <Droplet className="w-4 h-4" />,
              bgColor: darkMode ? 'bg-cyan-900' : 'bg-cyan-100',
              textColor: darkMode ? 'text-cyan-300' : 'text-cyan-600',
              message: 'Hydration checkpoint',
              detail: '1.8L consumed - 0.7L behind target',
            },
            {
              time: '10:15 AM',
              icon: <UtensilsCrossed className="w-4 h-4" />,
              bgColor: darkMode ? 'bg-purple-900' : 'bg-purple-100',
              textColor: darkMode ? 'text-purple-300' : 'text-purple-600',
              message: 'Breakfast logged',
              detail: '850mg sodium, 45g carbs',
            },
            {
              time: '8:00 AM',
              icon: <Activity className="w-4 h-4" />,
              bgColor: darkMode ? 'bg-emerald-900' : 'bg-emerald-100',
              textColor: darkMode ? 'text-emerald-300' : 'text-emerald-600',
              message: 'Morning vitals stable',
              detail: 'HR: 68 bpm, BP: 115/75 mmHg',
            },
          ].map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-xl p-3`}
            >
              <div className={`${alert.bgColor} p-2 rounded-full flex-shrink-0`}>
                <div className={alert.textColor}>{alert.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{alert.message}</div>
                <div className="text-xs text-slate-500 mt-0.5">{alert.detail}</div>
              </div>
              <div className="text-xs text-slate-500 flex-shrink-0">{alert.time}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
