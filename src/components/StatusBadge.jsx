export const STATUS_CONFIG = {
  new:       { label: 'Новая',       color: 'bg-blue-50 text-blue-600' },
  viewed:    { label: 'Просмотрена', color: 'bg-gray-100 text-gray-600' },
  applied:   { label: 'Откликнулся', color: 'bg-purple-50 text-purple-600' },
  interview: { label: 'Интервью',    color: 'bg-yellow-50 text-yellow-600' },
  offer:     { label: 'Оффер',       color: 'bg-green-50 text-green-600' },
  rejected:  { label: 'Отказ',       color: 'bg-red-50 text-red-500' },
  archived:  { label: 'Архив',       color: 'bg-gray-50 text-gray-400' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}