import { createRoot } from 'react-dom/client';
import ConfirmDialog, { ConfirmDialogVariant } from '../components/common/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  icon?: 'delete' | 'leave' | 'warning' | 'info';
}

/**
 * Imperative, styled confirmation dialog — a drop-in replacement for window.confirm().
 * Returns a Promise<boolean> that resolves true on confirm, false on cancel/close.
 *
 *   if (!(await confirmDialog({ message: 'Usunąć?' }))) return;
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const finish = (result: boolean) => {
      // Defer unmount to the next tick to avoid React warning about
      // unmounting during an event handler.
      setTimeout(() => {
        root.unmount();
        container.remove();
      }, 0);
      resolve(result);
    };

    root.render(
      <ConfirmDialog
        isOpen
        onClose={() => finish(false)}
        onConfirm={() => finish(true)}
        title={opts.title ?? 'Potwierdzenie'}
        message={opts.message}
        confirmText={opts.confirmText ?? 'Potwierdź'}
        cancelText={opts.cancelText ?? 'Anuluj'}
        variant={opts.variant ?? 'danger'}
        icon={opts.icon ?? 'warning'}
      />,
    );
  });
}

/** Convenience preset for delete confirmations. */
export function confirmDelete(message = 'Czy na pewno chcesz usunąć ten element? Tej operacji nie można cofnąć.'): Promise<boolean> {
  return confirmDialog({
    title: 'Potwierdź usunięcie',
    message,
    confirmText: 'Usuń',
    cancelText: 'Anuluj',
    variant: 'danger',
    icon: 'delete',
  });
}
