import { useState, useMemo, type ReactNode } from 'react';
import { Activity, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth, supabase } from '../contexts/AuthContext';

// ── Types ───────────────────────────────────────────────────────────────────
type SexOption = 'Female' | 'Male' | 'Intersex';
type HeightUnit = 'cm' | 'ftin';
type WeightUnit = 'kg' | 'lbs';

interface FormState {
  fullName: string;
  dob: string;
  sex: SexOption | '';
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightValue: string;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getHeightInMeters(unit: HeightUnit, cm: string, ft: string, inches: string): number | null {
  if (unit === 'cm') {
    const v = parseFloat(cm);
    return v > 0 ? v / 100 : null;
  }
  const totalIn = (parseFloat(ft) || 0) * 12 + (parseFloat(inches) || 0);
  return totalIn > 0 ? totalIn * 0.0254 : null;
}

function getWeightInKg(unit: WeightUnit, value: string): number | null {
  const v = parseFloat(value);
  if (!v || v <= 0) return null;
  return unit === 'kg' ? v : v * 0.453592;
}

function calcBMI(heightM: number | null, weightKg: number | null): number | null {
  if (!heightM || !weightKg) return null;
  return weightKg / (heightM * heightM);
}

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#06b6d4' };
  if (bmi < 25)   return { label: 'Healthy',     color: '#10b981' };
  if (bmi < 30)   return { label: 'Overweight',  color: '#f59e0b' };
  return            { label: 'Obese',         color: '#ef4444' };
}

// ── Shared input style ───────────────────────────────────────────────────────
const inputCls =
  'w-full px-4 py-3.5 rounded-2xl text-sm text-slate-800 placeholder-slate-400 ' +
  'bg-white border border-slate-200 shadow-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 ' +
  'transition-all duration-200';

// ── Unit Toggle ──────────────────────────────────────────────────────────────
function UnitToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            value === opt.value
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-600">Step {step} of {total}</span>
        <span className="text-sm font-semibold text-teal-600">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #0d9488 100%)',
          }}
        />
      </div>
    </div>
  );
}

// ── Field label ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-600 mb-1.5">{children}</label>;
}

