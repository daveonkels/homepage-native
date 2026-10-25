# Homepage Native

Your [Homepage](https://gethomepage.dev) apps and services, rendered as native Home Assistant cards. Keep Homepage as the source of truth for names, groups, icons, descriptions, and links.

This custom integration includes its own Lovelace card. It does not embed Homepage, launch an iframe, or fetch widget metrics. Inspired by the catalog-based approach of the [Raycast Homepage extension](https://github.com/raycast/extensions/tree/main/extensions/homepage).

## Features

- Imports `/api/services` on setup and every five minutes.
- Search by app name, description, or group.
- Preserves Homepage groups and service order; flattens nested groups with their parent names.
- Uses native `ha-card` elements, HA theme colors, and responsive layouts.
- Supports Homepage MDI, Simple Icons, selfh.st, Dashboard Icons, and custom image URLs.
- Opens apps in a new tab with opener protection.
- Bundles and registers the card automatically, with a visual card editor.
- One catalog sensor per Homepage instance, with a configurable refresh interval.
- Whitelists launcher fields; widget configuration and API credentials are never exposed as entity attributes.

## Install with HACS

1. Open **HACS → ⋮ → Custom repositories**.
2. Add `https://github.com/daveonkels/homepage-native`, type **Integration**.
3. Find **Homepage Native**, download it, and restart Home Assistant.
4. Open **Settings → Devices & services → Add integration → Homepage Native**.
5. Enter your Homepage URL, for example `https://homepage.example.com`.
6. Refresh your browser after setup to load the bundled card.
7. Edit a dashboard, choose **Add card → Homepage Native**, and select the catalog sensor.

Requires Home Assistant **2026.10+**. This is a custom repository, not a listing in HACS's default catalog.

### Networking and authentication

Home Assistant fetches the catalog server-side. Browsers do not need CORS access to Homepage. They do need access to app links and any external icon images.

If HA cannot reach the public Homepage URL, supply the optional **Internal API URL**, for example `http://192.168.1.20:3000`. The integration uses that address for the API connection and sends the public Homepage hostname in the `Host` header for Homepage's host allowlist. Relative links and local icons still resolve against the public Homepage URL.

Use an internal address only on a trusted network. TLS verification stays enabled. API redirects and authentication challenges are rejected; this release does not store passwords or support Homepage's built-in authenticated API. An internal URL can work when authentication is provided by an external reverse proxy, but it does not bypass Homepage's own authentication. Do not disable public authentication to make the integration work.

### Card YAML

Use the actual catalog entity ID shown in your integration:

```yaml
type: custom:homepage-native-card
entity: sensor.homepage_example_com_catalog
title: Apps & services
show_search: true
show_description: true
```

Optional filters and layout:

```yaml
groups:
  - Media
  - Utilities
columns: 3
```

Omit `columns` for responsive automatic sizing. Values 1–6 are supported, with a single column on small screens. Use a Panel view for a full-width launcher, or add the card to a Sections dashboard alongside other HA cards. Groups absent from Homepage are hidden; an empty filter list shows all groups.

If the custom card is not found after a browser refresh, add this JavaScript module under **Settings → Dashboards → Resources**:

```
/homepage_native/homepage-native.js?v=0.1.0
```

## Refresh and failure behavior

Change the interval under the integration's **Configure** action (30–86400 seconds). The card's **Refresh** button requests an immediate catalog update. Renames, additions, and removals appear on the next successful poll. An unavailable source marks the sensor unavailable; the card shows the last catalog received when available. Restarting HA requires a successful fetch to initialize the catalog again; there is no persistent offline cache.

A removed or disabled integration stops polling. Its static card definition can remain registered until HA restarts; it holds no service data and shows a missing-sensor message.

## Privacy and limitations

Only name, description, link, and resolved icon are retained. Service URLs and descriptions are visible to users who can read HA entity states, so avoid secrets in those fields. Icons may be fetched by the browser from third-party CDNs. No telemetry, cloud account, per-service credentials, widget calls, status probes, or control actions are included.

`/api/services` is Homepage's internal frontend API, also used by the Raycast extension. Homepage changes may require compatibility updates. A maximum 2 MiB response and 2000 services protect HA from malformed responses. This integration is independent of the Homepage and Home Assistant projects.

## Development

No JavaScript build or dependency installation is needed. The shipped JS is an ES module; Python uses libraries already supplied by Home Assistant.

```sh
python3 -m unittest discover -s tests -v
python3 -m compileall -q custom_components
node --test tests/card.test.mjs
python3 -m http.server 8765 --bind 127.0.0.1
# Open http://127.0.0.1:8765/tests/preview.html for a synthetic catalog preview.
```

The preview uses placeholder HA icons outside HA; installed cards use real `ha-icon` elements. CI also runs HACS validation and Home Assistant hassfest. If dependencies are ever added, use the exact pnpm version in `packageManager` and the workstation's `sfw pnpm` policy.

MIT licensed.
