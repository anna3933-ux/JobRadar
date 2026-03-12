export const STATUS_CONFIG = {
  new:       { label: '🆕 Новая',     className: 'bg-blue-100 text-blue-700' },
  viewed:    { label: '👁 Изучена',   className: 'bg-gray-100 text-gray-700' },
  applied:   { label: '📨 Отклик',    className: 'bg-yellow-100 text-yellow-700' },
  interview: { label: '🎤 Интервью',  className: 'bg-purple-100 text-purple-700' },
  offer:     { label: '🏆 Оффер',     className: 'bg-green-100 text-green-700' },
  rejected:  { label: '❌ Отказ',     className: 'bg-red-100 text-red-700' },
  archived:  { label: '📦 Архив',     className: 'bg-gray-100 text-gray-500' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}