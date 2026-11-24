import { CalendarEvent, ReminderUnit } from '@/src/types/calendar';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return startOfDay(addDays(date, -diff));
}

export function getWeekDays(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthMatrix(year: number, month: number, weekStartsOn: 0 | 1): Date[] {
  const firstDay = new Date(year, month, 1);
  const start = startOfWeek(firstDay, weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function formatTimeFromDate(date: Date, timeFormat: '12h' | '24h'): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (timeFormat === '24h') {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${minutes} ${period}`;
}

export function formatTimeString(hhmm: string, timeFormat: '12h' | '24h'): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr ?? 0);
  const m = String(Number(mStr ?? 0)).padStart(2, '0');
  if (timeFormat === '24h') {
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

export function formatHourLabel(hour: number, timeFormat: '12h' | '24h'): string {
  if (timeFormat === '24h') {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function computeMinutesBefore(value: number, unit: ReminderUnit): number {
  const safe = Math.max(0, Math.round(value));
  if (unit === 'hours') return safe * 60;
  if (unit === 'days') return safe * 1440;
  return safe;
}

export function decomposeMinutesBefore(minutes: number): { value: number; unit: ReminderUnit } {
  if (minutes > 0 && minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: 'days' };
  }
  if (minutes > 0 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'hours' };
  }
  return { value: minutes, unit: 'minutes' };
}

export function formatReminderLabel(minutesBefore: number): string {
  if (minutesBefore === 0) return 'At event time';
  if (minutesBefore < 60) return `${minutesBefore} min before`;
  if (minutesBefore % 1440 === 0) {
    const days = minutesBefore / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'} before`;
  }
  if (minutesBefore % 60 === 0) {
    const hours = minutesBefore / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} before`;
  }
  const hours = Math.floor(minutesBefore / 60);
  const mins = minutesBefore % 60;
  return `${hours}h ${mins}m before`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Now';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getEventStartDate(event: CalendarEvent): Date {
  if (event.allDay) {
    return parseDateKey(event.start.slice(0, 10));
  }
  return new Date(event.start);
}

export function getEventEndDate(event: CalendarEvent): Date {
  if (event.allDay) {
    const endKey = event.end.slice(0, 10);
    const d = parseDateKey(endKey);
    // Google Calendar all-day end is exclusive; local normalized to inclusive or exclusive -> handle cleanly
    return d;
  }
  return new Date(event.end);
}

export function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const dayKey = toDateKey(day);
  if (event.allDay) {
    const startKey = event.start.slice(0, 10);
    const endKey = event.end.slice(0, 10);
    // If endKey > startKey, treat endKey as exclusive (standard iCal/Google)
    if (endKey > startKey) {
      return dayKey >= startKey && dayKey < endKey;
    }
    return dayKey === startKey;
  }
  const s = new Date(event.start);
  const e = new Date(event.end);
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  return s.getTime() <= dayEnd && e.getTime() > dayStart;
}

export interface PositionedWeekEvent {
  event: CalendarEvent;
  topPercent: number;
  heightPercent: number;
  colIndex: number;
  totalCols: number;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Computes side-by-side layout columns for overlapping timed events on a given day.
 */
export function layoutDayEvents(events: CalendarEvent[], day: Date): PositionedWeekEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 86400000;

  const items = events
    .filter((ev) => !ev.allDay && eventOccursOnDay(ev, day))
    .map((event) => {
      const s = Math.max(new Date(event.start).getTime(), dayStart);
      const e = Math.min(new Date(event.end).getTime(), dayEnd);
      const startMinutes = Math.max(0, Math.round((s - dayStart) / 60000));
      const endMinutes = Math.max(startMinutes + 20, Math.round((e - dayStart) / 60000));
      return { event, startMinutes, endMinutes };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

  if (items.length === 0) return [];

  // Group into overlapping clusters
  const positioned: PositionedWeekEvent[] = [];
  let cluster: typeof items = [];
  let clusterMaxEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnsEnd: number[] = [];
    const assigned: { item: (typeof items)[number]; colIndex: number }[] = [];

    for (const item of cluster) {
      let col = columnsEnd.findIndex((endMin) => endMin <= item.startMinutes);
      if (col === -1) {
        col = columnsEnd.length;
        columnsEnd.push(item.endMinutes);
      } else {
        columnsEnd[col] = item.endMinutes;
      }
      assigned.push({ item, colIndex: col });
    }

    const totalCols = Math.max(1, columnsEnd.length);
    for (const { item, colIndex } of assigned) {
      positioned.push({
        event: item.event,
        topPercent: (item.startMinutes / 1440) * 100,
        heightPercent: Math.max(((item.endMinutes - item.startMinutes) / 1440) * 100, (25 / 1440) * 100),
        colIndex,
        totalCols,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
      });
    }
    cluster = [];
    clusterMaxEnd = -1;
  };

  for (const item of items) {
    if (cluster.length === 0 || item.startMinutes < clusterMaxEnd) {
      cluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.endMinutes);
    } else {
      flushCluster();
      cluster.push(item);
      clusterMaxEnd = item.endMinutes;
    }
  }
  flushCluster();

  return positioned;
}

export function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
