import { useState, useMemo } from 'react';
import {
  User,
  Ruler,
  Info,
  CheckCircle2,
  Loader2,
  Heart,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth, supabase } from '../contexts/AuthContext';

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

interface FormErrors {
  fullName?: string;
  dob?: string;
  sex?: string;
  height?: string;
  weight?: string;
}

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

function getHeightInMeters(
  unit: HeightUnit,
  cm: string,
  ft: string,
  inches: string
): number | null {
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

function getBMICategory(bmi: number): { label: string; colorCls: string; bgCls: string } {
  if (bmi < 18.5) return { label: 'Underweight', colorCls: 'text-cyan-600',   bgCls: 'bg-cyan-50' };
  if (bmi < 25)   return { label: 'Healthy',     colorCls: 'text-emerald-600', bgCls: 'bg-emerald-50' };
  if (bmi < 30)   return { label: 'Overweight',  colorCls: 'text-amber-600',   bgCls: 'bg-amber-50' };
  return            { label: 'Obese',         colorCls: 'text-red-500',     bgCls: 'bg-red-50' };
}

// ── Unit Toggle ────────────────────────────────────────────────────────────
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
    <div className="flex bg-blue-100 rounded-lg p-[3px] gap-[2px]">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-[5px] rounded-md text-xs font-semibold transition-all duration-150 ${
            value === opt.value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-blue-400 hover:text-blue-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Field Error ────────────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-500">{message}</p>;
}

// ── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-blue-500">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function BiodataOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
  const weightKg = useMemo(
    () => getWeightInKg(form.weightUnit, form.weightValue),
    [form.weightUnit, form.weightValue]
  );
  const bmi = useMemo(() => calcBMI(heightM, weightKg), [heightM, weightKg]);

  const errors = useMemo<FormErrors>(() => {
    const e: FormErrors = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      e.fullName = 'Please enter your full name';

    if (!form.dob) {
      e.dob = 'Please enter your date of birth';
    } else if (age !== null && (age < 0 || age > 120)) {
      e.dob = 'Please enter a valid date of birth';
    }

    if (!form.sex) e.sex = 'Please select an option';

    if (form.heightUnit === 'cm') {
      const cm = parseFloat(form.heightCm);
      if (!form.heightCm || isNaN(cm) || cm < 50 || cm > 300)
        e.height = 'Please enter a valid height (50–300 cm)';
    } else {
      const totalIn = (parseFloat(form.heightFt) || 0) * 12 + (parseFloat(form.heightIn) || 0);
      if (totalIn <= 0) e.height = 'Please enter a valid height';
    }

    const w = parseFloat(form.weightValue);
    if (!form.weightValue || isNaN(w) || w <= 0) e.weight = 'Please enter a valid weight';

    return e;
  }, [form, age]);

  const isValid = Object.keys(errors).length === 0;

  const shouldShowError = (field: keyof FormErrors) =>
    (touched[field] || submitAttempted) && !!errors[field];

  const blur = (field: string) => setTouched(t => ({ ...t, [field]: true }));

  const inputCls = (field: keyof FormErrors) =>
    [
      'w-full px-4 py-3 rounded-2xl border bg-white text-slate-800 placeholder-slate-400',
      'text-sm transition-all duration-150 outline-none',
      shouldShowError(field)
        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200'
        : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200',
    ].join(' ');

  const handleSave = async () => {
    setSubmitAttempted(true);
    if (!isValid || !user) return;

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
    toast.success('Profile saved!', {
      description: 'Welcome to RAVEN. Your experience is now personalized.',
      duration: 3000,
    });
    setTimeout(() => navigate('/dashboard'), 1100);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" richColors />

      <div className="max-w-sm mx-auto p-5 pt-10 pb-24">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-5 shadow-md">
            <Heart className="text-white w-7 h-7" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Let's set up your profile
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            This helps us personalize your POTS monitoring for your body.
          </p>
        </div>

        {/* ── Section 1: About You ── */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-5 shadow-sm mb-3">
          <SectionHeader icon={<User className="w-4 h-4" strokeWidth={2} />} label="About You" />

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Rivera"
              value={form.fullName}
              autoComplete="name"
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              onBlur={() => blur('fullName')}
              className={inputCls('fullName')}
            />
            <FieldError message={shouldShowError('fullName') ? errors.fullName : undefined} />
          </div>

          {/* Date of Birth */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Date of Birth <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={form.dob}
                max={today}
                onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                onBlur={() => blur('dob')}
                className={`${inputCls('dob')} ${age !== null && age >= 0 && age <= 120 ? 'pr-20' : ''}`}
              />
              {age !== null && age >= 0 && age <= 120 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg pointer-events-none">
                  {age} yrs
                </span>
              )}
            </div>
            <FieldError message={shouldShowError('dob') ? errors.dob : undefined} />
          </div>

          {/* Biological Sex */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Biological Sex <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  aria-label="Why we ask for biological sex"
                  className="text-slate-400 hover:text-blue-500 transition-colors flex items-center"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                {showTooltip && (
                  <div
                    role="tooltip"
                    className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-60 bg-slate-800 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl leading-relaxed"
                  >
                    Hormonal cycles can significantly affect POTS symptoms. This helps us personalize your insights.
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {(['Female', 'Male', 'Intersex'] as SexOption[]).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setForm(f => ({ ...f, sex: opt }));
                    setTouched(t => ({ ...t, sex: true }));
                  }}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all duration-150 ${
                    form.sex === opt
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : shouldShowError('sex')
                      ? 'bg-white text-slate-500 border-red-300'
                      : 'bg-white text-slate-500 border-gray-200 hover:border-blue-400 hover:text-blue-500'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <FieldError message={shouldShowError('sex') ? errors.sex : undefined} />
          </div>
        </div>

        {/* ── Section 2: Body Metrics ── */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 shadow-sm mb-4">
          <SectionHeader icon={<Ruler className="w-4 h-4" strokeWidth={2} />} label="Body Metrics" />

          {/* Height */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Height <span className="text-red-400">*</span>
              </label>
              <UnitToggle
                options={[
                  { value: 'cm' as HeightUnit, label: 'cm' },
                  { value: 'ftin' as HeightUnit, label: 'ft / in' },
                ]}
                value={form.heightUnit}
                onChange={u => setForm(f => ({ ...f, heightUnit: u, heightCm: '', heightFt: '', heightIn: '' }))}
              />
            </div>

            {form.heightUnit === 'cm' ? (
              <div className="relative">
                <input
                  type="number"
                  placeholder="e.g. 165"
                  min="50"
                  max="300"
                  value={form.heightCm}
                  onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))}
                  onBlur={() => blur('height')}
                  className={`${inputCls('height')} pr-12`}
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
                    onBlur={() => blur('height')}
                    className={`${inputCls('height')} pr-9`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">ft</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number" placeholder="7" min="0" max="11"
                    value={form.heightIn}
                    onChange={e => setForm(f => ({ ...f, heightIn: e.target.value }))}
                    onBlur={() => blur('height')}
                    className={`${inputCls('height')} pr-9`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">in</span>
                </div>
              </div>
            )}
            <FieldError message={shouldShowError('height') ? errors.height : undefined} />
          </div>

          {/* Weight */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Weight <span className="text-red-400">*</span>
              </label>
              <UnitToggle
                options={[
                  { value: 'kg' as WeightUnit, label: 'kg' },
                  { value: 'lbs' as WeightUnit, label: 'lbs' },
                ]}
                value={form.weightUnit}
                onChange={u => setForm(f => ({ ...f, weightUnit: u, weightValue: '' }))}
              />
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder={form.weightUnit === 'kg' ? 'e.g. 62' : 'e.g. 137'}
                min="0"
                value={form.weightValue}
                onChange={e => setForm(f => ({ ...f, weightValue: e.target.value }))}
                onBlur={() => blur('weight')}
                className={`${inputCls('weight')} pr-12`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                {form.weightUnit}
              </span>
            </div>
            <FieldError message={shouldShowError('weight') ? errors.weight : undefined} />
          </div>

          {/* BMI — read-only */}
          <div className={`rounded-2xl border px-4 py-3 transition-all duration-300 ${
            bmi !== null
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
              : 'bg-white border-dashed border-gray-200 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">BMI</p>
                {bmi !== null ? (
                  <p className="text-3xl font-bold text-slate-900 leading-none">{bmi.toFixed(1)}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Fill height & weight</p>
                )}
              </div>
              {bmi !== null && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getBMICategory(bmi).colorCls} ${getBMICategory(bmi).bgCls}`}>
                  {getBMICategory(bmi).label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Save Button ── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
            isValid && !saving
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]'
              : !isValid
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-300 text-white cursor-not-allowed'
          }`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Save Profile</>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 mt-1 text-sm text-slate-400 hover:text-blue-500 transition-colors"
        >
          Skip for now
        </button>

      </div>
    </div>
  );
}
