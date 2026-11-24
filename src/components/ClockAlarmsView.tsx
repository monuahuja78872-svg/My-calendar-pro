import { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  Bell,
  Clock,
  Globe,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  formatReminderLabel,
  formatTimeFromDate,
  formatTimeString,
  getEventStartDate,
  WEEKDAY_SHORT,
} from '@/src/lib/dateUtils';
import { playReminderSound } from '@/src/lib/soundEngine';
import {
  AppSettings,
  CalendarEvent,
  ClockAlarm,
  ReminderSound,
} from '@/src/types/calendar';

interface ClockAlarmsViewProps {
  events: CalendarEvent[];
  alarms: ClockAlarm[];
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onAddAlarm: (alarm: Omit<ClockAlarm, 'id'>) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onEditEventReminders: (event: CalendarEvent) => void;
  onTimerComplete: (label: string, sound: ReminderSound) => void;
}

const SOUND_OPTIONS: { value: ReminderSound; label: string }[] = [
  { value: 'gentle', label: 'Gentle Chime' },
  { value: 'bell', label: 'Crisp Bell' },
  { value: 'marimba', label: 'Warm Marimba' },
  { value: 'pulse', label: 'Digital Pulse' },
  { value: 'silent', label: 'Visual Only (Silent)' },
];

