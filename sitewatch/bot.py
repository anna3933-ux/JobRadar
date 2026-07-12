import asyncio
import json
import os
import logging
from datetime import datetime
from pathlib import Path

import aiohttp
from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Storage ──────────────────────────────────────────────────────────────────
DATA_FILE = Path("data.json")

def load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return {}

def save_data(data: dict):
    DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))

def get_user(data: dict, user_id: int) -> dict:
    uid = str(user_id)
    if uid not in data:
        data[uid] = {
            "interval_minutes": 5,
            "timeout_seconds": 10,
            "sites": {}
        }
    return data[uid]

# ── HTTP check ────────────────────────────────────────────────────────────────
async def check_site(url: str, timeout: int) -> dict:
    """Returns {ok, status_code, error, response_time_ms}"""
    start = asyncio.get_event_loop().time()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=timeout),
                allow_redirects=True,
                ssl=False
            ) as resp:
                elapsed = int((asyncio.get_event_loop().time() - start) * 1000)
                ok = resp.status < 400
                return {"ok": ok, "status_code": resp.status, "error": None, "response_time_ms": elapsed}
    except aiohttp.ClientConnectorError as e:
        return {"ok": False, "status_code": None, "error": f"DNS/Connection error: {str(e)[:60]}", "response_time_ms": None}
    except asyncio.TimeoutError:
        return {"ok": False, "status_code": None, "error": "Timeout", "response_time_ms": None}
    except Exception as e:
        return {"ok": False, "status_code": None, "error": str(e)[:80], "response_time_ms": None}

