import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

export default function MultiSelectFilter({ options, selected, onChange, placeholder = 'Все должности' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 min-h-[38px] border border-gray-200 rounded-xl px-3 py-1.5 cursor-pointer hover:border-[#6c63ff]/50 transition-colors bg-white"
      >
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        {selected.length === 0 ? (
          <span className="text-sm text-gray-400 flex-1">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#6c63ff]/10 text-[#6c63ff] text-xs rounded-full font-medium">
                {s}
                <button type="button" onClick={e => { e.stopPropagation(); toggle(s); }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#6c63ff]"
              placeholder="Поиск..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && <p className="text-sm text-gray-400 p-3">Ничего не найдено</p>}
            {filtered.map(o => (
              <label key={o} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="accent-[#6c63ff]" />
                <span className="text-sm text-gray-700 truncate">{o}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <button onClick={() => onChange([])} className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1">
                Очистить выбор ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}