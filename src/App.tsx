import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, type ReactNode } from 'react';
import { Home, UtensilsCrossed, Droplet, TrendingUp, Settings } from 'lucide-react';
import { HomeDashboard } from './components/HomeDashboard';
import { NutritionSection } from './components/NutritionSection';
import { HydrationTracker } from './components/HydrationTracker';
import { TrendsView } from './components/TrendsView';
import { SettingsView } from './components/SettingsView';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

// Main app component with tab navigation (only shown when authenticated)
function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  // Load dark mode preference from localStorage on initial load
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    }
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard darkMode={darkMode} />;
      case 'nutrition':
        return <NutritionSection darkMode={darkMode} />;
      case 'fluids':
        return <HydrationTracker darkMode={darkMode} />;
      case 'trends':
        return <TrendsView darkMode={darkMode} />;
      case 'settings':
        return (
          <SettingsView 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
          />
        );
      default:
        return <HomeDashboard darkMode={darkMode} />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-white'} transition-colors duration-300`}>
      {/* Mobile App Container */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pb-20">
          {renderActiveTab()}
        </div>

        {/* Bottom Navigation Bar */}
        <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } border-t shadow-lg transition-colors duration-300`}>
          <div className="flex justify-around items-center h-16 px-4">
            <NavButton
              icon={<Home className="w-5 h-5" />}
              label="Home"
              active={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
              darkMode={darkMode}
            />
            <NavButton
              icon={<UtensilsCrossed className="w-5 h-5" />}
              label="Nutrition"
              active={activeTab === 'nutrition'}
              onClick={() => setActiveTab('nutrition')}
              darkMode={darkMode}
            />
            <NavButton
              icon={<Droplet className="w-5 h-5" />}
              label="Fluids"
              active={activeTab === 'fluids'}
              onClick={() => setActiveTab('fluids')}
              darkMode={darkMode}
            />
            <NavButton
              icon={<TrendingUp className="w-5 h-5" />}
              label="Trends"
              active={activeTab === 'trends'}
              onClick={() => setActiveTab('trends')}
              darkMode={darkMode}
            />
            <NavButton
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              darkMode={darkMode}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick, darkMode }: { 
  icon: ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  darkMode: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
        active
          ? darkMode
            ? 'text-blue-400'
            : 'text-blue-600'
          : darkMode
          ? 'text-slate-400'
          : 'text-slate-500'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

// Root App component with routing
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Login route - accessible without authentication */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Main dashboard route with tab navigation */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } />
          
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Catch-all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
