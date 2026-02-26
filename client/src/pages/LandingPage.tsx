import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  CheckCircle2,
  Building2,
  CreditCard,
  Target,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const features = [
  {
    icon: FolderKanban,
    title: 'Zarządzanie projektami',
    description: 'Kanban, etapy, zadania, priorytety i terminy — pełny wgląd w postęp prac.',
    color: 'bg-indigo-500',
  },
  {
    icon: Target,
    title: 'CRM',
    description: 'Leady, pipeline sprzedaży i pełna historia relacji z każdym klientem.',
    color: 'bg-emerald-500',
  },
  {
    icon: FileText,
    title: 'Faktury i umowy',
    description: 'Wystawiaj faktury, generuj PDF-y, śledź płatności i zarządzaj umowami.',
    color: 'bg-amber-500',
  },
  {
    icon: Clock,
    title: 'Ewidencja czasu pracy',
    description: 'Timetracking z podsumowaniami, raportami i integracją z projektami.',
    color: 'bg-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Raporty finansowe',
    description: 'Przychody, koszty, wykresy trendów i analizy per klient — zawsze aktualne.',
    color: 'bg-purple-500',
  },
  {
    icon: CalendarDays,
    title: 'Nieobecności i HR',
    description: 'Urlopy, zwolnienia, delegacje — pełna kontrola nad zespołem.',
    color: 'bg-rose-500',
  },
  {
    icon: Video,
    title: 'Wideokonferencje',
    description: 'Spotkania wideo bez wychodzenia z systemu — prosto ze strony projektu lub zadania.',
    color: 'bg-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Chat live',
    description: 'Wewnętrzny komunikator zespołowy — wiadomości, powiadomienia i historia rozmów.',
    color: 'bg-teal-500',
  },
];

const stats = [
  { value: '15+', label: 'Modułów systemu' },
  { value: '100%', label: 'Zintegrowanych procesów' },
  { value: '24/7', label: 'Dostępność online' },
];

const benefits = [
  'Jeden system zamiast 10 osobnych narzędzi — koniec z przełączaniem zakładek',
  'Pełna historia każdego klienta, projektu i faktury w jednym miejscu',
  'Automatyczne przypomnienia o terminach płatności i deadlinach',
  'Kontrola dostępu — każdy pracownik widzi tylko to, co powinien',
  'Raporty gotowe w kilka sekund, nie kilka godzin',
  'Eksport danych do PDF jednym kliknięciem',
];

