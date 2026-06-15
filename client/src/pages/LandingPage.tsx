import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  FileText,
  Clock,
  BarChart3,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  CreditCard,
  Target,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const features = [
  {
    icon: FolderKanban,
    title: 'Zarządzanie projektami',
    description: 'Kanban, etapy, zadania, priorytety i terminy — pełny wgląd w postęp prac.',
    color: 'bg-[#F7941D]',
  },
  {
    icon: Target,
    title: 'CRM',
    description: 'Leady, pipeline sprzedaży i pełna historia relacji z każdym klientem.',
    color: 'bg-emerald-500',
  },
  {
    icon: FileText,
    title: 'Faktury i umowy',
    description: 'Wystawiaj faktury, generuj PDF-y, śledź płatności i zarządzaj umowami.',
    color: 'bg-amber-500',
  },
  {
    icon: Clock,
    title: 'Ewidencja czasu pracy',
    description: 'Timetracking z podsumowaniami, raportami i integracją z projektami.',
    color: 'bg-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Raporty finansowe',
    description: 'Przychody, koszty, wykresy trendów i analizy per klient — zawsze aktualne.',
    color: 'bg-purple-500',
  },
  {
    icon: CalendarDays,
    title: 'Nieobecności i HR',
    description: 'Urlopy, zwolnienia, delegacje — pełna kontrola nad zespołem.',
    color: 'bg-rose-500',
  },
  {
    icon: Video,
    title: 'Wideokonferencje',
    description: 'Spotkania wideo bez wychodzenia z systemu — prosto ze strony projektu lub zadania.',
    color: 'bg-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Chat live',
    description: 'Wewnętrzny komunikator zespołowy — wiadomości, powiadomienia i historia rozmów.',
    color: 'bg-teal-500',
  },
];

const stats = [
  { value: '15+', label: 'Modułów systemu' },
  { value: '100%', label: 'Zintegrowanych procesów' },
  { value: '24/7', label: 'Dostępność online' },
];

const benefits = [
  'Jeden system zamiast 10 osobnych narzędzi — koniec z przełączaniem zakładek',
  'Pełna historia każdego klienta, projektu i faktury w jednym miejscu',
  'Automatyczne przypomnienia o terminach płatności i deadlinach',
  'Kontrola dostępu — każdy pracownik widzi tylko to, co powinien',
  'Raporty gotowe w kilka sekund, nie kilka godzin',
  'Eksport danych do PDF jednym kliknięciem',
];

const faq = [
  {
    q: 'Czy system jest bezpieczny?',
    a: 'Tak. Każdy użytkownik ma osobne konto i przypisaną rolę (Administrator, Kierownik, Pracownik). Dane są szyfrowane, a dostęp do modułów jest kontrolowany przez uprawnienia, nadawane przez administratora.',
  },
  {
    q: 'Czy muszę instalować cokolwiek na komputerze?',
    a: 'Nie. System działa w całości w przeglądarce internetowej — wystarczy adres URL i dane logowania. Działa na każdym urządzeniu z dostępem do internetu.',
  },
  {
    q: 'Jak wygląda wdrożenie?',
    a: 'Wdrożenie obejmuje konfigurację kont, działów i uprawnień. Dane z poprzednich systemów można zaimportować. Pierwsze logowanie jest możliwe już w dniu wdrożenia.',
  },
  {
    q: 'Czy mogę zarządzać wieloma projektami jednocześnie?',
    a: 'Tak. System obsługuje nieograniczoną liczbę projektów, zadań i użytkowników. Możesz filtrować, grupować i sortować wszystko według własnych potrzeb.',
  },
  {
    q: 'Czy faktury generowane są zgodnie z polskim prawem?',
    a: 'Tak. Faktury zawierają wszystkie wymagane pola zgodne z przepisami, są numerowane automatycznie i generowane jako pliki PDF gotowe do wysyłki.',
  },
  {
    q: 'Czy mogę zobaczyć system przed zakupem?',
    a: 'Tak. Skontaktuj się z nami, a umówimy demonstrację systemu dostosowaną do specyfiki Twojej firmy.',
  },
  {
    q: 'Czy system obsługuje wiele firm lub oddziałów?',
    a: 'Tak. Możesz tworzyć działy, przypisywać do nich pracowników i zarządzać uprawnieniami osobno dla każdej jednostki organizacyjnej.',
  },
  {
    q: 'Czy mogę śledzić czas pracy pracowników?',
    a: 'Tak. Moduł ewidencji czasu pracy pozwala rejestrować przepracowane godziny, przypisywać je do projektów i generować raporty miesięczne.',
  },
  {
    q: 'Jak działają powiadomienia w systemie?',
    a: 'System wysyła powiadomienia o nowych zadaniach, zbliżających się terminach wykonania, zmianach statusu projektów oraz nieodczytanych wiadomościach na czacie.',
  },
  {
    q: 'Czy jest wykonywana regularna kopia zapasowa danych?',
    a: 'Tak. Baza danych jest regularnie archiwizowana. W razie awarii możliwe jest przywrócenie danych do poprzedniego stanu.',
  },
];

