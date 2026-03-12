import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function VacancyCard({ vacancy }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toggleFavorite = async (e) => {
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
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-[#6c63ff]/30 transition-all select-none"
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1 mr-2">{vacancy.title}</h3>
        <button onClick={toggleFavorite} className="flex-shrink-0 mt-0.5 p-0.5">
          <Star className={`w-4 h-4 transition-colors ${vacancy.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`} />
        </button>
      </div>
      {vacancy.company && <p className="text-xs text-gray-500 mb-2">{vacancy.company}</p>}
      {salary && <p className="text-xs font-semibold text-[#6c63ff] mb-2">{salary}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{vacancy.source_platform || '—'}</span>
        {vacancy.location && <span className="text-xs text-gray-400 truncate ml-2">{vacancy.location}</span>}
      </div>
    </div>
  );
}