import { useMemo, useState } from 'react';
import { AlarmClock, Bell, Plus, X } from 'lucide-react';
import {
  eventOccursOnDay,
  formatTimeFromDate,
  formatTimeString,
  getMonthMatrix,
  isSameDay,
  MONTH_NAMES,
  toDateKey,
  WEEKDAY_SHORT,
} from '@/src/lib/dateUtils';
import { AppSettings, CalendarEvent, ClockAlarm } from '@/src/types/calendar';

interface MonthViewProps {
  anchorDate: Date;
  events: CalendarEvent[];
  alarms: ClockAlarm[];
  settings: AppSettings;
  onSelectDateCreate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onJumpToWeek: (date: Date) => void;
}

export function MonthView({
  anchorDate,
  events,
  alarms,
  settings,
  onSelectDateCreate,
  onSelectEvent,
  onJumpToWeek,
}: MonthViewProps) {
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const today = new Date();

  const days = useMemo(
    () => getMonthMatrix(anchorDate.getFullYear(), anchorDate.getMonth(), settings.weekStartsOn),
    [anchorDate, settings.weekStartsOn]
  );

  const weekdayLabels = useMemo(() => {
    if (settings.weekStartsOn === 1) {
      return [...WEEKDAY_SHORT.slice(1), WEEKDAY_SHORT[0]];
    }
    return WEEKDAY_SHORT;
  }, [settings.weekStartsOn]);

  const expandedDayEvents = useMemo(() => {
    if (!expandedDay) return [];
    return events.filter((ev) => eventOccursOnDay(ev, expandedDay));
  }, [expandedDay, events]);

  const expandedDayAlarms = useMemo(() => {
    if (!expandedDay) return [];
    const dayKey = toDateKey(expandedDay);
    return alarms.filter((a) => {
      if (!a.enabled) return false;
      if (a.repeatDays.length > 0) return a.repeatDays.includes(expandedDay.getDay());
      return a.date === dayKey;
    });
  }, [expandedDay, alarms]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white pb-16 sm:pb-0 dark:bg-slate-900">
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="border-r border-slate-200 px-1.5 sm:px-3 py-2 text-center sm:text-left text-[11px] sm:text-xs font-semibold text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 7x6 Month Grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-200 overflow-y-auto calendar-scroll dark:divide-slate-800">
        {days.map((day) => {
          const inMonth = day.getMonth() === anchorDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayKey = toDateKey(day);
          const dayEvents = events.filter((ev) => eventOccursOnDay(ev, day));
          const dayAlarms = alarms.filter((a) => {
            if (!a.enabled) return false;
            if (a.repeatDays.length > 0) return a.repeatDays.includes(day.getDay());
            return a.date === dayKey;
          });

          const visibleEvents = dayEvents.slice(0, 3);
          const overflowCount = Math.max(0, dayEvents.length - visibleEvents.length);

          return (
            <div
              key={dayKey}
              onClick={() => {
                // On mobile touchscreens, tapping a cell opens the clean day summary sheet
                if (window.innerWidth < 640) {
                  setExpandedDay(day);
                }
              }}
              className={`group flex min-h-[72px] sm:min-h-[112px] flex-col p-1.5 sm:p-2 transition-colors ${
                inMonth
                  ? 'bg-white dark:bg-slate-900'
                  : 'bg-slate-50/60 dark:bg-slate-950/40'
              }`}
            >
              <div className="mb-1 sm:mb-1.5 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.innerWidth < 640) {
                      setExpandedDay(day);
                    } else {
                      onJumpToWeek(day);
                    }
                  }}
                  title="Open day"
                  className={`flex h-7 min-w-7 sm:h-6 sm:min-w-6 items-center justify-center rounded-md px-1 font-mono text-xs font-semibold tabular-nums transition-colors ${
                    isToday
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : inMonth
                        ? 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                        : 'text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800'
                  }`}
                >
                  {day.getDate()}
                </button>

                <div className="flex items-center gap-1">
                  {dayAlarms.length > 0 && (
                    <span
                      title={`${dayAlarms.length} active clock alarm(s)`}
                      className="inline-flex items-center gap-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-400"
                    >
                      <AlarmClock className="h-3 w-3" />
                      <span className="hidden sm:inline">
                        {formatTimeString(dayAlarms[0].time, settings.timeFormat)}
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDateCreate(day);
                    }}
                    aria-label={`Add event on ${dayKey}`}
                    className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 focus:opacity-100 h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-opacity dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile Compact Indicator Bars */}
              <div className="flex flex-col gap-1 sm:hidden">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className="h-1.5 w-full rounded-full"
                    style={{ backgroundColor: ev.color }}
                  />
                ))}
                {dayEvents.length > 2 && (
                  <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    +{dayEvents.length - 2}
                  </span>
                )}
              </div>

              {/* Desktop / Tablet Rich Event Chips */}
              <div className="hidden sm:block flex-1 space-y-1">
                {visibleEvents.map((ev) => {
                  const hasReminder = ev.reminders.some((r) => r.enabled);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-md border border-slate-200/90 bg-slate-50/70 px-1.5 py-1 text-left text-[11px] transition-colors hover:border-slate-300 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: ev.color }}
                      />
                      {!ev.allDay && (
                        <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                          {formatTimeFromDate(new Date(ev.start), settings.timeFormat)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                        {ev.title}
                      </span>
                      {hasReminder && (
                        <Bell className="h-2.5 w-2.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  );
                })}

                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDay(day);
                    }}
                    className="w-full px-1.5 py-0.5 text-left text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Summary / Overflow Bottom Sheet (Mobile) & Modal (Desktop) */}
      {expandedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {MONTH_NAMES[expandedDay.getMonth()]} {expandedDay.getDate()},{' '}
                  {expandedDay.getFullYear()}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {expandedDayEvents.length} event(s)
                  {expandedDayAlarms.length > 0
                    ? ` · ${expandedDayAlarms.length} alarm(s)`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedDay(null)}
                aria-label="Close day list"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto calendar-scroll">
              {expandedDayEvents.length === 0 && expandedDayAlarms.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No events scheduled for this day.
                </p>
              ) : (
                <>
                  {expandedDayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        setExpandedDay(null);
                        onSelectEvent(ev);
                      }}
                      className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: ev.color }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {ev.title}
                          </div>
                          <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {ev.allDay
                              ? 'All day'
                              : `${formatTimeFromDate(
                                  new Date(ev.start),
                                  settings.timeFormat
                                )} – ${formatTimeFromDate(new Date(ev.end), settings.timeFormat)}`}
                          </div>
                        </div>
                      </div>
                      {ev.reminders.some((r) => r.enabled) && (
                        <Bell className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  ))}

                  {expandedDayAlarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className="flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/20"
                    >
                      <div className="flex items-center gap-2">
                        <AlarmClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {alarm.label}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">
                        {formatTimeString(alarm.time, settings.timeFormat)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = expandedDay;
                  setExpandedDay(null);
                  onJumpToWeek(target);
                }}
                className="min-h-[44px] sm:min-h-0 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open Week View
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = expandedDay;
                  setExpandedDay(null);
                  onSelectDateCreate(target);
                }}
                className="min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Add Event on This Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
