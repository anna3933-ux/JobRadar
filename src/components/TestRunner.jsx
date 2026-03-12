import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, FlaskConical, X, Clock } from 'lucide-react';

export default function TestRunner({ onClose }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('runTests', {});
      setResults(res.data);
    } catch (e) {
      setError(e.message);
    }
    setRunning(false);
  };

  const summary = results?.summary;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-[#6c63ff]" />
            <h2 className="text-base font-bold text-gray-900">Авто-тесты</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!results && !running && !error && (
            <p className="text-sm text-gray-500 mb-4">
              Проверяет CRUD операции с вакансиями, настройками, логами, а также доступность hh.ru API.
            </p>
          )}

          {running && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-[#6c63ff] animate-spin" />
              <p className="text-sm text-gray-500">Выполняется...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
          )}

          {results && (
            <>
              <div className={`flex items-center gap-4 p-4 rounded-xl mb-4 ${summary.failed === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-2xl font-bold text-gray-900">{summary.passed}/{summary.total}</div>
                <div>
                  <p className={`text-sm font-semibold ${summary.failed === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {summary.failed === 0 ? '✅ Все тесты прошли' : `❌ ${summary.failed} тест(а) упали`}
                  </p>
                  <p className="text-xs text-gray-500">{summary.passed} прошло · {summary.failed} упало</p>
                </div>
              </div>

              <div className="space-y-2">
                {results.results.map((r, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${r.status === 'pass' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                    {r.status === 'pass'
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{r.name}</p>
                      {r.error && <p className="text-xs text-red-600 mt-0.5">{r.error}</p>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <Clock className="w-3 h-3" />{r.duration}ms
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={run}
            disabled={running}
            className="w-full py-2.5 bg-[#6c63ff] text-white font-semibold rounded-xl hover:bg-[#5a52d5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {running ? <><Loader2 className="w-4 h-4 animate-spin" />Выполняется...</> : <><FlaskConical className="w-4 h-4" />Запустить тесты</>}
          </button>
        </div>
      </div>
    </div>
  );
}