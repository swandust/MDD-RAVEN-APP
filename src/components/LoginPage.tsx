import React, { useState, useEffect } from "react";
import { Mail, Lock, LogIn, PlayCircle, User, Eye, EyeOff, Loader2 } from "lucide-react";
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
  const [darkMode, setDarkMode] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) setDarkMode(saved === 'true');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

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
          navigate('/dashboard');
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
    navigate('/dashboard');
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className={`absolute inset-0 ${darkMode ? 'bg-black/60' : 'bg-white/80'} backdrop-blur-sm`}></div>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
            <LogIn className="text-white w-10 h-10" />
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome Back
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            {isLogin ? 'Sign in to continue to your account' : 'Create your account to get started'}
          </p>
        </div>

        <div className="flex gap-8 mb-6 border-b border-gray-300">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`pb-3 text-sm font-medium transition-all ${
              isLogin 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : `${darkMode ? 'text-gray-400' : 'text-gray-500'} border-b-2 border-transparent`
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`pb-3 text-sm font-medium transition-all ${
              !isLogin 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : `${darkMode ? 'text-gray-400' : 'text-gray-500'} border-b-2 border-transparent`
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="Full Name"
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="Username"
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              placeholder="Email address"
              className={`w-full pl-10 pr-4 py-3 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full pl-10 pr-10 py-3 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 bg-transparent ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider font-medium`}>
              Or
            </span>
          </div>
        </div>

        <button
          onClick={handleDemo}
          type="button"
          className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <PlayCircle className="w-5 h-5" />
          Try Demo
        </button>

        <p className={`text-center mt-6 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            type="button"
            className="ml-2 text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <div className="flex justify-center mt-6">
          <button
            onClick={toggleDarkMode}
            type="button"
            className={`px-4 py-2 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} rounded-full text-sm font-medium hover:opacity-90 transition-colors`}
          >
            {darkMode ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>
    </div>
  );
}