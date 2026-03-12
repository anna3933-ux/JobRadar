import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const StatusIcon = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
};

export default function ScraperLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['scraperLogs'],
    queryFn: () => base44.entities.ScraperLog.list('-created_date', 50),
  });

  const duration = (log) => {
    if (!log.started_at || !log.finished_at) return null;
    const ms = new Date(log.finished_at) - new Date(log.started_at);
    return ms < 60000 ? `${(ms / 1000).toFixed(1)}с` : `${(ms / 60000).toFixed(1)}мин`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Логи скрейпера</h1>
      <p className="text-gray-500 text-sm mb-6">История запусков автоматического сбора вакансий</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#6c63ff] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Логов пока нет. Запустите скрейпинг из раздела «Вакансии».</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <StatusIcon status={log.status} />
                  <span className="text-sm font-semibold text-gray-800 capitalize">{log.platform || 'hh.ru'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    log.status === 'success' ? 'bg-green-50 text-green-600' :
                    log.status === 'error' ? 'bg-red-50 text-red-600' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>{log.status}</span>
                </div>
                {log.started_at && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(log.started_at), 'dd.MM.yyyy HH:mm')}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm mt-3">
                <div className="text-gray-500">Найдено: <span className="font-semibold text-gray-800">{log.total_found ?? '—'}</span></div>
                <div className="text-gray-500">Добавлено: <span className="font-semibold text-green-600">{log.new_added ?? '—'}</span></div>
                {duration(log) && (
                  <div className="text-gray-500">Длительность: <span className="font-semibold text-gray-800">{duration(log)}</span></div>
                )}
              </div>

              {log.error_message && (
                <div className="mt-3 bg-red-50 rounded-xl px-4 py-2.5 text-xs text-red-600 font-mono leading-relaxed">
                  {log.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}