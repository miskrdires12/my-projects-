import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Smartphone, Shield, LogOut, CheckCircle2,
  Sliders, Camera, School, MapPin, Save, Volume2,
  RefreshCw, RotateCcw, Sparkles, Check, HardDrive,
  Eye, Zap, Laptop, Layers, FileText
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId, DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP } from '@/lib/store';
import { getAppSettings, updateAppSettings, resetAppSettings, AppSettings } from '@/lib/settingsStore';

export const SenderSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [activeTab, setActiveTab] = useState<'profile' | 'camera' | 'intake' | 'security' | 'diagnostics'>('profile');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setSettings(getAppSettings());
    window.addEventListener('studentbridge_settings_change', handleUpdate);
    return () => window.removeEventListener('studentbridge_settings_change', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFieldChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = updateAppSettings({ [key]: value });
    setSettings(updated);
    showToast(`Updated ${String(key)}.`);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateAppSettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      showToast('All field station settings saved and applied.');
    }, 300);
  };

  const handleReset = () => {
    if (confirm('Reset all field station settings to enterprise defaults?')) {
      const reset = resetAppSettings();
      setSettings(reset);
      showToast('Settings reset to defaults.');
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const availableSchools = BRANCH_SCHOOL_MAP[settings.defaultBranch] || BRANCH_SCHOOL_MAP['Addis Ababa'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-14 font-mono select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0] dark:border-[#223126]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="text-[#366804] dark:text-[#8fe617] font-bold">FIELD STATION</span>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">PREFERENCES &amp; CAMERA PRESETS</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1118] dark:text-white flex items-center gap-2">
            Field Sender Station Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure camera popups, biometric guides, auto-intake defaults, and 1-device terminal security
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#256002] dark:text-[#8fe617] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#85E510]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Horizontal Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Operator Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera &amp; Biometrics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('intake')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Intake &amp; Form Automation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>1-Device Lock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'diagnostics'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Diagnostics &amp; Reset</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OPERATOR PROFILE & CREDENTIALS                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center font-black">
                {user?.username?.substring(0, 2).toUpperCase() || 'OP'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Operator Credentials</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Authenticated field terminal account</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Username</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{user?.username || 'miskrdires12'}</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Email Address</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email || 'miskrdires12@gmail.com'}</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Role Assignment</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] border border-[#85E510]/30">
                  {user?.role || 'SENDER'} (FIELD OPERATOR)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campus &amp; Regional Branch</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Assigned administrative region</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Assigned Branch</label>
                <select
                  value={settings.defaultBranch}
                  onChange={(e) => handleFieldChange('defaultBranch', e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#85E510]"
                >
                  {DEFAULT_BRANCHES.map(b => (
                    <option key={b} value={b}>{b} Branch</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold text-[10px] block mb-1">Default School</label>
                <select
                  value={settings.defaultSchool}
                  onChange={(e) => handleFieldChange('defaultSchool', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#85E510]"
                >
                  {availableSchools.map(sch => (
                    <option key={sch} value={sch}>{sch}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: CAMERA & BIOMETRICS STUDIO                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'camera' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Camera Modal &amp; Biometric Studio Presets</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Controls capture popup, overlay guidelines, and ISO 19794 portrait standards</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Guide overlay */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Biometric Guide Silhouette</span>
              <p className="text-[11px] text-slate-500">Visual positioning overlay rendered inside the camera capture modal</p>
              <select
                value={settings.cameraGuideMode}
                onChange={(e) => handleFieldChange('cameraGuideMode', e.target.value as any)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value="oval">Oval Face Frame + Eye &amp; Nose Crosshairs (Recommended)</option>
                <option value="grid">3x3 Rule-of-Thirds Grid</option>
                <option value="crosshair">Minimal Center Crosshair Only</option>
                <option value="minimal">Clean Viewfinder (No Guides)</option>
              </select>
            </div>

            {/* Default Camera Facing */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Default Camera Facing</span>
              <p className="text-[11px] text-slate-500">Initial lens selected when opening the capture modal</p>
              <select
                value={settings.defaultCameraFacing}
                onChange={(e) => handleFieldChange('defaultCameraFacing', e.target.value as any)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value="user">Front-Facing Camera (Selfie / Operator View)</option>
                <option value="environment">Rear-Facing Camera (External / Student View)</option>
              </select>
            </div>

            {/* Capture Resolution */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Capture Resolution</span>
              <p className="text-[11px] text-slate-500">Sensor resolution requested from hardware camera</p>
              <select
                value={settings.photoResolution}
                onChange={(e) => handleFieldChange('photoResolution', e.target.value as any)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value="1280x720">1280 x 720 (HD - ISO 19794 Standard)</option>
                <option value="1920x1080">1920 x 1080 (Full HD - High Density)</option>
                <option value="640x480">640 x 480 (VGA - Bandwidth Saver)</option>
              </select>
            </div>

            {/* Biometric Shutter Chime */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Biometric Shutter Sound</span>
                <span className="text-[11px] text-slate-500">Audible chime on portrait snap</span>
              </div>
              <input
                type="checkbox"
                checked={settings.biometricChimeEnabled}
                onChange={(e) => handleFieldChange('biometricChimeEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#85E510] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: INTAKE & FORM AUTOMATION                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'intake' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Form Automation &amp; Speed Intake Defaults</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Accelerate continuous student intake and eliminate repetitive data entry</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Default Intake Grade</span>
              <select
                value={settings.defaultGrade}
                onChange={(e) => handleFieldChange('defaultGrade', e.target.value)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Default Section</span>
              <input
                type="text"
                value={settings.defaultSection}
                onChange={(e) => handleFieldChange('defaultSection', e.target.value.toUpperCase())}
                placeholder="A, B, C, D..."
                maxLength={4}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Auto-Reset Form After Submit</span>
                <span className="text-[11px] text-slate-500">Clears inputs ready for the next student in line</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoResetFormAfterSubmit}
                onChange={(e) => handleFieldChange('autoResetFormAfterSubmit', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#85E510] focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Auto-Format Phone Numbers</span>
                <span className="text-[11px] text-slate-500">Formats input to standard +251 9XX XXX XXX</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoFormatPhone}
                onChange={(e) => handleFieldChange('autoFormatPhone', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#85E510] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: 1-DEVICE SECURITY BINDING                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">1-Email = 1-Device Terminal Lock</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Cryptographic hardware fingerprint locking this station</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Bound Terminal ID (SHA-256)</span>
              <span className="font-mono font-bold text-[#256002] dark:text-[#8fe617] break-all block">
                {deviceId}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Station Cryptographically Bound to {user?.email || 'Current Account'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: DIAGNOSTICS & RESET                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'diagnostics' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Maintenance &amp; Diagnostics</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Troubleshoot local browser storage and restore defaults</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Reset to Factory Presets</span>
                <span className="text-[11px] text-slate-500">Restore default camera resolution, guide modes, and intake presets</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold transition-all cursor-pointer"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SenderSettingsPage;
