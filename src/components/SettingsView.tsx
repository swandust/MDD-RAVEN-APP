import { useState } from 'react';
import { Moon, Sun, Bell, User, Shield, HelpCircle, ChevronRight, LogOut } from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { useAuth } from '../contexts/AuthContext';

interface SettingsViewProps {
  darkMode?: boolean;
  setDarkMode?: (value: boolean) => void;
}

export function SettingsView({ darkMode: darkModeProp, setDarkMode: setDarkModeProp }: SettingsViewProps = {}) {
  const { user, signOut } = useAuth();
  const [localDarkMode, setLocalDarkMode] = useState(false);
  const darkMode = darkModeProp ?? localDarkMode;
  const setDarkMode = setDarkModeProp ?? setLocalDarkMode;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`p-5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header with logout */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl mb-1">Settings</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Customize your app experience
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            darkMode
              ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300'
              : 'bg-red-50 hover:bg-red-100 text-red-600'
          } transition`}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Profile Card - now shows real user */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 ${darkMode ? 'bg-blue-800' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
            <User className={`w-8 h-8 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <div className="text-lg">{user?.email?.split('@')[0] || 'User'}</div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
      </Card>

      {/* Appearance */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <h3 className="text-lg mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="w-5 h-5 text-slate-400" />
            ) : (
              <Sun className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <div className="text-sm">Dark Mode</div>
              <div className="text-xs text-slate-500">Switch to {darkMode ? 'light' : 'dark'} theme</div>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>
      </Card>

      {/* Notifications */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <h3 className="text-lg mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm">Vital Alerts</div>
                <div className="text-xs text-slate-500">Get notified of abnormal readings</div>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm">Hydration Reminders</div>
                <div className="text-xs text-slate-500">Drink water reminders</div>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm">Meal Tracking</div>
                <div className="text-xs text-slate-500">Remind to log meals</div>
              </div>
            </div>
            <Switch />
          </div>
        </div>
      </Card>

      {/* Other Settings */}
      <div className="space-y-3">
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-400" />
              <div className="text-sm">Privacy & Security</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <div className="text-sm">Help & Support</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </Card>
      </div>

      {/* App Version */}
      <div className="text-center mt-8 text-xs text-slate-500">
        POTS Health Monitor v1.0.0
      </div>
    </div>
  );
}
