import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckSquare, Folder, Loader2, Search, X } from 'lucide-react';
import { getProjects } from '../../api/project.api';
import { getTasks } from '../../api/task.api';

type SearchResultType = 'project' | 'task';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

const resultTypeConfig: Record<SearchResultType, { label: string; icon: typeof Folder; color: string }> = {
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

    let isCurrentRequest = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');

        const [projectResponse, taskResponse] = await Promise.all([
          getProjects({ search: trimmedQuery }),
          getTasks({ search: trimmedQuery }),
        ]);

        if (!isCurrentRequest) return;

        const projectResults: SearchResult[] = projectResponse.projects.slice(0, 5).map((project) => ({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: `${project.code} · ${project.status}`,
          href: `/projects/${project.id}`,
        }));

        const taskResults: SearchResult[] = taskResponse.slice(0, 5).map((task) => ({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.project?.name || 'Zadanie bez nazwy projektu',
          href: `/tasks/${task.id}/edit`,
        }));

        setResults([...projectResults, ...taskResults].slice(0, 8));
      } catch {
        if (isCurrentRequest) {
          setResults([]);
          setError('Nie udało się pobrać wyników.');
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrentRequest = false;
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
  const showDropdown = isOpen && (trimmedQuery.length > 0 || results.length > 0);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Szukaj projektów i zadań..."
          className="h-9 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-9 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-[#F7941D]/50 focus:bg-white focus:ring-2 focus:ring-[#F7941D]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setError('');
            }}
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
            <div className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => {
                const config = resultTypeConfig[result.type];
                const Icon = config.icon;

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleSelect(result.href)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                        {config.label} · {result.subtitle}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </button>
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
