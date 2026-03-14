import React, { useState } from "react";
import { Mail, Lock, PlayCircle, User, Eye, EyeOff, Loader2, Activity } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, username, fullName);

      if (result.error) {
        setError(result.error.message || 'Something went wrong');
      } else {
        if (!isLogin) {
          setError('');
          alert('Check your email to confirm your account!');
        } else {
          const biodataComplete = localStorage.getItem('biodataComplete');
          navigate(biodataComplete ? '/dashboard' : '/onboarding');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    localStorage.setItem('demoMode', 'true');
    localStorage.setItem('demoUser', JSON.stringify({
      email: 'demo@example.com',
      name: 'Demo User'
    }));
    const biodataComplete = localStorage.getItem('biodataComplete');
    navigate(biodataComplete ? '/dashboard' : '/onboarding');
  };

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-sm";

  return (
    <div className="min-h-screen bg-white flex flex-col p-5 pt-16 max-w-sm mx-auto">
      <div className="w-full">

        {/* App brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Activity className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">RAVEN</h1>
          <p className="text-sm text-slate-500 mt-1">POTS Monitoring & Insights</p>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 shadow-sm mb-4">

          {/* Tabs */}
          <div className="flex gap-6 mb-5 border-b border-blue-200">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`pb-3 text-sm font-medium transition-all ${
                isLogin
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-slate-400 border-b-2 border-transparent'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`pb-3 text-sm font-medium transition-all ${
                !isLogin
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-slate-400 border-b-2 border-transparent'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputCls}
                    placeholder="Full Name"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls}
                    placeholder="Username"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="email"
                placeholder="Email address"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`${inputCls} pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white font-semibold rounded-2xl hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isLogin ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>
        </div>

        {/* Demo card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 shadow-sm mb-5">
          <p className="text-xs text-slate-500 mb-3 text-center">Want to explore first?</p>
          <button
            onClick={handleDemo}
            type="button"
            className="w-full py-2.5 bg-white border border-purple-300 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <PlayCircle className="w-4 h-4" />
            Try Demo
          </button>
        </div>

        <p className="text-center text-sm text-slate-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            type="button"
            className="ml-1.5 text-blue-500 font-semibold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

      </div>
    </div>
  );
}