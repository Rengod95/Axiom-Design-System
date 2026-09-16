import assert from "node:assert/strict";
import { test } from "node:test";
import { getStudioCatalogEntry, listStudioCatalog, listStudioLibrary, STUDIO_LIBRARY_ALIASES, studioLibraryIdentity } from "../src/index.ts";

test("Library consolidation retains every provider row and all saved source identities", () => {
  const inventory = listStudioCatalog(), library = listStudioLibrary();
  assert.equal(inventory.length, 239);
  assert.equal(library.length, 225);
  assert.equal(library.filter(entry => entry.kind === "component").length, 196);
  const sourceRows = inventory.flatMap(entry => entry.sourceRows).sort((a, b) => a - b);
  assert.deepEqual(library.flatMap(entry => entry.sourceRows).sort((a, b) => a - b), sourceRows);
  assert.equal(new Set(sourceRows).size, 330);
  for (const [aliasId, canonicalId] of Object.entries(STUDIO_LIBRARY_ALIASES)) {
    const alias = getStudioCatalogEntry(aliasId)!;
    assert.equal(alias.id, aliasId);
    assert.equal(studioLibraryIdentity(aliasId), canonicalId);
    assert.ok(!library.some(entry => entry.id === aliasId));
    const canonical = library.find(entry => entry.id === canonicalId)!;
    assert.ok(canonical.aliases.some(item => item.id === aliasId && item.name === alias.name));
    for (const variant of alias.providerVariants) assert.ok(canonical.providerVariants.some(item => item.sourceRow === variant.sourceRow));
  }
});

test("Lookalike placeholders cannot erase distinct upstream responsibilities", () => {
  const library = listStudioLibrary();
  for (const group of [["input", "textfield"], ["dialog", "modal", "alertdialog"], ["scrollarea", "scroller"], ["hovercard", "previewcard"], ["progress", "meter"], ["checkbox", "radio", "switch"]]) {
    for (const name of group) assert.ok(library.some(entry => entry.id === `catalog.${name}`), name);
  }
  assert.equal(studioLibraryIdentity("__proto__"), "__proto__");
  const first = listStudioLibrary();
  first[0]!.providerVariants.splice(0);
  assert.ok(listStudioLibrary()[0]!.providerVariants.length > 0);
});
