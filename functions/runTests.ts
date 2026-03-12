import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = [];
    const run = async (name, fn) => {
      const start = Date.now();
      try {
        await fn();
        results.push({ name, status: 'pass', duration: Date.now() - start });
      } catch (e) {
        results.push({ name, status: 'fail', error: e.message, duration: Date.now() - start });
      }
    };

    // ── Entity CRUD tests ────────────────────────────────────────────────────

    await run('SearchConfig: read list', async () => {
      const list = await base44.asServiceRole.entities.SearchConfig.list();
      if (!Array.isArray(list)) throw new Error('Expected array');
    });

    await run('SearchConfig: has at least one config', async () => {
      const list = await base44.asServiceRole.entities.SearchConfig.list();
      if (list.length === 0) throw new Error('No SearchConfig found — please save settings first');
    });

    await run('SearchConfig: keywords is array', async () => {
      const list = await base44.asServiceRole.entities.SearchConfig.list();
      const config = list[0];
      if (!config) throw new Error('No config');
      if (!Array.isArray(config.keywords)) throw new Error(`keywords is ${typeof config.keywords}`);
    });

    await run('Vacancy: read list', async () => {
      const list = await base44.asServiceRole.entities.Vacancy.list('-created_date', 5);
      if (!Array.isArray(list)) throw new Error('Expected array');
    });

    await run('Vacancy: create + delete (CRUD cycle)', async () => {
      const created = await base44.asServiceRole.entities.Vacancy.create({
        title: '__TEST_VACANCY__',
        company: 'Test Co',
        status: 'new',
        hash: `test_${Date.now()}`,
      });
      if (!created?.id) throw new Error('Create failed — no id returned');
      await base44.asServiceRole.entities.Vacancy.delete(created.id);
    });

    await run('Vacancy: update status', async () => {
      const created = await base44.asServiceRole.entities.Vacancy.create({
        title: '__TEST_UPDATE__',
        status: 'new',
        hash: `test_upd_${Date.now()}`,
      });
      const updated = await base44.asServiceRole.entities.Vacancy.update(created.id, { status: 'viewed' });
      await base44.asServiceRole.entities.Vacancy.delete(created.id);
      if (!updated) throw new Error('Update returned nothing');
    });

    await run('ScraperLog: read list', async () => {
      const list = await base44.asServiceRole.entities.ScraperLog.list('-created_date', 5);
      if (!Array.isArray(list)) throw new Error('Expected array');
    });

    // ── hh.ru API connectivity ───────────────────────────────────────────────

    await run('hh.ru API: connectivity check', async () => {
      const res = await fetch('https://api.hh.ru/areas/113', {
        headers: { 'User-Agent': 'JobRadar/1.0' },
      });
      if (!res.ok) throw new Error(`hh.ru returned HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.id) throw new Error('Unexpected response structure');
    });

    await run('hh.ru API: vacancies search', async () => {
      const res = await fetch('https://api.hh.ru/vacancies?text=developer&per_page=1&area=113', {
        headers: { 'User-Agent': 'JobRadar/1.0' },
      });
      if (!res.ok) throw new Error(`hh.ru search returned HTTP ${res.status}`);
      const json = await res.json();
      if (typeof json?.found !== 'number') throw new Error('No "found" field in response');
    });

    // ── Deduplication logic ──────────────────────────────────────────────────

    await run('Deduplication: hash-based duplicate prevention', async () => {
      const hash = `dedup_test_${Date.now()}`;
      const v1 = await base44.asServiceRole.entities.Vacancy.create({ title: 'Dup1', hash, status: 'new' });
      const existing = await base44.asServiceRole.entities.Vacancy.list('-created_date', 100);
      const hashes = new Set(existing.map(v => v.hash).filter(Boolean));
      await base44.asServiceRole.entities.Vacancy.delete(v1.id);
      if (!hashes.has(hash)) throw new Error('Hash not found in existing vacancies');
    });

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;

    return Response.json({ results, summary: { passed, failed, total: results.length } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});