const heroLines = [
  { top: '12%', left: '-18%', width: '58%', color: 'rgba(247, 148, 29, 0.18)', delay: '0s', duration: '15s', rotate: '-8deg' },
  { top: '20%', left: '34%', width: '44%', color: 'rgba(0, 174, 239, 0.14)', delay: '2s', duration: '18s', rotate: '-8deg' },
  { top: '32%', left: '-12%', width: '48%', color: 'rgba(255, 255, 255, 0.10)', delay: '4s', duration: '17s', rotate: '-8deg' },
  { top: '43%', left: '54%', width: '36%', color: 'rgba(247, 148, 29, 0.13)', delay: '1s', duration: '16s', rotate: '-8deg' },
  { top: '55%', left: '4%', width: '52%', color: 'rgba(0, 174, 239, 0.13)', delay: '5s', duration: '20s', rotate: '-8deg' },
  { top: '67%', left: '42%', width: '50%', color: 'rgba(255, 255, 255, 0.09)', delay: '3s', duration: '19s', rotate: '-8deg' },
  { top: '76%', left: '-8%', width: '62%', color: 'rgba(247, 148, 29, 0.12)', delay: '6s', duration: '22s', rotate: '-8deg' },
  { top: '84%', left: '48%', width: '42%', color: 'rgba(0, 174, 239, 0.12)', delay: '7s', duration: '21s', rotate: '-8deg' },
];

