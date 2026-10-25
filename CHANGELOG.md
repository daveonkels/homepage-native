# Changelog

## 0.1.1

- Wait for Home Assistant’s frontend registry before defining card classes, fixing intermittent “Custom element doesn’t exist” errors during startup, including in Firefox/Zen.
- Add a regression test that replaces the element registry and base constructor during module loading.

## 0.1.0

- Initial Homepage catalog integration with UI setup and polling options.
- Native searchable app cards with automatic frontend registration.
- Public and internal API URL support, safe icon resolution, and sanitized catalog data.
