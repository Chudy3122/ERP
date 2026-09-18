import { RotateCcw } from 'lucide-react';

interface ResetFiltersButtonProps {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  compact?: boolean;
}

export default function ResetFiltersButton({ onClick, title, disabled, compact }: ResetFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 font-semibold text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7941D]/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 ${compact ? 'h-8 text-xs' : 'h-10 text-sm'}`}
    >
      <RotateCcw className="h-4 w-4" aria-hidden="true" />
      Resetuj
    </button>
  );
}
