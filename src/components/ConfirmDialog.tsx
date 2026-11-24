import { AlertTriangle, X } from 'lucide-react';
import { PendingConfirmation } from '@/src/types/calendar';

interface ConfirmDialogProps {
  confirmation: PendingConfirmation | null;
  isBusy: boolean;
  onCancel: () => void;
}

export function ConfirmDialog({ confirmation, isBusy, onCancel }: ConfirmDialogProps) {
  if (!confirmation) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                confirmation.tone === 'danger'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h3
              id="confirm-dialog-title"
              className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {confirmation.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            aria-label="Cancel confirmation"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p
          id="confirm-dialog-desc"
          className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
        >
          {confirmation.description}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => confirmation.onConfirm()}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
              confirmation.tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
          >
            {isBusy ? 'Processing...' : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
