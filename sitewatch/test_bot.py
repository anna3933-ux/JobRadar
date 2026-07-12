import asyncio
import json
import os
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Подменяем токен перед импортом
os.environ["BOT_TOKEN"] = "1234567890:FAKE_TOKEN_FOR_TESTS"

from bot import (
    check_site, load_data, save_data, get_user,
    cmd_add, cmd_remove, cmd_list, cmd_status, cmd_interval
)

# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(autouse=True)
def clean_data(tmp_path, monkeypatch):
    """Каждый тест получает чистый data.json во временной папке"""
    import bot
    test_file = tmp_path / "data.json"
    monkeypatch.setattr(bot, "DATA_FILE", test_file)
    yield test_file

def make_message(text: str, user_id: int = 12345) -> MagicMock:
    msg = MagicMock()
    msg.text = text
    msg.from_user = MagicMock()
    msg.from_user.id = user_id
    msg.answer = AsyncMock()
    return msg

# ── Unit tests: check_site ────────────────────────────────────────────────────
class TestCheckSite:
    @pytest.mark.asyncio
    async def test_ok_site(self):
        """200 OK → ok=True"""
        import aiohttp
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
        mock_resp.__aexit__ = AsyncMock(return_value=False)

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=mock_resp)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await check_site("https://example.com", timeout=5)

        assert result["ok"] is True
        assert result["status_code"] == 200
        assert result["error"] is None

    @pytest.mark.asyncio
    async def test_500_error(self):
        """HTTP 500 → ok=False"""
        mock_resp = MagicMock()
        mock_resp.status = 500
        mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
        mock_resp.__aexit__ = AsyncMock(return_value=False)

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=mock_resp)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await check_site("https://broken.com", timeout=5)

        assert result["ok"] is False
        assert result["status_code"] == 500

    @pytest.mark.asyncio
    async def test_timeout(self):
        """Timeout → ok=False, error='Timeout'"""
        import aiohttp
        mock_session = MagicMock()
        mock_session.get = MagicMock(side_effect=asyncio.TimeoutError())
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await check_site("https://slow.com", timeout=1)

        assert result["ok"] is False
        assert result["error"] == "Timeout"

    @pytest.mark.asyncio
    async def test_dns_error(self):
        """DNS fail → ok=False"""
        import aiohttp
        mock_session = MagicMock()
        mock_session.get = MagicMock(
            side_effect=aiohttp.ClientConnectorError(
                connection_key=MagicMock(), os_error=OSError("DNS fail")
            )
        )
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await check_site("https://nonexistent-xyz.com", timeout=5)

        assert result["ok"] is False
        assert result["error"] is not None

    @pytest.mark.asyncio
    async def test_redirect_is_ok(self):
        """HTTP 301 → ok=True (redirect считается живым)"""
        mock_resp = MagicMock()
        mock_resp.status = 301
        mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
        mock_resp.__aexit__ = AsyncMock(return_value=False)

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=mock_resp)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        with patch("aiohttp.ClientSession", return_value=mock_session):
            result = await check_site("https://example.com", timeout=5)

        assert result["ok"] is True

# ── Unit tests: Storage ───────────────────────────────────────────────────────
class TestStorage:
    def test_load_empty(self):
        data = load_data()
        assert isinstance(data, dict)

    def test_save_and_load(self):
        data = {"test": "value"}
        save_data(data)
        loaded = load_data()
        assert loaded == data

    def test_get_user_creates_default(self):
        data = load_data()
        user = get_user(data, 99999)
        assert user["interval_minutes"] == 5
        assert user["timeout_seconds"] == 10
        assert user["sites"] == {}

    def test_get_user_existing(self):
        data = {"12345": {"interval_minutes": 10, "timeout_seconds": 5, "sites": {}}}
        save_data(data)
        data = load_data()
        user = get_user(data, 12345)
        assert user["interval_minutes"] == 10

# ── Integration tests: Handlers ───────────────────────────────────────────────
class TestHandlers:
    @pytest.mark.asyncio
    async def test_add_valid_url(self):
        msg = make_message("/add https://google.com")
        await cmd_add(msg)
        msg.answer.assert_called_once()
        assert "Добавлен" in msg.answer.call_args[0][0]

        data = load_data()
        user = get_user(data, 12345)
        assert "https://google.com" in user["sites"]

    @pytest.mark.asyncio
    async def test_add_without_protocol(self):
        """URL без https:// — бот должен добавить протокол автоматически"""
        msg = make_message("/add google.com")
        await cmd_add(msg)
        data = load_data()
        user = get_user(data, 12345)
        assert "https://google.com" in user["sites"]

    @pytest.mark.asyncio
    async def test_add_duplicate(self):
        msg = make_message("/add https://google.com")
        await cmd_add(msg)
        await cmd_add(msg)
        assert "уже в списке" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_add_no_url(self):
        msg = make_message("/add")
        await cmd_add(msg)
        assert "Укажи URL" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_remove_existing(self):
        # Сначала добавляем
        msg_add = make_message("/add https://google.com")
        await cmd_add(msg_add)

        msg_rem = make_message("/remove https://google.com")
        await cmd_remove(msg_rem)
        assert "Удалён" in msg_rem.answer.call_args[0][0]

        data = load_data()
        user = get_user(data, 12345)
        assert "https://google.com" not in user["sites"]

    @pytest.mark.asyncio
    async def test_remove_nonexistent(self):
        msg = make_message("/remove https://notadded.com")
        await cmd_remove(msg)
        assert "не найден" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_list_empty(self):
        msg = make_message("/list")
        await cmd_list(msg)
        assert "пуст" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_list_with_sites(self):
        msg_add = make_message("/add https://google.com")
        await cmd_add(msg_add)

        msg_list = make_message("/list")
        await cmd_list(msg_list)
        assert "google.com" in msg_list.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_interval_valid(self):
        msg = make_message("/interval 10")
        await cmd_interval(msg)
        assert "10 мин" in msg.answer.call_args[0][0]

        data = load_data()
        user = get_user(data, 12345)
        assert user["interval_minutes"] == 10

    @pytest.mark.asyncio
    async def test_interval_invalid(self):
        msg = make_message("/interval abc")
        await cmd_interval(msg)
        assert "Укажи интервал" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_interval_zero(self):
        msg = make_message("/interval 0")
        await cmd_interval(msg)
        assert "Минимальный" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_interval_too_large(self):
        msg = make_message("/interval 9999")
        await cmd_interval(msg)
        assert "Максимальный" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_status_empty(self):
        msg = make_message("/status")
        await cmd_status(msg)
        assert "пуст" in msg.answer.call_args[0][0]

    @pytest.mark.asyncio
    async def test_status_with_sites(self):
        msg_add = make_message("/add https://google.com")
        await cmd_add(msg_add)

        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
        mock_resp.__aexit__ = AsyncMock(return_value=False)
        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=mock_resp)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)

        msg_status = make_message("/status")
        with patch("aiohttp.ClientSession", return_value=mock_session):
            await cmd_status(msg_status)

        calls = [c[0][0] for c in msg_status.answer.call_args_list]
        assert any("google.com" in c for c in calls)

    @pytest.mark.asyncio
    async def test_add_max_sites(self):
        """Нельзя добавить больше 20 сайтов"""
        for i in range(20):
            msg = make_message(f"/add https://site{i}.com")
            await cmd_add(msg)

        msg21 = make_message("/add https://site21.com")
        await cmd_add(msg21)
        assert "Максимум" in msg21.answer.call_args[0][0]
