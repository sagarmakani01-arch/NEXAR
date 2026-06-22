import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore';
import { authAPI } from '../../services/api';

export default function LoginForm() {
  const { login, register, loginWithToken } = useAuthStore();
  const { addNotification } = useUIStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        setLoading(true);
        try {
          await loginWithToken(token);
          addNotification({ type: 'success', title: 'Signed in with OAuth' });
        } catch {
          setErrors({ form: 'OAuth login failed. Try again.' });
        } finally {
          setLoading(false);
        }
      })();
    } else if (error) {
      window.history.replaceState({}, '', window.location.pathname);
      setErrors({ form: `OAuth error: ${error.replace(/_/g, ' ')}` });
    }
  }, []);

  const handleOAuth = (provider) => {
    setOauthLoading(provider);
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!isLogin && !form.name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const { data } = await authAPI.login(form.email, form.password);
        if (data.require2fa) {
          setTwoFactorStep(true);
          setTwoFactorUserId(data.userId);
          setTwoFactorCode('');
        } else {
          await login(form.email, form.password);
          addNotification({ type: 'success', title: 'Welcome back!' });
        }
      } else {
        await register(form.email, form.password, form.name);
        addNotification({ type: 'success', title: 'Account created!' });
      }
    } catch (error) {
      const message = error.response?.data?.error || (isLogin ? 'Login failed' : 'Registration failed');
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;
    setLoading(true);
    try {
      const { data } = await authAPI.twoFAChallenge(twoFactorUserId, twoFactorCode.trim());
      await loginWithToken(data.token);
      addNotification({ type: 'success', title: 'Welcome back!' });
    } catch (error) {
      setErrors({ form: error.response?.data?.error || 'Invalid verification code' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isLogin ? 'Sign in to continue building' : 'Start building with AI today'}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-xl border border-gray-200 dark:border-dark-border p-8">
          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading}
              className="flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-tertiary transition-colors text-sm font-medium"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              )}
              Sign in with GitHub
            </button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-white dark:bg-dark-secondary text-xs text-gray-500 dark:text-gray-400">or continue with email</span></div>
            </div>
          </div>

          {twoFactorStep ? (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
              <div className="text-center mb-4">
                <Shield className="w-12 h-12 mx-auto mb-3 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-bold">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enter the code from your authenticator app
                </p>
              </div>

              <div>
                <label className="label">Verification Code</label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => { setTwoFactorCode(e.target.value); setErrors({}); }}
                  placeholder="000000"
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {errors.form && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || twoFactorCode.length < 6}
                className="btn-primary w-full py-3 text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
              </button>

              <button
                type="button"
                onClick={() => { setTwoFactorStep(false); setTwoFactorUserId(null); setTwoFactorCode(''); setErrors({}); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="label">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="input pl-10"
                      autoComplete="name"
                    />
                  </div>
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="input pl-10"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              {errors.form && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => { setIsLogin(!isLogin); setErrors({}); setForm({ email: '', password: '', name: '' }); }}
              className="ml-2 text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3">Demo credentials</p>
            <div className="bg-gray-50 dark:bg-dark-tertiary rounded-lg p-3 text-sm font-mono text-gray-700 dark:text-gray-300 space-y-1">
              <div>Email: <span className="font-medium">demo@nexar.app</span></div>
              <div>Password: <span className="font-medium">demo123</span></div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
