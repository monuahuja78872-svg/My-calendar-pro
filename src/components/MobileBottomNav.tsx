import { CalendarDays, CalendarRange, Clock, Grid3x3 } from 'lucide-react';
import { CalendarView } from '@/src/types/calendar';

interface MobileBottomNavProps {
  activeView: CalendarView;
  onChangeView: (view: CalendarView) => void;
}

const ITEMS: { id: CalendarView; label: string; Icon: typeof CalendarRange }[] = [
  { id: 'week', label: 'Week', Icon: CalendarRange },
  { id: 'month', label: 'Month', Icon: CalendarDays },
  { id: 'year', label: 'Year', Icon: Grid3x3 },
  { id: 'clock', label: 'Clock', Icon: Clock },
];

export function MobileBottomNav({ activeView, onChangeView }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="grid h-16 grid-cols-4 items-center">
        {ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeView(id)}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
