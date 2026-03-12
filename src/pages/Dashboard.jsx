import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Briefcase, Star, Activity } from 'lucide-react';
import { STATUS_CONFIG } from '@/components/StatusBadge';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: vacancies = [] } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => base44.entities.Vacancy.list('-created_date', 500),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['scraperLogs'],
    queryFn: () => base44.entities.ScraperLog.list('-started_at', 10),
  });

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, s) => {
    acc[s] = vacancies.filter(v => v.status === s).length;
    return acc;
  }, {});

  const sourceCounts = vacancies.reduce((acc, v) => {
    const p = v.source_platform || 'Другое';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statsCards = [
    { label: 'Всего вакансий', value: vacancies.length, icon: Briefcase, color: 'bg-[#6c63ff]' },
    { label: 'Новых сегодня', value: vacancies.filter(v => v.created_date?.startsWith(new Date().toISOString().slice(0, 10))).length, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Откликов', value: (statusCounts.applied || 0) + (statusCounts.interview || 0), icon: Activity, color: 'bg-amber-500' },
    { label: 'Избранных', value: vacancies.filter(v => v.is_favorite).length, icon: Star, color: 'bg-pink-500' },
  ];

  const logStatusStyle = { success: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700', running: 'bg-yellow-100 text-yellow-700' };
  const logStatusLabel = { success: 'Успех', error: 'Ошибка', running: 'Выполняется' };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Сводная статистика по вашим вакансиям</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Воронка по статусам</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="text-center p-3 rounded-xl bg-gray-50">
                <p className="text-2xl font-bold text-gray-900">{statusCounts[key] || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{cfg.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Топ источников</h2>
          {topSources.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {topSources.map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{platform}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#6c63ff] h-1.5 rounded-full"
                        style={{ width: `${Math.round((count / vacancies.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Последние запуски скрапера</h2>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Запусков ещё не было</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Платформа</th>
                  <th className="px-5 py-3 text-right">Найдено</th>
                  <th className="px-5 py-3 text-right">Новых</th>
                  <th className="px-5 py-3 text-left">Статус</th>
                  <th className="px-5 py-3 text-left">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{log.platform}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{log.total_found ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-[#6c63ff] font-medium">+{log.new_added ?? 0}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${logStatusStyle[log.status] || 'bg-gray-100 text-gray-600'}`}>
                        {logStatusLabel[log.status] || log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {log.started_at ? format(new Date(log.started_at), 'dd.MM.yy HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}