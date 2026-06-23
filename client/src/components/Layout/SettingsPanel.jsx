import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Palette, Type, Terminal, Save, Shield, 
  Bell, Moon, Sun, Monitor, Code2, Globe, Key,
  CheckCircle
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore.js';
import { authAPI } from '../../services/api';

const THEMES = [
  { id: 'vs-dark', name: 'Dark+ (Default)', icon: Moon },
  { id: 'vs', name: 'Light+ (Default)', icon: Sun },
  { id: 'hc-black', name: 'High Contrast Dark', icon: Monitor }
];

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

export default function SettingsPanel() {
  const navigate = useNavigate();
  const { 
    user, 
    updateProfile, 
    logout 
  } = useAuthStore();
  
  const {
    editorTheme,
    setEditorTheme,
    uiTheme,
    setUiTheme,
    fontSize,
    setFontSize,
    wordWrap,
    setWordWrap,
    minimap,
    setMinimap,
    lineNumbers,
    setLineNumbers,
    previewMode,
    setPreviewMode,
    autoRefresh,
    setAutoRefresh,
    addNotification
  } = useUIStore();

  const [activeSection, setActiveSection] = useState('editor');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [twoFA, setTwoFA] = useState({ enabled: false, loading: false, qrCode: null, secret: null, code: '', recoveryCodes: null, step: 'idle' });

  useEffect(() => {
    authAPI.twoFAStatus().then(({ data }) => {
      setTwoFA(s => ({ ...s, enabled: data.totp_enabled }));
    }).catch(() => {});
  }, []);

  const sections = [
    { id: 'editor', label: 'Editor', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Monitor },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: profileForm.name });
      addNotification({ type: 'success', title: 'Saved', message: 'Profile updated' });
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      addNotification({ type: 'error', title: 'Error', message: 'Passwords do not match' });
      return;
    }
    if (passwordForm.new.length < 6) {
      addNotification({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ password: passwordForm.current, newPassword: passwordForm.new });
      setPasswordForm({ current: '', new: '', confirm: '' });
      addNotification({ type: 'success', title: 'Saved', message: 'Password changed' });
    } catch (error) {
      addNotification({ type: 'error', title: 'Failed', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    addNotification({ type: 'success', title: 'Logged out' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-secondary">
      {/* Section Tabs */}
      <div className="flex border-b border-gray-200 dark:border-dark-border px-2">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                activeSection === section.id
                  ? 'bg-white dark:bg-dark-bg text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-tertiary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Editor Settings */}
        {activeSection === 'editor' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Editor Theme</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Only changes the code editor background. For the whole UI, use <button className="text-primary-500 hover:underline" onClick={() => setActiveSection('appearance')}>Appearance → UI Theme</button>.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {THEMES.map(theme => {
                  const Icon = theme.icon;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setEditorTheme(theme.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        editorTheme === theme.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        {editorTheme === theme.id && <CheckCircle className="w-5 h-5 text-primary-500" />}
                      </div>
                      <span className="text-sm font-medium">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Font Size</label>
                <div className="flex flex-wrap gap-2">
                  {FONT_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                        fontSize === size
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Font Family</label>
                <select
                  value="JetBrains Mono"
                  className="input"
                  disabled
                >
                  <option>JetBrains Mono</option>
                  <option>Fira Code</option>
                  <option>Cascadia Code</option>
                  <option>Source Code Pro</option>
                  <option>Monospace</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Behavior</h4>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">Word Wrap</span>
                <select
                  value={wordWrap}
                  onChange={(e) => setWordWrap(e.target.value)}
                  className="input w-32 text-sm ml-4"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                  <option value="wordWrapColumn">Word Wrap Column</option>
                  <option value="bounded">Bounded</option>
                </select>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">Minimap</span>
                <input
                  type="checkbox"
                  checked={minimap}
                  onChange={(e) => setMinimap(e.target.checked)}
                  className="w-5 h-5 accent-primary-600"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">Line Numbers</span>
                <select
                  value={lineNumbers}
                  onChange={(e) => setLineNumbers(e.target.value)}
                  className="input w-32 text-sm ml-4"
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                  <option value="relative">Relative</option>
                  <option value="interval">Interval</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Preview Settings */}
        {activeSection === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Preview Options</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh on save</span>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-5 h-5 accent-primary-600"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Default Preview Mode</span>
                  <select
                    value={previewMode}
                    onChange={(e) => setPreviewMode(e.target.value)}
                    className="input w-40 text-sm ml-4"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile</option>
                    <option value="mobileL">Mobile Large</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">About Preview</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Preview uses isolated iframe sandbox</li>
                <li>• Console logs are captured and shown in panel</li>
                <li>• Auto-refresh polls for changes every 2s</li>
                <li>• Deploy creates production-ready build</li>
              </ul>
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">UI Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'system', name: 'System', icon: Monitor },
                  { id: 'light', name: 'Light', icon: Sun },
                  { id: 'dark', name: 'Dark', icon: Moon }
                ].map(theme => {
                  const Icon = theme.icon;
                  const isActive = uiTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setUiTheme(theme.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium block text-center">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Panel Layout</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Drag panel handles to resize</p>
                <p>• Double-click handle to collapse/expand</p>
                <p>• Layout persists across sessions</p>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings */}
        {activeSection === 'account' && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Display Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    className="input"
                    disabled
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4 border border-gray-200 dark:border-dark-border">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Danger Zone</h3>
              <button
                onClick={handleLogout}
                className="btn-danger"
              >
                <Key className="w-4 h-4 mr-2" />
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    className="input"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="input"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !passwordForm.current || !passwordForm.new}
                  className="btn-primary"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Two-Factor Authentication</h3>
              <div className="space-y-4">
                {/* TOTP Method */}
                <div className="p-3 bg-white dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">Authenticator App (TOTP)</p>
                      <p className="text-xs text-gray-500">Google Authenticator, Authy, etc.</p>
                    </div>
                    <span className={`badge ${twoFA.enabled ? 'badge-success' : 'badge-default'}`}>{twoFA.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex gap-2">
                    {twoFA.step === 'idle' && !twoFA.enabled && (
                      <button
                        onClick={async () => {
                          setTwoFA(s => ({ ...s, loading: true }));
                          try {
                            const { data } = await authAPI.twoFASetup();
                            setTwoFA(s => ({ ...s, loading: false, qrCode: data.qrCode, secret: data.secret, step: 'setup' }));
                          } catch (err) {
                            setTwoFA(s => ({ ...s, loading: false }));
                            addNotification({ type: 'error', title: 'Failed', message: err.response?.data?.error || 'Could not setup 2FA' });
                          }
                        }}
                        disabled={twoFA.loading}
                        className="btn-primary text-sm py-1.5 px-3"
                      >
                        Setup
                      </button>
                    )}
                    {twoFA.enabled && (
                      <button
                        onClick={async () => {
                          setTwoFA(s => ({ ...s, loading: true }));
                          try {
                            await authAPI.twoFADisable('');
                            setTwoFA(s => ({ ...s, enabled: false, loading: false }));
                            addNotification({ type: 'success', title: 'TOTP 2FA Disabled' });
                          } catch (err) {
                            setTwoFA(s => ({ ...s, loading: false }));
                            addNotification({ type: 'error', title: 'Failed', message: err.response?.data?.error || 'Could not disable' });
                          }
                        }}
                        disabled={twoFA.loading}
                        className="btn-danger text-sm py-1.5 px-3"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                  {twoFA.step === 'setup' && (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Scan this QR code with your authenticator app:
                      </p>
                      {twoFA.qrCode && <img src={twoFA.qrCode} alt="2FA QR Code" className="mx-auto w-48 h-48" />}
                      {twoFA.secret && (
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Or enter manually:</p>
                          <code className="text-sm font-mono bg-white dark:bg-dark-bg px-3 py-2 rounded border border-gray-200 dark:border-dark-border select-all">{twoFA.secret}</code>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={twoFA.code}
                          onChange={(e) => setTwoFA(s => ({ ...s, code: e.target.value }))}
                          placeholder="000000"
                          className="input text-center text-lg tracking-widest font-mono flex-1"
                          maxLength={6}
                        />
                        <button
                          onClick={async () => {
                            if (twoFA.code.length < 6) return;
                            setTwoFA(s => ({ ...s, loading: true }));
                            try {
                              const { data } = await authAPI.twoFAVerify(twoFA.code);
                              setTwoFA(s => ({ ...s, enabled: true, loading: false, recoveryCodes: data.recoveryCodes, step: 'done' }));
                              addNotification({ type: 'success', title: 'TOTP 2FA Enabled' });
                            } catch (err) {
                              setTwoFA(s => ({ ...s, loading: false }));
                              addNotification({ type: 'error', title: 'Invalid Code', message: err.response?.data?.error || 'Verification failed' });
                            }
                          }}
                          disabled={twoFA.loading || twoFA.code.length < 6}
                          className="btn-primary"
                        >
                          {twoFA.loading ? '...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  )}
                  {twoFA.step === 'done' && twoFA.recoveryCodes && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Save these recovery codes!</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">Each code can be used once if you lose access.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {twoFA.recoveryCodes.map((code, i) => (
                          <code key={i} className="text-xs font-mono bg-white dark:bg-dark-bg px-2 py-1 rounded border border-yellow-300 dark:border-yellow-700">{code}</code>
                        ))}
                      </div>
                      <button onClick={() => setTwoFA({ enabled: true, loading: false, qrCode: null, secret: null, code: '', recoveryCodes: null, step: 'idle' })} className="btn-primary mt-3 text-sm py-1.5 px-3">Done</button>
                    </div>
                  )}
                </div>


              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-tertiary/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">AI Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Using local Ollama AI (no API keys required)
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                  <div>
                    <p className="font-medium text-sm">Ollama (Local)</p>
                    <p className="text-xs text-gray-500">Running at {import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'}</p>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
