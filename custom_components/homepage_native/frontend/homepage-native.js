/* Homepage Native 0.1.0 — dependency-free Lovelace launcher. */
const VERSION = "0.1.0";

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function selectGroups(groups, selected = [], query = "") {
  const term = query.trim().toLocaleLowerCase();
  return (Array.isArray(groups) ? groups : [])
    .filter(group => group && typeof group.name === "string" && (!selected.length || selected.includes(group.name)))
    .map(group => ({name: group.name, services: (Array.isArray(group.services) ? group.services : []).filter(service => {
      if (!service || typeof service.name !== "string") return false;
      return !term || [group.name, service.name, service.description || ""].join(" ").toLocaleLowerCase().includes(term);
    })})).filter(group => group.services.length);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

const STYLES = `
:host { display:block; color:var(--primary-text-color,#202735); }
* { box-sizing:border-box; }
header { display:flex; gap:16px; align-items:center; justify-content:space-between; margin:4px 0 20px; }
h1 { font-size:24px; line-height:1.25; letter-spacing:-.5px; margin:0; font-weight:600; }
.subtitle { color:var(--secondary-text-color,#657080); font-size:13px; margin:6px 0 0; }
button { border:1px solid var(--divider-color,#ddd); background:var(--ha-card-background,var(--card-background-color,#fff)); color:inherit; border-radius:12px; padding:10px 14px; font:inherit; cursor:pointer; min-height:44px; }
button:disabled { opacity:.5; cursor:wait; }
.search { display:flex; align-items:center; gap:12px; background:var(--ha-card-background,var(--card-background-color,#fff)); border:1px solid var(--divider-color,#ddd); border-radius:var(--ha-card-border-radius,12px); margin-bottom:28px; padding:0 14px; }
.search ha-icon { color:var(--secondary-text-color,#657080); --mdc-icon-size:20px; }
input { border:0; background:transparent; color:inherit; font:inherit; width:100%; min-height:48px; outline:0; }
.search:focus-within { outline:2px solid var(--primary-color,#03a9f4); outline-offset:2px; }
section { margin:0 0 28px; }
.group-title { display:flex; gap:10px; align-items:baseline; margin:0 0 12px; }
h2 { font-size:16px; font-weight:600; margin:0; }
.count { color:var(--secondary-text-color,#657080); font-size:12px; font-weight:400; }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
a { color:inherit; text-decoration:none; display:block; border-radius:var(--ha-card-border-radius,12px); height:100%; }
a:focus-visible, button:focus-visible { outline:2px solid var(--primary-color,#03a9f4); outline-offset:3px; }
ha-card { display:block; height:100%; border-radius:var(--ha-card-border-radius,12px); background:var(--ha-card-background,var(--card-background-color,#fff)); border:1px solid var(--ha-card-border-color,var(--divider-color,#ddd)); box-shadow:var(--ha-card-box-shadow,none); transition:border-color .15s, background .15s; }
a:hover ha-card { border-color:var(--primary-color,#03a9f4); background:var(--secondary-background-color,#f7f9fc); }
.tile { display:flex; align-items:center; gap:14px; padding:18px; min-height:88px; }
.icon { width:40px; height:40px; flex:0 0 40px; display:grid; place-items:center; }
.icon img { width:34px; height:34px; object-fit:contain; }
.icon ha-icon { --mdc-icon-size:28px; color:var(--primary-color,#03a9f4); }
.copy { min-width:0; flex:1; }
.name { font-size:14px; font-weight:600; line-height:1.4; overflow-wrap:anywhere; }
.description { font-size:12px; color:var(--secondary-text-color,#657080); line-height:1.45; margin-top:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.arrow { color:var(--secondary-text-color,#657080); --mdc-icon-size:16px; opacity:.5; flex-shrink:0; }
.notice { padding:16px; margin-bottom:16px; border-radius:12px; background:var(--secondary-background-color,#f3f5f8); color:var(--secondary-text-color,#657080); font-size:14px; }
[hidden] { display:none !important; }
@media(max-width:500px) { .grid { grid-template-columns:1fr !important; } h1 { font-size:22px; } .tile { min-height:78px; padding:14px; } }
@media(prefers-reduced-motion:reduce) { * { transition:none !important; } }
`;

export class HomepageNativeCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:"open"}); this._query = "";
  }
  setConfig(config) {
    if (!config || typeof config.entity !== "string" || !config.entity.startsWith("sensor.")) {
      throw new Error("Select the Homepage Native catalog sensor in the card editor.");
    }
    if (config.groups !== undefined && (!Array.isArray(config.groups) || config.groups.some(g => typeof g !== "string"))) {
      throw new Error("groups must be a list of Homepage group names.");
    }
    if (config.columns !== undefined && (!Number.isInteger(config.columns) || config.columns < 1 || config.columns > 6)) {
      throw new Error("columns must be between 1 and 6.");
    }
    this._config = {title:"Apps & services", show_search:true, show_description:true, ...config};
    this._build(); this._render();
  }
  set hass(hass) {
    const previous = this._state;
    this._hass = hass; this._state = hass.states[this._config?.entity];
    if (previous !== this._state && this._config) this._render();
  }
  getCardSize() { return 8; }
  getGridOptions() { return {columns:12, min_columns:6, rows:8}; }
  static getConfigElement() { return document.createElement("homepage-native-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find(id => id.startsWith("sensor.") && Array.isArray(hass.states[id].attributes.groups) && hass.states[id].attributes.homepage_url);
    return {entity:entity || "sensor.homepage_catalog", title:"Apps & services"};
  }
  _build() {
    this.shadowRoot.replaceChildren();
    this.shadowRoot.append(element("style", "", STYLES));
    const header = element("header");
    const heading = element("div");
    heading.append(element("h1", "", this._config.title));
    this._subtitle = element("p", "subtitle"); heading.append(this._subtitle);
    const refresh = element("button", "", "Refresh");
    refresh.setAttribute("aria-label", "Refresh Homepage catalog");
    refresh.addEventListener("click", async () => {
      if (!this._hass) return;
      refresh.disabled = true;
      try { await this._hass.callService("homeassistant", "update_entity", {entity_id:this._config.entity}); }
      catch { this._notice.textContent = "Could not refresh the catalog. Check the integration connection."; this._notice.hidden = false; }
      finally { refresh.disabled = false; }
    });
    header.append(heading, refresh); this.shadowRoot.append(header);
    const search = element("label", "search"); search.hidden = !this._config.show_search;
    const searchIcon = element("ha-icon"); searchIcon.setAttribute("icon", "mdi:magnify");
    const input = element("input"); input.type = "search"; input.placeholder = "Find an app or service…";
    input.setAttribute("aria-label", "Search apps and services"); input.value = this._query;
    input.addEventListener("input", () => { this._query = input.value; this._render(); });
    search.append(searchIcon, input); this.shadowRoot.append(search);
    this._notice = element("div", "notice"); this._notice.setAttribute("role", "status"); this._notice.hidden = true;
    this._content = element("div"); this.shadowRoot.append(this._notice, this._content);
  }
  _render() {
    if (!this._content) return;
    this._state = this._hass?.states[this._config.entity];
    this._content.replaceChildren(); this._notice.hidden = true;
    if (!this._state) {
      this._subtitle.textContent = "Connect your Homepage catalog";
      this._notice.textContent = `Catalog sensor ${this._config.entity} is not available. Add the Homepage Native integration and select its catalog sensor.`;
      this._notice.hidden = false; return;
    }
    const all = selectGroups(this._state.attributes.groups, this._config.groups || []);
    const groups = selectGroups(all, [], this._query);
    const total = all.reduce((sum, group) => sum + group.services.length, 0);
    const shown = groups.reduce((sum, group) => sum + group.services.length, 0);
    this._subtitle.textContent = this._query ? `${shown} of ${total} services` : `${total} services · ${all.length} groups`;
    if (["unavailable", "unknown"].includes(this._state.state)) {
      this._notice.textContent = "Homepage is unavailable. Showing the last catalog received; links may still work."; this._notice.hidden = false;
    }
    if (!groups.length) {
      this._content.append(element("div", "notice", this._query ? "No matching services. Try another search." : "No services in the selected groups."));
      return;
    }
    for (const group of groups) {
      const section = element("section"); const title = element("div", "group-title");
      title.append(element("h2", "", group.name), element("span", "count", group.services.length));
      const grid = element("div", "grid");
      if (this._config.columns) grid.style.gridTemplateColumns = `repeat(${this._config.columns},minmax(0,1fr))`;
      for (const service of group.services) grid.append(this._service(service));
      section.append(title, grid); this._content.append(section);
    }
  }
  _service(service) {
    const url = safeUrl(service.url);
    const link = element(url ? "a" : "div");
    if (url) {
      link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Open ${service.name} in a new tab`);
    }
    const card = element("ha-card"); const tile = element("div", "tile"); const icon = element("div", "icon");
    const fallback = () => { const mdi = element("ha-icon"); mdi.setAttribute("icon", /^mdi:[a-z0-9-]+$/.test(service.icon || "") ? service.icon : "mdi:application-outline"); icon.replaceChildren(mdi); };
    const imageUrl = safeUrl(service.image);
    if (imageUrl) {
      const image = element("img"); image.src = imageUrl; image.alt = ""; image.loading = "lazy"; image.referrerPolicy = "no-referrer";
      image.addEventListener("error", fallback, {once:true}); icon.append(image);
    } else fallback();
    const copy = element("div", "copy"); copy.append(element("div", "name", service.name));
    if (this._config.show_description && service.description) copy.append(element("div", "description", service.description));
    tile.append(icon, copy);
    if (url) { const arrow = element("ha-icon", "arrow"); arrow.setAttribute("icon", "mdi:open-in-new"); tile.append(arrow); }
    card.append(tile); link.append(card); return link;
  }
}

class HomepageNativeEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:"open"}); }
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _render() {
    if (!this._config || !this._hass) return;
    this.shadowRoot.replaceChildren(element("style", "", `label{display:block;margin:16px 0;font:inherit}input,select{display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:6px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:8px}input[type=checkbox]{display:inline;width:auto;margin-right:8px}`));
    const field = (key, title, tag="input") => {
      const label = element("label", "", title); const control = element(tag);
      if (tag === "select") {
        const ids = Object.keys(this._hass.states).filter(id => Array.isArray(this._hass.states[id].attributes.groups) && this._hass.states[id].attributes.homepage_url);
        if (this._config.entity && !ids.includes(this._config.entity)) ids.unshift(this._config.entity);
        for (const id of ids) { const opt = element("option", "", this._hass.states[id]?.attributes.friendly_name || id); opt.value = id; control.append(opt); }
      }
      control.value = this._config[key] || "";
      control.addEventListener("change", () => this._changed(key, control.value));
      label.append(control); this.shadowRoot.append(label);
    };
    field("entity", "Catalog sensor", "select"); field("title", "Title");
    for (const [key,title] of [["show_search","Show search"],["show_description","Show descriptions"]]) {
      const label = element("label"); const box = element("input"); box.type = "checkbox"; box.checked = this._config[key] !== false;
      box.addEventListener("change", () => this._changed(key, box.checked)); label.append(box, document.createTextNode(title)); this.shadowRoot.append(label);
    }
  }
  _changed(key, value) {
    this._config = {...this._config, [key]:value};
    this.dispatchEvent(new CustomEvent("config-changed", {detail:{config:this._config}, bubbles:true, composed:true}));
  }
}

if (!customElements.get("homepage-native-card")) customElements.define("homepage-native-card", HomepageNativeCard);
if (!customElements.get("homepage-native-editor")) customElements.define("homepage-native-editor", HomepageNativeEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "homepage-native-card")) {
  window.customCards.push({type:"homepage-native-card", name:"Homepage Native", description:"Your Homepage services as searchable, native app cards.", preview:true});
}
console.info(`Homepage Native ${VERSION}`);
