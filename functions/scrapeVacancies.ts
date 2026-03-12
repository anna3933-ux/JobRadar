import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(level, msg, data) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console[level](`[${ts}] [${level.toUpperCase()}] ${msg}`, JSON.stringify(data, null, 2));
  } else {
    console[level](`[${ts}] [${level.toUpperCase()}] ${msg}`);
  }
}

async function hhFetch(url, headers) {
  log('info', `→ HH.RU REQUEST`, { url, headers });
  const res = await fetch(url, { headers });
  const responseHeaders = Object.fromEntries(res.headers.entries());
  const rawText = await res.text();
  let body = null;
  try { body = JSON.parse(rawText); } catch (_) { body = rawText; }
  if (!res.ok) {
    log('error', `← HH.RU RESPONSE ERROR status=${res.status}`, { responseHeaders, body });
  } else {
    log('info', `← HH.RU RESPONSE status=${res.status} items=${body?.found ?? body?.items?.length ?? '?'}`, { pages: body?.pages, per_page: body?.per_page });
  }
  return { ok: res.ok, status: res.status, body };
}

async function sendTelegram(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
  log('info', `→ TELEGRAM REQUEST`, { url, payload });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseBody = await res.json().catch(() => null);
  log('info', `← TELEGRAM RESPONSE status=${res.status}`, responseBody);
  return res.ok;
}

// Map Russian country names → hh.ru area IDs
const AREA_MAP = {
  'Россия': '113', 'Russia': '113',
  'Беларусь': '16', 'Belarus': '16',
  'Казахстан': '40', 'Kazakhstan': '40',
  'Украина': '5',   'Ukraine': '5',
  'Грузия': '28',   'Georgia': '28',
  'Армения': '1013','Armenia': '1013',
  'Узбекистан': '97','Uzbekistan': '97',
  'Кипр': '1012',   'Cyprus': '1012',
};

// Map employment type names → hh.ru employment IDs
// hh.ru employment values: full, part, project, volunteer, probation
// hh.ru schedule values: fullDay, shift, flexible, remote, flyInFlyOut
const EMP_MAP = {
  // Russian UI values
  'Полная занятость': { employment: 'full' },
  'Частичная занятость': { employment: 'part' },
  'Удалённая работа': { schedule: 'remote' },
  'Стажировка': { employment: 'probation' },
  'Проектная работа': { employment: 'project' },
  // English UI values (from SearchSettings)
  'remote': { schedule: 'remote' },
  'Remote': { schedule: 'remote' },
  'hybrid': { schedule: 'flexible' },
  'Hybrid': { schedule: 'flexible' },
  'office': { employment: 'full' },
  'Office': { employment: 'full' },
  'full-time': { employment: 'full' },
  'part-time': { employment: 'part' },
  'contract': { employment: 'project' },
  'internship': { employment: 'probation' },
};

