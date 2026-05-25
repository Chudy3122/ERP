import { Activity, CheckSquare, Clock, FolderPlus, MessageSquarePlus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../widgets/WidgetCard';

const quickActions = [
  {
    label: 'Nowe zadanie',
    description: 'Utwórz zadanie i przypisz termin',
    path: '/tasks/new',
    icon: CheckSquare,
    accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  {
    label: 'Nowy projekt',
    description: 'Dodaj projekt do systemu',
    path: '/projects/new',
    icon: FolderPlus,
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    label: 'Nowe zgłoszenie',
    description: 'Zarejestruj temat do obsługi',
    path: '/tickets/new',
    icon: MessageSquarePlus,
    accent: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300',
  },
  {
    label: 'Czasy pracy',
    description: 'Przejdź do ewidencji czasu',
    path: '/work-time',
    icon: Clock,
    accent: 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20 dark:text-orange-300',
  },
  {
    label: 'Nadgodziny',
    description: 'Dodaj lub odbierz czas',
    path: '/overtime',
    icon: TrendingUp,
    accent: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    label: 'Aktywności',
    description: 'Zobacz pełny stream zdarzeń',
    path: '/activities',
    icon: Activity,
    accent: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
  },
];

const DashboardQuickActions = () => {
  const navigate = useNavigate();

  return (
    <WidgetCard title="Szybkie akcje">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className="group flex min-h-[84px] items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.accent}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 transition-colors group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-100">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">
                  {action.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

export default DashboardQuickActions;
