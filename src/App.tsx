import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActiveAlertBanner } from '@/src/components/ActiveAlertBanner';
import { ClockAlarmsView } from '@/src/components/ClockAlarmsView';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { EventModal } from '@/src/components/EventModal';
import { MobileBottomNav } from '@/src/components/MobileBottomNav';
import { MonthView } from '@/src/components/MonthView';
import { OfflineIndicator } from '@/src/components/OfflineIndicator';
import { Sidebar } from '@/src/components/Sidebar';
import { TopNav } from '@/src/components/TopNav';
import { WeekView } from '@/src/components/WeekView';
import { WorkspaceToolbar } from '@/src/components/WorkspaceToolbar';
import { YearView } from '@/src/components/YearView';
import {
  addDays,
  addMonths,
  formatReminderLabel,
  getEventStartDate,
  getWeekDays,
  MONTH_NAMES,
  MONTH_SHORT,
  toDateKey,
} from '@/src/lib/dateUtils';
import {
  createInitialClockAlarms,
  createInitialLocalEvents,
  DEFAULT_SETTINGS,
} from '@/src/lib/defaultData';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from '@/src/lib/googleAuth';
import {
  createGoogleEvent,
  deleteGoogleEvent,
  fetchCalendarEvents,
  fetchCalendarList,
  GoogleAuthExpiredError,
  updateGoogleEvent,
} from '@/src/lib/googleCalendar';
import {
  playReminderSound,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from '@/src/lib/soundEngine';
import {
  ActiveAlert,
  AppSettings,
  CalendarEvent,
  CalendarSource,
  CalendarView,
  ClockAlarm,
  PendingConfirmation,
  ReminderSound,
} from '@/src/types/calendar';

const STORAGE_KEYS = {
  settings: 'my_pro_calendar_settings_v1',
  localEvents: 'my_pro_calendar_local_events_v1',
  alarms: 'my_pro_calendar_alarms_v1',
  calVisibility: 'my_pro_calendar_visibility_v1',
};

function readStorage<T>(key: string, fallback: () => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() =>
    readStorage(STORAGE_KEYS.settings, () => DEFAULT_SETTINGS)
  );
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() =>
    readStorage(STORAGE_KEYS.localEvents, () => createInitialLocalEvents())
  );
  const [alarms, setAlarms] = useState<ClockAlarm[]>(() =>
    readStorage(STORAGE_KEYS.alarms, () => createInitialClockAlarms())
  );
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() =>
    readStorage(STORAGE_KEYS.calVisibility, () => ({}))
  );

  // Google Calendar state (token strictly kept in memory inside googleAuth.ts)
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(true);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [googleCalendars, setGoogleCalendars] = useState<CalendarSource[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [syncNotice, setSyncNotice] = useState<{
    tone: 'error' | 'info';
    message: string;
  } | null>(null);

  // Modal & Confirmation state
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<Date | null>(null);
  const [modalInitialHour, setModalInitialHour] = useState<number | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [isConfirmBusy, setIsConfirmBusy] = useState(false);

  // Real-time Alerts & Snooze Queue
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [snoozedAlerts, setSnoozedAlerts] = useState<
    { alert: ActiveAlert; wakeAt: number }[]
  >([]);
  const firedAlertKeysRef = useRef<Set<string>>(new Set());

  // Sync Tailwind dark class on <html> and browser theme-color meta tag
  useEffect(() => {
    const isDark = settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0f172a' : '#2563eb');
    }
  }, [settings.theme]);

  // Persist user preferences, local events, and alarms (no secrets/tokens)
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.localEvents, JSON.stringify(localEvents));
    } catch {
      // ignore quota errors
    }
  }, [localEvents]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.alarms, JSON.stringify(alarms));
    } catch {
      // ignore quota errors
    }
  }, [alarms]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.calVisibility,
        JSON.stringify(visibilityMap)
      );
    } catch {
      // ignore quota errors
    }
  }, [visibilityMap]);

  const syncGoogleCalendarData = useCallback(
    async (explicitToken?: string, yearOverride?: number) => {
      const token = explicitToken || (await getAccessToken());
      if (!token) {
        setNeedsGoogleAuth(true);
        return;
      }

      setIsSyncing(true);
      setSyncNotice(null);
      try {
        const list = await fetchCalendarList(token);
        setGoogleCalendars(list);

        const targetYear = yearOverride ?? anchorDate.getFullYear();
        const timeMin = new Date(targetYear, 0, 1, 0, 0, 0, 0);
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date(targetYear, 11, 31, 23, 59, 59, 999);
        timeMax.setMonth(timeMax.getMonth() + 1);

        const fetchedLists = await Promise.all(
          list.map((cal) =>
            fetchCalendarEvents(
              token,
              cal.id,
              timeMin.toISOString(),
              timeMax.toISOString(),
              cal.color,
              settings.defaultReminderSound
            ).catch(() => [])
          )
        );

        setGoogleEvents(fetchedLists.flat());
        setLastSyncedAt(new Date());
      } catch (err) {
        if (err instanceof GoogleAuthExpiredError) {
          clearAccessToken();
          setNeedsGoogleAuth(true);
          setSyncNotice({
            tone: 'error',
            message: 'Your Google Calendar session expired. Sign in again to resume syncing.',
          });
        } else {
          setSyncNotice({
            tone: 'error',
            message:
              err instanceof Error
                ? err.message
                : 'Unable to sync with Google Calendar right now.',
          });
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [anchorDate, settings.defaultReminderSound]
  );

  // Initialize Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUserEmail(user.email);
        setNeedsGoogleAuth(false);
        syncGoogleCalendarData(token);
      },
      () => {
        setNeedsGoogleAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Re-sync Google Calendar if user navigates to a different year while connected
  const syncedYearRef = useRef<number>(anchorDate.getFullYear());
  useEffect(() => {
    const currentYear = anchorDate.getFullYear();
    if (!needsGoogleAuth && currentYear !== syncedYearRef.current) {
      syncedYearRef.current = currentYear;
      syncGoogleCalendarData(undefined, currentYear);
    }
  }, [anchorDate, needsGoogleAuth, syncGoogleCalendarData]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setSyncNotice(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setGoogleUserEmail(user.email);
      setNeedsGoogleAuth(false);
      await syncGoogleCalendarData(accessToken);
    } catch (err) {
      setSyncNotice({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Google sign-in was cancelled or could not be completed.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setGoogleUserEmail(null);
    setNeedsGoogleAuth(true);
    setGoogleCalendars([]);
    setGoogleEvents([]);
    setLastSyncedAt(null);
  };

  const allCalendars: CalendarSource[] = useMemo(() => {
    const localCal: CalendarSource = {
      id: 'local-primary',
      name: 'My Pro Calendar',
      color: '#2563EB',
      source: 'local',
      primary: true,
      accessRole: 'owner',
      visible: visibilityMap['local-primary'] ?? true,
    };

    const gCals = googleCalendars.map((c) => ({
      ...c,
      visible: visibilityMap[c.id] ?? true,
    }));

    return [localCal, ...gCals];
  }, [googleCalendars, visibilityMap]);

  const allEvents: CalendarEvent[] = useMemo(() => {
    const visibleIds = new Set(allCalendars.filter((c) => c.visible).map((c) => c.id));
    const q = searchQuery.trim().toLowerCase();

    return [...localEvents, ...googleEvents].filter((ev) => {
      if (!visibleIds.has(ev.calendarId)) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.location && ev.location.toLowerCase().includes(q))
      );
    });
  }, [allCalendars, localEvents, googleEvents, searchQuery]);

  // Real-time 1-second scheduler for Event Reminders, Clock Alarms, and Snoozed Alerts
  const triggerAlert = useCallback(
    (alert: ActiveAlert) => {
      setActiveAlerts((prev) => {
        if (prev.some((a) => a.alertKey === alert.alertKey)) return prev;
        return [alert, ...prev];
      });
      if (settings.soundEnabled && alert.sound !== 'silent') {
        playReminderSound(alert.sound);
      }
      if (settings.browserNotifications) {
        showBrowserNotification(alert.title, alert.subtitle);
      }
    },
    [settings.soundEnabled, settings.browserNotifications]
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const nowMs = now.getTime();
      const todayKey = toDateKey(now);
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      // 1. Check Event Reminders
      for (const ev of [...localEvents, ...googleEvents]) {
        const startMs = getEventStartDate(ev).getTime();
        for (const rem of ev.reminders) {
          if (!rem.enabled) continue;
          const fireAt = startMs - rem.minutesBefore * 60000;
          const delta = nowMs - fireAt;
          if (delta >= 0 && delta <= 60000) {
            const key = `event:${ev.id}:${rem.id}:${fireAt}`;
            if (!firedAlertKeysRef.current.has(key)) {
              firedAlertKeysRef.current.add(key);
              triggerAlert({
                alertKey: key,
                kind: 'event',
                title: ev.title,
                subtitle: `${formatReminderLabel(rem.minutesBefore)} · ${
                  ev.location || (ev.source === 'google' ? 'Google Calendar' : 'Local Schedule')
                }`,
                triggerAt: fireAt,
                sound: rem.sound,
                eventId: ev.id,
              });
            }
          }
        }
      }

      // 2. Check Clock Alarms
      for (const alarm of alarms) {
        if (!alarm.enabled) continue;
        if (alarm.time !== currentHHMM) continue;
        const matchesDay = alarm.date
          ? alarm.date === todayKey
          : alarm.repeatDays.length === 0 || alarm.repeatDays.includes(now.getDay());
        if (!matchesDay) continue;

        const key = `alarm:${alarm.id}:${todayKey}:${currentHHMM}`;
        if (!firedAlertKeysRef.current.has(key)) {
          firedAlertKeysRef.current.add(key);
          triggerAlert({
            alertKey: key,
            kind: 'alarm',
            title: alarm.label,
            subtitle: `Scheduled clock alarm · ${currentHHMM}`,
            triggerAt: nowMs,
            sound: alarm.sound,
            alarmId: alarm.id,
          });
        }
      }

      // 3. Check Snoozed Alerts
      setSnoozedAlerts((prev) => {
        const due = prev.filter((item) => nowMs >= item.wakeAt);
        if (due.length === 0) return prev;
        for (const item of due) {
          triggerAlert({
            ...item.alert,
            alertKey: `${item.alert.alertKey}:snooze:${item.wakeAt}`,
            subtitle: `Snoozed reminder · ${item.alert.title}`,
          });
        }
        return prev.filter((item) => nowMs < item.wakeAt);
      });
    };

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [localEvents, googleEvents, alarms, triggerAlert]);

  // Next Upcoming Reminder / Alarm for Sidebar Countdown
  const nextReminderInfo = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    let best: { title: string; targetTime: number; kind: 'event' | 'alarm' } | null = null;

    for (const ev of [...localEvents, ...googleEvents]) {
      const startMs = getEventStartDate(ev).getTime();
      for (const rem of ev.reminders) {
        if (!rem.enabled) continue;
        const fireAt = startMs - rem.minutesBefore * 60000;
        if (fireAt > nowMs && (!best || fireAt < best.targetTime)) {
          best = { title: ev.title, targetTime: fireAt, kind: 'event' };
        }
      }
    }

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const [h, m] = alarm.time.split(':').map(Number);
      for (let offset = 0; offset <= 7; offset++) {
        const candidate = addDays(now, offset);
        candidate.setHours(h || 0, m || 0, 0, 0);
        if (candidate.getTime() <= nowMs) continue;
        const cKey = toDateKey(candidate);
        const ok = alarm.date
          ? alarm.date === cKey
          : alarm.repeatDays.length === 0 || alarm.repeatDays.includes(candidate.getDay());
        if (ok) {
          if (!best || candidate.getTime() < best.targetTime) {
            best = { title: alarm.label, targetTime: candidate.getTime(), kind: 'alarm' };
          }
          break;
        }
      }
    }

    return best;
  }, [localEvents, googleEvents, alarms]);

  // Period Header Label
  const periodLabel = useMemo(() => {
    if (activeView === 'year') {
      return String(anchorDate.getFullYear());
    }
    if (activeView === 'month') {
      return `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
    }
    const week = getWeekDays(anchorDate, settings.weekStartsOn);
    const first = week[0];
    const last = week[6];
    if (first.getMonth() === last.getMonth()) {
      return `${MONTH_SHORT[first.getMonth()]} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
    }
    if (first.getFullYear() === last.getFullYear()) {
      return `${MONTH_SHORT[first.getMonth()]} ${first.getDate()} – ${MONTH_SHORT[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `${MONTH_SHORT[first.getMonth()]} ${first.getDate()}, ${first.getFullYear()} – ${MONTH_SHORT[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
  }, [activeView, anchorDate, settings.weekStartsOn]);

  const handleNavigatePrev = () => {
    setAnchorDate((d) => {
      if (activeView === 'year') return new Date(d.getFullYear() - 1, d.getMonth(), 1);
      if (activeView === 'month') return addMonths(d, -1);
      return addDays(d, -7);
    });
  };

  const handleNavigateNext = () => {
    setAnchorDate((d) => {
      if (activeView === 'year') return new Date(d.getFullYear() + 1, d.getMonth(), 1);
      if (activeView === 'month') return addMonths(d, 1);
      return addDays(d, 7);
    });
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleToggleBrowserNotifications = async () => {
    if (settings.browserNotifications) {
      handleUpdateSettings({ browserNotifications: false });
      return;
    }
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'granted') {
      handleUpdateSettings({ browserNotifications: true });
    } else {
      setSyncNotice({
        tone: 'info',
        message:
          perm === 'unsupported'
            ? 'Browser desktop notifications are unavailable in this context; in-app alerts and audio chimes remain active.'
            : 'Desktop notification permission was not granted. In-app alerts and chimes remain active.',
      });
    }
  };

  const handleOpenCreateModal = (date?: Date, hour?: number) => {
    setEditingEvent(null);
    setModalInitialDate(date || anchorDate);
    setModalInitialHour(hour ?? null);
    setEventModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setModalInitialDate(null);
    setModalInitialHour(null);
    setEventModalOpen(true);
  };

  const executeSaveEvent = async (
    payload: Omit<CalendarEvent, 'id' | 'source'>,
    targetCalendar: CalendarSource,
    existingEvent: CalendarEvent | null
  ) => {
    setIsSavingEvent(true);
    setSyncNotice(null);
    try {
      if (targetCalendar.source === 'google') {
        const token = await getAccessToken();
        if (!token) {
          setNeedsGoogleAuth(true);
          setSyncNotice({
            tone: 'error',
            message: 'Please sign in with Google to save changes to Google Calendar.',
          });
          return;
        }

        if (existingEvent && existingEvent.googleEventId) {
          const updated = await updateGoogleEvent(
            token,
            targetCalendar.id,
            existingEvent.googleEventId,
            payload,
            settings.defaultReminderSound
          );
          setGoogleEvents((prev) =>
            prev.map((ev) => (ev.id === existingEvent.id ? updated : ev))
          );
        } else {
          const created = await createGoogleEvent(
            token,
            targetCalendar.id,
            payload,
            settings.defaultReminderSound
          );
          setGoogleEvents((prev) => [...prev, created]);
        }
      } else {
        if (existingEvent) {
          const updated: CalendarEvent = {
            ...existingEvent,
            ...payload,
            source: 'local',
          };
          setLocalEvents((prev) =>
            prev.map((ev) => (ev.id === existingEvent.id ? updated : ev))
          );
        } else {
          const created: CalendarEvent = {
            ...payload,
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: 'local',
          };
          setLocalEvents((prev) => [...prev, created]);
        }
      }
      setEventModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      if (err instanceof GoogleAuthExpiredError) {
        clearAccessToken();
        setNeedsGoogleAuth(true);
      }
      setSyncNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to save event.',
      });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleSaveEventRequest = async (
    payload: Omit<CalendarEvent, 'id' | 'source'>,
    targetCalendar: CalendarSource,
    existingEvent: CalendarEvent | null
  ) => {
    // Workspace Integration Rule: Always require explicit confirmation before mutating Google Calendar data
    if (targetCalendar.source === 'google' && existingEvent) {
      setPendingConfirmation({
        title: 'Update Google Calendar Event?',
        description: `Are you sure you want to update "${payload.title}" in your "${targetCalendar.name}" Google Calendar? This will overwrite the event details and reminder overrides on Google Calendar.`,
        confirmLabel: 'Update Event',
        tone: 'primary',
        onConfirm: async () => {
          setIsConfirmBusy(true);
          try {
            await executeSaveEvent(payload, targetCalendar, existingEvent);
          } finally {
            setIsConfirmBusy(false);
            setPendingConfirmation(null);
          }
        },
      });
      return;
    }

    await executeSaveEvent(payload, targetCalendar, existingEvent);
  };

  const handleDeleteEventRequest = (event: CalendarEvent) => {
    const cal = allCalendars.find((c) => c.id === event.calendarId);
    const isGoogle = event.source === 'google';

    setPendingConfirmation({
      title: isGoogle ? 'Delete Google Calendar Event?' : 'Delete Event?',
      description: isGoogle
        ? `Are you sure you want to permanently delete "${event.title}" from your "${
            cal?.name || 'Google Calendar'
          }" Google Calendar? This action cannot be undone.`
        : `Remove "${event.title}" from My Pro Calendar?`,
      confirmLabel: 'Delete Event',
      tone: 'danger',
      onConfirm: async () => {
        setIsConfirmBusy(true);
        setSyncNotice(null);
        try {
          if (isGoogle && event.googleEventId) {
            const token = await getAccessToken();
            if (!token) {
              setNeedsGoogleAuth(true);
              setSyncNotice({
                tone: 'error',
                message: 'Please sign in with Google to delete events from Google Calendar.',
              });
              return;
            }
            await deleteGoogleEvent(token, event.calendarId, event.googleEventId);
            setGoogleEvents((prev) => prev.filter((ev) => ev.id !== event.id));
          } else {
            setLocalEvents((prev) => prev.filter((ev) => ev.id !== event.id));
          }
          setEventModalOpen(false);
          setEditingEvent(null);
        } catch (err) {
          if (err instanceof GoogleAuthExpiredError) {
            clearAccessToken();
            setNeedsGoogleAuth(true);
          }
          setSyncNotice({
            tone: 'error',
            message: err instanceof Error ? err.message : 'Failed to delete event.',
          });
        } finally {
          setIsConfirmBusy(false);
          setPendingConfirmation(null);
        }
      },
    });
  };

  const handleAddAlarm = (alarm: Omit<ClockAlarm, 'id'>) => {
    setAlarms((prev) => [
      { ...alarm, id: `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ...prev,
    ]);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTimerComplete = useCallback(
    (label: string, sound: ReminderSound) => {
      triggerAlert({
        alertKey: `timer:${Date.now()}`,
        kind: 'timer',
        title: label,
        subtitle: 'Countdown timer finished',
        triggerAt: Date.now(),
        sound,
      });
    },
    [triggerAlert]
  );

  const handleDismissAlert = (alertKey: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.alertKey !== alertKey));
  };

  const handleSnoozeAlert = (alert: ActiveAlert, minutes: number) => {
    setActiveAlerts((prev) => prev.filter((a) => a.alertKey !== alert.alertKey));
    setSnoozedAlerts((prev) => [
      ...prev,
      { alert, wakeAt: Date.now() + minutes * 60000 },
    ]);
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNav
        activeView={activeView}
        onChangeView={setActiveView}
        onCreateEvent={() => handleOpenCreateModal()}
      />

      <WorkspaceToolbar
        activeView={activeView}
        periodLabel={periodLabel}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onNavigateToday={() => setAnchorDate(new Date())}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onToggleSidebarMobile={() => setMobileSidebarOpen((v) => !v)}
        googleUserEmail={googleUserEmail}
        needsGoogleAuth={needsGoogleAuth}
        isLoggingIn={isLoggingIn}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSync={() => syncGoogleCalendarData()}
        onGoogleSignOut={handleGoogleSignOut}
        onToggleBrowserNotifications={handleToggleBrowserNotifications}
      />

      <OfflineIndicator />

      {syncNotice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 border-b px-4 py-2 text-xs sm:px-6 ${
            syncNotice.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200'
          }`}
        >
          <span>{syncNotice.message}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="font-medium underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          anchorDate={anchorDate}
          onSelectDate={(date) => {
            setAnchorDate(date);
            if (activeView === 'year' || activeView === 'clock') {
              setActiveView('week');
            }
          }}
          calendars={allCalendars}
          onToggleCalendar={(id) =>
            setVisibilityMap((prev) => ({
              ...prev,
              [id]: !(prev[id] ?? true),
            }))
          }
          events={allEvents}
          alarms={alarms}
          onToggleAlarm={handleToggleAlarm}
          onOpenClockView={() => setActiveView('clock')}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          nextReminderInfo={nextReminderInfo}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 overflow-hidden">
          {activeView === 'week' && (
            <WeekView
              anchorDate={anchorDate}
              events={allEvents}
              settings={settings}
              onSelectSlot={(date, hour) => handleOpenCreateModal(date, hour)}
              onSelectEvent={handleOpenEditModal}
            />
          )}

          {activeView === 'month' && (
            <MonthView
              anchorDate={anchorDate}
              events={allEvents}
              alarms={alarms}
              settings={settings}
              onSelectDateCreate={(date) => handleOpenCreateModal(date, 9)}
              onSelectEvent={handleOpenEditModal}
              onJumpToWeek={(date) => {
                setAnchorDate(date);
                setActiveView('week');
              }}
            />
          )}

          {activeView === 'year' && (
            <YearView
              year={anchorDate.getFullYear()}
              events={allEvents}
              settings={settings}
              onSelectMonth={(monthIdx) => {
                setAnchorDate(new Date(anchorDate.getFullYear(), monthIdx, 1));
                setActiveView('month');
              }}
              onSelectDay={(date) => {
                setAnchorDate(date);
                setActiveView('week');
              }}
            />
          )}

          {activeView === 'clock' && (
            <ClockAlarmsView
              events={allEvents}
              alarms={alarms}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onAddAlarm={handleAddAlarm}
              onToggleAlarm={handleToggleAlarm}
              onDeleteAlarm={handleDeleteAlarm}
              onEditEventReminders={handleOpenEditModal}
              onTimerComplete={handleTimerComplete}
            />
          )}
        </main>
      </div>

      <EventModal
        isOpen={eventModalOpen}
        editingEvent={editingEvent}
        initialDate={modalInitialDate}
        initialHour={modalInitialHour}
        calendars={allCalendars}
        defaultSound={settings.defaultReminderSound}
        isSaving={isSavingEvent}
        onClose={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEventRequest}
        onDelete={handleDeleteEventRequest}
      />

      <ConfirmDialog
        confirmation={pendingConfirmation}
        isBusy={isConfirmBusy}
        onCancel={() => setPendingConfirmation(null)}
      />

      <ActiveAlertBanner
        alerts={activeAlerts}
        onDismiss={handleDismissAlert}
        onSnooze={handleSnoozeAlert}
      />

      <MobileBottomNav activeView={activeView} onChangeView={setActiveView} />
    </div>
  );
}
