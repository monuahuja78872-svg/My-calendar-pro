import { decomposeMinutesBefore } from '@/src/lib/dateUtils';
import {
  CalendarEvent,
  CalendarSource,
  EventReminder,
  ReminderSound,
} from '@/src/types/calendar';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarListItem {
  id: string;
  summary?: string;
  backgroundColor?: string;
  primary?: boolean;
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
}

interface GoogleEventReminderOverride {
  method: 'popup' | 'email';
  minutes: number;
}

interface GoogleCalendarEventResource {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault?: boolean;
    overrides?: GoogleEventReminderOverride[];
  };
  status?: string;
}

export class GoogleAuthExpiredError extends Error {
  constructor(message = 'Google Calendar session expired. Please sign in again.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

async function googleFetch(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401) {
    throw new GoogleAuthExpiredError();
  }

  if (!response.ok) {
    let errorText = `Google Calendar error (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error?.message) {
        errorText = payload.error.message;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(errorText);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function fetchCalendarList(accessToken: string): Promise<CalendarSource[]> {
  const data = await googleFetch(`${CALENDAR_API_BASE}/users/me/calendarList?minAccessRole=reader`, accessToken);
  const items: GoogleCalendarListItem[] = Array.isArray(data?.items) ? data.items : [];
  return items.map((cal) => ({
    id: cal.id,
    name: cal.summary || 'Google Calendar',
    color: cal.backgroundColor || '#2563EB',
    source: 'google' as const,
    primary: Boolean(cal.primary),
    accessRole: cal.accessRole || 'reader',
    visible: true,
  }));
}

function mapGoogleReminders(
  reminders: GoogleCalendarEventResource['reminders'],
  defaultSound: ReminderSound
): EventReminder[] {
  const overrides = reminders?.overrides;
  if (overrides && overrides.length > 0) {
    return overrides.map((ov, idx) => {
      const { value, unit } = decomposeMinutesBefore(ov.minutes);
      return {
        id: `g-rem-${idx}-${ov.minutes}-${ov.method}`,
        value,
        unit,
        minutesBefore: ov.minutes,
        method: ov.method === 'email' ? 'email' : 'popup',
        sound: defaultSound,
        enabled: true,
      };
    });
  }
  if (reminders?.useDefault) {
    return [
      {
        id: 'g-rem-default-10',
        value: 10,
        unit: 'minutes',
        minutesBefore: 10,
        method: 'popup',
        sound: defaultSound,
        enabled: true,
      },
    ];
  }
  return [];
}

export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string,
  calendarColor: string,
  defaultSound: ReminderSound
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
  });

  const encodedId = encodeURIComponent(calendarId);
  const data = await googleFetch(
    `${CALENDAR_API_BASE}/calendars/${encodedId}/events?${params.toString()}`,
    accessToken
  );

  const items: GoogleCalendarEventResource[] = Array.isArray(data?.items) ? data.items : [];

  return items
    .filter((item) => item.status !== 'cancelled' && (item.start?.dateTime || item.start?.date))
    .map((item) => {
      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      const start = isAllDay ? item.start!.date! : item.start!.dateTime!;
      const end = isAllDay
        ? item.end?.date || item.start!.date!
        : item.end?.dateTime || item.start!.dateTime!;

      return {
        id: `google:${calendarId}:${item.id}`,
        calendarId,
        source: 'google' as const,
        googleEventId: item.id,
        title: item.summary || '(No title)',
        description: item.description || '',
        location: item.location || '',
        start,
        end,
        allDay: isAllDay,
        color: calendarColor,
        reminders: mapGoogleReminders(item.reminders, defaultSound),
        htmlLink: item.htmlLink,
      };
    });
}

function buildGoogleEventBody(event: Omit<CalendarEvent, 'id' | 'source'>) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const activeReminders = event.reminders
    .filter((r) => r.enabled)
    .slice(0, 5)
    .map((r) => ({
      method: r.method,
      minutes: Math.min(40320, Math.max(0, r.minutesBefore)),
    }));

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.allDay
      ? { date: event.start.slice(0, 10) }
      : { dateTime: new Date(event.start).toISOString(), timeZone },
    end: event.allDay
      ? { date: event.end.slice(0, 10) }
      : { dateTime: new Date(event.end).toISOString(), timeZone },
    reminders: {
      useDefault: false,
      overrides: activeReminders,
    },
  };
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventData: Omit<CalendarEvent, 'id' | 'source'>,
  defaultSound: ReminderSound
): Promise<CalendarEvent> {
  const encodedId = encodeURIComponent(calendarId);
  const created: GoogleCalendarEventResource = await googleFetch(
    `${CALENDAR_API_BASE}/calendars/${encodedId}/events`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(buildGoogleEventBody(eventData)),
    }
  );

  const isAllDay = Boolean(created.start?.date && !created.start?.dateTime);
  return {
    id: `google:${calendarId}:${created.id}`,
    calendarId,
    source: 'google',
    googleEventId: created.id,
    title: created.summary || eventData.title,
    description: created.description || eventData.description || '',
    location: created.location || eventData.location || '',
    start: isAllDay ? created.start!.date! : created.start!.dateTime!,
    end: isAllDay ? created.end!.date! : created.end!.dateTime!,
    allDay: isAllDay,
    color: eventData.color,
    reminders:
      eventData.reminders.length > 0
        ? eventData.reminders
        : mapGoogleReminders(created.reminders, defaultSound),
    htmlLink: created.htmlLink,
  };
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  eventData: Omit<CalendarEvent, 'id' | 'source'>,
  defaultSound: ReminderSound
): Promise<CalendarEvent> {
  const encodedCal = encodeURIComponent(calendarId);
  const encodedEvent = encodeURIComponent(googleEventId);
  const updated: GoogleCalendarEventResource = await googleFetch(
    `${CALENDAR_API_BASE}/calendars/${encodedCal}/events/${encodedEvent}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(buildGoogleEventBody(eventData)),
    }
  );

  const isAllDay = Boolean(updated.start?.date && !updated.start?.dateTime);
  return {
    id: `google:${calendarId}:${updated.id}`,
    calendarId,
    source: 'google',
    googleEventId: updated.id,
    title: updated.summary || eventData.title,
    description: updated.description || eventData.description || '',
    location: updated.location || eventData.location || '',
    start: isAllDay ? updated.start!.date! : updated.start!.dateTime!,
    end: isAllDay ? updated.end!.date! : updated.end!.dateTime!,
    allDay: isAllDay,
    color: eventData.color,
    reminders:
      eventData.reminders.length > 0
        ? eventData.reminders
        : mapGoogleReminders(updated.reminders, defaultSound),
    htmlLink: updated.htmlLink,
  };
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string
): Promise<void> {
  const encodedCal = encodeURIComponent(calendarId);
  const encodedEvent = encodeURIComponent(googleEventId);
  await googleFetch(
    `${CALENDAR_API_BASE}/calendars/${encodedCal}/events/${encodedEvent}`,
    accessToken,
    {
      method: 'DELETE',
    }
  );
}
