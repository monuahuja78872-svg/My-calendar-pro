import { Plus } from 'lucide-react';
import { CalendarView } from '@/src/types/calendar';

interface TopNavProps {
  activeView: CalendarView;
  onChangeView: (view: CalendarView) => void;
  onCreateEvent: () => void;
}

const NAV_ITEMS: { id: CalendarView; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'clock', label: 'Clock' },
];

export function TopNav({ activeView, onChangeView, onCreateEvent }: TopNavProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-13 sm:h-14 items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6">
        {/* Zone 1: Official Logo + Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onChangeView('week')}
          className="inline-flex items-center gap-2.5 font-display text-left text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md dark:text-slate-100"
        >
          <img
            src="/logo-icon.png"
            alt="My Pro Calendar logo"
            referrerPolicy="no-referrer"
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span>My Pro Calendar</span>
        </button>

        {/* Zone 2: Clean Single-Line Nav Links (Desktop/Tablet; Mobile uses MobileBottomNav) */}
        <nav aria-label="Calendar views" className="hidden sm:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onCreateEvent}
            className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Event</span>
          </button>
        </div>
      </div>
    </header>
  );
}
