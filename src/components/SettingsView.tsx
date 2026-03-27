import { useState, useEffect } from 'react';
import { Moon, Sun, Bell, User, Shield, HelpCircle, ChevronRight, LogOut, Loader2, Save, Wifi } from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { useAuth, supabase } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

interface SettingsViewProps {
  darkMode?: boolean;
  setDarkMode?: (value: boolean) => void;
  esp32Url?: string;
  setEsp32Url?: (url: string) => void;
}

interface Profile {
  username: string;
  full_name: string;
  avatar_url: string;
}

interface UserSettings {
  sodium_goal: number;
  fluid_goal: number;
  vital_alerts: boolean;
  hydration_reminders: boolean;
  meal_tracking_reminders: boolean;
}

export function SettingsView({
  darkMode: darkModeProp,
  setDarkMode: setDarkModeProp,
  esp32Url: esp32UrlProp,
  setEsp32Url: setEsp32UrlProp
}: SettingsViewProps = {}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [localDarkMode, setLocalDarkMode] = useState(false);
  const [localEsp32Url, setLocalEsp32Url] = useState('');

  const darkMode = darkModeProp ?? localDarkMode;
  const setDarkMode = setDarkModeProp ?? setLocalDarkMode;

  const esp32Url = esp32UrlProp ?? localEsp32Url;
  const setEsp32Url = setEsp32UrlProp ?? setLocalEsp32Url;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    username: '',
    full_name: '',
    avatar_url: ''
  });
  const [settings, setSettings] = useState<UserSettings>({
    sodium_goal: 2300,
    fluid_goal: 2000,
    vital_alerts: true,
    hydration_reminders: true,
    meal_tracking_reminders: false
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Load URL from localStorage on mount if no prop provided
  useEffect(() => {
    if (esp32UrlProp === undefined) {
      const savedUrl = localStorage.getItem('esp32Url');
      if (savedUrl) setLocalEsp32Url(savedUrl);
    }
  }, [esp32UrlProp]);

  // Save URL to localStorage whenever it changes
  useEffect(() => {
    if (esp32Url) localStorage.setItem('esp32Url', esp32Url);
    else localStorage.removeItem('esp32Url');
  }, [esp32Url]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (profileData) {
        setProfile({
          username: profileData.username || '',
          full_name: profileData.full_name || '',
          avatar_url: profileData.avatar_url || ''
        });
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('sodium_goal, fluid_goal, vital_alerts, hydration_reminders, meal_tracking_reminders')
        .eq('id', user?.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (settingsData) {
        setSettings({
          sodium_goal: settingsData.sodium_goal,
          fluid_goal: settingsData.fluid_goal,
          vital_alerts: settingsData.vital_alerts,
          hydration_reminders: settingsData.hydration_reminders,
          meal_tracking_reminders: settingsData.meal_tracking_reminders
        });
      }
    } catch (error: any) {
      console.warn('Settings fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            username: profile.username,
            full_name: profile.full_name,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (error) throw error;
      toast.success('Profile updated!');
      setIsEditingProfile(false);
    } catch (error: any) {
      toast.error('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { id: user.id, ...newSettings, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );

      if (error) throw error;
    } catch (error: any) {
      toast.error('Error updating settings: ' + error.message);
      fetchData(); // revert on failure
    }
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('demoMode');
    localStorage.removeItem('demoUser');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`p-5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Header with logout */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl mb-1 font-bold">Settings</h1>
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

      {/* Profile Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        {!isEditingProfile ? (
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 ${darkMode ? 'bg-blue-800' : 'bg-blue-100'} rounded-full flex items-center justify-center overflow-hidden`}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className={`w-8 h-8 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">{profile.full_name || profile.username || 'User'}</div>
              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{user?.email}</div>
            </div>
            <button onClick={() => setIsEditingProfile(true)}>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Edit Profile</h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}
              >
                Cancel
              </button>
            </div>
            <div className="space-y-2">
              <label className={`text-xs uppercase font-bold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-xs uppercase font-bold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Username</label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({...profile, username: e.target.value})}
                className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <button
              onClick={handleUpdateProfile}
              disabled={saving}
              className="w-full bg-blue-600 text-white p-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        )}
      </Card>

      {/* Goals Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <h3 className="text-lg mb-4 font-semibold">Daily Goals</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Sodium Goal (mg)</div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target daily intake</div>
            </div>
            <input
              type="number"
              value={settings.sodium_goal}
              onChange={(e) => handleUpdateSettings({ sodium_goal: parseInt(e.target.value) || 0 })}
              className={`w-20 p-1 text-right rounded border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Fluid Goal (ml)</div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target daily intake</div>
            </div>
            <input
              type="number"
              value={settings.fluid_goal}
              onChange={(e) => handleUpdateSettings({ fluid_goal: parseInt(e.target.value) || 0 })}
              className={`w-20 p-1 text-right rounded border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
        </div>
      </Card>

      {/* Appearance Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <h3 className="text-lg mb-4 font-semibold">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="w-5 h-5 text-slate-400" />
            ) : (
              <Sun className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <div className="text-sm">Dark Mode</div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Switch to {darkMode ? 'light' : 'dark'} theme</div>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>
      </Card>

      {/* ESP32 URL Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center gap-3 mb-3">
          <Wifi className="w-5 h-5 text-slate-400" />
          <div>
            <div className="text-sm">ESP32 URL</div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Local IP or ngrok tunnel URL for your load cell device
            </div>
          </div>
        </div>
        <input
          type="text"
          value={esp32Url}
          onChange={(e) => setEsp32Url(e.target.value)}
          placeholder="e.g., http://192.168.1.100 or https://xyz.ngrok-free.app"
          className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </Card>

      {/* Pair Device Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Pair Device</div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Link all new data to your account
            </div>
          </div>
          <Button
            onClick={async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not logged in');
                await supabase.rpc('set_active_user', { user_id: user.id });
                toast.success('Device paired! All new data will be linked to you.');
              } catch (err: any) {
                toast.error('Failed to pair device: ' + err.message);
              }
            }}
            className="rounded-xl"
          >
            Pair
          </Button>
        </div>
      </Card>

      {/* Notifications Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm mb-4`}>
        <h3 className="text-lg mb-4 font-semibold">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm">Vital Alerts</div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Get notified of abnormal readings</div>
              </div>
            </div>
            <Switch
              checked={settings.vital_alerts}
              onCheckedChange={(val) => handleUpdateSettings({ vital_alerts: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm">Hydration Reminders</div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Drink water reminders</div>
              </div>
            </div>
            <Switch
              checked={settings.hydration_reminders}
              onCheckedChange={(val) => handleUpdateSettings({ hydration_reminders: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm">Meal Tracking</div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Remind to log meals</div>
              </div>
            </div>
            <Switch
              checked={settings.meal_tracking_reminders}
              onCheckedChange={(val) => handleUpdateSettings({ meal_tracking_reminders: val })}
            />
          </div>
        </div>
      </Card>

      {/* Other Settings (disabled) */}
      <div className="space-y-3">
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm cursor-not-allowed opacity-70`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-400" />
              <div className="text-sm">Privacy & Security</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </Card>

        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-4 shadow-sm cursor-not-allowed opacity-70`}>
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
      <div className={`text-center mt-8 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        POTS Health Monitor v1.0.0
      </div>
    </div>
  );
}