// ── Main Component ───────────────────────────────────────────────────────────
export function BiodataOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    fullName: '',
    dob: '',
    sex: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    weightValue: '',
    heightUnit: 'cm',
    weightUnit: 'kg',
  });

  const age = useMemo(() => calculateAge(form.dob), [form.dob]);
  const heightM = useMemo(
    () => getHeightInMeters(form.heightUnit, form.heightCm, form.heightFt, form.heightIn),
    [form.heightUnit, form.heightCm, form.heightFt, form.heightIn]
  );
  const weightKg = useMemo(() => getWeightInKg(form.weightUnit, form.weightValue), [form.weightUnit, form.weightValue]);
  const bmi = useMemo(() => calcBMI(heightM, weightKg), [heightM, weightKg]);
  const today = new Date().toISOString().split('T')[0];

  // ── Step validation ────────────────────────────────────────────────────────
  const step1Valid = form.fullName.trim().length >= 2 && !!form.dob && (age !== null && age >= 0 && age <= 120);
  const step2Valid = !!form.sex && (heightM !== null) && (weightKg !== null);

  const canContinue = step === 1 ? step1Valid : step === 2 ? step2Valid : true;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user?.id) {
      // Demo mode — just skip to dashboard
      localStorage.setItem('biodataComplete', 'true');
      navigate('/dashboard');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('health_profile')
      .upsert({
        user_id: user.id,
        date_of_birth: form.dob,
        biological_sex: form.sex,
        height_cm: heightM ? parseFloat((heightM * 100).toFixed(1)) : null,
        weight_kg: weightKg ? parseFloat(weightKg.toFixed(2)) : null,
        bmi: bmi ? parseFloat(bmi.toFixed(1)) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    setSaving(false);

    if (error) {
      toast.error('Could not save profile', { description: error.message });
      return;
    }

    localStorage.setItem('biodataComplete', 'true');
    toast.success('Profile saved!', { description: 'Welcome to RAVEN.', duration: 2000 });
    setTimeout(() => navigate('/dashboard'), 900);
  };

  const handleContinue = () => {
    if (step < 3) setStep(s => s + 1);
    else handleSave();
  };

  // ── Render steps ──────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Tell us about yourself</h2>
            <p className="text-sm text-slate-500 mb-6">This helps us personalise your experience</p>

            <div className="space-y-3">
              {/* Full name */}
              <div>
                <FieldLabel>Full Name <span className="text-red-400">*</span></FieldLabel>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Date of birth */}
              <div>
                <FieldLabel>Date of Birth <span className="text-red-400">*</span></FieldLabel>
                <div className="relative">
                  <input
                    type="date"
                    value={form.dob}
                    max={today}
                    onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                    className={`${inputCls} ${age !== null && age >= 0 ? 'pr-20' : ''}`}
                  />
                  {age !== null && age >= 0 && age <= 120 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg pointer-events-none">
                      {age} yrs
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Your body metrics</h2>
            <p className="text-sm text-slate-500 mb-6">Used to calculate personalised health insights</p>

            <div className="space-y-4">
              {/* Height */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>Height <span className="text-red-400">*</span></FieldLabel>
                  <UnitToggle
                    options={[{ value: 'cm' as HeightUnit, label: 'cm' }, { value: 'ftin' as HeightUnit, label: 'ft/in' }]}
                    value={form.heightUnit}
                    onChange={u => setForm(f => ({ ...f, heightUnit: u, heightCm: '', heightFt: '', heightIn: '' }))}
                  />
                </div>
                {form.heightUnit === 'cm' ? (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Height (cm)"
                      min="50" max="300"
                      value={form.heightCm}
                      onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))}
                      className={`${inputCls} pr-12`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">cm</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number" placeholder="5" min="0" max="9"
                        value={form.heightFt}
                        onChange={e => setForm(f => ({ ...f, heightFt: e.target.value }))}
                        className={`${inputCls} pr-9`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">ft</span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number" placeholder="7" min="0" max="11"
                        value={form.heightIn}
                        onChange={e => setForm(f => ({ ...f, heightIn: e.target.value }))}
                        className={`${inputCls} pr-9`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">in</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>Weight <span className="text-red-400">*</span></FieldLabel>
                  <UnitToggle
                    options={[{ value: 'kg' as WeightUnit, label: 'kg' }, { value: 'lbs' as WeightUnit, label: 'lbs' }]}
                    value={form.weightUnit}
                    onChange={u => setForm(f => ({ ...f, weightUnit: u, weightValue: '' }))}
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={form.weightUnit === 'kg' ? 'Weight (kg)' : 'Weight (lbs)'}
                    min="0"
                    value={form.weightValue}
                    onChange={e => setForm(f => ({ ...f, weightValue: e.target.value }))}
                    className={`${inputCls} pr-12`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                    {form.weightUnit}
                  </span>
                </div>
              </div>

              {/* Biological Sex */}
              <div>
                <FieldLabel>Biological Sex <span className="text-red-400">*</span></FieldLabel>
                <div className="flex gap-2">
                  {(['Female', 'Male', 'Intersex'] as SexOption[]).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, sex: opt }))}
                      className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all duration-150 ${
                        form.sex === opt
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400 hover:text-teal-600'
                      }`}
                      style={form.sex === opt ? { background: 'linear-gradient(135deg, #3b82f6 0%, #0d9488 100%)' } : {}}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Almost done!</h2>
            <p className="text-sm text-slate-500 mb-6">Here's a summary of your profile</p>

            <div className="space-y-3">
              {/* Summary rows */}
              {[
                { label: 'Name', value: form.fullName || '—' },
                { label: 'Age', value: age !== null ? `${age} years` : '—' },
                { label: 'Biological Sex', value: form.sex || '—' },
                {
                  label: 'Height',
                  value: heightM
                    ? form.heightUnit === 'cm'
                      ? `${form.heightCm} cm`
                      : `${form.heightFt}ft ${form.heightIn || 0}in`
                    : '—',
                },
                {
                  label: 'Weight',
                  value: weightKg ? `${weightKg.toFixed(1)} kg` : '—',
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-3 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}

              {/* BMI card */}
              {bmi !== null && (() => {
                const cat = getBMICategory(bmi);
                return (
                  <div className="flex justify-between items-center py-3 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-sm text-slate-500">BMI</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{bmi.toFixed(1)}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        );
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center px-5 py-10"
      style={{
        background: 'linear-gradient(160deg, #f0f9ff 0%, #e6fffa 50%, #f0fdfa 100%)',
        paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #0d9488 100%)' }}
          >
            <Activity className="text-white w-10 h-10" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0d7e70' }}>Welcome to RAVEN</h1>
          <p className="text-sm text-slate-500 mt-1">Let's set up your profile</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg shadow-teal-100/60 p-6 mb-4 border border-slate-100">
          <StepBar step={step} total={3} />
          {renderStep()}
        </div>

        {/* Continue / Save button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-3"
          style={{ background: canContinue ? 'linear-gradient(135deg, #3b82f6 0%, #0d9488 100%)' : undefined, backgroundColor: canContinue ? undefined : '#cbd5e1' }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : step < 3 ? (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Save Profile</>
          )}
        </button>

        {/* Skip */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 text-sm text-slate-400 hover:text-teal-600 transition-colors font-medium"
        >
          Skip for now
        </button>

      </div>
    </div>
  );
}
