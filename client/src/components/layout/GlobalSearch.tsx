import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckSquare,
  FileText,
  Folder,
  Loader2,
  Receipt,
  Search,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { globalSearch, type SearchResult } from '../../api/search.api';

type ResultType = SearchResult['type'];

const TYPE_CONFIG: Record<ResultType, { label: string; icon: typeof Folder; color: string }> = {
  project: {
    label: 'Projekt',
    icon: Folder,
    color: 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20 dark:text-orange-300',
  },
  task: {
    label: 'Zadanie',
    icon: CheckSquare,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  },
  ticket: {
    label: 'Zgłoszenie',
    icon: Ticket,
    color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300',
  },
  invoice: {
    label: 'Faktura',
    icon: Receipt,
    color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300',
  },
  contract: {
    label: 'Umowa',
    icon: FileText,
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
  },
  client: {
    label: 'Kontrahent',
    icon: Building2,
    color: 'bg-cyan-50 text-[#00AEEF] dark:bg-cyan-900/20 dark:text-cyan-300',
  },
  procedure: {
    label: 'Procedura',
    icon: BookOpen,
    color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300',
  },
  employee: {
    label: 'Pracownik',
    icon: User,
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
};

const GlobalSearch = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await globalSearch(trimmedQuery);
        if (!active) return;
        setResults(data);
      } catch {
        if (active) {
          setResults([]);
          setError('Nie udało się pobrać wyników.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSelect = (href: string) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    navigate(href);
  };

  const trimmedQuery = query.trim();
  const showDropdown = isOpen && trimmedQuery.length > 0;

  // Group results by type for section headers
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});
  const orderedTypes = (Object.keys(grouped) as ResultType[]).sort();

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Szukaj projektów, zadań, pracowników..."
          className="h-9 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-9 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-[#F7941D]/50 focus:bg-white focus:ring-2 focus:ring-[#F7941D]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setError(''); }}
            aria-label="Wyczyść wyszukiwanie"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {trimmedQuery.length < 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Wpisz co najmniej 2 znaki.
            </div>
          )}

          {trimmedQuery.length >= 2 && isLoading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Szukanie...
            </div>
          )}

          {trimmedQuery.length >= 2 && !isLoading && error && (
            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {trimmedQuery.length >= 2 && !isLoading && !error && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Brak wyników dla tej frazy.
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-[28rem] overflow-y-auto py-1">
              {orderedTypes.map((type) => {
                const config = TYPE_CONFIG[type as ResultType];
                const Icon = config.icon;
                return (
                  <div key={type}>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {config.label}
                      </span>
                    </div>
                    {grouped[type].map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => handleSelect(result.href)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                            {result.subtitle}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
