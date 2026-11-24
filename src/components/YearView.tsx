import { useMemo } from 'react';
import {
  eventOccursOnDay,
  getMonthMatrix,
  isSameDay,
  MONTH_NAMES,
  toDateKey,
  WEEKDAY_INITIALS,
} from '@/src/lib/dateUtils';
import { AppSettings, CalendarEvent } from '@/src/types/calendar';

interface YearViewProps {
  year: number;
  events: CalendarEvent[];
  settings: AppSettings;
  onSelectMonth: (monthIndex: number) => void;
  onSelectDay: (date: Date) => void;
}

export function YearView({
  year,
  events,
  settings,
  onSelectMonth,
  onSelectDay,
}: YearViewProps) {
  const today = new Date();

  const weekdayHeaders = useMemo(() => {
    if (settings.weekStartsOn === 1) {
      return [...WEEKDAY_INITIALS.slice(1), WEEKDAY_INITIALS[0]];
    }
    return WEEKDAY_INITIALS;
  }, [settings.weekStartsOn]);

  // Pre-index event counts by YYYY-MM-DD for fast year rendering
  const daySummaryMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(year, month, d);
        const matching = events.filter((ev) => eventOccursOnDay(ev, day));
        if (matching.length > 0) {
          map.set(toDateKey(day), matching);
        }
      }
    }
    return map;
  }, [year, events]);

  const months = Array.from({ length: 12 }, (_, idx) => idx);

  return (
    <div className="h-full overflow-y-auto calendar-scroll bg-white p-4 pb-24 sm:p-6 sm:pb-6 dark:bg-slate-900">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((monthIdx) => {
          const matrix = getMonthMatrix(year, monthIdx, settings.weekStartsOn);
          const monthEventCount = Array.from(daySummaryMap.entries()).reduce(
            (acc, [key, list]) => {
              const m = Number(key.split('-')[1]) - 1;
              return m === monthIdx ? acc + list.length : acc;
            },
            0
          );

          return (
            <section
              key={monthIdx}
              className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <button
                  type="button"
                  onClick={() => onSelectMonth(monthIdx)}
                  className="font-display text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors dark:text-slate-100 dark:hover:text-blue-400"
                >
                  {MONTH_NAMES[monthIdx]}
                </button>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                  {monthEventCount > 0 ? `${monthEventCount} items` : 'Clear'}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayHeaders.map((label, idx) => (
                  <div
                    key={`${monthIdx}-w-${idx}`}
                    className="pb-1 text-[10px] font-medium text-slate-400 dark:text-slate-500"
                  >
                    {label}
                  </div>
                ))}

                {matrix.map((day) => {
                  const inMonth = day.getMonth() === monthIdx;
                  if (!inMonth) {
                    return (
                      <div
                        key={day.toISOString()}
                        className="h-9 sm:h-7 w-full"
                        aria-hidden="true"
                      />
                    );
                  }

                  const key = toDateKey(day);
                  const dayEvents = daySummaryMap.get(key) || [];
                  const isToday = isSameDay(day, today);
                  const count = dayEvents.length;

                  const intensityClass = isToday
                    ? 'bg-blue-600 text-white font-semibold dark:bg-blue-500'
                    : count >= 3
                      ? 'bg-blue-100 text-blue-900 font-semibold dark:bg-blue-950/70 dark:text-blue-200'
                      : count > 0
                        ? 'bg-slate-100 text-slate-900 font-medium dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50';

                  const tooltip =
                    count > 0
                      ? `${key}: ${count} event(s) — ${dayEvents
                          .slice(0, 2)
                          .map((e) => e.title)
                          .join(', ')}`
                      : `${key}: Click to open week`;

                  return (
                    <button
                      key={key}
                      type="button"
                      title={tooltip}
                      onClick={() => onSelectDay(day)}
                      className={`relative flex h-9 sm:h-7 w-full items-center justify-center rounded-md font-mono text-xs sm:text-[11px] tabular-nums transition-colors ${intensityClass}`}
                    >
                      <span>{day.getDate()}</span>
                      {count > 0 && !isToday && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0.5 h-0.5 w-2 rounded-full"
                          style={{ backgroundColor: dayEvents[0].color }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
