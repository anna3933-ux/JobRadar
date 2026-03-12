import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ExternalLink, MapPin, Building2, Calendar, Briefcase } from 'lucide-react';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';
import { format } from 'date-fns';

export default function VacancyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const { data: vacancy, isLoading } = useQuery({
    queryKey: ['vacancy', id],
    queryFn: () => base44.entities.Vacancy.list().then(list => list.find(v => v.id === id)),
    enabled: !!id,
  });

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vacancy) setNotes(vacancy.notes || '');
  }, [vacancy]);

  const update = async (data) => {
    await base44.entities.Vacancy.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['vacancy', id] });
    queryClient.invalidateQueries({ queryKey: ['vacancies'] });
  };

  const saveNotes = async () => {
    setSaving(true);
    await update({ notes });
    setSaving(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#6c63ff] rounded-full animate-spin" /></div>;
  if (!vacancy) return <div className="p-8 text-center text-gray-400">Вакансия не найдена</div>;

  const salary = (() => {
    if (!vacancy.salary_from && !vacancy.salary_to) return null;
    const cur = vacancy.currency || '';
    if (vacancy.salary_from && vacancy.salary_to) return `${vacancy.salary_from.toLocaleString()} – ${vacancy.salary_to.toLocaleString()} ${cur}`;
    if (vacancy.salary_from) return `от ${vacancy.salary_from.toLocaleString()} ${cur}`;
    return `до ${vacancy.salary_to.toLocaleString()} ${cur}`;
  })();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{vacancy.title}</h1>
            {vacancy.company && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{vacancy.company}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => update({ is_favorite: !vacancy.is_favorite })}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Star className={`w-5 h-5 ${vacancy.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <StatusBadge status={vacancy.status} />
          {salary && <span className="text-sm font-semibold text-[#6c63ff]">{salary}</span>}
          {vacancy.location && (
            <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" />{vacancy.location}</span>
          )}
          {vacancy.employment_type && (
            <span className="flex items-center gap-1 text-sm text-gray-500"><Briefcase className="w-3.5 h-3.5" />{vacancy.employment_type}</span>
          )}
          {vacancy.published_at && (
            <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="w-3.5 h-3.5" />{format(new Date(vacancy.published_at), 'dd.MM.yyyy')}</span>
          )}
        </div>

        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Сменить статус</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => update({ status: key })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${vacancy.status === key ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {vacancy.source_url && (
          <a href={vacancy.source_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#6c63ff] hover:underline">
            <ExternalLink className="w-4 h-4" /> Открыть на {vacancy.source_platform || 'сайте'}
          </a>
        )}
      </div>

      {vacancy.description && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Описание</h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{vacancy.description}</div>
        </div>
      )}

      {vacancy.tags?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Теги</h2>
          <div className="flex flex-wrap gap-2">
            {vacancy.tags.map(tag => (
              <span key={tag} className="px-3 py-1 text-xs rounded-full bg-[#6c63ff]/10 text-[#6c63ff] font-medium">{tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Заметки</h2>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#6c63ff] resize-none"
          rows={5}
          placeholder="Добавьте заметки..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={saveNotes}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[#6c63ff] text-white rounded-lg font-medium hover:bg-[#5a52d5] transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить заметки'}
          </button>
        </div>
      </div>
    </div>
  );
}