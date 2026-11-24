import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Check, ChevronLeft, ChevronRight, Clock, Plus, X } from 'lucide-react';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import {
  addMonths,
  eventOccursOnDay,
  formatCountdown,
  formatTimeString,
  getMonthMatrix,
  isSameDay,
  MONTH_NAMES,
  WEEKDAY_INITIALS,
} from '@/src/lib/dateUtils';
import {
  AppSettings,
  CalendarEvent,
  CalendarSource,
  ClockAlarm,
} from '@/src/types/calendar';

interface SidebarProps {
  anchorDate: Date;
  onSelectDate: (date: Date) => void;
  calendars: CalendarSource[];
  onToggleCalendar: (id: string) => void;
  events: CalendarEvent[];
  alarms: ClockAlarm[];
  onToggleAlarm: (id: string) => void;
  onOpenClockView: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  nextReminderInfo: { title: string; targetTime: number; kind: 'event' | 'alarm' } | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  anchorDate,
  onSelectDate,
  calendars,
  onToggleCalendar,
  events,
  alarms,
  onToggleAlarm,
  onOpenClockView,
  settings,
  onUpdateSettings,
  nextReminderInfo,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [now, setNow] = useState(() => new Date());
  const [miniMonth, setMiniMonth] = useState(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  );

  useEffect(() => {
    setMiniMonth(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  }, [anchorDate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const miniDays = useMemo(
    () => getMonthMatrix(miniMonth.getFullYear(), miniMonth.getMonth(), settings.weekStartsOn),
    [miniMonth, settings.weekStartsOn]
  );

  const weekdayHeaders = useMemo(() => {
    if (settings.weekStartsOn === 1) {
      return [...WEEKDAY_INITIALS.slice(1), WEEKDAY_INITIALS[0]];
    }
    return WEEKDAY_INITIALS;
  }, [settings.weekStartsOn]);

  const timeFormatted = useMemo(() => {
    return now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: settings.timeFormat === '12h',
    });
  }, [now, settings.timeFormat]);

  const timezoneName = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Local Time';
    }
  }, []);

  const content = (
    <div className="flex h-full flex-col divide-y divide-slate-200 overflow-y-auto calendar-scroll bg-white dark:divide-slate-800 dark:bg-slate-900">
      {/* Precision Live Clock & Next Reminder Countdown */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Live Clock
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                timeFormat: settings.timeFormat === '12h' ? '24h' : '12h',
              })
            }
            className="text-[11px] font-mono font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {settings.timeFormat === '12h' ? '12H' : '24H'}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenClockView}
          className="mt-1.5 block w-full text-left group focus-visible:outline-none"
        >
          <div className="font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums group-hover:text-blue-600 transition-colors dark:text-slate-100 dark:group-hover:text-blue-400">
            {timeFormatted}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {now.toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            · {timezoneName}
          </div>
        </button>

        {nextReminderInfo && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                <Clock className="h-3 w-3" />
                <span>Next {nextReminderInfo.kind === 'alarm' ? 'Alarm' : 'Reminder'}</span>
              </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                in {formatCountdown(nextReminderInfo.targetTime - now.getTime())}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-800 dark:text-slate-200">
              {nextReminderInfo.title}
            </p>
          </div>
        )}
      </div>

      {/* Mini Month Navigator */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            {MONTH_NAMES[miniMonth.getMonth()]} {miniMonth.getFullYear()}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMiniMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMiniMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {weekdayHeaders.map((w, idx) => (
            <div
              key={`${w}-${idx}`}
              className="text-[11px] font-medium text-slate-400 dark:text-slate-500"
            >
              {w}
            </div>
          ))}

          {miniDays.map((day) => {
            const inCurrentMonth = day.getMonth() === miniMonth.getMonth();
            const isToday = isSameDay(day, now);
            const isSelected = isSameDay(day, anchorDate);
            const hasEvents = events.some((ev) => eventOccursOnDay(ev, day));

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  onSelectDate(day);
                  onCloseMobile();
                }}
                className={`relative mx-auto flex h-7 w-7 flex-col items-center justify-center rounded-md font-mono text-[11px] tabular-nums transition-colors ${
                  isToday
                    ? 'bg-blue-600 font-semibold text-white dark:bg-blue-500'
                    : isSelected
                      ? 'bg-slate-200 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                      : inCurrentMonth
                        ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        : 'text-slate-400 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>{day.getDate()}</span>
                {hasEvents && !isToday && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 h-0.5 w-2.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendars & Google Sync Sources */}
      <div className="p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            Calendars
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {calendars.filter((c) => c.visible).length}/{calendars.length}
          </span>
        </div>

        <ul className="space-y-1.5">
          {calendars.map((cal) => (
            <li key={cal.id}>
              <button
                type="button"
                onClick={() => onToggleCalendar(cal.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                  style={{
                    backgroundColor: cal.visible ? cal.color : 'transparent',
                    borderColor: cal.color,
                  }}
                >
                  {cal.visible && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                    {cal.name}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {cal.source === 'google' ? 'Google Calendar' : 'Local'}
                    {cal.primary ? ' · Primary' : ''}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Clock Alarms Quick Control */}
      <div className="p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            Clock Alarms
          </h2>
          <button
            type="button"
            onClick={() => {
              onOpenClockView();
              onCloseMobile();
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Plus className="h-3 w-3" />
            <span>Manage</span>
          </button>
        </div>

        {alarms.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No clock alarms configured.
          </p>
        ) : (
          <ul className="space-y-2">
            {alarms.slice(0, 4).map((alarm) => (
              <li
                key={alarm.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlarmClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                      {formatTimeString(alarm.time, settings.timeFormat)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {alarm.label}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alarm.enabled}
                  aria-label={`Toggle alarm ${alarm.label}`}
                  onClick={() => onToggleAlarm(alarm.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    alarm.enabled
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      alarm.enabled ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PWA Install Prompt (automatically hides if already installed) */}
      <div className="mt-auto p-4 empty:hidden">
        <PWAInstallButton variant="full" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:block w-[272px] shrink-0 border-r border-slate-200 dark:border-slate-800">
        {content}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-[280px] max-w-[85vw] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Navigation & Clock
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close sidebar"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{content}</div>
          </aside>
        </div>
      )}
    </>
  );
}
