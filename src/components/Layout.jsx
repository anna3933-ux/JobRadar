import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, List, Settings, FileText, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/VacanciesKanban', label: 'Kanban', icon: LayoutGrid },
  { path: '/VacanciesList', label: 'Вакансии', icon: List },
  { path: '/SearchSettings', label: 'Настройки поиска', icon: Settings },
  { path: '/ScraperLogs', label: 'Логи скрапера', icon: FileText },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6c63ff] flex items-center justify-center shadow-sm">
              <Crosshair className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">JobRadar</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                location.pathname === path
                  ? 'bg-[#6c63ff] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">JobRadar v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}