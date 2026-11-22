import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Button, Card } from '../components/ui';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  // Animation on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the redirect path from location state (if coming from protected route)
  const from = location.state?.from?.pathname || '/';

  // Simple validation
  const isEmailValid = formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isPasswordValid = formData.password.length >= 1;
  const showEmailError = touched.email && formData.email && !isEmailValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isEmailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    const result = await login(formData.email, formData.password);

    if (result.success) {
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.message);
    }
  };

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) clearError();
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50/30 flex items-center justify-center p-4 sm:p-6">
      <div className={`w-full max-w-md transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30 transition-transform hover:scale-105 duration-300">
            <Package className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-secondary">
            Welcome Back
          </h1>
          <p className="text-secondary-500 mt-2">
            Sign in to Major Surgical Inventory
          </p>
        </div>

        {/* Login Card */}
        <Card padding="lg" className="shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  onBlur={handleBlur('email')}
                  className={`input pl-11 ${showEmailError ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  aria-invalid={showEmailError}
                  aria-describedby={error ? 'login-error' : showEmailError ? 'email-error' : undefined}
                />
              </div>
              {showEmailError && (
                <p id="email-error" className="mt-1.5 text-sm text-danger flex items-center gap-1">
                  <AlertCircle size={14} />
                  Please enter a valid email address
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  onBlur={handleBlur('password')}
                  className="input pl-11 pr-12"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-md transition-all"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox"
                />
                <span className="text-sm text-secondary-600 group-hover:text-secondary-800 transition-colors">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div
                id="login-error"
                role="alert"
                className="p-3.5 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm flex items-start gap-2.5 animate-fade-in"
              >
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              loading={isLoading}
              disabled={!formData.email || !formData.password}
              className="w-full h-12 text-base"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="divider my-6">
            <span className="text-secondary-400">or</span>
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-secondary-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary font-semibold hover:text-primary-dark transition-colors"
            >
              Create account
            </Link>
          </p>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-secondary-400 mt-8">
          Major Surgical Co. &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
