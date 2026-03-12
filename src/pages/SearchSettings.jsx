import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = ['hh.ru', 'Хабр Карьера', 'headhunter.by', 'rabota.by', 'MyJob.ge', 'hh.uz', 'superjob.uz'];
const COUNTRIES = ['Россия', 'Беларусь', 'Грузия', 'Армения', 'Узбекистан', 'Кипр', 'Казахстан'];
const EMP_TYPES = ['Полная занятость', 'Частичная занятость', 'Удалённая работа', 'Стажировка', 'Проектная работа'];
const INTERVALS = [1, 3, 6, 12, 24];

const TagInput = ({ value = [], onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };
  return (
    <div className="border border-gray-200 rounded-xl p-2.5 focus-within:border-[#6c63ff] min-h-[48px] flex flex-wrap gap-1.5">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#6c63ff]/10 text-[#6c63ff] text-xs rounded-full font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        className="flex-1 min-w-24 text-sm outline-none bg-transparent"
        placeholder={value.length === 0 ? placeholder : ''}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
      />
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <div onClick={onChange} className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#6c63ff]' : 'bg-gray-200'} relative`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

export default function SearchSettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['searchConfig'],
    queryFn: () => base44.entities.SearchConfig.list(),
  });

  const config = configs[0];
  const [form, setForm] = useState({
    keywords: [], exclude_keywords: [], countries: [], platforms: [],
    employment_type: [], salary_from: '', salary_to: '', salary_currency: 'RUB',
    scan_interval_hours: 6, notify_telegram: false, notify_email: false, is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) setForm(f => ({ ...f, ...config }));
  }, [config]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleArray = (key, val) => {
    set(key, form[key].includes(val) ? form[key].filter(v => v !== val) : [...form[key], val]);
  };

  const save = async () => {
    setSaving(true);
    const data = { ...form, salary_from: Number(form.salary_from) || null, salary_to: Number(form.salary_to) || null };
    if (config) await base44.entities.SearchConfig.update(config.id, data);
    else await base44.entities.SearchConfig.create(data);
    queryClient.invalidateQueries({ queryKey: ['searchConfig'] });
    setSaving(false);
    toast.success('Настройки сохранены');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Настройки поиска</h1>
      <p className="text-gray-500 text-sm mb-6">Параметры автоматического сбора вакансий</p>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Ключевые слова</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Включить</label>
              <TagInput value={form.keywords} onChange={v => set('keywords', v)} placeholder="Введите и нажмите Enter..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Исключить</label>
              <TagInput value={form.exclude_keywords} onChange={v => set('exclude_keywords', v)} placeholder="Введите и нажмите Enter..." />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Платформы</h2>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button key={p} type="button" onClick={() => toggleArray('platforms', p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.platforms.includes(p) ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Страны и занятость</h2>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Страны</label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map(c => (
                  <button key={c} type="button" onClick={() => toggleArray('countries', c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.countries.includes(c) ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Тип занятости</label>
              <div className="flex flex-wrap gap-2">
                {EMP_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => toggleArray('employment_type', t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.employment_type.includes(t) ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Зарплата</h2>
          <div className="flex gap-3 items-center">
            <input type="number" placeholder="От" value={form.salary_from} onChange={e => set('salary_from', e.target.value)}
              className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c63ff]" />
            <span className="text-gray-400">—</span>
            <input type="number" placeholder="До" value={form.salary_to} onChange={e => set('salary_to', e.target.value)}
              className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c63ff]" />
            <select value={form.salary_currency} onChange={e => set('salary_currency', e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c63ff] bg-white">
              {['RUB', 'USD', 'EUR', 'BYN', 'GEL', 'AMD', 'UZS'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Автоматизация и уведомления</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Частота сканирования</label>
              <div className="flex gap-2">
                {INTERVALS.map(h => (
                  <button key={h} type="button" onClick={() => set('scan_interval_hours', h)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.scan_interval_hours === h ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#6c63ff]/50'}`}>
                    {h}ч
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <div className="space-y-2">
                <Toggle label="Уведомления в Telegram" checked={form.notify_telegram} onChange={() => set('notify_telegram', !form.notify_telegram)} />
                {form.notify_telegram && (
                  <div className="ml-12 space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Токен Telegram-бота</label>
                      <input type="text" placeholder="1234567890:ABCdef..." value={form.telegram_bot_token || ''}
                        onChange={e => set('telegram_bot_token', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c63ff]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Chat ID</label>
                      <input type="text" placeholder="-100123456789 или @username" value={form.telegram_chat_id || ''}
                        onChange={e => set('telegram_chat_id', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c63ff]" />
                      <p className="text-xs text-gray-400 mt-1">Получить Chat ID можно через @userinfobot в Telegram</p>
                    </div>
                  </div>
                )}
              </div>
              <Toggle label="Уведомления на Email" checked={form.notify_email} onChange={() => set('notify_email', !form.notify_email)} />
              <Toggle label="Поиск активен" checked={form.is_active} onChange={() => set('is_active', !form.is_active)} />
            </div>
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full py-3 bg-[#6c63ff] text-white font-semibold rounded-xl hover:bg-[#5a52d5] transition-colors disabled:opacity-50 shadow-sm">
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
}