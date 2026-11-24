import { addDays, toDateKey } from '@/src/lib/dateUtils';
import { AppSettings, CalendarEvent, ClockAlarm } from '@/src/types/calendar';

export const EVENT_COLOR_OPTIONS = [
  { name: 'Cobalt', hex: '#2563EB' },
  { name: 'Emerald', hex: '#16A34A' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Crimson', hex: '#DC2626' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Teal', hex: '#0D9488' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  timeFormat: '12h',
  weekStartsOn: 0,
  soundEnabled: true,
  browserNotifications: false,
  defaultReminderMinutes: 10,
  defaultReminderSound: 'gentle',
  worldTimezones: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
};

export function createInitialLocalEvents(now: Date = new Date()): CalendarEvent[] {
  const todayKey = toDateKey(now);
  const tomorrowKey = toDateKey(addDays(now, 1));
  const twoDaysKey = toDateKey(addDays(now, 2));
  const threeDaysKey = toDateKey(addDays(now, 3));

  const atHour = (dateKey: string, h: number, m: number) => {
    const [y, mo, d] = dateKey.split('-').map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0).toISOString();
  };

  return [
    {
      id: 'local-seed-1',
      calendarId: 'local-primary',
      source: 'local',
      title: 'Weekly Design & Roadmap Sync',
      description: 'Review sprint deliverables, calendar milestones, and Q4 product roadmap.',
      location: 'Studio Room B',
      start: atHour(todayKey, 9, 30),
      end: atHour(todayKey, 10, 30),
      allDay: false,
      color: '#2563EB',
      reminders: [
        {
          id: 'rem-seed-1a',
          value: 15,
          unit: 'minutes',
          minutesBefore: 15,
          method: 'popup',
          sound: 'gentle',
          enabled: true,
        },
      ],
    },
    {
      id: 'local-seed-2',
      calendarId: 'local-primary',
      source: 'local',
      title: 'Deep Focus Architecture Block',
      description: 'Uninterrupted engineering and specification review.',
      start: atHour(todayKey, 14, 0),
      end: atHour(todayKey, 16, 0),
      allDay: false,
      color: '#0D9488',
      reminders: [
        {
          id: 'rem-seed-2a',
          value: 10,
          unit: 'minutes',
          minutesBefore: 10,
          method: 'popup',
          sound: 'bell',
          enabled: true,
        },
      ],
    },
    {
      id: 'local-seed-3',
      calendarId: 'local-primary',
      source: 'local',
      title: 'Client Milestone Review',
      description: 'Walk through upcoming deliverables and timeline sign-off.',
      location: 'Video Call',
      start: atHour(tomorrowKey, 11, 0),
      end: atHour(tomorrowKey, 12, 0),
      allDay: false,
      color: '#7C3AED',
      reminders: [
        {
          id: 'rem-seed-3a',
          value: 30,
          unit: 'minutes',
          minutesBefore: 30,
          method: 'popup',
          sound: 'marimba',
          enabled: true,
        },
        {
          id: 'rem-seed-3b',
          value: 1,
          unit: 'days',
          minutesBefore: 1440,
          method: 'popup',
          sound: 'gentle',
          enabled: true,
        },
      ],
    },
    {
      id: 'local-seed-4',
      calendarId: 'local-primary',
      source: 'local',
      title: 'Quarterly Planning Offsite',
      description: 'All-day cross-functional strategy workshop.',
      start: twoDaysKey,
      end: threeDaysKey,
      allDay: true,
      color: '#D97706',
      reminders: [
        {
          id: 'rem-seed-4a',
          value: 2,
          unit: 'hours',
          minutesBefore: 120,
          method: 'popup',
          sound: 'bell',
          enabled: true,
        },
      ],
    },
  ];
}

export function createInitialClockAlarms(): ClockAlarm[] {
  return [
    {
      id: 'alarm-seed-1',
      label: 'Morning Schedule Briefing',
      time: '08:30',
      repeatDays: [1, 2, 3, 4, 5],
      enabled: true,
      sound: 'gentle',
      snoozeMinutes: 10,
    },
    {
      id: 'alarm-seed-2',
      label: 'End-of-Day Wrap & Tomorrow Prep',
      time: '17:45',
      repeatDays: [1, 2, 3, 4, 5],
      enabled: true,
      sound: 'marimba',
      snoozeMinutes: 5,
    },
  ];
}
