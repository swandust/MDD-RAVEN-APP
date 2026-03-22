import React, { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  Activity,
  PlayCircle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Defined outside LoginPage so React never treats it as a new component on re-render
function Field({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  right,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-10 py-3 sm:py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-700/90 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
      {right && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          {right}
        </span>
      )}
    </div>
  );
}

export function LoginPage() {
  const [isLogin, setIsLogin]           = useState(true);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [username, setUsername]         = useState("");
  const [fullName, setFullName]         = useState("");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode]         = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setDarkMode(localStorage.getItem('darkMode') === 'true');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, username, fullName);
      if (result.error) {
        setError(result.error.message || 'Something went wrong');
      } else {
        navigate(isLogin ? '/dashboard' : '/onboarding');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    localStorage.setItem('demoMode', 'true');
    navigate('/dashboard');
  };

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setError("");
    setEmail("");
    setPassword("");
    setFullName("");
    setUsername("");
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* ── LEFT PANEL (Desktop only) ── */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-teal-500">
        <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -top-20 -left-20 animate-pulse" />
        <div className="absolute w-80 h-80 bg-teal-300/20 rounded-full blur-3xl -bottom-16 -right-16 animate-pulse delay-1000" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-white text-center px-12 max-w-lg"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-2xl">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight">RAVEN</h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Smart monitoring & insights for POTS patients. Track, analyze, and
            take control of your health journey.
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-white/80">
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm">Monitoring</div>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold">AI</div>
              <div className="text-sm">Insights</div>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-sm">Secure</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex flex-1 items-center justify-center min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile-only header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 to-teal-500 mb-4">
              <Activity className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              RAVEN
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">POTS Monitoring & Insights</p>
          </div>

          {/* Auth card */}
          <motion.div
            layout
            className="w-full rounded-2xl p-6 sm:p-8 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-white/60 dark:border-slate-700/60"
          >
            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-6">
              {["Sign In", "Register"].map((tab, i) => {
                const active = (i === 0) === isLogin;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => switchTab(i === 0)}
                    className="relative flex-1 pb-3 font-semibold transition-colors touch-manipulation"
                  >
                    <span
                      className={
                        active
                          ? "bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent"
                          : "text-slate-400 dark:text-slate-500"
                      }
                    >
                      {tab}
                    </span>
                    {active && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-blue-500 to-teal-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="register-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4"
                  >
                    <Field
                      icon={<User size={16} />}
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <Field
                      icon={<User size={16} />}
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                icon={<Mail size={16} />}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                icon={<Lock size={16} />}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors touch-manipulation p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm px-1"
                >
                  {error}
                </motion.p>
              )}

              {isLogin && (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    className="text-sm text-blue-500 hover:text-blue-400 transition-colors touch-manipulation"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 sm:py-3 rounded-lg font-semibold text-white mt-2 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-blue-500 to-teal-500 touch-manipulation"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {isLogin && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab(false)}
                    className="text-blue-500 font-semibold hover:text-blue-400 transition-colors touch-manipulation"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            )}
          </motion.div>

          {/* Demo card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full rounded-2xl p-5 sm:p-6 mt-4 shadow-lg bg-white/90 dark:bg-slate-800/80 border border-white/50 dark:border-slate-700/50"
          >
            <p className="text-sm text-center mb-3 text-slate-600 dark:text-slate-400 font-medium">
              Want to explore first?
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              type="button"
              onClick={handleDemo}
              className="w-full py-3.5 sm:py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-teal-500 to-cyan-500 touch-manipulation"
            >
              <PlayCircle className="w-5 h-5" />
              Try Demo
            </motion.button>
          </motion.div>

        </motion.div>
      </div>
    </div>
    </div>
  );
}
