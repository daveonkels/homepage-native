"""A single catalog sensor, rather than an entity for every app."""
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import HomepageCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([HomepageCatalogSensor(entry.runtime_data, entry)])


class HomepageCatalogSensor(CoordinatorEntity[HomepageCoordinator], SensorEntity):
    _attr_has_entity_name = True
    _attr_name = "Catalog"
    _attr_icon = "mdi:apps"
    _unrecorded_attributes = frozenset({"groups"})

    def __init__(self, coordinator: HomepageCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_catalog"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)}, name=entry.title,
            manufacturer="Homepage", model="Service catalog", configuration_url=coordinator.url,
        )

    @property
    def native_value(self) -> int:
        return sum(len(group["services"]) for group in self.coordinator.data)

    @property
    def extra_state_attributes(self) -> dict:
        return {"groups": self.coordinator.data, "homepage_url": self.coordinator.url,
                "attribution": "Service catalog from Homepage"}
