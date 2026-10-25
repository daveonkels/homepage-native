import test from "node:test";
import assert from "node:assert/strict";
// Only registration is stubbed; rendering and DOM behavior are exercised in preview.html.
globalThis.HTMLElement = class {};
globalThis.customElements = { get: () => true };
globalThis.window = {};
const { safeUrl, selectGroups } = await import("../custom_components/homepage_native/frontend/homepage-native.js");
const groups = [
  {name:"Media", services:[{name:"Movies",description:"Watch films"},{name:"Music",description:"Listen"}]},
  {name:"Utilities", services:[{name:"Network",description:"Manage devices"}]}
];
test("search covers service names, descriptions and groups without mutating source", () => {
  const original = JSON.stringify(groups);
  assert.equal(selectGroups(groups, [], " FILMS ")[0].services[0].name, "Movies");
  assert.equal(selectGroups(groups, [], "media")[0].services.length, 2);
  assert.equal(selectGroups(groups, ["Utilities"])[0].services[0].name, "Network");
  assert.deepEqual(selectGroups(groups, [], "missing"), []);
  assert.equal(JSON.stringify(groups), original);
});
test("malformed data cannot break search", () => {
  assert.deepEqual(selectGroups(null), []);
  assert.deepEqual(selectGroups([null, {name:"Empty"}, {name:"Invalid",services:[null,{}]}]), []);
});
test("links reject executable schemes and embedded credentials", () => {
  for (const url of ["javascript:alert(1)","data:text/html,hi","https://u:p@example.com",null,"/relative"]) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl("https://example.com/app"), "https://example.com/app");
  assert.equal(safeUrl("http://192.168.1.10:3000"), "http://192.168.1.10:3000/");
});
