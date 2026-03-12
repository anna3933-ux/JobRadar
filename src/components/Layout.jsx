import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, List, Settings, FileText, Crosshair, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/VacanciesList', label: 'Вакансии', icon: List },
  { path: '/SearchSettings', label: 'Настройки поиска', icon: Settings },
  { path: '/ScraperLogs', label: 'Логи скрапера', icon: FileText },
];

function NavItem({ item, collapsed, onClick }) {
  const location = useLocation();
  const Icon = item.icon;
  const active = location.pathname === item.path;

  return (
    <div className="relative group">
      <Link
        to={item.path}
        onClick={onClick}
        className={cn(
          'flex items-center rounded-lg text-sm font-medium transition-all',
          collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
          active ? 'bg-[#6c63ff] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && item.label}
      </Link>
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
          {item.label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarClasses = cn(
    'bg-white border-r border-gray-100 flex flex-col flex-shrink-0 transition-all duration-300 z-30',
    collapsed ? 'w-16' : 'w-60'
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <aside className={cn(sidebarClasses, 'hidden lg:flex flex-col')}>
        <div className={cn('p-4 border-b border-gray-100 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6c63ff] flex items-center justify-center shadow-sm flex-shrink-0">
              <Crosshair className="w-4 h-4 text-white" />
            </div>
            {!collapsed && <span className="font-bold text-gray-900 text-lg tracking-tight">JobRadar</span>}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed} onClick={() => {}} />
          ))}
        </nav>
        {!collapsed && (
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">JobRadar v1.0</p>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 flex flex-col z-30 lg:hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#6c63ff] flex items-center justify-center shadow-sm">
                <Crosshair className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">JobRadar</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {navItems.map(item => (
              <NavItem key={item.path} item={item} collapsed={false} onClick={() => setMobileOpen(false)} />
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">JobRadar v1.0</p>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6c63ff] flex items-center justify-center shadow-sm">
              <Crosshair className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">JobRadar</span>
          </div>
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}