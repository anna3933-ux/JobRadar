import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, ScrollText } from 'lucide-react';

const nav = [
  { to: '/Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/VacanciesList', icon: Briefcase, label: 'Вакансии' },
  { to: '/SearchSettings', icon: Settings, label: 'Настройки' },
  { to: '/ScraperLogs', icon: ScrollText, label: 'Логи' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-3 shrink-0">
        <div className="px-3 mb-6">
          <span className="text-lg font-bold text-[#6c63ff]">JobRadar</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#6c63ff]/10 text-[#6c63ff]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}