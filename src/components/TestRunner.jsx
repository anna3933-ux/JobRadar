import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function TestRunner({ onClose }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const run = async () => {
    setRunning(true);
    setResults(null);
    const res = await base44.functions.invoke('runTests', {});
    setResults(res.data);
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Тесты системы</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {!results && !running && (
            <p className="text-sm text-gray-500">Нажмите «Запустить», чтобы проверить работу всех компонентов системы.</p>
          )}
          {running && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#6c63ff]" />
              Выполняется...
            </div>
          )}
          {results?.results?.map((r, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              {r.status === 'pass'
                ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{r.name}</p>
                {r.error && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{r.duration}ms</span>
            </div>
          ))}
        </div>

        {results?.summary && (
          <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
            Итого: <span className="text-green-600 font-semibold">{results.summary.passed} прошло</span>
            {results.summary.failed > 0 && <span className="text-red-500 font-semibold ml-2">{results.summary.failed} упало</span>}
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={run}
            disabled={running}
            className="w-full py-2.5 bg-[#6c63ff] text-white text-sm font-medium rounded-xl hover:bg-[#5a52d5] disabled:opacity-50 transition-colors"
          >
            {running ? 'Выполняется...' : 'Запустить'}
          </button>
        </div>
      </div>
    </div>
  );
}