const faq = [
  {
    q: 'Czy system jest bezpieczny?',
    a: 'Tak. Każdy użytkownik ma osobne konto i przypisaną rolę (admin, team leader, pracownik). Dane są szyfrowane, a dostęp do modułów jest kontrolowany przez uprawnienia.',
  },
  {
    q: 'Czy muszę instalować cokolwiek na komputerze?',
    a: 'Nie. System działa w całości w przeglądarce internetowej — wystarczy adres URL i dane logowania. Działa na każdym urządzeniu z dostępem do internetu.',
  },
  {
    q: 'Jak wygląda wdrożenie?',
    a: 'Wdrożenie obejmuje konfigurację kont, działów i uprawnień. Dane z poprzednich systemów można zaimportować. Pierwsze logowanie jest możliwe już w dniu wdrożenia.',
  },
  {
    q: 'Czy mogę zarządzać wieloma projektami jednocześnie?',
    a: 'Tak. System obsługuje nieograniczoną liczbę projektów, zadań i użytkowników. Możesz filtrować, grupować i sortować wszystko według własnych potrzeb.',
  },
  {
    q: 'Czy faktury generowane są zgodnie z polskim prawem?',
    a: 'Tak. Faktury zawierają wszystkie wymagane pola zgodne z przepisami, są numerowane automatycznie i generowane jako pliki PDF gotowe do wysyłki.',
  },
  {
    q: 'Czy mogę zobaczyć system przed zakupem?',
    a: 'Tak. Skontaktuj się z nami, a umówimy demonstrację systemu dostosowaną do specyfiki Twojej firmy.',
  },
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">ERP System</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#funkcje" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Funkcje
            </a>
            <a href="#zalety" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Zalety
            </a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              FAQ
            </a>
          </div>

          {/* Single CTA */}
          <Link
            to="/login"
            className="text-sm font-semibold bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            Zaloguj się
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center overflow-hidden pt-16">
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3 h-3 text-amber-400" />
              Kompletny system ERP dla Twojej firmy
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Zarządzaj firmą{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
                w jednym miejscu
              </span>
            </h1>

            <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-lg">
              Projekty, CRM, faktury, HR i raporty — wszystko zintegrowane w jednym, intuicyjnym
              systemie. Oszczędzaj czas i podejmuj lepsze decyzje.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Zaloguj się do systemu
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#funkcje"
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Zobacz funkcje
              </a>
            </div>
          </div>

          {/* Right: Mock dashboard UI */}
          <div className="relative h-96 lg:h-[480px] hidden lg:block">
            <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-white/40 text-xs ml-2">dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Projekty', val: '24', color: 'text-indigo-400' },
                  { label: 'Zadania', val: '138', color: 'text-emerald-400' },
                  { label: 'Faktury', val: '56', color: 'text-amber-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/50 text-xs">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="flex-1 bg-white/5 rounded-xl p-4 flex items-end gap-2">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-indigo-500/60 hover:bg-indigo-400/80 transition-colors"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Wdrożenie modułu CRM', status: 'W toku', color: 'bg-blue-500' },
                  { name: 'Raport finansowy Q1', status: 'Ukończone', color: 'bg-emerald-500' },
                ].map((t) => (
                  <div key={t.name} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                    <div className={`w-2 h-2 rounded-full ${t.color}`} />
                    <p className="text-white/70 text-xs flex-1">{t.name}</p>
                    <span className="text-white/40 text-xs">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <MockCard
              title="Przychód miesięczny"
              value="48 200 zł"
              sub="↑ +12% vs ostatni miesiąc"
              color="text-emerald-600"
              className="-right-8 top-8"
            />
            <MockCard
              title="Aktywne projekty"
              value="24"
              sub="8 zbliża się do deadline"
              color="text-amber-600"
              className="-left-8 bottom-16"
            />
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label} className="p-8 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-5xl font-black text-gray-900 mb-2">{s.value}</p>
                <p className="text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funkcje" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
              Moduły systemu
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Wszystko, czego potrzebuje Twoja firma
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Jeden system zamiast dziesiątek narzędzi. Każdy moduł działa samodzielnie i w pełnej
              integracji z pozostałymi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group"
                >
                  <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">
                Dlaczego nasz system?
              </p>
              <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight">
                Jeden system,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
                  pełna kontrola
                </span>
              </h2>
              <p className="text-lg text-gray-500 mb-10 leading-relaxed">
                Zamiast sklejać arkusze Excel, maile i kilka różnych aplikacji — masz jeden panel,
                w którym wszystko jest połączone i zawsze aktualne.
              </p>

              <ul className="space-y-4">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Bezpieczeństwo',
                  desc: 'Role i uprawnienia — każdy widzi tylko to, do czego ma dostęp',
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50',
                },
                {
                  icon: TrendingUp,
                  title: 'Decyzje oparte na danych',
                  desc: 'Raporty i dashboardy aktualizowane w czasie rzeczywistym',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  icon: MessageSquare,
                  title: 'Komunikacja w zespole',
                  desc: 'Chat, wideokonferencje i powiadomienia bez zewnętrznych aplikacji',
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
                {
                  icon: CreditCard,
                  title: 'Finanse pod kontrolą',
                  desc: 'Faktury, płatności i umowy — zawsze wiesz co jest opłacone',
                  color: 'text-rose-600',
                  bg: 'bg-rose-50',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={`${item.bg} rounded-2xl p-6`}>
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
      <section id="faq" className="bg-gray-50 py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
              Masz pytania?
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Najczęściej zadawane pytania
            </h2>
            <p className="text-lg text-gray-500">
              Nie znalazłeś odpowiedzi? Skontaktuj się z nami.
            </p>
          </div>

          <div className="space-y-3">
            {faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="bg-gradient-to-r from-gray-900 to-slate-800 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">
            Gotowy, żeby zacząć?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Zaloguj się do systemu i zacznij zarządzać firmą efektywniej już dziś.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors text-lg"
          >
            Zaloguj się do systemu
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 border-t border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">ERP System</span>
          </div>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} ERP System. Wszelkie prawa zastrzeżone.
          </p>
          <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
            Zaloguj się →
          </Link>
        </div>
      </footer>
    </div>
  );
}
