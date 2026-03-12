import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Star, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: vacancies = [] } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => base44.entities.Vacancy.list('-created_date', 500),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['scraperLogs'],
    queryFn: () => base44.entities.ScraperLog.list('-created_date', 5),
  });

  const total = vacancies.length;
  const favorites = vacancies.filter(v => v.is_favorite).length;
  const newCount = vacancies.filter(v => v.status === 'new').length;
  const offers = vacancies.filter(v => v.status === 'offer').length;

  const byStatus = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    count: vacancies.filter(v => v.status === key).length,
  })).filter(s => s.count > 0);

  const recent = vacancies.slice(0, 8);

  const lastLog = logs[0];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Обзор вакансий и активности скрейпера</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Всего вакансий', value: total, icon: Briefcase, color: 'text-[#6c63ff] bg-[#6c63ff]/10' },
          { label: 'Новых', value: newCount, icon: TrendingUp, color: 'text-blue-500 bg-blue-50' },
          { label: 'Избранных', value: favorites, icon: Star, color: 'text-yellow-500 bg-yellow-50' },
          { label: 'Офферов', value: offers, icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* By status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">По статусам</h2>
          <div className="space-y-2.5">
            {byStatus.length === 0 && <p className="text-sm text-gray-400">Нет данных</p>}
            {byStatus.map(s => (
              <div key={s.key} className="flex items-center justify-between">
                <StatusBadge status={s.key} />
                <span className="text-sm font-semibold text-gray-700">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent vacancies */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Последние вакансии</h2>
            <button onClick={() => navigate('/VacanciesList')} className="text-xs text-[#6c63ff] hover:underline">Все →</button>
          </div>
          <div className="space-y-2.5">
            {recent.length === 0 && <p className="text-sm text-gray-400">Вакансий пока нет</p>}
            {recent.map(v => (
              <div
                key={v.id}
                onClick={() => navigate(`/VacancyDetail?id=${v.id}`)}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{v.title}</p>
                  {v.company && <p className="text-xs text-gray-400 truncate">{v.company}</p>}
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last scraper log */}
      {lastLog && (
        <div className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Последний запуск скрейпера</h2>
            <button onClick={() => navigate('/ScraperLogs')} className="text-xs text-[#6c63ff] hover:underline">Все логи →</button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              {lastLog.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {lastLog.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
              {lastLog.status === 'running' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
              <span className="font-medium capitalize">{lastLog.status}</span>
            </div>
            {lastLog.started_at && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(lastLog.started_at), 'dd.MM.yyyy HH:mm')}
              </div>
            )}
            <span className="text-gray-500">Найдено: <strong>{lastLog.total_found ?? '—'}</strong></span>
            <span className="text-gray-500">Добавлено: <strong className="text-green-600">{lastLog.new_added ?? '—'}</strong></span>
          </div>
          {lastLog.error_message && (
            <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{lastLog.error_message}</p>
          )}
        </div>
      )}
    </div>
  );
}