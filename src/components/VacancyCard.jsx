import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, MapPin, Building2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function VacancyCard({ vacancy }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toggleFav = async (e) => {
    e.stopPropagation();
    await base44.entities.Vacancy.update(vacancy.id, { is_favorite: !vacancy.is_favorite });
    queryClient.invalidateQueries({ queryKey: ['vacancies'] });
  };

  const salary = (() => {
    if (!vacancy.salary_from && !vacancy.salary_to) return null;
    const cur = vacancy.currency || 'RUB';
    if (vacancy.salary_from && vacancy.salary_to)
      return `${vacancy.salary_from.toLocaleString()} – ${vacancy.salary_to.toLocaleString()} ${cur}`;
    if (vacancy.salary_from) return `от ${vacancy.salary_from.toLocaleString()} ${cur}`;
    return `до ${vacancy.salary_to.toLocaleString()} ${cur}`;
  })();

  return (
    <div
      onClick={() => navigate(`/VacancyDetail?id=${vacancy.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">{vacancy.title}</p>
        <button onClick={toggleFav} className="shrink-0 mt-0.5">
          <Star className={`w-4 h-4 transition-colors ${vacancy.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {vacancy.company && (
          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{vacancy.company}</span>
        )}
        {vacancy.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vacancy.location}</span>
        )}
      </div>

      {salary && <p className="text-sm font-bold text-[#6c63ff]">{salary}</p>}

      <div className="flex items-center justify-between">
        <StatusBadge status={vacancy.status} />
        {vacancy.source_platform && (
          <span className="text-xs text-gray-400">{vacancy.source_platform}</span>
        )}
      </div>
    </div>
  );
}