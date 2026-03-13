import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, Star, Play, RefreshCw, LayoutGrid, Columns, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import VacancyCard from '@/components/VacancyCard';
import KanbanBoard from '@/components/KanbanBoard';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';

const STATUSES = ['all', ...Object.keys(STATUS_CONFIG)];
const PLATFORMS = ['hh.ru', 'Хабр Карьера', 'headhunter.by', 'rabota.by', 'MyJob.ge'];
const EMP_TYPES = ['Полная занятость', 'Частичная занятость', 'Удалённая работа', 'Стажировка', 'Проектная работа'];
const COUNTRIES = ['Россия', 'Беларусь', 'Грузия', 'Армения', 'Узбекистан', 'Кипр', 'Казахстан'];

export default function VacanciesList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPlatforms, setFilterPlatforms] = useState([]);
  const [filterEmpTypes, setFilterEmpTypes] = useState([]);
  const [filterCountries, setFilterCountries] = useState([]);

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => base44.entities.Vacancy.list('-created_date', 500),
  });

  const filtered = vacancies.filter(v => {
    if (favOnly && !v.is_favorite) return false;
    if (status !== 'all' && v.status !== status) return false;
    if (filterPlatforms.length > 0 && !filterPlatforms.includes(v.source_platform)) return false;
    if (filterEmpTypes.length > 0 && !filterEmpTypes.includes(v.employment_type)) return false;
    if (filterCountries.length > 0 && !filterCountries.includes(v.country)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (v.title || '').toLowerCase().includes(q) ||
        (v.company || '').toLowerCase().includes(q) ||
        (v.location || '').toLowerCase().includes(q);
    }
    return true;
  });

  const activeFilterCount = filterPlatforms.length + filterEmpTypes.length + filterCountries.length;

  const toggleChip = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const clearFilters = () => {
    setFilterPlatforms([]);
    setFilterEmpTypes([]);
    setFilterCountries([]);
  };

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

      {/* Main controls */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#6c63ff]"
            placeholder="Поиск по названию, компании, городу..."
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
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${showFilters || activeFilterCount > 0 ? 'bg-[#6c63ff]/10 border-[#6c63ff]/30 text-[#6c63ff]' : 'bg-white border-gray-200 text-gray-600'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Фильтры
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-[#6c63ff] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
        {/* View toggle */}
        <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setView('list')}
            title="Список"
            className={`px-3 py-2 transition-colors ${view === 'list' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('kanban')}
            title="Канбан"
            className={`px-3 py-2 transition-colors ${view === 'kanban' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Columns className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['vacancies'] })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Extended filter panel */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Расширенные фильтры</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />Сбросить все
              </button>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Платформа</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => toggleChip(filterPlatforms, setFilterPlatforms, p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterPlatforms.includes(p) ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Тип занятости</label>
            <div className="flex flex-wrap gap-2">
              {EMP_TYPES.map(t => (
                <button key={t} onClick={() => toggleChip(filterEmpTypes, setFilterEmpTypes, t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterEmpTypes.includes(t) ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Зарплата (RUB)</label>
            <div className="flex gap-3 items-center">
              <input type="number" placeholder="От" value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)}
                className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6c63ff]" />
              <span className="text-gray-400">—</span>
              <input type="number" placeholder="До" value={salaryTo} onChange={e => setSalaryTo(e.target.value)}
                className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6c63ff]" />
            </div>
          </div>
        </div>
      )}

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
      ) : view === 'kanban' ? (
        <KanbanBoard vacancies={filtered} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => <VacancyCard key={v.id} vacancy={v} />)}
        </div>
      )}
    </div>
  );
}