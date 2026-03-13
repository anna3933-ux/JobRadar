import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { STATUS_CONFIG } from '@/components/StatusBadge';

const KANBAN_STATUSES = ['new', 'viewed', 'applied', 'interview', 'offer', 'rejected'];

export default function KanbanBoard({ vacancies }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toggleFav = async (e, v) => {
    e.stopPropagation();
    await base44.entities.Vacancy.update(v.id, { is_favorite: !v.is_favorite });
    queryClient.invalidateQueries({ queryKey: ['vacancies'] });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map(status => {
        const cfg = STATUS_CONFIG[status];
        const items = vacancies.filter(v => v.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-60">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-gray-400 font-medium">{items.length}</span>
            </div>
            <div className="space-y-2.5">
              {items.map(v => (
                <div
                  key={v.id}
                  onClick={() => navigate(`/VacancyDetail?id=${v.id}`)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 cursor-pointer hover:shadow-md hover:border-[#6c63ff]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{v.title}</p>
                    <button onClick={(e) => toggleFav(e, v)} className="shrink-0 mt-0.5">
                      <Star className={`w-3.5 h-3.5 ${v.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  </div>
                  {v.company && <p className="text-xs text-gray-500 mt-1 truncate">{v.company}</p>}
                  {v.location && <p className="text-xs text-gray-400 mt-0.5 truncate">{v.location}</p>}
                  {(v.salary_from || v.salary_to) && (
                    <p className="text-xs text-[#6c63ff] font-medium mt-1.5">
                      {v.salary_from ? `от ${v.salary_from.toLocaleString()}` : ''}
                      {v.salary_to ? ` до ${v.salary_to.toLocaleString()}` : ''} {v.currency || 'RUB'}
                    </p>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-gray-300 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  Нет вакансий
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}