import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Star, MapPin, Building2, Calendar, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';

export default function VacancyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const { data: vacancy, isLoading } = useQuery({
    queryKey: ['vacancy', id],
    queryFn: () => base44.entities.Vacancy.filter({ id }),
    select: data => data[0],
    enabled: !!id,
  });

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const update = async (patch) => {
    await base44.entities.Vacancy.update(id, patch);
    queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
    queryClient.invalidateQueries({ queryKey: ['vacancies'] });
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await update({ notes });
    setSavingNotes(false);
    toast.success('Заметки сохранены');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );

  if (!vacancy) return (
    <div className="p-6 text-center text-gray-400">Вакансия не найдена</div>
  );

  const salary = (() => {
    if (!vacancy.salary_from && !vacancy.salary_to) return null;
    const cur = vacancy.currency || 'RUB';
    if (vacancy.salary_from && vacancy.salary_to)
      return `${vacancy.salary_from.toLocaleString()} – ${vacancy.salary_to.toLocaleString()} ${cur}`;
    if (vacancy.salary_from) return `от ${vacancy.salary_from.toLocaleString()} ${cur}`;
    return `до ${vacancy.salary_to.toLocaleString()} ${cur}`;
  })();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/VacanciesList')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Назад к списку
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 flex-1 mr-3">{vacancy.title}</h1>
          <button onClick={() => update({ is_favorite: !vacancy.is_favorite })}>
            <Star className={`w-5 h-5 transition-colors ${vacancy.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
          {vacancy.company && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" />{vacancy.company}</span>}
          {vacancy.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" />{vacancy.location}</span>}
          {vacancy.published_at && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{vacancy.published_at}</span>}
          {vacancy.employment_type && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-gray-400" />{vacancy.employment_type}</span>}
        </div>

        {salary && <p className="text-lg font-bold text-[#6c63ff] mb-4">{salary}</p>}

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <StatusBadge status={vacancy.status} />
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">{vacancy.source_platform || '—'}</span>
          {vacancy.source_url && (
            <a href={vacancy.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#6c63ff] hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />Открыть вакансию
            </a>
          )}
        </div>

        {/* Status change */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Изменить статус</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => update({ status: key })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${vacancy.status === key ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {vacancy.description && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Описание</h2>
          <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{vacancy.description}</div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Заметки</h2>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#6c63ff] resize-none min-h-[100px]"
          placeholder="Добавьте заметки..."
          defaultValue={vacancy.notes || ''}
          onChange={e => setNotes(e.target.value)}
        />
        <button onClick={saveNotes} disabled={savingNotes}
          className="mt-2 px-4 py-2 bg-[#6c63ff] text-white text-sm font-medium rounded-xl hover:bg-[#5a52d5] transition-colors disabled:opacity-50">
          {savingNotes ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}