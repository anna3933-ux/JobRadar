import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2, Star } from 'lucide-react';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = Object.keys(STATUS_CONFIG);

export default function TableView({ vacancies }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const allChecked = vacancies.length > 0 && selected.length === vacancies.length;
  const someChecked = selected.length > 0 && !allChecked;

  const toggleAll = () => setSelected(allChecked ? [] : vacancies.map(v => v.id));
  const toggleOne = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vacancies'] });

  const bulkUpdateStatus = async () => {
    if (!bulkStatus) return;
    setBulkLoading(true);
    await Promise.all(selected.map(id => base44.entities.Vacancy.update(id, { status: bulkStatus })));
    toast.success(`Статус изменён для ${selected.length} вакансий`);
    setSelected([]);
    setBulkStatus('');
    invalidate();
    setBulkLoading(false);
  };

  const bulkFavorite = async () => {
    setBulkLoading(true);
    await Promise.all(selected.map(id => base44.entities.Vacancy.update(id, { is_favorite: true })));
    toast.success(`Добавлено в избранное: ${selected.length}`);
    setSelected([]);
    invalidate();
    setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Удалить ${selected.length} вакансий?`)) return;
    setBulkLoading(true);
    await Promise.all(selected.map(id => base44.entities.Vacancy.delete(id)));
    toast.success(`Удалено: ${selected.length}`);
    setSelected([]);
    invalidate();
    setBulkLoading(false);
  };

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#6c63ff]/5 border border-[#6c63ff]/20 rounded-xl">
          <span className="text-sm font-medium text-[#6c63ff]">Выбрано: {selected.length}</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#6c63ff]"
              >
                <option value="">Изменить статус...</option>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
              {bulkStatus && (
                <button
                  onClick={bulkUpdateStatus}
                  disabled={bulkLoading}
                  className="text-xs px-3 py-1.5 bg-[#6c63ff] text-white rounded-lg hover:bg-[#5a52d5] disabled:opacity-50 transition-colors"
                >
                  Применить
                </button>
              )}
            </div>
            <button
              onClick={bulkFavorite}
              disabled={bulkLoading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />Избранное
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkLoading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />Удалить
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="accent-[#6c63ff] cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[200px]">Должность</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Дата публ.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Платформа</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Страна</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Зарп. от</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Зарп. до</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Отрасль</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Занятость</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Статус</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Заметки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vacancies.map(v => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50/70 transition-colors ${selected.includes(v.id) ? 'bg-[#6c63ff]/5' : ''}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(v.id)}
                      onChange={() => toggleOne(v.id)}
                      className="accent-[#6c63ff] cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {v.is_favorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                      {v.source_url ? (
                        <a
                          href={v.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6c63ff] hover:underline font-medium line-clamp-2"
                          onClick={e => e.stopPropagation()}
                        >
                          {v.title}
                        </a>
                      ) : (
                        <button
                          onClick={() => navigate(`/VacancyDetail?id=${v.id}`)}
                          className="text-gray-900 hover:text-[#6c63ff] font-medium text-left line-clamp-2 transition-colors"
                        >
                          {v.title}
                        </button>
                      )}
                    </div>
                    {v.company && <p className="text-xs text-gray-400 mt-0.5 truncate">{v.company}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {v.published_at ? format(new Date(v.published_at), 'dd.MM.yy') : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{v.source_platform || '—'}</td>
                  <td className="px-3 py-3 text-xs text-gray-600">{v.country || '—'}</td>
                  <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {v.salary_from ? v.salary_from.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {v.salary_to ? v.salary_to.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px]">
                    <span className="line-clamp-2">{v.sphere || '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{v.employment_type || '—'}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 max-w-[120px]">
                    <span className="line-clamp-2">{v.notes || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}