# ── Scheduler job ─────────────────────────────────────────────────────────────
async def monitor_all(bot: Bot):
    data = load_data()
    for uid, user in data.items():
        timeout = user.get("timeout_seconds", 10)
        for url, site in user.get("sites", {}).items():
            result = await check_site(url, timeout)
            prev_ok = site.get("last_ok")
            now = datetime.utcnow().isoformat()

            if result["ok"]:
                site["last_ok"] = True
                site["last_checked_at"] = now
                if prev_ok is False:
                    # Recovered
                    down_since = site.get("down_since")
                    downtime = ""
                    if down_since:
                        delta = datetime.utcnow() - datetime.fromisoformat(down_since)
                        mins = int(delta.total_seconds() // 60)
                        downtime = f" (простой: {mins} мин)"
                    site["down_since"] = None
                    await bot.send_message(
                        int(uid),
                        f"🟢 <b>{url}</b> снова работает{downtime}\n"
                        f"⏱ Ответ: {result['response_time_ms']} мс",
                        parse_mode="HTML"
                    )
            else:
                site["last_ok"] = False
                site["last_checked_at"] = now
                if prev_ok is not False:
                    site["down_since"] = now
                    err = result.get("error") or f"HTTP {result.get('status_code')}"
                    await bot.send_message(
                        int(uid),
                        f"🔴 <b>{url}</b> недоступен!\n"
                        f"❗ Причина: <code>{err}</code>\n"
                        f"🕐 {datetime.utcnow().strftime('%H:%M UTC')}",
                        parse_mode="HTML"
                    )

    save_data(data)

# ── Bot setup ─────────────────────────────────────────────────────────────────
TOKEN = os.getenv("BOT_TOKEN", "REPLACE_ME")
bot = Bot(token=TOKEN)
dp = Dispatcher()
scheduler = AsyncIOScheduler()

# ── Handlers ──────────────────────────────────────────────────────────────────
@dp.message(Command("start"))
async def cmd_start(msg: Message):
    await msg.answer(
        "👋 <b>SiteWatch Bot</b>\n\n"
        "Мониторю сайты и уведомляю когда что-то падает.\n\n"
        "<b>Команды:</b>\n"
        "/add https://example.com — добавить сайт\n"
        "/remove https://example.com — удалить сайт\n"
        "/list — список сайтов со статусом\n"
        "/status — проверить все прямо сейчас\n"
        "/interval 5 — интервал проверки в минутах\n"
        "/help — эта справка",
        parse_mode="HTML"
    )

@dp.message(Command("help"))
async def cmd_help(msg: Message):
    await cmd_start(msg)

@dp.message(Command("add"))
async def cmd_add(msg: Message):
    parts = msg.text.split(maxsplit=1)
    if len(parts) < 2:
        await msg.answer("❌ Укажи URL: /add https://example.com")
        return
    url = parts[1].strip().rstrip("/")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    data = load_data()
    user = get_user(data, msg.from_user.id)
    if url in user["sites"]:
        await msg.answer(f"⚠️ <b>{url}</b> уже в списке", parse_mode="HTML")
        return
    if len(user["sites"]) >= 20:
        await msg.answer("❌ Максимум 20 сайтов")
        return

    user["sites"][url] = {"last_ok": None, "last_checked_at": None, "down_since": None}
    save_data(data)
    await msg.answer(f"✅ Добавлен: <b>{url}</b>\n🔄 Первая проверка через {user['interval_minutes']} мин.", parse_mode="HTML")

@dp.message(Command("remove"))
async def cmd_remove(msg: Message):
    parts = msg.text.split(maxsplit=1)
    if len(parts) < 2:
        await msg.answer("❌ Укажи URL: /remove https://example.com")
        return
    url = parts[1].strip().rstrip("/")

    data = load_data()
    user = get_user(data, msg.from_user.id)
    if url not in user["sites"]:
        await msg.answer(f"❌ Сайт <b>{url}</b> не найден в списке", parse_mode="HTML")
        return
    del user["sites"][url]
    save_data(data)
    await msg.answer(f"🗑 Удалён: <b>{url}</b>", parse_mode="HTML")

@dp.message(Command("list"))
async def cmd_list(msg: Message):
    data = load_data()
    user = get_user(data, msg.from_user.id)
    sites = user.get("sites", {})
    if not sites:
        await msg.answer("📋 Список пуст. Добавь сайт: /add https://example.com")
        return

    lines = [f"📋 <b>Твои сайты</b> (интервал: {user['interval_minutes']} мин)\n"]
    for url, site in sites.items():
        status = "✅" if site["last_ok"] is True else "🔴" if site["last_ok"] is False else "⏳"
        checked = site.get("last_checked_at")
        checked_str = f" — {checked[:16].replace('T',' ')} UTC" if checked else " — не проверялся"
        lines.append(f"{status} <code>{url}</code>{checked_str}")

    await msg.answer("\n".join(lines), parse_mode="HTML")

@dp.message(Command("status"))
async def cmd_status(msg: Message):
    data = load_data()
    user = get_user(data, msg.from_user.id)
    sites = user.get("sites", {})
    if not sites:
        await msg.answer("📋 Список пуст. Добавь сайт: /add https://example.com")
        return

    await msg.answer("🔄 Проверяю все сайты...")
    timeout = user.get("timeout_seconds", 10)
    results = await asyncio.gather(*[check_site(url, timeout) for url in sites])

    lines = [f"📊 <b>Результаты проверки</b> — {datetime.utcnow().strftime('%H:%M UTC')}\n"]
    for url, result in zip(sites.keys(), results):
        if result["ok"]:
            lines.append(f"✅ <code>{url}</code> — {result['status_code']} ({result['response_time_ms']} мс)")
        else:
            err = result.get("error") or f"HTTP {result.get('status_code')}"
            lines.append(f"🔴 <code>{url}</code> — {err}")

    await msg.answer("\n".join(lines), parse_mode="HTML")

@dp.message(Command("interval"))
async def cmd_interval(msg: Message):
    parts = msg.text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip().isdigit():
        await msg.answer("❌ Укажи интервал в минутах: /interval 5")
        return
    minutes = int(parts[1].strip())
    if minutes < 1:
        await msg.answer("❌ Минимальный интервал — 1 минута")
        return
    if minutes > 1440:
        await msg.answer("❌ Максимальный интервал — 1440 минут (24 часа)")
        return

    data = load_data()
    user = get_user(data, msg.from_user.id)
    user["interval_minutes"] = minutes
    save_data(data)
    await msg.answer(f"✅ Интервал проверки установлен: <b>{minutes} мин</b>", parse_mode="HTML")

# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    scheduler.add_job(monitor_all, "interval", minutes=1, args=[bot])
    scheduler.start()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
