"""UI setup and polling options."""
from urllib.parse import urlsplit

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_URL
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import AuthRequired, CannotConnect, fetch_catalog
from .catalog import InvalidCatalog, normalize_url
from .const import CONF_API_URL, CONF_REFRESH_INTERVAL, DEFAULT_REFRESH_INTERVAL, DOMAIN


class HomepageConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            try:
                url = normalize_url(user_input[CONF_URL])
                api_url = normalize_url(user_input[CONF_API_URL]) if user_input.get(CONF_API_URL) else ""
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()
                await fetch_catalog(async_get_clientsession(self.hass), url, api_url)
            except AuthRequired:
                errors["base"] = "auth_required"
            except CannotConnect:
                errors["base"] = "cannot_connect"
            except InvalidCatalog:
                errors["base"] = "invalid_catalog"
            except ValueError:
                errors["base"] = "invalid_url"
            else:
                return self.async_create_entry(title=f"Homepage ({urlsplit(url).hostname})", data={
                    CONF_URL: url, CONF_API_URL: api_url,
                })
        return self.async_show_form(step_id="user", data_schema=vol.Schema({
            vol.Required(CONF_URL, default=(user_input or {}).get(CONF_URL, "")): str,
            vol.Optional(CONF_API_URL, default=(user_input or {}).get(CONF_API_URL, "")): str,
        }), errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return HomepageOptionsFlow()


class HomepageOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        return self.async_show_form(step_id="init", data_schema=vol.Schema({
            vol.Required(CONF_REFRESH_INTERVAL, default=self.config_entry.options.get(
                CONF_REFRESH_INTERVAL, DEFAULT_REFRESH_INTERVAL
            )): vol.All(vol.Coerce(int), vol.Range(min=30, max=86400)),
        }))
