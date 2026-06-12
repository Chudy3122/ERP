import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Clock, Users, BarChart3, Shield } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    try {
      await login({ email, password });
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#F7941D] mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: Clock, title: 'Ewidencja czasu', desc: 'Rejestruj godziny pracy i monitoruj obecność zespołu' },
    { icon: Users, title: 'Zarządzanie zespołem', desc: 'Koordynuj projekty, zadania i komunikację w jednym miejscu' },
    { icon: BarChart3, title: 'Raporty i analityka', desc: 'Generuj raporty i śledź postępy w czasie rzeczywistym' },
    { icon: Shield, title: 'Bezpieczeństwo', desc: 'Szyfrowane dane i kontrola dostępu na każdym poziomie' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"></div>
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-login" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-login)" />
        </svg>
        {/* Brand color glows */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#F7941D]/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#00AEEF]/10 rounded-full filter blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20">
          {/* Logo */}
          <Link to="/" className="mb-12 inline-flex" aria-label="Strona główna">
            <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-12 w-auto" />
          </Link>

          {/* Heading */}
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Kompleksowe zarządzanie<br />
            <span className="text-[#F7941D]">Twoją organizacją</span>
          </h1>
          <p className="text-slate-400 text-base mb-12 max-w-md leading-relaxed">
            Platforma do zarządzania czasem pracy, projektami, zespołem i komunikacją. Wszystko czego potrzebujesz w jednym systemie.
          </p>

          {/* Features */}
          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <feature.icon className="w-4 h-4 text-[#F7941D]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{feature.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Back to landing */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć do strony głównej
          </Link>

          {/* Mobile logo */}
          <Link to="/" className="flex items-center mb-8 lg:hidden" aria-label="Strona główna">
            <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-9 w-auto" />
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('welcomeBack')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('subtitle')}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] transition-all duration-200"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] transition-all duration-200"
                  placeholder={t('passwordPlaceholder')}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#F7941D] hover:bg-[#e08317] text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? t('loggingIn') : t('login')}
            </button>

            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Dostęp do systemu nadaje administrator organizacji.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
