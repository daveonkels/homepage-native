import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

// Reproduce HA replacing both customElements and HTMLElement during startup.
// A card imported early must use the replacement registry and constructor.
test("early module waits for HA registry initialization", () => {
  const moduleUrl = new URL("../custom_components/homepage_native/frontend/homepage-native.js", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    const earlyDefinitions = [];
    globalThis.HTMLElement = class NativeElement {};
    globalThis.customElements = {
      get: () => undefined,
      define: name => earlyDefinitions.push(name),
      whenDefined: () => new Promise(() => {}),
    };
    globalThis.window = {};
    const loaded = import(${JSON.stringify(moduleUrl)});
    const finalDefinitions = new Map();
    class ReadyElement {}
    setTimeout(() => {
      globalThis.HTMLElement = ReadyElement;
      globalThis.customElements = {
        get: name => name === "home-assistant" ? ReadyElement : finalDefinitions.get(name),
        define: (name, constructor) => finalDefinitions.set(name, constructor),
      };
    }, 100);
    await loaded;
    assert.deepEqual(earlyDefinitions, [], "card registered before HA replaced the registry");
    for (const name of ["homepage-native-card", "homepage-native-editor"]) {
      const constructor = finalDefinitions.get(name);
      assert.ok(constructor, name + " must exist in HA's active registry");
      assert.equal(Object.getPrototypeOf(constructor.prototype), ReadyElement.prototype);
    }
  `], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
