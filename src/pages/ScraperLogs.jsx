import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInSeconds } from 'date-fns';

const STATUS_STYLE = {
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  running: 'bg-yellow-100 text-yellow-700',
};
const STATUS_LABEL = { success: '✓ Успех', error: '✗ Ошибка', running: '⟳ Выполняется' };

export default function ScraperLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['scraperLogs'],
    queryFn: () => base44.entities.ScraperLog.list('-started_at', 100),
  });

  const duration = (log) => {
    if (!log.started_at || !log.finished_at) return '—';
    const secs = differenceInSeconds(new Date(log.finished_at), new Date(log.started_at));
    if (secs < 60) return `${secs}с`;
    return `${Math.floor(secs / 60)}м ${secs % 60}с`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Логи скрапера</h1>
      <p className="text-gray-500 text-sm mb-6">История автоматических запусков</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#6c63ff] rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-1">Запусков ещё не было</p>
            <p className="text-sm">Логи появятся после первого запуска скрапера</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Платформа</th>
                  <th className="px-5 py-3 text-left">Начало</th>
                  <th className="px-5 py-3 text-left">Конец</th>
                  <th className="px-5 py-3 text-left">Длительность</th>
                  <th className="px-5 py-3 text-right">Найдено</th>
                  <th className="px-5 py-3 text-right">Новых</th>
                  <th className="px-5 py-3 text-left">Статус</th>
                  <th className="px-5 py-3 text-left">Ошибка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{log.platform}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {log.started_at ? format(new Date(log.started_at), 'dd.MM.yy HH:mm') : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {log.finished_at ? format(new Date(log.finished_at), 'dd.MM.yy HH:mm') : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{duration(log)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{log.total_found ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#6c63ff]">+{log.new_added ?? 0}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[log.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[log.status] || log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-red-500 max-w-xs truncate">
                      {log.error_message || '—'}
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