import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, Star, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import VacancyCard from '@/components/VacancyCard';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';

const STATUSES = ['all', ...Object.keys(STATUS_CONFIG)];

export default function VacanciesList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const [scraping, setScraping] = useState(false);

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => base44.entities.Vacancy.list('-created_date', 500),
  });

  const filtered = vacancies.filter(v => {
    if (favOnly && !v.is_favorite) return false;
    if (status !== 'all' && v.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      return (v.title || '').toLowerCase().includes(q) ||
        (v.company || '').toLowerCase().includes(q) ||
        (v.location || '').toLowerCase().includes(q);
    }
    return true;
  });

  const runScraper = async () => {
    setScraping(true);
    try {
      const res = await base44.functions.invoke('scrapeVacancies', {});
      toast.success(`Найдено: ${res.data.total_found}, добавлено: ${res.data.new_added}`);
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    } catch (e) {
      toast.error(e.message || 'Ошибка скрейпинга');
    }
    setScraping(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Вакансии</h1>
        <button
          onClick={runScraper}
          disabled={scraping}
          className="flex items-center gap-2 px-4 py-2 bg-[#6c63ff] text-white text-sm font-medium rounded-xl hover:bg-[#5a52d5] transition-colors disabled:opacity-50 shadow-sm"
        >
          {scraping ? <><Loader2 className="w-4 h-4 animate-spin" />Сканирование...</> : <><Play className="w-4 h-4" />Запустить скрейпер</>}
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-5">{vacancies.length} вакансий в базе</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#6c63ff]"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setFavOnly(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${favOnly ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-white border-gray-200 text-gray-600'}`}
        >
          <Star className="w-4 h-4" />Избранные
        </button>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['vacancies'] })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${status === s ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}
          >
            {s === 'all' ? 'Все' : STATUS_CONFIG[s]?.label}
            <span className="ml-1.5 opacity-70">
              {s === 'all' ? vacancies.length : vacancies.filter(v => v.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#6c63ff] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-1">Ничего не найдено</p>
          <p className="text-sm">Попробуйте изменить фильтры или запустить скрейпер</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => <VacancyCard key={v.id} vacancy={v} />)}
        </div>
      )}
    </div>
  );
}