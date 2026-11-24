import { AlarmClock, BellRing, Volume2, X } from 'lucide-react';
import { playReminderSound } from '@/src/lib/soundEngine';
import { ActiveAlert } from '@/src/types/calendar';

interface ActiveAlertBannerProps {
  alerts: ActiveAlert[];
  onDismiss: (alertKey: string) => void;
  onSnooze: (alert: ActiveAlert, minutes: number) => void;
}

export function ActiveAlertBanner({
  alerts,
  onDismiss,
  onSnooze,
}: ActiveAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-20 right-4 sm:bottom-4 z-[70] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2.5"
    >
      {alerts.map((alert) => (
        <div
          key={alert.alertKey}
          className="rounded-xl border border-blue-200 bg-white p-4 shadow-xl dark:border-blue-900 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-blue-500">
                {alert.kind === 'alarm' || alert.kind === 'timer' ? (
                  <AlarmClock className="h-4 w-4" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {alert.kind === 'alarm'
                    ? 'Clock Alarm'
                    : alert.kind === 'timer'
                      ? 'Countdown Complete'
                      : 'Event Reminder'}
                </div>
                <h4 className="truncate font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {alert.title}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {alert.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {alert.sound !== 'silent' && (
                <button
                  type="button"
                  onClick={() => playReminderSound(alert.sound)}
                  title="Replay alert chime"
                  aria-label="Replay alert chime"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDismiss(alert.alertKey)}
                aria-label="Dismiss reminder"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Snooze:</span>
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onSnooze(alert, mins)}
                  className="rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {mins}m
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(alert.alertKey)}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
