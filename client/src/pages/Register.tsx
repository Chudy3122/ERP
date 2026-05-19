import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, Phone, Building, CheckCircle2, Zap, Globe, HeadphonesIcon } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const { t } = useTranslation('auth');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    department: '',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError(t('fillAllRequiredFields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsNotMatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in AuthContext with toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const benefits = [
    { icon: Zap, title: 'Szybki start', desc: 'Konto gotowe w kilka sekund, bez zbędnych formalności' },
    { icon: Globe, title: 'Dostęp z każdego miejsca', desc: 'Pracuj z dowolnego urządzenia z dostępem do internetu' },
    { icon: CheckCircle2, title: 'Pełna kontrola', desc: 'Zarządzaj czasem, projektami i zadaniami w jednym panelu' },
    { icon: HeadphonesIcon, title: 'Wsparcie techniczne', desc: 'Nasz zespół pomoże Ci na każdym etapie wdrożenia' },
  ];

  const inputClass = "w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] transition-all duration-200";
  const passwordInputClass = "w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] transition-all duration-200";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400";

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"></div>
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-register" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-register)" />
        </svg>
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#F7941D]/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#00AEEF]/10 rounded-full filter blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20">
          {/* Logo */}
          <div className="mb-12">
            <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-12 w-auto" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Dołącz do grona<br />
            <span className="text-[#F7941D]">naszych użytkowników</span>
          </h1>
          <p className="text-slate-400 text-base mb-12 max-w-md leading-relaxed">
            Załóż konto i zyskaj dostęp do narzędzi, które usprawnią codzienną pracę Twojego zespołu.
          </p>

          {/* Benefits */}
          <div className="space-y-5">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <benefit.icon className="w-4 h-4 text-[#F7941D]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{benefit.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center mb-8 lg:hidden">
            <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-9 w-auto" />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('createAccount')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('joinTeam')}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="first_name" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {t('firstName')}
                </label>
                <div className="relative">
                  <User className={iconClass} />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t('firstNamePlaceholder')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {t('lastName')}
                </label>
                <div className="relative">
                  <User className={iconClass} />
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t('lastNamePlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className={iconClass} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder={t('emailPlaceholder')}
                />
              </div>
            </div>

            {/* Department & Phone row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="department" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {t('department')}
                </label>
                <div className="relative">
                  <Building className={iconClass} />
                  <input
                    id="department"
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t('departmentPlaceholder')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {t('phone')}
                </label>
                <div className="relative">
                  <Phone className={iconClass} />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t('phonePlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className={iconClass} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={passwordInputClass}
                  placeholder={t('minChars')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className={iconClass} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={passwordInputClass}
                  placeholder={t('confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#F7941D] hover:bg-[#e08317] text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? t('registering') : t('register')}
            </button>

            {/* Login link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {t('haveAccount')}{' '}
                <Link
                  to="/login"
                  className="font-medium text-[#F7941D] hover:text-[#e08317] transition-colors duration-200"
                >
                  {t('login')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
