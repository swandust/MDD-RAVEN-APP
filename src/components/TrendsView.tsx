import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Heart, Activity, Droplet, UtensilsCrossed, TrendingUp, AlertTriangle, CheckCircle2, Info, Share2, FileDown, FileSpreadsheet, Wind } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { supabase } from '../../lib/supabase';

interface WeekDataPoint {
  day: string;
  date: string;
  hr: number;
  bp: number;
  water: number;
  sodium: number;
  symptoms: number;
}

interface MonthDataPoint {
  day: number;
  hr: number;
}

export function TrendsView({ darkMode }: { darkMode: boolean }) {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');
  const [weekData, setWeekData] = useState<WeekDataPoint[]>([]);
  const [monthData, setMonthData] = useState<MonthDataPoint[]>([]);
  const [recentVitals, setRecentVitals] = useState<any[]>([]);
  const [recentFluids, setRecentFluids] = useState<any[]>([]);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchTrendsData();
  }, []);

  const fetchTrendsData = async () => {
    try {
      setLoading(true);
      const now = new Date();

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // Fetch 30-day vitals (covers both week and month views)
      const { data: vitals30 } = await supabase
        .from('processed_vitals')
        .select('heart_rate, systolic, status, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Fetch 7-day fluid consumption events
      const { data: fluids7 } = await supabase
        .from('fluid_events')
        .select('amount, created_at')
        .eq('type', 'consumption')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Fetch 7-day food logs
      const { data: foods7 } = await supabase
        .from('food_logs')
        .select('sodium_mg, food_status, serving_desc, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Fetch recent records for activity timeline
      const { data: recentVitalsData } = await supabase
        .from('processed_vitals')
        .select('heart_rate, systolic, diastolic, status, created_at')
        .order('created_at', { ascending: false })
        .limit(4);

      const { data: recentFluidsData } = await supabase
        .from('fluid_events')
        .select('amount, created_at')
        .eq('type', 'consumption')
        .order('created_at', { ascending: false })
        .limit(4);

      const { data: recentFoodsData } = await supabase
        .from('food_logs')
        .select('food_name, sodium_mg, food_status, serving_desc, created_at')
        .order('created_at', { ascending: false })
        .limit(4);

      // Build 7-day data array
      const last7Days: WeekDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const dayVitals = (vitals30 || []).filter(v => {
          const d = new Date(v.created_at);
          return d >= dayStart && d < dayEnd;
        });

        const avgHR = dayVitals.length > 0
          ? Math.round(dayVitals.reduce((sum, v) => sum + v.heart_rate, 0) / dayVitals.length)
          : 0;
        const avgBP = dayVitals.length > 0
          ? Math.round(dayVitals.reduce((sum, v) => sum + v.systolic, 0) / dayVitals.length)
          : 0;
        const symptoms = dayVitals.filter(v => v.status && v.status.toLowerCase().includes('caution')).length;

        const dayFluids = (fluids7 || []).filter(f => {
          const d = new Date(f.created_at);
          return d >= dayStart && d < dayEnd;
        });
        const waterL = parseFloat(dayFluids.reduce((sum, f) => sum + f.amount, 0).toFixed(2));

        const dayFoods = (foods7 || []).filter(f => {
          const d = new Date(f.created_at);
          return d >= dayStart && d < dayEnd;
        });
        const sodiumMg = Math.round(
          dayFoods.reduce((sum, f) =>
            sum + (Number(f.sodium_mg) || 0) * getPortionMultiplier(f.food_status, f.serving_desc), 0)
        );

        last7Days.push({
          day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
          date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          hr: avgHR,
          bp: avgBP,
          water: waterL,
          sodium: sodiumMg,
          symptoms,
        });
      }

      // Build 30-day data array
      const last30Days: MonthDataPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const dayVitals = (vitals30 || []).filter(v => {
          const d = new Date(v.created_at);
          return d >= dayStart && d < dayEnd;
        });

        const avgHR = dayVitals.length > 0
          ? Math.round(dayVitals.reduce((sum, v) => sum + v.heart_rate, 0) / dayVitals.length)
          : 0;

        last30Days.push({ day: 30 - i, hr: avgHR });
      }

      setWeekData(last7Days);
      setMonthData(last30Days);
      setRecentVitals(recentVitalsData || []);
      setRecentFluids(recentFluidsData || []);
      setRecentFoods(recentFoodsData || []);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Computed stats ---
  const validWeekHR = weekData.filter(d => d.hr > 0);
  const avgHR = validWeekHR.length > 0
    ? Math.round(validWeekHR.reduce((sum, d) => sum + d.hr, 0) / validWeekHR.length)
    : 0;
  const avgBP = validWeekHR.length > 0
    ? Math.round(validWeekHR.reduce((sum, d) => sum + d.bp, 0) / validWeekHR.length)
    : 0;

  const validWaterDays = weekData.filter(d => d.water > 0);
  const avgWater = validWaterDays.length > 0
    ? (validWaterDays.reduce((sum, d) => sum + d.water, 0) / validWaterDays.length).toFixed(1)
    : '0.0';
  const daysMetGoal = weekData.filter(d => d.water >= 2.5).length;

  const validSodiumDays = weekData.filter(d => d.sodium > 0);
  const avgSodium = validSodiumDays.length > 0
    ? Math.round(validSodiumDays.reduce((sum, d) => sum + d.sodium, 0) / validSodiumDays.length)
    : 0;

  const validMonthData = monthData.filter(d => d.hr > 0);
  const minHR = validMonthData.length > 0 ? Math.min(...validMonthData.map(d => d.hr)) : 0;
  const maxHR = validMonthData.length > 0 ? Math.max(...validMonthData.map(d => d.hr)) : 0;
  const avgHR30 = validMonthData.length > 0
    ? Math.round(validMonthData.reduce((sum, d) => sum + d.hr, 0) / validMonthData.length)
    : 0;

  const goodDays = weekData.filter(d => d.symptoms === 0);
  const goodDaysWithSodium = goodDays.filter(d => d.sodium > 0);
  const avgSodiumGoodDays = goodDaysWithSodium.length > 0
    ? Math.round(goodDaysWithSodium.reduce((sum, d) => sum + d.sodium, 0) / goodDaysWithSodium.length)
    : avgSodium;
  const goodDaysWithWater = goodDays.filter(d => d.water > 0);
  const avgWaterGoodDays = goodDaysWithWater.length > 0
    ? (goodDaysWithWater.reduce((sum, d) => sum + d.water, 0) / goodDaysWithWater.length).toFixed(1)
    : avgWater;

  const worstDay = weekData.length > 0
    ? weekData.reduce((worst, d) => d.symptoms > worst.symptoms ? d : worst, weekData[0])
    : null;

  // Format timestamp for activity timeline
  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Custom tooltip for 30-day chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 shadow-lg`}>
          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Day {data.day}: {data.hr > 0 ? `${data.hr} bpm` : 'No data'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`p-5 pb-6 ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center justify-center min-h-64`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading your trends...</p>
        </div>
      </div>
    );
  }

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
            className={`rounded-xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
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
              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              : darkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`flex-1 py-2 px-4 rounded-xl transition-all ${
            timeRange === 'month'
              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              : darkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600'
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
          <div className="text-2xl">{timeRange === 'week' ? (avgHR || '—') : (avgHR30 || '—')}</div>
          <div className="text-xs text-slate-500">bpm resting</div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${darkMode ? 'bg-rose-900' : 'bg-rose-100'} p-1.5 rounded-lg`}>
              <Activity className={`w-4 h-4 ${darkMode ? 'text-rose-300' : 'text-rose-600'}`} />
            </div>
            <span className="text-xs text-slate-500">Avg BP</span>
          </div>
          <div className="text-2xl">{avgBP || '—'}</div>
          <div className="text-xs text-slate-500">mmHg systolic</div>
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
          <div className="text-2xl">{avgSodium || '—'}</div>
          <div className="text-xs text-slate-500">mg/day</div>
        </Card>
      </div>

      {/* 30-Day Heart Rate Trend */}
      {timeRange === 'month' && (
        <>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-purple-50 via-white to-white border-purple-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm">Heart Rate Trend (Last 30 Days)</div>
                <div className="text-xs text-slate-500">Monitor your daily patterns</div>
              </div>
            </div>

            {validMonthData.length === 0 ? (
              <div className={`flex items-center justify-center h-40 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500">No vitals data in the last 30 days</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={validMonthData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
                    domain={['auto', 'auto']}
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
                      if (!payload.hr) return <></>;
                      return <circle cx={cx} cy={cy} r={3} fill={darkMode ? '#a78bfa' : '#8b5cf6'} />;
                    }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-purple-100'} flex justify-center gap-6 text-xs`}>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Min: <strong>{minHR || '—'} bpm</strong></span>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Max: <strong>{maxHR || '—'} bpm</strong></span>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Avg: <strong>{avgHR30 || '—'} bpm</strong></span>
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
                  <span className="text-xs text-slate-500">Caution Episodes</span>
                </div>
                <div className="text-xl mb-1">
                  🌀 {weekData.reduce((sum, d) => sum + d.symptoms, 0)} readings
                </div>
                <div className="text-xs text-slate-500">this week</div>
              </Card>

              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'} border rounded-2xl p-4 shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${darkMode ? 'bg-cyan-900' : 'bg-cyan-100'} p-1.5 rounded-lg`}>
                    <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
                  </div>
                  <span className="text-xs text-slate-500">Low Fluid Days</span>
                </div>
                <div className="text-xl mb-1">
                  💧 {weekData.filter(d => d.water > 0 && d.water < 2.5).length} days
                </div>
                <div className="text-xs text-slate-500">below 2.5L target</div>
              </Card>
            </div>

            {daysMetGoal >= 4 && (
              <div className={`mt-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'} flex-shrink-0`} />
                  <div className="text-xs">
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      You met your hydration goal on {daysMetGoal} of the last 7 days — great consistency!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 7-Day Charts */}
      {timeRange === 'week' && (
        <>
          {/* Heart Rate Trend */}
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-100'} p-2 rounded-full`}>
                  <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <div>
                  <div className="text-sm">Heart Rate Trends</div>
                  <div className="text-xs text-slate-500">Daily average resting HR</div>
                </div>
              </div>
              <Badge className={`${avgHR > 0 && avgHR < 100 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border rounded-full px-3 py-0.5 text-xs`}>
                {avgHR > 0 && avgHR < 100 ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" />Normal</>
                ) : (
                  <><AlertTriangle className="w-3 h-3 mr-1" />Monitor</>
                )}
              </Badge>
            </div>

            {validWeekHR.length === 0 ? (
              <div className={`flex items-center justify-center h-32 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500">No vitals data this week</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weekData.filter(d => d.hr > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [value > 0 ? `${value} bpm` : 'No data', 'Avg HR']}
                  />
                  <Line
                    type="monotone"
                    dataKey="hr"
                    stroke={darkMode ? '#60a5fa' : '#3b82f6'}
                    strokeWidth={2}
                    name="Avg HR"
                    dot={{ fill: darkMode ? '#60a5fa' : '#3b82f6', r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Hydration Chart */}
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${darkMode ? 'bg-cyan-900' : 'bg-cyan-100'} p-2 rounded-full`}>
                  <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
                </div>
                <div>
                  <div className="text-sm">Hydration Intake</div>
                  <div className="text-xs text-slate-500">Daily water from bottle tracker</div>
                </div>
              </div>
            </div>

            {validWaterDays.length === 0 ? (
              <div className={`flex items-center justify-center h-32 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500">No hydration data this week</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekData.filter(d => d.water > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} L`, 'Water']}
                  />
                  <Bar dataKey="water" fill={darkMode ? '#22d3ee' : '#06b6d4'} radius={[8, 8, 0, 0]} name="Water (L)" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {validWaterDays.length > 0 && (
              <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-cyan-50'}`}>
                <div className="flex items-start gap-2">
                  <Info className={`w-4 h-4 mt-0.5 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'} flex-shrink-0`} />
                  <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {daysMetGoal >= 4
                      ? `Great job! You hit your 2.5L goal on ${daysMetGoal} of the last 7 days.`
                      : `You met your 2.5L goal on ${daysMetGoal} of the last 7 days. Try to drink more consistently.`}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Sodium Intake Chart */}
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${darkMode ? 'bg-purple-900' : 'bg-purple-100'} p-2 rounded-full`}>
                  <UtensilsCrossed className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                </div>
                <div>
                  <div className="text-sm">Sodium Intake</div>
                  <div className="text-xs text-slate-500">From logged meals</div>
                </div>
              </div>
            </div>

            {validSodiumDays.length === 0 ? (
              <div className={`flex items-center justify-center h-32 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className="text-sm text-slate-500">No nutrition data this week</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weekData.filter(d => d.sodium > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} mg`, 'Sodium']}
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
            )}

            {validSodiumDays.length > 0 && (
              <div className="flex justify-center mt-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="text-xs text-slate-500">Weekly Average:</div>
                  <div className="text-sm">{avgSodium} mg/day</div>
                </div>
              </div>
            )}
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
          {avgHR30 > 0 && (
            <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Heart Rate Overview</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Your 30-day average HR is {avgHR30} bpm (min: {minHR}, max: {maxHR} bpm).
                  </div>
                </div>
              </div>
            </div>
          )}

          {avgSodiumGoodDays > 0 && (
            <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Pattern Detected</div>
                  <div className="text-xs text-slate-500 mt-1">
                    On symptom-free days your average sodium was {avgSodiumGoodDays} mg
                    {avgWaterGoodDays !== '0.0' ? ` and water intake was ${avgWaterGoodDays} L` : ''}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {worstDay && worstDay.symptoms > 0 && (
            <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Area for Improvement</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {worstDay.day} ({worstDay.date}) had the most caution readings ({worstDay.symptoms}).
                    {worstDay.water > 0 && worstDay.water < 2.5 ? ` Hydration was low at ${worstDay.water} L.` : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(avgWaterGoodDays !== '0.0' || avgSodiumGoodDays > 0) && (
            <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Recommendation</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Your best days averaged{avgWaterGoodDays !== '0.0' ? ` ${avgWaterGoodDays} L water` : ''}
                    {avgSodiumGoodDays > 0 && avgWaterGoodDays !== '0.0' ? ' and' : ''}
                    {avgSodiumGoodDays > 0 ? ` ${avgSodiumGoodDays} mg sodium` : ''}. Aim for these targets daily.
                  </div>
                </div>
              </div>
            </div>
          )}

          {validWeekHR.length === 0 && validWaterDays.length === 0 && validSodiumDays.length === 0 && (
            <div className={`${darkMode ? 'bg-slate-800/50' : 'bg-white/60'} rounded-xl p-3`}>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>No data yet</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Start logging vitals, hydration, and meals to see personalised insights here.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity Timeline */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className={`w-5 h-5 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
          <h3 className="text-lg">Recent Activity</h3>
        </div>

        <div className="space-y-3">
          {recentVitals.slice(0, 2).map((v, i) => (
            <div key={`vital-${i}`} className={`flex items-start gap-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-xl p-3`}>
              <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-100'} p-2 rounded-full flex-shrink-0`}>
                <Heart className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">Vitals recorded — {v.status || 'Stable'}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  HR: {v.heart_rate} bpm, BP: {v.systolic}/{v.diastolic} mmHg
                </div>
              </div>
              <div className="text-xs text-slate-500 flex-shrink-0">{formatTime(v.created_at)}</div>
            </div>
          ))}

          {recentFluids.slice(0, 1).map((f, i) => (
            <div key={`fluid-${i}`} className={`flex items-start gap-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-xl p-3`}>
              <div className={`${darkMode ? 'bg-cyan-900' : 'bg-cyan-100'} p-2 rounded-full flex-shrink-0`}>
                <Droplet className={`w-4 h-4 ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">Hydration logged</div>
                <div className="text-xs text-slate-500 mt-0.5">{f.amount.toFixed(2)} L consumed</div>
              </div>
              <div className="text-xs text-slate-500 flex-shrink-0">{formatTime(f.created_at)}</div>
            </div>
          ))}

          {recentFoods.slice(0, 1).map((f, i) => {
            const multiplier = getPortionMultiplier(f.food_status, f.serving_desc);
            const sodium = Math.round((Number(f.sodium_mg) || 0) * multiplier);
            return (
              <div key={`food-${i}`} className={`flex items-start gap-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-xl p-3`}>
                <div className={`${darkMode ? 'bg-purple-900' : 'bg-purple-100'} p-2 rounded-full flex-shrink-0`}>
                  <UtensilsCrossed className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{f.food_name || 'Meal'} logged</div>
                  <div className="text-xs text-slate-500 mt-0.5">{sodium} mg sodium</div>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">{formatTime(f.created_at)}</div>
              </div>
            );
          })}

          {recentVitals.length === 0 && recentFluids.length === 0 && recentFoods.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No recent activity recorded yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
