import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, Star, ChevronUp, ChevronDown } from 'lucide-react';
import StatusBadge, { STATUS_CONFIG } from '@/components/StatusBadge';
import { format } from 'date-fns';

export default function VacanciesList() {
  const navigate = useNavigate();
  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => base44.entities.Vacancy.list('-created_date', 500),
  });

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortField, setSortField] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');

  const platforms = [...new Set(vacancies.map(v => v.source_platform).filter(Boolean))];
  const countries = [...new Set(vacancies.map(v => v.country).filter(Boolean))];
  const types = [...new Set(vacancies.map(v => v.employment_type).filter(Boolean))];

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let res = vacancies.filter(v => {
      if (search && !v.title?.toLowerCase().includes(search.toLowerCase()) && !v.company?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      if (filterPlatform && v.source_platform !== filterPlatform) return false;
      if (filterCountry && v.country !== filterCountry) return false;
      if (filterType && v.employment_type !== filterType) return false;
      return true;
    });
    res.sort((a, b) => {
      let va = sortField === 'salary' ? (a.salary_from || 0) : a[sortField] || '';
      let vb = sortField === 'salary' ? (b.salary_from || 0) : b[sortField] || '';
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return res;
  }, [vacancies, search, filterStatus, filterPlatform, filterCountry, filterType, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#6c63ff]" /> : <ChevronDown className="w-3 h-3 text-[#6c63ff]" />;
  };

  const salary = (v) => {
    if (!v.salary_from && !v.salary_to) return '—';
    const cur = v.currency || '';
    if (v.salary_from && v.salary_to) return `${v.salary_from.toLocaleString()} – ${v.salary_to.toLocaleString()} ${cur}`;
    if (v.salary_from) return `от ${v.salary_from.toLocaleString()} ${cur}`;
    return `до ${v.salary_to.toLocaleString()} ${cur}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Вакансии</h1>
      <p className="text-gray-500 text-sm mb-6">{filtered.length} из {vacancies.length} вакансий</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#6c63ff]"
              placeholder="Поиск по названию или компании..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {[
            { value: filterStatus, setter: setFilterStatus, options: Object.entries(STATUS_CONFIG).map(([k,v]) => ({ value: k, label: v.label })), placeholder: 'Статус' },
            { value: filterPlatform, setter: setFilterPlatform, options: platforms.map(p => ({ value: p, label: p })), placeholder: 'Источник' },
            { value: filterCountry, setter: setFilterCountry, options: countries.map(c => ({ value: c, label: c })), placeholder: 'Страна' },
            { value: filterType, setter: setFilterType, options: types.map(t => ({ value: t, label: t })), placeholder: 'Занятость' },
          ].map(({ value, setter, options, placeholder }) => (
            <select
              key={placeholder}
              value={value}
              onChange={e => setter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c63ff] text-gray-700 bg-white"
            >
              <option value="">{placeholder}</option>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#6c63ff] rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left w-8"></th>
                  <th className="px-5 py-3 text-left">Вакансия</th>
                  <th className="px-5 py-3 text-left">Статус</th>
                  <th className="px-5 py-3 text-left cursor-pointer hover:text-gray-700" onClick={() => toggleSort('salary')}>
                    <div className="flex items-center gap-1">Зарплата <SortIcon field="salary" /></div>
                  </th>
                  <th className="px-5 py-3 text-left">Источник</th>
                  <th className="px-5 py-3 text-left">Страна</th>
                  <th className="px-5 py-3 text-left cursor-pointer hover:text-gray-700" onClick={() => toggleSort('published_at')}>
                    <div className="flex items-center gap-1">Дата <SortIcon field="published_at" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.id} onClick={() => navigate(`/VacancyDetail?id=${v.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      {v.is_favorite && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 line-clamp-1">{v.title}</p>
                      {v.company && <p className="text-xs text-gray-500">{v.company}</p>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{salary(v)}</td>
                    <td className="px-5 py-3 text-gray-500">{v.source_platform || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{v.country || '—'}</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {v.published_at ? format(new Date(v.published_at), 'dd.MM.yy') : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Вакансии не найдены</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}