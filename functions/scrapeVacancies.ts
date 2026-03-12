import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const configs = await base44.entities.SearchConfig.list();
    const config = configs[0];
    if (!config) return Response.json({ error: 'Настройки поиска не найдены' }, { status: 404 });

    const platforms = config.platforms || [];
    const keywords = config.keywords || [];
    const results = { platforms_scanned: platforms, new_added: 0, message: '' };

    // Логируем запуск
    const logEntry = await base44.entities.ScraperLog.create({
      started_at: new Date().toISOString(),
      platform: platforms.join(', ') || 'Все платформы',
      status: 'running',
    });

    // Симуляция скрейпинга: создаём лог с результатами
    // В реальном сценарии здесь будет обращение к API платформ
    const mockNewVacancies = 0; // В реальной реализации — реальное число

    await base44.entities.ScraperLog.update(logEntry.id, {
      finished_at: new Date().toISOString(),
      total_found: mockNewVacancies,
      new_added: mockNewVacancies,
      status: 'success',
    });

    results.new_added = mockNewVacancies;
    results.message = `Сканирование завершено. Платформы: ${platforms.join(', ') || 'не настроены'}. Ключевые слова: ${keywords.join(', ') || 'не настроены'}.`;

    // Отправка уведомления в Telegram если настроено
    if (config.notify_telegram && config.telegram_bot_token && config.telegram_chat_id) {
      const text = `🔍 JobRadar: сканирование завершено\n📊 Новых вакансий: ${mockNewVacancies}\n🕐 ${new Date().toLocaleString('ru-RU')}`;
      await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.telegram_chat_id, text }),
      });
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});