const HH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://hh.ru/',
  'Origin': 'https://hh.ru',
};

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startTime = Date.now();

  // Determine trigger type (manual vs automated)
  const triggerSource = req.headers.get('x-automation-id') ? 'CRON/AUTOMATION' : 'MANUAL';
  log('info', `═══════════════════════════════════════════`);
  log('info', `SCRAPE JOB STARTED — trigger: ${triggerSource}`);
  log('info', `Request headers`, Object.fromEntries(req.headers.entries()));

  let logEntryId = null;

  try {
    const base44 = createClientFromRequest(req);

    // Auth — allow both user calls and service/automation calls
    let callerInfo = 'automation/service';
    try {
      const user = await base44.auth.me();
      if (!user) {
        log('warn', 'No authenticated user — assuming automation context');
      } else {
        callerInfo = `user:${user.email} role:${user.role}`;
        log('info', `Authenticated caller: ${callerInfo}`);
      }
    } catch (e) {
      log('warn', `Auth check failed (automation context?): ${e.message}`);
    }

    // Load config
    log('info', 'Loading SearchConfig...');
    const configs = await base44.asServiceRole.entities.SearchConfig.list();
    const config = configs?.[0];
    log('info', 'SearchConfig loaded', config);

    if (!config) {
      log('error', 'No SearchConfig found — aborting');
      return Response.json({ error: 'Настройки поиска не найдены' }, { status: 404 });
    }
    if (!config.is_active) {
      log('warn', 'SearchConfig is_active=false — aborting');
      return Response.json({ message: 'Поиск деактивирован в настройках' });
    }

    const keywords = config.keywords || [];
    const excludeKeywords = config.exclude_keywords || [];
    const countries = config.countries || [];
    const empTypes = config.employment_type || [];

    if (keywords.length === 0) {
      log('warn', 'No keywords configured — aborting');
      return Response.json({ message: 'Ключевые слова не настроены' });
    }

    log('info', `Config summary`, {
      keywords,
      excludeKeywords,
      countries,
      empTypes,
      salary_from: config.salary_from,
      salary_to: config.salary_to,
      salary_currency: config.salary_currency,
      notify_telegram: config.notify_telegram,
    });

    // Create scraper log entry
    const logEntry = await base44.asServiceRole.entities.ScraperLog.create({
      started_at: new Date().toISOString(),
      platform: 'hh.ru',
      status: 'running',
      total_found: 0,
      new_added: 0,
    });
    logEntryId = logEntry.id;
    log('info', `ScraperLog created id=${logEntryId}`);

    // Load existing vacancies to deduplicate
    log('info', 'Loading existing vacancies for deduplication...');
    const existingVacancies = await base44.asServiceRole.entities.Vacancy.list('-created_date', 1000);
    const existingHashes = new Set(existingVacancies.map(v => v.hash).filter(Boolean));
    const existingUrls = new Set(existingVacancies.map(v => v.source_url).filter(Boolean));
    log('info', `Existing vacancies: ${existingVacancies.length}, unique hashes: ${existingHashes.size}`);

    // Build base query params
    const baseParams = {};
    // hh.ru salary filter: only RUR is reliable; skip USD/other to avoid 400 errors
    if (config.salary_from) {
      const cur = (config.salary_currency || 'RUB').toUpperCase();
      if (cur === 'RUB' || cur === 'RUR') {
        baseParams.salary = String(config.salary_from);
        baseParams.currency = 'RUR';
        baseParams.only_with_salary = 'false';
        log('info', `Salary filter: ${config.salary_from} RUR`);
      } else {
        log('warn', `Salary currency=${cur} — hh.ru only supports RUR for salary filter, skipping salary filter to avoid errors`);
      }
    }

    // Area IDs
    const areaIds = countries.map(c => AREA_MAP[c]).filter(Boolean);

    // Employment — collect employment and schedule values
    const empIds = [];
    const scheduleIds = [];
    for (const et of empTypes) {
      const mapped = EMP_MAP[et];
      if (mapped?.employment) empIds.push(mapped.employment);
      if (mapped?.schedule) scheduleIds.push(mapped.schedule);
    }
    log('info', `Employment IDs: ${empIds.join(', ') || 'none'} | Schedule IDs: ${scheduleIds.join(', ') || 'none'}`);

    let totalFound = 0;
    let newAdded = 0;
    const errors = [];
    const newVacanciesForNotify = [];

    // ── Iterate keywords ─────────────────────────────────────────────────────
    for (const keyword of keywords) {
      log('info', `──── Keyword: "${keyword}" ────`);

      const params = new URLSearchParams({
        text: keyword,
        per_page: '100',
        page: '0',
        order_by: 'publication_time',
        ...baseParams,
      });

      areaIds.forEach(id => params.append('area', id));
      // hh.ru allows multiple employment but only one schedule
      empIds.forEach(id => params.append('employment', id));
      if (scheduleIds.length > 0) params.append('schedule', scheduleIds[0]);

      const url = `https://api.hh.ru/vacancies?${params.toString()}`;
      const { ok, status, body } = await hhFetch(url, HH_HEADERS);

      if (!ok) {
        const errMsg = `hh.ru API error for "${keyword}": HTTP ${status}`;
        log('error', errMsg);
        errors.push(errMsg);
        continue;
      }

      const items = body?.items || [];
      log('info', `Found ${items.length} items for keyword "${keyword}" (total pages: ${body?.pages})`);
      totalFound += items.length;

      for (const item of items) {
        const hash = `hh_${item.id}`;

        if (existingHashes.has(hash)) {
          log('info', `  SKIP (duplicate hash) ${hash}: ${item.name}`);
          continue;
        }
        if (existingUrls.has(item.alternate_url)) {
          log('info', `  SKIP (duplicate url): ${item.alternate_url}`);
          continue;
        }

        // Exclude keyword filter
        const titleLower = (item.name || '').toLowerCase();
        const companyLower = (item.employer?.name || '').toLowerCase();
        const excluded = excludeKeywords.find(kw =>
          titleLower.includes(kw.toLowerCase()) || companyLower.includes(kw.toLowerCase())
        );
        if (excluded) {
          log('info', `  SKIP (excluded keyword "${excluded}"): ${item.name}`);
          continue;
        }

        const vacancy = {
          title: item.name,
          company: item.employer?.name || '',
          location: item.area?.name || '',
          salary_from: item.salary?.from || null,
          salary_to: item.salary?.to || null,
          currency: item.salary?.currency?.replace('RUR', 'RUB') || 'RUB',
          source_platform: 'hh.ru',
          source_url: item.alternate_url,
          published_at: item.published_at ? item.published_at.split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'new',
          is_favorite: false,
          hash,
          employment_type: item.employment?.name || '',
          country: countries[0] || item.area?.name || '',
          tags: [keyword],
        };

        log('info', `  NEW vacancy: "${vacancy.title}" @ ${vacancy.company} [${hash}]`);
        await base44.asServiceRole.entities.Vacancy.create(vacancy);
        existingHashes.add(hash);
        existingUrls.add(item.alternate_url);
        newAdded++;
        newVacanciesForNotify.push(vacancy);
      }
    }

    const durationMs = Date.now() - startTime;
    log('info', `Scraping complete. total_found=${totalFound} new_added=${newAdded} duration=${durationMs}ms`);
    if (errors.length > 0) log('warn', 'Errors during scraping', errors);

    // ── Update log entry ─────────────────────────────────────────────────────
    const finalStatus = errors.length > 0 && newAdded === 0 ? 'error' : 'success';
    await base44.asServiceRole.entities.ScraperLog.update(logEntryId, {
      finished_at: new Date().toISOString(),
      total_found: totalFound,
      new_added: newAdded,
      status: finalStatus,
      error_message: errors.join('; ') || undefined,
    });
    log('info', `ScraperLog updated id=${logEntryId} status=${finalStatus}`);

    // ── Telegram notification ─────────────────────────────────────────────────
    if (config.notify_telegram && config.telegram_bot_token && config.telegram_chat_id) {
      if (newVacanciesForNotify.length > 0) {
        log('info', `Sending Telegram summary to chat ${config.telegram_chat_id}`);
        const summary =
          `🎯 <b>JobRadar: найдено ${newAdded} новых вакансий</b>\n` +
          `🔑 Ключевые слова: ${keywords.join(', ')}\n` +
          `⏱ Длительность: ${(durationMs / 1000).toFixed(1)}с\n` +
          `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

        await sendTelegram(config.telegram_bot_token, config.telegram_chat_id, summary);

        const top = newVacanciesForNotify.slice(0, 5);
        for (const v of top) {
          const sal = v.salary_from || v.salary_to
            ? `💰 ${v.salary_from ? `от ${v.salary_from.toLocaleString()}` : ''}${v.salary_to ? ` до ${v.salary_to.toLocaleString()}` : ''} ${v.currency}`
            : '💰 зарплата не указана';
          const text =
            `📌 <b>${v.title}</b>\n` +
            `🏢 ${v.company || '—'}\n` +
            `📍 ${v.location || '—'}\n` +
            `${sal}\n` +
            `🔗 <a href="${v.source_url}">Открыть вакансию</a>`;
          await sendTelegram(config.telegram_bot_token, config.telegram_chat_id, text);
          await new Promise(r => setTimeout(r, 150));
        }
        if (newVacanciesForNotify.length > 5) {
          await sendTelegram(
            config.telegram_bot_token,
            config.telegram_chat_id,
            `... и ещё ${newVacanciesForNotify.length - 5} вакансий в приложении JobRadar`
          );
        }
      } else {
        log('info', 'No new vacancies — skipping Telegram notification');
      }
    } else {
      log('info', 'Telegram notifications disabled or not configured');
    }

    log('info', `SCRAPE JOB FINISHED — trigger: ${triggerSource} | total_found=${totalFound} new_added=${newAdded} | ${durationMs}ms`);
    log('info', `═══════════════════════════════════════════`);

    return Response.json({
      success: true,
      trigger: triggerSource,
      total_found: totalFound,
      new_added: newAdded,
      duration_ms: durationMs,
      errors: errors.length > 0 ? errors : undefined,
      message: `Найдено: ${totalFound}, добавлено: ${newAdded}`,
    });

  } catch (error) {
    log('error', `FATAL ERROR: ${error.message}`, error.stack);
    if (logEntryId) {
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.ScraperLog.update(logEntryId, {
          finished_at: new Date().toISOString(),
          status: 'error',
          error_message: error.message,
        });
      } catch (_) { /* ignore */ }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});