import { useState } from 'react';
import {
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import { AppSettings, CalendarView } from '@/src/types/calendar';

interface WorkspaceToolbarProps {
  activeView: CalendarView;
  periodLabel: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onToggleSidebarMobile: () => void;
  googleUserEmail: string | null;
  needsGoogleAuth: boolean;
  isLoggingIn: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  onGoogleSignIn: () => void;
  onGoogleSync: () => void;
  onGoogleSignOut: () => void;
  onToggleBrowserNotifications: () => void;
}

export function WorkspaceToolbar({
  activeView,
  periodLabel,
  searchQuery,
  onSearchChange,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  settings,
  onUpdateSettings,
  onToggleSidebarMobile,
  googleUserEmail,
  needsGoogleAuth,
  isLoggingIn,
  isSyncing,
  lastSyncedAt,
  onGoogleSignIn,
  onGoogleSync,
  onGoogleSignOut,
  onToggleBrowserNotifications,
}: WorkspaceToolbarProps) {
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  const googleSyncControl = needsGoogleAuth ? (
    <button
      type="button"
      onClick={onGoogleSignIn}
      disabled={isLoggingIn}
      className="gsi-material-button"
    >
      <div className="gsi-material-button-content-wrapper">
        <div className="gsi-material-button-icon">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            style={{ display: 'block' }}
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </div>
        <span className="gsi-material-button-contents">
          {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
        </span>
      </div>
    </button>
  ) : (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900">
      <span className="hidden xl:inline max-w-[160px] truncate text-xs text-slate-600 dark:text-slate-300">
        {googleUserEmail || 'Google Calendar'}
      </span>
      {lastSyncedAt && (
        <span className="hidden 2xl:inline text-[11px] font-mono text-slate-400">
          · {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      <button
        type="button"
        onClick={onGoogleSync}
        disabled={isSyncing}
        title="Sync Google Calendar now"
        className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap shrink-0 dark:text-blue-400 dark:hover:bg-blue-950/50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
      </button>
      <button
        type="button"
        onClick={onGoogleSignOut}
        title="Disconnect Google Calendar"
        aria-label="Disconnect Google Calendar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-3 py-2 sm:px-6 sm:py-2.5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mobile Sidebar Toggle + Period Navigation */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebarMobile}
            aria-label="Toggle calendar sidebar"
            className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-4 w-4" />
          </button>

          {activeView !== 'clock' ? (
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onNavigateToday}
                className="min-h-[40px] sm:min-h-0 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Today
              </button>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={onNavigatePrev}
                  aria-label="Previous period"
                  className="inline-flex min-h-[40px] min-w-[36px] sm:min-h-0 sm:h-8 sm:w-8 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateNext}
                  aria-label="Next period"
                  className="inline-flex min-h-[40px] min-w-[36px] sm:min-h-0 sm:h-8 sm:w-8 items-center justify-center border-l border-slate-200 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h1 className="font-display truncate pl-0.5 sm:pl-1 text-sm sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {periodLabel}
              </h1>
            </div>
          ) : (
            <h1 className="font-display truncate text-sm sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Clock, Alarms & Reminders
            </h1>
          )}
        </div>

        {/* Mobile Quick Controls Toggle */}
        <div className="flex items-center gap-1.5 sm:hidden shrink-0">
          <button
            type="button"
            onClick={() => setMobileToolsOpen((v) => !v)}
            aria-expanded={mobileToolsOpen}
            aria-label="Toggle search, Google sync, and tools"
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border transition-colors ${
              mobileToolsOpen || searchQuery
                ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop / Tablet Inline Toolbar Controls */}
        <div className="hidden sm:flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search schedule..."
              aria-label="Search schedule"
              className="h-9 w-40 rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none md:w-52 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {googleSyncControl}

          <PWAInstallButton variant="compact" />

          {/* Week Start Toggle */}
          <div className="hidden md:flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => onUpdateSettings({ weekStartsOn: 0 })}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.weekStartsOn === 0
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Sun
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ weekStartsOn: 1 })}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.weekStartsOn === 1
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Mon
            </button>
          </div>

          {/* Sound & Notification & Theme Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              title={settings.soundEnabled ? 'Mute reminder sounds' : 'Unmute reminder sounds'}
              aria-label={settings.soundEnabled ? 'Mute reminder sounds' : 'Unmute reminder sounds'}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                settings.soundEnabled
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
              }`}
            >
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleBrowserNotifications}
              title={
                settings.browserNotifications
                  ? 'Browser desktop alerts enabled'
                  : 'Enable browser desktop alerts'
              }
              aria-label="Toggle browser desktop alerts"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                settings.browserNotifications
                  ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {settings.browserNotifications ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Mobile Drawer Row for Search, Google Calendar Sync, PWA Install, and Preferences */}
      {mobileToolsOpen && (
        <div className="mt-2.5 flex flex-col gap-2.5 border-t border-slate-200 pt-2.5 sm:hidden dark:border-slate-800">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events, notes, or locations..."
              aria-label="Search schedule"
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 flex h-8 w-8 items-center justify-center text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {googleSyncControl}
            <PWAInstallButton variant="compact" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => onUpdateSettings({ weekStartsOn: 0 })}
                className={`min-h-[36px] rounded-md px-3 text-xs font-medium ${
                  settings.weekStartsOn === 0
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Sun start
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ weekStartsOn: 1 })}
                className={`min-h-[36px] rounded-md px-3 text-xs font-medium ${
                  settings.weekStartsOn === 1
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Mon start
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                aria-label="Toggle reminder sound"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onToggleBrowserNotifications}
                aria-label="Toggle desktop notifications"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                {settings.browserNotifications ? (
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
                }
                aria-label="Toggle light or dark theme"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                {settings.theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
