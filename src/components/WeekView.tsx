import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, MapPin } from 'lucide-react';
import {
  eventOccursOnDay,
  formatHourLabel,
  formatReminderLabel,
  formatTimeFromDate,
  getWeekDays,
  isSameDay,
  layoutDayEvents,
  toDateKey,
  WEEKDAY_SHORT,
} from '@/src/lib/dateUtils';
import { AppSettings, CalendarEvent } from '@/src/types/calendar';

interface WeekViewProps {
  anchorDate: Date;
  events: CalendarEvent[];
  settings: AppSettings;
  onSelectSlot: (date: Date, hour: number) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT_PX = 56;

export function WeekView({
  anchorDate,
  events,
  settings,
  onSelectSlot,
  onSelectEvent,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT_PX;
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const weekDays = useMemo(
    () => getWeekDays(anchorDate, settings.weekStartsOn),
    [anchorDate, settings.weekStartsOn]
  );

  const allDayByDay = useMemo(() => {
    return weekDays.map((day) =>
      events.filter((ev) => ev.allDay && eventOccursOnDay(ev, day))
    );
  }, [weekDays, events]);

  const hasAnyAllDay = allDayByDay.some((list) => list.length > 0);

  const timedLayoutByDay = useMemo(() => {
    return weekDays.map((day) => layoutDayEvents(events, day));
  }, [weekDays, events]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTopPercent = (nowMinutes / 1440) * 100;

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-auto calendar-scroll bg-white pb-16 sm:pb-0 dark:bg-slate-900"
    >
      <div className="min-w-[680px] md:min-w-0">
        {/* Sticky Day Columns Header */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr]">
            <div className="sticky left-0 z-10 flex items-end justify-end border-r border-slate-200 bg-white px-1.5 sm:px-2 py-2.5 text-[10px] sm:text-[11px] font-mono text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
              GMT{now.getTimezoneOffset() <= 0 ? '+' : '-'}
              {Math.abs(Math.round(now.getTimezoneOffset() / 60))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, now);
                return (
                  <div
                    key={toDateKey(day)}
                    className={`flex flex-col items-center justify-center py-2 sm:py-2.5 ${
                      isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <span
                      className={`text-[11px] font-medium ${
                        isToday
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {WEEKDAY_SHORT[day.getDay()]}
                    </span>
                    <span
                      className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-semibold tabular-nums ${
                        isToday
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All-Day Events Row */}
          {hasAnyAllDay && (
            <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr] border-t border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950/90">
              <div className="sticky left-0 z-10 flex items-center justify-end border-r border-slate-200 bg-slate-50 px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                All day
              </div>
              <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800">
                {weekDays.map((day, idx) => (
                  <div key={toDateKey(day)} className="min-h-[34px] space-y-1 p-1">
                    {allDayByDay[idx].map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-xs font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: ev.color }}
                        />
                        <span className="truncate">{ev.title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 24-Hour Time Grid */}
        <div
          className="relative grid grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr]"
          style={{ height: `${24 * HOUR_HEIGHT_PX}px` }}
        >
          {/* Sticky Left Time Gutter */}
          <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative pr-1.5 sm:pr-2 text-right"
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
              >
                {hour > 0 && (
                  <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 tabular-nums -translate-y-2 inline-block dark:text-slate-500">
                    {formatHourLabel(hour, settings.timeFormat)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 7-Day Columns */}
          <div className="relative grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800">
            {/* Horizontal Hour Grid Lines */}
            <div className="pointer-events-none absolute inset-0">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-slate-100 dark:border-slate-800/80"
                  style={{ height: `${HOUR_HEIGHT_PX}px` }}
                >
                  <div
                    className="border-b border-dashed border-slate-100/70 dark:border-slate-800/40"
                    style={{ height: `${HOUR_HEIGHT_PX / 2}px` }}
                  />
                </div>
              ))}
            </div>

            {weekDays.map((day, dayIdx) => {
              const isToday = isSameDay(day, now);
              const dayEvents = timedLayoutByDay[dayIdx];

              return (
                <div
                  key={toDateKey(day)}
                  className={`relative h-full ${
                    isToday ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                  }`}
                >
                  {/* Clickable Hour Slots */}
                  {HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      aria-label={`Create event on ${toDateKey(day)} at ${formatHourLabel(
                        hour,
                        settings.timeFormat
                      )}`}
                      onClick={() => onSelectSlot(day, hour)}
                      className="block w-full hover:bg-blue-50/40 transition-colors focus-visible:outline-none focus-visible:bg-blue-50/50 dark:hover:bg-slate-800/40"
                      style={{ height: `${HOUR_HEIGHT_PX}px` }}
                    />
                  ))}

                  {/* Current Time Indicator */}
                  {isToday && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: `${nowTopPercent}%` }}
                    >
                      <span className="-ml-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                      <span className="h-0.5 flex-1 bg-blue-600 dark:bg-blue-400" />
                    </div>
                  )}

                  {/* Positioned Events */}
                  {dayEvents.map((item) => {
                    const widthPct = 100 / item.totalCols;
                    const leftPct = item.colIndex * widthPct;
                    const startDate = new Date(item.event.start);
                    const endDate = new Date(item.event.end);
                    const activeReminders = item.event.reminders.filter((r) => r.enabled);
                    const isCompact = item.endMinutes - item.startMinutes < 50;

                    return (
                      <button
                        key={`${item.event.id}-${dayIdx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(item.event);
                        }}
                        style={{
                          top: `${item.topPercent}%`,
                          height: `${item.heightPercent}%`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                        className="group absolute z-10 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/95 p-1.5 text-left shadow-xs transition-all hover:z-20 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/95 dark:hover:border-slate-600"
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-sm"
                            style={{ backgroundColor: item.event.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {item.event.title}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                              {formatTimeFromDate(startDate, settings.timeFormat)}
                              {!isCompact && ` – ${formatTimeFromDate(endDate, settings.timeFormat)}`}
                            </div>
                          </div>
                        </div>

                        {!isCompact && item.event.location && (
                          <div className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500 dark:text-slate-400">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{item.event.location}</span>
                          </div>
                        )}

                        {!isCompact && activeReminders.length > 0 && (
                          <div className="mt-auto flex items-center gap-1 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Bell className="h-2.5 w-2.5 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span className="truncate">
                              {formatReminderLabel(activeReminders[0].minutesBefore)}
                              {activeReminders.length > 1
                                ? ` · +${activeReminders.length - 1}`
                                : ''}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
