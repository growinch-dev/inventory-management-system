import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff, User, Mail, Lock, Check, X, AlertCircle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Button, Card } from '../components/ui';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  // Animation on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Validation
  const isEmailValid = formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const showEmailError = touched.email && formData.email && !isEmailValid;

  // Password strength validation
  const passwordChecks = {
    length: formData.password.length >= 6,
    hasNumber: /\d/.test(formData.password),
    hasLetter: /[a-zA-Z]/.test(formData.password),
    match: formData.password && formData.password === formData.confirmPassword,
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-danger', 'bg-warning', 'bg-info', 'bg-success'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!formData.companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }

    if (!isEmailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!passwordChecks.length) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!passwordChecks.match) {
      toast.error('Passwords do not match');
      return;
    }

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      companyName: formData.companyName,
    });

    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/');
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

  const PasswordCheck = ({ valid, label }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors duration-200 ${valid ? 'text-success' : 'text-secondary-400'}`}>
      <span className={`flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${valid ? 'bg-success/10' : 'bg-secondary-100'}`}>
        {valid ? <Check size={10} className="text-success" /> : <X size={10} />}
      </span>
      <span>{label}</span>
    </div>
  );

  const isFormValid = formData.name && formData.companyName && isEmailValid && passwordChecks.length && passwordChecks.match;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50/30 flex items-center justify-center p-4 sm:p-6">
      <div className={`w-full max-w-md transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30 transition-transform hover:scale-105 duration-300">
            <Package className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-secondary">
            Create Account
          </h1>
          <p className="text-secondary-500 mt-2">
            Get started with GrowInch Inventory
          </p>
        </div>

        {/* Register Card */}
        <Card padding="lg" className="shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10" />
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  onBlur={handleBlur('name')}
                  className="input pl-11"
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Company Name Field */}
            <div>
              <label htmlFor="companyName" className="label">
                Company Name
              </label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10" />
                <input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleInputChange('companyName')}
                  onBlur={handleBlur('companyName')}
                  className="input pl-11"
                  placeholder="Acme Corporation"
                  autoComplete="organization"
                  required
                />
              </div>
            </div>

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
                  aria-describedby={showEmailError ? 'email-error' : undefined}
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
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none z-10" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  className={`input pl-11 pr-12 ${touched.confirmPassword && formData.confirmPassword && !passwordChecks.match ? 'input-error' : ''}`}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-md transition-all"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="p-4 bg-secondary-50 rounded-xl space-y-3 animate-fade-in">
                {/* Strength Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary-600 font-medium">Password Strength</span>
                    <span className={`font-semibold ${passwordStrength >= 3 ? 'text-success' : passwordStrength >= 2 ? 'text-info' : 'text-warning'}`}>
                      {strengthLabels[passwordStrength - 1] || 'Too weak'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-secondary-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <PasswordCheck valid={passwordChecks.length} label="6+ characters" />
                  <PasswordCheck valid={passwordChecks.hasLetter} label="Has letters" />
                  <PasswordCheck valid={passwordChecks.hasNumber} label="Has numbers" />
                  <PasswordCheck valid={passwordChecks.match} label="Passwords match" />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
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
              disabled={!isFormValid}
              className="w-full h-12 text-base"
            >
              Create Account
            </Button>
          </form>

          {/* Terms Notice */}
          <p className="text-xs text-secondary-500 text-center mt-5 leading-relaxed">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary font-medium hover:text-primary-dark transition-colors">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary font-medium hover:text-primary-dark transition-colors">Privacy Policy</Link>
          </p>

          {/* Divider */}
          <div className="divider my-6">
            <span className="text-secondary-400">or</span>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-secondary-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary font-semibold hover:text-primary-dark transition-colors"
            >
              Sign in
            </Link>
          </p>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-secondary-400 mt-8">
          GrowInch &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Register;