// Floating UI card mock
const MockCard = ({
  title,
  value,
  sub,
  color,
  className,
}: {
  title: string;
  value: string;
  sub: string;
  color: string;
  className?: string;
}) => (
  <div
    className={`absolute bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-4 w-52 ${className}`}
  >
    <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className={`text-xs font-semibold mt-1 ${color}`}>{sub}</p>
  </div>
);

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{q}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-gray-500 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function ContactForm({ standalone = false }: { standalone?: boolean }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('https://formspree.io/f/xqedvokw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, message: form.message }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className={`${standalone ? '' : 'mt-8 pt-8 border-t border-white/10'} text-center`}>
        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-white font-semibold mb-1">Wiadomość wysłana!</p>
        <p className="text-gray-400 text-sm">Odezwiemy się najszybciej jak to możliwe.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${standalone ? '' : 'mt-8 pt-8 border-t border-white/10'} space-y-3`}
    >
      {!standalone && <p className="text-sm font-semibold text-white mb-4">Napisz do nas</p>}
      <input
        type="text"
        placeholder="Imię i nazwisko"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7941D] transition-colors"
      />
      <input
        type="email"
        placeholder="Adres e-mail"
        required
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7941D] transition-colors"
      />
      <textarea
        placeholder="Twoja wiadomość..."
        required
        rows={3}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7941D] transition-colors resize-none"
      />
      <button
        type="submit"
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 bg-[#F7941D] hover:bg-[#e08317] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
      >
        {sending ? 'Wysyłanie...' : (
          <>Wyślij wiadomość <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </form>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (error: any) {
      const status = error?.response?.status;
      setLoginError(
        status === 401
          ? 'Nieprawidłowy adres e-mail lub hasło.'
          : 'Nie udało się zalogować. Spróbuj ponownie za chwilę.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center mb-8" aria-label="Strona główna">
          <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-10 w-auto" />
        </Link>

        <h2 className="text-2xl font-black text-gray-900 mb-1">Witaj ponownie</h2>
        <p className="text-gray-500 text-sm mb-8">Zaloguj się do swojego konta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="twoj@email.pl"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Hasło </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] transition-all"
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

          {loginError && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#F7941D] hover:bg-[#e08317] text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm mt-2 shadow-sm hover:shadow-md"
          >
            {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Dostęp do systemu nadaje administrator organizacji.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const animatedElements = Array.from(document.querySelectorAll<HTMLElement>('[data-animate]'));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      animatedElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.18,
      },
    );

    animatedElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (href: string) => {
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <style>
        {`
          [data-animate] {
            opacity: 0;
            filter: blur(3px);
            transition:
              opacity 700ms ease,
              transform 700ms cubic-bezier(0.22, 1, 0.36, 1),
              filter 700ms ease,
              border-color 200ms ease,
              box-shadow 200ms ease,
              background-color 200ms ease,
              color 200ms ease;
            will-change: opacity, transform, filter;
          }

          [data-animate="fade-up"] {
            transform: translate3d(0, 30px, 0);
          }

          [data-animate="fade-left"] {
            transform: translate3d(-34px, 0, 0);
          }

          [data-animate="fade-right"] {
            transform: translate3d(34px, 0, 0);
          }

          [data-animate="scale-in"] {
            transform: translate3d(0, 18px, 0) scale(0.96);
          }

          [data-animate].is-visible {
            opacity: 1;
            filter: blur(0);
            transform: translate3d(0, 0, 0) scale(1);
          }

          @media (prefers-reduced-motion: reduce) {
            [data-animate] {
              opacity: 1;
              filter: none;
              transform: none;
              transition: none;
            }
          }
        `}
      </style>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center" aria-label="Strona główna">
            <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-8 w-auto" />
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-full px-1.5 py-1.5 absolute left-1/2 -translate-x-1/2">
              {[
                { label: 'Moduły', href: '#moduly' },
                { label: 'Zalety', href: '#zalety' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Kontakt', href: '#kontakt' },
              ].map((item, index, items) => (
              <div key={item.href} className="flex items-center">
                <a
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(item.href);
                  }}
                  className="text-[15px] font-medium uppercase tracking-wide text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm px-4 py-1.5 rounded-full transition-all duration-150"
                >
                  {item.label}
                </a>
                {index < items.length - 1 && (
                  <span className="text-gray-300 select-none" aria-hidden="true">
                    |
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
          <button
            onClick={() => setLoginOpen(true)}
            className="text-[15px] font-semibold tracking-wide bg-[#F7941D] hover:bg-[#e08317] text-white px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
          >
            Zaloguj się
          </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center overflow-hidden pt-16">
        <style>
          {`
            @keyframes heroLineDrift {
              0% { transform: translateX(-18%); opacity: 0; }
              18% { opacity: 1; }
              82% { opacity: 1; }
              100% { transform: translateX(22%); opacity: 0; }
            }
          `}
        </style>
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F7941D]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00AEEF]/15 rounded-full blur-3xl" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {heroLines.map((line, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                top: line.top,
                left: line.left,
                width: line.width,
                transform: `rotate(${line.rotate})`,
              }}
            >
              <div
                className="h-px rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${line.color}, transparent)`,
                  animation: `heroLineDrift ${line.duration} ease-in-out ${line.delay} infinite`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div data-animate="fade-left">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3 h-3 text-[#F7941D]" />
              Kompletny system ERP dla Twojej firmy
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Zarządzaj firmą{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7941D] to-[#00AEEF]">
                w jednym miejscu
              </span>
            </h1>

            <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-lg">
              Zarządzaj projektami, klientami, fakturami i&nbsp;czasem pracy w&nbsp;jednym systemie.
              Monitoruj zadania, płatności i&nbsp;raporty bez przełączania się między narzędziami.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Zaloguj się do systemu
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#moduly"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("#moduly");
                }}
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Zobacz moduły
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right: Mock dashboard UI */}
          <div className="relative h-96 lg:h-[500px] hidden lg:block" data-animate="fade-right" style={{ transitionDelay: '120ms' }}>
            <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-white/40 text-xs ml-2">ERP panel</span>
                <span className="ml-auto rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  live
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Projekty', val: '24', color: 'text-[#F7941D]' },
                  { label: 'Zadania', val: '138', color: 'text-emerald-400' },
                  { label: 'Faktury', val: '56', color: 'text-amber-400' },
                  { label: 'Czas', val: '1 248h', color: 'text-emerald-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/50 text-xs">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1.15fr_0.85fr] gap-3 flex-1 min-h-0 overflow-hidden">
                <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">
                      Priorytety
                    </p>
                    <span className="text-white/35 text-xs">dziś</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { name: 'Akceptacja faktury FV/05/24', meta: 'Księgowość', color: 'bg-amber-400' },
                      { name: 'Oferta dla potencjalnego klienta', meta: 'CRM', color: 'bg-cyan-400' },
                      { name: 'Sprint aplikacji mobilnej', meta: 'Projekty', color: 'bg-[#F7941D]' },
                      { name: 'Urlopy zespołu wdrożeń', meta: 'HR', color: 'bg-emerald-400' },
                    ].map((task) => (
                      <div key={task.name} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-1.5">
                        <div className={`h-2 w-2 rounded-full ${task.color}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white/75">{task.name}</p>
                          <p className="text-[11px] text-white/35">{task.meta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-4">
                    Finanse i&nbsp;czas
                  </p>
                  <div className="space-y-4">
                    {[
                      { label: 'Opłacone faktury', value: '78%', width: '78%', color: 'bg-emerald-400' },
                      { label: 'Budżet projektów', value: '64%', width: '64%', color: 'bg-[#F7941D]' },
                      { label: 'Raporty czasu', value: '92%', width: '92%', color: 'bg-cyan-400' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-white/45">{item.label}</span>
                          <span className="font-semibold text-white/65">{item.value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 shrink-0 pt-1">
                {[
                  { name: 'Projekty', status: '8 aktywnych', color: 'bg-[#F7941D]/20 text-[#F7941D]' },
                  { name: 'Faktury', status: '5 po terminie', color: 'bg-amber-400/20 text-amber-300' },
                  { name: 'CRM', status: '12 leadów', color: 'bg-cyan-400/20 text-cyan-300' },
                ].map((module) => (
                  <div key={module.name} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-white/40 text-[11px]">{module.name}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${module.color}`}>
                      {module.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <MockCard
              title="Należności"
              value="32 400 zł"
              sub="5 faktur po terminie"
              color="text-amber-600"
              className="-right-8 top-8"
            />
            <MockCard
              title="Czas pracy"
              value="1 248 h"
              sub="92% raportów uzupełnione"
              color="text-emerald-600"
              className="-left-8 bottom-16"
            />
          </div>
        </div>

      </section>

      {/* ── STATS ── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((s, index) => (
              <div
                key={s.label}
                data-animate="scale-in"
                style={{ transitionDelay: `${index * 90}ms` }}
                className="p-8 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <p className="text-5xl font-black text-gray-900 mb-2">{s.value}</p>
                <p className="text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute -bottom-px left-0 right-0">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="moduly" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" data-animate="fade-up">
            <p className="text-sm font-semibold text-[#F7941D] uppercase tracking-wider mb-3">
              Moduły systemu
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Wszystko, czego potrzebuje Twoja firma
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Jeden system zamiast dziesiątek narzędzi. Każdy moduł działa samodzielnie i w pełnej
              integracji z pozostałymi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, index) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  data-animate="fade-up"
                  style={{ transitionDelay: `${index * 70}ms` }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group"
                >
                  <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#F7941D] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="zalety" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" data-animate="fade-up">
            <p className="text-sm font-semibold text-[#00AEEF] uppercase tracking-wider mb-3">
              Zalety systemu
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Jeden system, pełna kontrola
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Zamiast szukać plików, komunikować się wewnątrz firmy przez maile i&nbsp;mieć kilka różnych aplikacji, każdą do innego przeznaczenia, masz jeden panel,
              w&nbsp;którym wszystko jest połączone i&nbsp;zawsze aktualne.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div data-animate="fade-left">
              <h3 className="text-2xl font-black text-gray-900 mb-4">
                Co zyskujesz na co dzień?
              </h3>
              <p className="text-lg text-gray-500 mb-10 leading-relaxed">
                Najważniejsze procesy firmy są widoczne w&nbsp;jednym miejscu, a&nbsp;zespół pracuje
                na tych samych, aktualnych danych.
              </p>

              <ul className="space-y-4">
                {benefits.map((b, index) => (
                  <li
                    key={b}
                    data-animate="fade-left"
                    style={{ transitionDelay: `${index * 55}ms` }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4" data-animate="fade-right" style={{ transitionDelay: '120ms' }}>
              {[
                {
                  icon: ShieldCheck,
                  title: 'Bezpieczeństwo',
                  desc: 'Role i uprawnienia — każdy widzi tylko to, do czego ma dostęp',
                  color: 'text-[#F7941D]',
                  bg: 'bg-orange-50',
                },
                {
                  icon: TrendingUp,
                  title: 'Decyzje oparte na danych',
                  desc: 'Raporty i dashboardy aktualizowane w czasie rzeczywistym',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  icon: MessageSquare,
                  title: 'Komunikacja w zespole',
                  desc: 'Chat, wideokonferencje i powiadomienia bez zewnętrznych aplikacji',
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
                {
                  icon: CreditCard,
                  title: 'Finanse pod kontrolą',
                  desc: 'Faktury, płatności i umowy — zawsze wiesz co jest opłacone',
                  color: 'text-rose-600',
                  bg: 'bg-rose-50',
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    data-animate="scale-in"
                    style={{ transitionDelay: `${index * 80}ms` }}
                    className={`${item.bg} rounded-2xl p-6`}
                  >
                    <Icon className={`w-8 h-8 ${item.color} mb-3`} />
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" data-animate="fade-up">
            <p className="text-sm font-semibold text-[#F7941D] uppercase tracking-wider mb-3">
              FAQ
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Najczęściej zadawane pytania
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Krótkie odpowiedzi na najważniejsze kwestie dotyczące działania,
              wdrożenia i&nbsp;bezpieczeństwa systemu.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">

            {/* Left sticky panel */}
            <div className="lg:col-span-2 lg:sticky lg:top-24" data-animate="fade-left">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white">
                <p className="text-xs font-semibold text-[#F7941D] uppercase tracking-wider mb-3">
                  FAQ w skrócie
                </p>
                <h2 className="text-3xl font-black leading-tight mb-4">
                  Wszystko, co chcesz wiedzieć
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  Zebraliśmy najczęstsze pytania o działanie systemu, wdrożenie, uprawnienia
                  i&nbsp;codzienną pracę zespołu.
                </p>

                <div className="space-y-4">
                  {[
                    { num: '01', label: 'Bezpieczeństwo i dostęp' },
                    { num: '02', label: 'Instalacja i wdrożenie' },
                    { num: '03', label: 'Funkcje i możliwości' },
                    { num: '04', label: 'Faktury i finanse' },
                  ].map((item) => (
                    <div key={item.num} className="flex items-center gap-3 group cursor-default">
                      <span className="text-xs font-bold text-[#F7941D] w-6">{item.num}</span>
                      <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: accordion */}
            <div className="lg:col-span-3 space-y-3">
              {faq.map((item, index) => (
                <div
                  key={item.q}
                  data-animate="fade-right"
                  style={{ transitionDelay: `${index * 55}ms` }}
                  className="group"
                >
                  <FaqItem q={item.q} a={item.a} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="kontakt" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" data-animate="fade-up">
            <p className="text-sm font-semibold text-[#00AEEF] uppercase tracking-wider mb-3">
              Kontakt
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Porozmawiajmy o&nbsp;Twoim ERP
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Jeśli chcesz doprecyzować wdrożenie, dostępne moduły albo sposób pracy systemu,
              wyślij nam krótką wiadomość.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
            <div
              className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm"
              data-animate="fade-left"
            >
              <p className="text-xs font-semibold text-[#F7941D] uppercase tracking-wider mb-3">
                Jak możemy pomóc?
              </p>
              <h3 className="text-3xl font-black text-gray-900 mb-4">
                Opisz krótko potrzeby firmy
              </h3>
              <p className="text-gray-500 leading-relaxed mb-8">
                Najlepiej napisz, które obszary są dla Ciebie najważniejsze: projekty, CRM,
                faktury, czas pracy, raporty albo uprawnienia użytkowników.
              </p>

              <div className="space-y-4">
                {[
                  { icon: MessageSquare, title: 'Zakres systemu', desc: 'Dobór modułów do realnych procesów firmy.' },
                  { icon: Clock, title: 'Wdrożenie', desc: 'Omówienie startu, ról użytkowników i organizacji pracy.' },
                  { icon: Mail, title: 'Odpowiedź', desc: 'Wracamy z informacją po analizie wiadomości.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4 rounded-2xl bg-gray-50 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl"
              data-animate="fade-right"
              style={{ transitionDelay: '120ms' }}
            >
              <p className="text-xs font-semibold text-[#F7941D] uppercase tracking-wider mb-3">
                Formularz kontaktowy
              </p>
              <h3 className="text-3xl font-black mb-3">
                Napisz do nas
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Wypełnij formularz, a&nbsp;przygotujemy odpowiedź dopasowaną do Twojej sytuacji.
              </p>

              <ContactForm standalone />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="bg-gradient-to-r from-gray-800 to-slate-800 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center" data-animate="scale-in">
          <h2 className="text-4xl font-black text-white mb-4">
            Gotowy, żeby zacząć?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Zaloguj się do systemu i zacznij zarządzać firmą efektywniej już dziś.
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12" data-animate="fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr_0.8fr] gap-10">
            <div>
              <Link to="/" className="inline-flex items-center mb-5" aria-label="Strona główna">
                <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-8 w-auto" />
              </Link>
              <p className="max-w-md text-sm leading-6 text-gray-400">
                System ERP do zarządzania projektami, CRM, fakturami, czasem pracy
                i&nbsp;komunikacją zespołu.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-4">
                Sekcje
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Moduły", href: "#moduly" },
                  { label: "Zalety", href: "#zalety" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Kontakt", href: "#kontakt" },
                ].map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => scrollToSection(item.href)}
                    className="block text-sm text-gray-300 transition-colors hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-4">
                Konto
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-[#F7941D] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#e08317]"
                >
                  Zaloguj się
                </button>
                <p className="text-center text-xs leading-relaxed text-gray-400">
                  Konta użytkowników tworzy administrator organizacji.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} ITComplete.pl. Wszelkie prawa zastrzeżone.
            </p>
            <p className="text-xs text-gray-400">
              ERP dla firm oparty na spójnych danych.
            </p>
          </div>
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Przewiń do góry strony"
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#F7941D] text-white shadow-lg transition-all hover:bg-[#e08317] hover:shadow-xl"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
