export type CalendarView = 'week' | 'month' | 'year' | 'clock';

export type ReminderUnit = 'minutes' | 'hours' | 'days';

export type ReminderMethod = 'popup' | 'email';

export type ReminderSound = 'gentle' | 'bell' | 'marimba' | 'pulse' | 'silent';

export interface EventReminder {
  id: string;
  /** Offset value in `unit` before event start (0 = at event start) */
  value: number;
  unit: ReminderUnit;
  /** Total minutes before event start (computed for Google Calendar API & scheduler) */
  minutesBefore: number;
  method: ReminderMethod;
  sound: ReminderSound;
  enabled: boolean;
}

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  source: 'local' | 'google';
  primary?: boolean;
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  visible: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  source: 'local' | 'google';
  googleEventId?: string;
  title: string;
  description?: string;
  location?: string;
  /** ISO string or YYYY-MM-DD for all-day */
  start: string;
  /** ISO string or YYYY-MM-DD (exclusive or inclusive normalized cleanly) */
  end: string;
  allDay: boolean;
  color: string;
  reminders: EventReminder[];
  htmlLink?: string;
}

export interface ClockAlarm {
  id: string;
  label: string;
  /** HH:MM in 24-hour format */
  time: string;
  /** 0 = Sunday .. 6 = Saturday. Empty array means one-time on `date` */
  repeatDays: number[];
  /** Optional YYYY-MM-DD for one-time alarm */
  date?: string;
  enabled: boolean;
  sound: ReminderSound;
  snoozeMinutes: number;
  linkedEventId?: string;
}

export interface ActiveAlert {
  alertKey: string;
  kind: 'event' | 'alarm' | 'timer';
  title: string;
  subtitle: string;
  triggerAt: number;
  sound: ReminderSound;
  eventId?: string;
  alarmId?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  soundEnabled: boolean;
  browserNotifications: boolean;
  defaultReminderMinutes: number;
  defaultReminderSound: ReminderSound;
  worldTimezones: string[];
}

export interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}
