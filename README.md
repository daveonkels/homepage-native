# Homepage Native

Your [Homepage](https://gethomepage.dev) apps and services, rendered as native Home Assistant cards. Keep Homepage as the source of truth for names, groups, icons, descriptions, and links.

This custom integration includes its own Lovelace card. It does not embed Homepage, launch an iframe, or fetch widget metrics. Inspired by the catalog-based approach of the [Raycast Homepage extension](https://github.com/raycast/extensions/tree/main/extensions/homepage).

## Screenshots

![Homepage Native showing nine sample services in Media, Productivity, and Utilities groups](https://raw.githubusercontent.com/daveonkels/homepage-native/main/docs/screenshots/catalog.jpg)

*Sample catalog rendered by the bundled card in the standalone preview. Colors follow the selected Home Assistant theme when installed; preview icons are stand-ins for HA icons.*

![Searching for documents narrows the sample catalog to one matching service](https://raw.githubusercontent.com/daveonkels/homepage-native/main/docs/screenshots/search.jpg)

*Search matches service names, descriptions, and group names. Screenshots use fictional services and example.com links.*

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

## Dashboard examples

Replace `sensor.homepage_catalog` in every example with your actual catalog entity ID. Find it under **Settings → Devices & services → Homepage Native → your device → Catalog**; open the entity settings to see its ID. Names can vary between installations and when you add multiple Homepage instances.

### Add a card to an existing dashboard

Edit your dashboard, choose **Add card → Manual**, and paste the following. You can also choose **Homepage Native** in the card picker and select the sensor using the visual editor.

```yaml
type: custom:homepage-native-card
entity: sensor.homepage_catalog
title: Apps & services
show_search: true
show_description: true
```

This is a **card configuration**, so paste it into a card editor, not the dashboard's raw configuration editor.

### Full-width Apps dashboard

1. Open **Settings → Dashboards → Add dashboard → New dashboard from scratch**.
2. Name it **Apps**, use `mdi:apps` as its icon, and choose a URL such as `homepage-apps`. Enable **Add to sidebar** if desired.
3. Open the new dashboard, select **Edit dashboard → ⋮ → Raw configuration editor**, and replace the empty dashboard configuration with the YAML below.
4. Save and exit editing.

```yaml
views:
  - title: Apps
    path: apps
    icon: mdi:apps
    type: panel
    cards:
      - type: custom:homepage-native-card
        entity: sensor.homepage_catalog
        title: Apps & services
        show_search: true
        show_description: true
```

This is a **complete dashboard configuration**. Use it for a new dashboard; replacing an existing dashboard's raw configuration removes its current views and cards. A Panel view gives this single card the available width. Leave `columns` unset so tiles adapt to the available space.

### Show selected groups alongside other cards

Add this as a Manual card on an existing dashboard, including a Sections dashboard:

```yaml
type: custom:homepage-native-card
entity: sensor.homepage_catalog
title: Media & utilities
show_search: true
show_description: false
groups:
  - Media
  - Utilities
columns: 2
```

Group names must match Homepage exactly, including capitalization. Nested groups use the flattened name shown on the catalog card. Unknown groups are hidden; omitting `groups` or setting `groups: []` shows every group. Filtering preserves Homepage's group order rather than reordering it to match the filter list.

Download the same examples: [single card](https://github.com/daveonkels/homepage-native/blob/main/docs/examples/card.yaml), [complete Apps dashboard](https://github.com/daveonkels/homepage-native/blob/main/docs/examples/dashboard.yaml), and [filtered card](https://github.com/daveonkels/homepage-native/blob/main/docs/examples/filtered-card.yaml).

### Card options

| Option | Default | Purpose |
| --- | --- | --- |
| `type` | Required | Always `custom:homepage-native-card`. |
| `entity` | Required | Your Homepage Native catalog sensor. |
| `title` | `Apps & services` | Heading above the catalog. |
| `show_search` | `true` | Show the search field. |
| `show_description` | `true` | Show each service's description. |
| `groups` | All groups | List of exact Homepage group names to include. |
| `columns` | Automatic | Fixed column count, integer 1–6. Small screens use one column. |

The visual editor supports sensor, title, search, and descriptions. Set group filters and columns in the card's code editor. These options affect this card only; they do not change Homepage or other cards using the same sensor.

### If the card does not appear

After installing and configuring the integration, reload your browser or reopen the HA app. The card is bundled with the integration and normally registers automatically.

If you still see “Custom element doesn't exist: homepage-native-card”, enable **Advanced mode** in your HA profile if necessary, then add a resource under **Settings → Dashboards → ⋮ → Resources** (also available from the dashboard edit menu). Choose **JavaScript Module** and use:

```text
/homepage_native/homepage-native.js?v=0.1.1
```

Reload the browser again. A missing-catalog message instead means the card loaded but its `entity` does not match an available Homepage Native sensor; check the entity ID and integration connection.

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

The preview uses lightweight SVG stand-ins for HA icons and fictional services; installed cards use real `ha-icon` elements. It is also the source for the README screenshots in `docs/screenshots/`. CI also runs HACS validation and Home Assistant hassfest. If dependencies are ever added, use the exact pnpm version in `packageManager` and the workstation's `sfw pnpm` policy.

MIT licensed.
