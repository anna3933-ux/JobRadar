import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Получаем все активные сайты
    const sites = await base44.entities.MonitoredSite.list({
      query: { is_active: true }
    });

    if (!sites || sites.length === 0) {
      return new Response(JSON.stringify({ status: 'no_sites' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results: any[] = [];
    const now = new Date().toISOString();

    for (const site of sites) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          (site.data.timeout_seconds || 10) * 1000
        );

        const response = await fetch(site.data.url, {
          redirect: 'follow',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const isOk = response.status < 400;
        const wasOk = site.data.last_ok;

        // Обновляем статус сайта
        await base44.entities.MonitoredSite.update(site.id, {
          last_ok: isOk,
          last_checked_at: now,
          down_since: isOk ? null : (wasOk === false ? site.data.down_since : now)
        });

        // Логируем изменения статуса
        if (wasOk === true && isOk === false) {
          results.push({
            type: 'down',
            url: site.data.url,
            status: response.status
          });
        } else if (wasOk === false && isOk === true) {
          const downSince = new Date(site.data.down_since || now);
          const downtime = Math.floor(
            (new Date(now).getTime() - downSince.getTime()) / 1000 / 60
          );
          results.push({
            type: 'up',
            url: site.data.url,
            downtime_minutes: downtime
          });
        }
      } catch (error: any) {
        const wasOk = site.data.last_ok;

        await base44.entities.MonitoredSite.update(site.id, {
          last_ok: false,
          last_checked_at: now,
          down_since: wasOk === false ? site.data.down_since : now
        });

        if (wasOk !== false) {
          results.push({
            type: 'down',
            url: site.data.url,
            error: error.message
          });
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok', events: results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
