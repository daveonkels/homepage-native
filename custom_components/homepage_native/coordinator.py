"""Poll the Homepage service catalog."""
from __future__ import annotations

from datetime import timedelta
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import AuthRequired, CannotConnect, fetch_catalog
from .catalog import InvalidCatalog
from .const import CONF_API_URL, CONF_REFRESH_INTERVAL, DEFAULT_REFRESH_INTERVAL

_LOGGER = logging.getLogger(__name__)


class HomepageCoordinator(DataUpdateCoordinator[list[dict]]):
    """Keep one shared, sanitized catalog per Homepage instance."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass, _LOGGER, name="Homepage Native", config_entry=entry,
            update_interval=timedelta(seconds=entry.options.get(
                CONF_REFRESH_INTERVAL, entry.data.get(CONF_REFRESH_INTERVAL, DEFAULT_REFRESH_INTERVAL)
            )), always_update=False,
        )
        self.url = entry.data[CONF_URL]
        self.api_url = entry.data.get(CONF_API_URL, "")
        self.session = async_get_clientsession(hass)

    async def _async_update_data(self) -> list[dict]:
        try:
            return await fetch_catalog(self.session, self.url, self.api_url)
        except AuthRequired as err:
            raise UpdateFailed("Homepage requires authentication; configure an accessible internal API URL") from err
        except (CannotConnect, InvalidCatalog) as err:
            raise UpdateFailed(str(err)) from err
