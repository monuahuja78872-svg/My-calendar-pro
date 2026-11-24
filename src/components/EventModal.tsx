import { useEffect, useState } from 'react';
import { Bell, ExternalLink, Plus, Trash2, Volume2, X } from 'lucide-react';
import {
  computeMinutesBefore,
  formatReminderLabel,
  toDateKey,
  toLocalDateTimeInput,
} from '@/src/lib/dateUtils';
import { EVENT_COLOR_OPTIONS } from '@/src/lib/defaultData';
import { playReminderSound } from '@/src/lib/soundEngine';
import {
  CalendarEvent,
  CalendarSource,
  EventReminder,
  ReminderMethod,
  ReminderSound,
  ReminderUnit,
} from '@/src/types/calendar';

interface EventModalProps {
  isOpen: boolean;
  editingEvent: CalendarEvent | null;
  initialDate: Date | null;
  initialHour: number | null;
  calendars: CalendarSource[];
  defaultSound: ReminderSound;
  isSaving: boolean;
  onClose: () => void;
  onSave: (
    payload: Omit<CalendarEvent, 'id' | 'source'>,
    targetCalendar: CalendarSource,
    existingEvent: CalendarEvent | null
  ) => Promise<void> | void;
  onDelete: (event: CalendarEvent) => void;
}

const SOUND_CHOICES: { value: ReminderSound; label: string }[] = [
  { value: 'gentle', label: 'Gentle Chime' },
  { value: 'bell', label: 'Crisp Bell' },
  { value: 'marimba', label: 'Warm Marimba' },
  { value: 'pulse', label: 'Digital Pulse' },
  { value: 'silent', label: 'Silent (Visual)' },
];

const QUICK_PRESETS: { label: string; value: number; unit: ReminderUnit }[] = [
  { label: 'At time', value: 0, unit: 'minutes' },
  { label: '5m', value: 5, unit: 'minutes' },
  { label: '10m', value: 10, unit: 'minutes' },
  { label: '15m', value: 15, unit: 'minutes' },
  { label: '30m', value: 30, unit: 'minutes' },
  { label: '1h', value: 1, unit: 'hours' },
  { label: '1d', value: 1, unit: 'days' },
];

function isSafeExternalUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function EventModal({
  isOpen,
  editingEvent,
  initialDate,
  initialHour,
  calendars,
  defaultSound,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const writableCalendars = calendars.filter(
    (c) => c.source === 'local' || c.accessRole === 'owner' || c.accessRole === 'writer'
  );

  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState('local-primary');
  const [allDay, setAllDay] = useState(false);
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [startDateOnly, setStartDateOnly] = useState('');
  const [endDateOnly, setEndDateOnly] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [reminders, setReminders] = useState<EventReminder[]>([]);

  // Custom Reminder Builder Draft
  const [customVal, setCustomVal] = useState(15);
  const [customUnit, setCustomUnit] = useState<ReminderUnit>('minutes');
  const [customMethod, setCustomMethod] = useState<ReminderMethod>('popup');
  const [customSound, setCustomSound] = useState<ReminderSound>(defaultSound);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (editingEvent) {
      setTitle(editingEvent.title);
      setCalendarId(editingEvent.calendarId);
      setAllDay(editingEvent.allDay);
      setLocation(editingEvent.location || '');
      setDescription(editingEvent.description || '');
      setColor(editingEvent.color || '#2563EB');
      setReminders(editingEvent.reminders || []);

      if (editingEvent.allDay) {
        const sKey = editingEvent.start.slice(0, 10);
        const eKey = editingEvent.end.slice(0, 10);
        setStartDateOnly(sKey);
        setEndDateOnly(eKey > sKey ? eKey : sKey);
        setStartStr(`${sKey}T09:00`);
        setEndStr(`${sKey}T10:00`);
      } else {
        setStartStr(toLocalDateTimeInput(editingEvent.start));
        setEndStr(toLocalDateTimeInput(editingEvent.end));
        const sKey = toDateKey(new Date(editingEvent.start));
        setStartDateOnly(sKey);
        setEndDateOnly(sKey);
      }
    } else {
      const base = initialDate ? new Date(initialDate) : new Date();
      const hour = initialHour !== null ? initialHour : Math.min(22, new Date().getHours() + 1);
      const startDt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0, 0);
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
      const dateKey = toDateKey(startDt);

      const preferredCal =
        writableCalendars.find((c) => c.source === 'google' && c.primary) ||
        writableCalendars[0];

      setTitle('');
      setCalendarId(preferredCal?.id || 'local-primary');
      setAllDay(false);
      setStartStr(toLocalDateTimeInput(startDt.toISOString()));
      setEndStr(toLocalDateTimeInput(endDt.toISOString()));
      setStartDateOnly(dateKey);
      setEndDateOnly(dateKey);
      setLocation('');
      setDescription('');
      setColor(preferredCal?.color || '#2563EB');
      setReminders([
        {
          id: `rem-${Date.now()}`,
          value: 10,
          unit: 'minutes',
          minutesBefore: 10,
          method: 'popup',
          sound: defaultSound,
          enabled: true,
        },
      ]);
    }
  }, [isOpen, editingEvent, initialDate, initialHour, defaultSound]);

  if (!isOpen) return null;

  const selectedCalendar =
    writableCalendars.find((c) => c.id === calendarId) ||
    calendars.find((c) => c.id === calendarId) ||
    writableCalendars[0];

  const isReadOnlyGoogle =
    editingEvent?.source === 'google' &&
    selectedCalendar?.accessRole !== 'owner' &&
    selectedCalendar?.accessRole !== 'writer';

  const handleAddPresetOrCustom = (
    value: number,
    unit: ReminderUnit,
    method: ReminderMethod = customMethod,
    sound: ReminderSound = customSound
  ) => {
    const minutesBefore = computeMinutesBefore(value, unit);
    const duplicate = reminders.some(
      (r) => r.minutesBefore === minutesBefore && r.method === method
    );
    if (duplicate) return;

    setReminders((prev) => [
      ...prev,
      {
        id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value,
        unit,
        minutesBefore,
        method,
        sound,
        enabled: true,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an event title.');
      return;
    }

    let finalStart = '';
    let finalEnd = '';

    if (allDay) {
      if (!startDateOnly) {
        setErrorMsg('Please select a valid start date.');
        return;
      }
      finalStart = startDateOnly;
      // Ensure end date is at least startDateOnly + 1 day if Google exclusive convention or equal
      if (!endDateOnly || endDateOnly <= startDateOnly) {
        const d = new Date(`${startDateOnly}T00:00:00`);
        d.setDate(d.getDate() + 1);
        finalEnd = toDateKey(d);
      } else {
        finalEnd = endDateOnly;
      }
    } else {
      const s = new Date(startStr);
      const en = new Date(endStr);
      if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) {
        setErrorMsg('Please select valid start and end times.');
        return;
      }
      if (en.getTime() <= s.getTime()) {
        setErrorMsg('End time must be after start time.');
        return;
      }
      finalStart = s.toISOString();
      finalEnd = en.toISOString();
    }

    if (!selectedCalendar) {
      setErrorMsg('No target calendar selected.');
      return;
    }

    await onSave(
      {
        calendarId: selectedCalendar.id,
        googleEventId: editingEvent?.googleEventId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start: finalStart,
        end: finalEnd,
        allDay,
        color,
        reminders,
        htmlLink: editingEvent?.htmlLink,
      },
      selectedCalendar,
      editingEvent
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="event-modal-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {editingEvent ? 'Edit Event & Reminders' : 'Create Scheduled Event'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {editingEvent?.source === 'google'
                ? 'Synced with Google Calendar'
                : 'Configure event details and custom clock reminders'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {editingEvent?.htmlLink && isSafeExternalUrl(editingEvent.htmlLink) && (
              <a
                href={editingEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>Open in Google</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-6 calendar-scroll">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {isReadOnlyGoogle && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              This Google Calendar is read-only. You can inspect details, but remote edits require write access.
            </div>
          )}

          {/* Title & Calendar Target */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Event Title
              </label>
              <input
                type="text"
                required
                disabled={isReadOnlyGoogle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Product Architecture Review"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Calendar
              </label>
              <select
                disabled={Boolean(editingEvent)}
                value={calendarId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCalendarId(nextId);
                  const cal = calendars.find((c) => c.id === nextId);
                  if (cal) setColor(cal.color);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {(editingEvent ? calendars : writableCalendars).map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name} ({cal.source === 'google' ? 'Google' : 'Local'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Range */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Schedule Timing
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  disabled={isReadOnlyGoogle}
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>All-day event</span>
              </label>
            </div>

            {allDay ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnlyGoogle}
                    value={startDateOnly}
                    onChange={(e) => setStartDateOnly(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    End Date (exclusive)
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnlyGoogle}
                    value={endDateOnly}
                    onChange={(e) => setEndDateOnly(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Starts
                  </label>
                  <input
                    type="datetime-local"
                    disabled={isReadOnlyGoogle}
                    value={startStr}
                    onChange={(e) => setStartStr(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Ends
                  </label>
                  <input
                    type="datetime-local"
                    disabled={isReadOnlyGoogle}
                    value={endStr}
                    onChange={(e) => setEndStr(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location, Color & Description */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Location / Meeting Link
              </label>
              <input
                type="text"
                disabled={isReadOnlyGoogle}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room, address, or meeting URL"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Color Tag
              </label>
              <div className="mt-2 flex items-center gap-2">
                {EVENT_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    disabled={isReadOnlyGoogle}
                    aria-label={`Color ${c.name}`}
                    onClick={() => setColor(c.hex)}
                    className={`h-6 w-6 rounded-md transition-transform ${
                      color === c.hex
                        ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              rows={2}
              disabled={isReadOnlyGoogle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda, checklist, or details..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Custom Reminders Configuration */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Custom Event Reminders
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Syncs with Google Calendar overrides & local clock alerts
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isReadOnlyGoogle}
                  onClick={() => handleAddPresetOrCustom(preset.value, preset.unit)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Exact Lead-Time Builder */}
            <div className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12 dark:bg-slate-950/60">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-medium text-slate-500">Amount</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  disabled={isReadOnlyGoogle}
                  value={customVal}
                  onChange={(e) => setCustomVal(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-medium text-slate-500">Unit</label>
                <select
                  disabled={isReadOnlyGoogle}
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as ReminderUnit)}
                  className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="minutes">Minutes before</option>
                  <option value="hours">Hours before</option>
                  <option value="days">Days before</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-medium text-slate-500">Channel</label>
                <select
                  disabled={isReadOnlyGoogle}
                  value={customMethod}
                  onChange={(e) => setCustomMethod(e.target.value as ReminderMethod)}
                  className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="popup">Alert / Popup</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-medium text-slate-500">Sound</label>
                <div className="mt-0.5 flex items-center gap-1">
                  <select
                    disabled={isReadOnlyGoogle}
                    value={customSound}
                    onChange={(e) => setCustomSound(e.target.value as ReminderSound)}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {SOUND_CHOICES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => playReminderSound(customSound)}
                    title="Preview chime"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="button"
                  disabled={isReadOnlyGoogle}
                  onClick={() =>
                    handleAddPresetOrCustom(customVal, customUnit, customMethod, customSound)
                  }
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Active Reminders List */}
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No reminders set for this event.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {reminders.map((rem) => (
                  <li
                    key={rem.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        disabled={isReadOnlyGoogle}
                        checked={rem.enabled}
                        onChange={() =>
                          setReminders((prev) =>
                            prev.map((r) =>
                              r.id === rem.id ? { ...r, enabled: !r.enabled } : r
                            )
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                      />
                      <span
                        className={`font-medium ${
                          rem.enabled
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 line-through'
                        }`}
                      >
                        {formatReminderLabel(rem.minutesBefore)}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {rem.method === 'email' ? 'Email' : 'Popup / Clock Alert'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {SOUND_CHOICES.find((s) => s.value === rem.sound)?.label || rem.sound}
                      </span>
                    </div>

                    {!isReadOnlyGoogle && (
                      <button
                        type="button"
                        onClick={() =>
                          setReminders((prev) => prev.filter((r) => r.id !== rem.id))
                        }
                        aria-label="Remove reminder"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div>
              {editingEvent && !isReadOnlyGoogle && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => onDelete(editingEvent)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/70 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Event</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              {!isReadOnlyGoogle && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {isSaving
                    ? 'Saving...'
                    : editingEvent
                      ? 'Save Changes'
                      : 'Create Event'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