const WORLD_TZ_CHOICES = [
  { tz: 'UTC', label: 'UTC' },
  { tz: 'America/New_York', label: 'New York' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles' },
  { tz: 'Europe/London', label: 'London' },
  { tz: 'Europe/Berlin', label: 'Berlin' },
  { tz: 'Asia/Dubai', label: 'Dubai' },
  { tz: 'Asia/Kolkata', label: 'Mumbai / Delhi' },
  { tz: 'Asia/Tokyo', label: 'Tokyo' },
  { tz: 'Australia/Sydney', label: 'Sydney' },
];

export function ClockAlarmsView({
  events,
  alarms,
  settings,
  onUpdateSettings,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onEditEventReminders,
  onTimerComplete,
}: ClockAlarmsViewProps) {
  const [now, setNow] = useState(() => new Date());

  // New Alarm State
  const [alarmLabel, setAlarmLabel] = useState('');
  const [alarmTime, setAlarmTime] = useState('09:00');
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [alarmDate, setAlarmDate] = useState('');
  const [alarmSound, setAlarmSound] = useState<ReminderSound>('gentle');
  const [alarmSnooze, setAlarmSnooze] = useState(10);

  // Quick Countdown Timer State
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerLabel, setTimerLabel] = useState('Focus Session');
  const [timerRemainingSec, setTimerRemainingSec] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSound, setTimerSound] = useState<ReminderSound>('bell');

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timerRunning || timerRemainingSec === null) return;
    const id = window.setInterval(() => {
      setTimerRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setTimerRunning(false);
          onTimerComplete(timerLabel || 'Focus Timer', timerSound);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerRemainingSec, timerLabel, timerSound, onTimerComplete]);

  const secondsAngle = now.getSeconds() * 6;
  const minutesAngle = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const hoursAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;

  const upcomingReminderEvents = useMemo(() => {
    const nowMs = Date.now();
    return [...events]
      .filter((ev) => getEventStartDate(ev).getTime() >= nowMs - 86400000)
      .sort((a, b) => getEventStartDate(a).getTime() - getEventStartDate(b).getTime())
      .slice(0, 20);
  }, [events]);

  const handleCreateAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTime) return;
    onAddAlarm({
      label: alarmLabel.trim() || 'Clock Reminder',
      time: alarmTime,
      repeatDays: alarmDate ? [] : alarmDays,
      date: alarmDate || undefined,
      enabled: true,
      sound: alarmSound,
      snoozeMinutes: alarmSnooze,
    });
    setAlarmLabel('');
  };

  const toggleDay = (dayIdx: number) => {
    setAlarmDate('');
    setAlarmDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort()
    );
  };

  const formatTimerClock = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(
        2,
        '0'
      )}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleTimezone = (tz: string) => {
    const exists = settings.worldTimezones.includes(tz);
    const next = exists
      ? settings.worldTimezones.filter((t) => t !== tz)
      : [...settings.worldTimezones, tz];
    onUpdateSettings({ worldTimezones: next });
  };

  return (
    <div className="h-full overflow-y-auto calendar-scroll bg-slate-50/50 p-4 pb-24 sm:p-6 sm:pb-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1280px] space-y-6">
        {/* Top Section: Precision Clock + Quick Countdown Timer */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Precision Analog + Digital Clock */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Master Precision Clock
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Local system clock synchronized with your schedule reminders
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ timeFormat: '12h' })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    settings.timeFormat === '12h'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  12-Hour
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ timeFormat: '24h' })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    settings.timeFormat === '24h'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  24-Hour
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
              {/* Minimalist Analog Dial */}
              <svg
                viewBox="0 0 120 120"
                className="h-32 w-32 shrink-0 text-slate-900 dark:text-slate-100"
                aria-label="Analog clock"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.16"
                  strokeWidth="2"
                />
                {Array.from({ length: 12 }, (_, idx) => {
                  const angle = (idx * 30 * Math.PI) / 180;
                  const x1 = 60 + Math.sin(angle) * 47;
                  const y1 = 60 - Math.cos(angle) * 47;
                  const x2 = 60 + Math.sin(angle) * 52;
                  const y2 = 60 - Math.cos(angle) * 52;
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      strokeOpacity={idx % 3 === 0 ? 0.65 : 0.25}
                      strokeWidth={idx % 3 === 0 ? 2 : 1.2}
                    />
                  );
                })}
                {/* Hour Hand */}
                <line
                  x1="60"
                  y1="60"
                  x2="60"
                  y2="30"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${hoursAngle} 60 60)`}
                />
                {/* Minute Hand */}
                <line
                  x1="60"
                  y1="60"
                  x2="60"
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${minutesAngle} 60 60)`}
                />
                {/* Second Hand */}
                <line
                  x1="60"
                  y1="68"
                  x2="60"
                  y2="16"
                  stroke="#2563EB"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  transform={`rotate(${secondsAngle} 60 60)`}
                />
                <circle cx="60" cy="60" r="3" fill="#2563EB" />
              </svg>

              <div>
                <div className="font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-5xl dark:text-slate-100">
                  {now.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: settings.timeFormat === '12h',
                  })}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {now.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* World Timezones */}
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Globe className="h-3.5 w-3.5" />
                  <span>World Clocks</span>
                </span>
                <select
                  aria-label="Toggle world timezone"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) toggleTimezone(e.target.value);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">+ Add / Remove City</option>
                  {WORLD_TZ_CHOICES.map((c) => (
                    <option key={c.tz} value={c.tz}>
                      {settings.worldTimezones.includes(c.tz) ? 'Remove ' : 'Add '}
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {settings.worldTimezones.map((tz) => {
                  const meta = WORLD_TZ_CHOICES.find((c) => c.tz === tz);
                  const formatted = now.toLocaleTimeString([], {
                    timeZone: tz,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: settings.timeFormat === '12h',
                  });
                  return (
                    <div
                      key={tz}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {meta?.label || tz}
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatted}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Countdown Focus / Reminder Timer */}
          <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Countdown Clock Timer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set an instant countdown reminder with audible alert
              </p>

              <div className="mt-5 text-center">
                <div className="font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                  {timerRemainingSec !== null
                    ? formatTimerClock(timerRemainingSec)
                    : formatTimerClock(timerMinutes * 60)}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Timer Label
                  </label>
                  <input
                    type="text"
                    value={timerLabel}
                    onChange={(e) => setTimerLabel(e.target.value)}
                    placeholder="Focus Session"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={480}
                      value={timerMinutes}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        setTimerMinutes(v);
                        if (!timerRunning) setTimerRemainingSec(null);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Sound Chime
                    </label>
                    <select
                      value={timerSound}
                      onChange={(e) => setTimerSound(e.target.value as ReminderSound)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {SOUND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              {!timerRunning ? (
                <button
                  type="button"
                  onClick={() => {
                    if (timerRemainingSec === null || timerRemainingSec === 0) {
                      setTimerRemainingSec(timerMinutes * 60);
                    }
                    setTimerRunning(true);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{timerRemainingSec ? 'Resume Timer' : 'Start Timer'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setTimerRunning(false)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerRemainingSec(null);
                }}
                aria-label="Reset timer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </section>
        </div>

        {/* Custom Clock Alarms Builder & List */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Custom Clock Alarms
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Schedule recurring weekday alarms or date-specific clock reminders with custom audio chimes
            </p>
          </div>

          <form
            onSubmit={handleCreateAlarm}
            className="mt-4 grid grid-cols-1 gap-3 border-b border-slate-200 pb-5 md:grid-cols-12 dark:border-slate-800"
          >
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Alarm Label
              </label>
              <input
                type="text"
                value={alarmLabel}
                onChange={(e) => setAlarmLabel(e.target.value)}
                placeholder="Daily Standup Alarm"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Time
              </label>
              <input
                type="time"
                required
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Repeat Days (or pick exact date)
              </label>
              <div className="mt-1 flex items-center gap-1">
                {WEEKDAY_SHORT.map((name, idx) => {
                  const selected = !alarmDate && alarmDays.includes(idx);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`h-8 w-8 rounded-md text-[11px] font-medium transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {name[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Sound & Snooze
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <select
                  value={alarmSound}
                  onChange={(e) => setAlarmSound(e.target.value as ReminderSound)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => playReminderSound(alarmSound)}
                  title="Preview sound"
                  aria-label="Preview alarm sound"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Alarm</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 md:col-span-12">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Specific one-time date (optional):
                </label>
                <input
                  type="date"
                  value={alarmDate}
                  onChange={(e) => setAlarmDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {alarmDate && (
                  <button
                    type="button"
                    onClick={() => setAlarmDate('')}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Use repeat days
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">Snooze:</label>
                <select
                  value={alarmSnooze}
                  onChange={(e) => setAlarmSnooze(Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                </select>
              </div>
            </div>
          </form>

          {alarms.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No clock alarms yet. Add one above to get audible and visual reminders.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3.5"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                      {formatTimeString(alarm.time, settings.timeFormat)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <AlarmClock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {alarm.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {alarm.date
                          ? `One-time on ${alarm.date}`
                          : alarm.repeatDays.length === 7
                            ? 'Every day'
                            : alarm.repeatDays.length > 0
                              ? alarm.repeatDays.map((d) => WEEKDAY_SHORT[d]).join(', ')
                              : 'Daily'}{' '}
                        · {SOUND_OPTIONS.find((s) => s.value === alarm.sound)?.label || alarm.sound}{' '}
                        · Snooze {alarm.snoozeMinutes}m
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={alarm.enabled}
                      onClick={() => onToggleAlarm(alarm.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
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
                    <button
                      type="button"
                      onClick={() => onDeleteAlarm(alarm.id)}
                      aria-label={`Delete alarm ${alarm.label}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All Scheduled Event Reminders Ledger */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Scheduled Event Reminders
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage custom reminder lead times and alert sounds across your Local and Google Calendar events
            </p>
          </div>

          {upcomingReminderEvents.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No upcoming events scheduled. Create an event to attach custom reminders.
            </p>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
                {upcomingReminderEvents.map((ev) => {
                  const startDate = getEventStartDate(ev);
                  const activeReminders = ev.reminders.filter((r) => r.enabled);
                  return (
                    <div key={ev.id} className="py-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: ev.color }}
                          />
                          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {ev.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditEventReminders(ev)}
                          className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Clock className="h-3 w-3" />
                          <span>Customize</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono tabular-nums">
                          {startDate.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          ·{' '}
                          {ev.allDay
                            ? 'All day'
                            : formatTimeFromDate(startDate, settings.timeFormat)}
                        </span>{' '}
                        · {ev.source === 'google' ? 'Google Calendar' : 'Local'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {activeReminders.length === 0 ? (
                          <span className="text-slate-400">No active reminders</span>
                        ) : (
                          <div className="flex items-start gap-1.5">
                            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>
                              {activeReminders
                                .map(
                                  (r) =>
                                    `${formatReminderLabel(r.minutesBefore)} (${
                                      r.method === 'email' ? 'Email' : 'Alert'
                                    })`
                                )
                                .join(' · ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Data Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="py-3 pr-4 font-medium">Event</th>
                      <th className="py-3 pr-4 font-medium">Date & Time</th>
                      <th className="py-3 pr-4 font-medium">Source</th>
                      <th className="py-3 pr-4 font-medium">Custom Reminders</th>
                      <th className="py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {upcomingReminderEvents.map((ev) => {
                      const startDate = getEventStartDate(ev);
                      const activeReminders = ev.reminders.filter((r) => r.enabled);
                      return (
                        <tr
                          key={ev.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: ev.color }}
                              />
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {ev.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-300">
                            {startDate.toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            ·{' '}
                            {ev.allDay
                              ? 'All day'
                              : formatTimeFromDate(startDate, settings.timeFormat)}
                          </td>
                          <td className="py-3 pr-4 text-slate-500 whitespace-nowrap dark:text-slate-400">
                            {ev.source === 'google' ? 'Google Calendar' : 'Local'}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                            {activeReminders.length === 0 ? (
                              <span className="text-slate-400">No active reminders</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <Bell className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                <span>
                                  {activeReminders
                                    .map(
                                      (r) =>
                                        `${formatReminderLabel(r.minutesBefore)} (${
                                          r.method === 'email' ? 'Email' : 'Alert'
                                        })`
                                    )
                                    .join(' · ')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onEditEventReminders(ev)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Clock className="h-3 w-3" />
                              <span>Customize</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
