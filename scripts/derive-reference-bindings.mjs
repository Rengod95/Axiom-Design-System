import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { canonicalJson, createStudioStarter, inspectStudioProject, listStudioLibrary, planStudioComponentCreate, STUDIO_PROFILE, studioReferenceForCatalog } from "../modules/ads-core/src/index.ts";
import { browserPath, launch, terminate, within } from "./browser-driver.mjs";
import { referenceContext, registerReferenceDebugger } from "./verify-reference-studio.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const check = process.argv.includes("--check");
const flowTags = new Set(["div", "section", "article", "header", "footer", "main", "aside", "nav", "figure", "figcaption", "blockquote", "li", "dd", "td", "th", "form", "fieldset", "dialog", "details", "body"]);
const phrasingTags = new Set(["a", "abbr", "b", "button", "cite", "code", "del", "dfn", "em", "h1", "h2", "h3", "h4", "h5", "h6", "i", "ins", "kbd", "label", "mark", "output", "p", "pre", "q", "s", "samp", "small", "span", "strong", "sub", "summary", "sup", "time", "u", "var"]);
const contentModel = tag => flowTags.has(tag) ? "flow" : phrasingTags.has(tag) ? "phrasing" : "none";
let browser, server, temp;
const evidence = { kind: "original-reference-binding-derivation", status: "FAILED", templates: [] };
try {
  temp = await mkdtemp(join(tmpdir(), "axiom-binding-derivation-"));
  const origin = await new Promise((accept, reject) => {
    server = spawn(process.execPath, ["scripts/serve-studio.mjs"], { cwd: ROOT, windowsHide: true, env: { ...process.env, AXIOM_STUDIO_PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "", errors = "";
    const timer = setTimeout(() => reject(Error(`Binding server timed out: ${errors}`)), 10_000);
    server.stdout.on("data", data => { output += data; const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]; if (url) { clearTimeout(timer); accept(url); } });
    server.stderr.on("data", data => { errors += data; });
    server.once("error", reject);
  });
  browser = await launch(await browserPath(), join(temp, "profile"));
  const page = await browser.cdp.page(origin); registerReferenceDebugger(page, browser.cdp);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; i < 200 && !(await page.evaluate("document.readyState==='complete' && Boolean(document.querySelector('[data-testid=onboarding]'))")); i++) await delay(50);
  await page.evaluate(`(()=>{document.body.replaceChildren();document.body.style.margin='0';const frame=document.createElement('iframe');frame.id='binding-frame';frame.setAttribute('sandbox','allow-scripts');frame.style.cssText='width:640px;height:480px;border:0';document.body.append(frame)})()`);
  const base = { id: "project.binding", name: "Binding audit", revision: "binding.initial", documents: Object.fromEntries(createStudioStarter("project.binding").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:binding-audit", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  let sequence = 0; const id = () => `binding.audit.${++sequence}`;
  const result = {};
  for (const entry of listStudioLibrary().filter(entry => entry.kind === "component")) {
    const template = studioReferenceForCatalog(entry.id);
    // Build a detached compatibility fixture without consulting existing binding
    // metadata, so a provider version can be re-audited before adopting its pin.
    const plan = planStudioComponentCreate(base, { catalogId: template.sourceCatalogId }, id);
    assert.equal(plan.valid, true, `${entry.id}: ${JSON.stringify(plan.diagnostics)}`);
    const createdId = plan.changes.upserts.find(row => row.document.kind === "component").document.id;
    const source = plan.project.documents[createdId].document;
    const designs = Object.values(plan.project.documents).map(entry => entry.document).filter(document => document.kind === "design" && document.componentRef?.id === source.id);
    for (const part of source.parts) delete part.studioText;
    for (const design of designs) design.appearance = [];
    const projection = inspectStudioProject(plan.project); assert.equal(projection.valid, true);
    const component = projection.components.find(component => component.id === source.id);
    component.catalog.reference = { templateId: template.id, contentFields: [], valueIds: [] };
    component.web.referenceLayout = {}; component.mobile.referenceLayout = {};
    const byId = Object.fromEntries(component.parts.map(part => [part.id, part.role]));
    const parts = source.parts.map(part => ({ role: part.studioRole, parent: part.parent === null ? null : byId[part.parent], required: part.required, designs: Object.fromEntries(designs.map(design => {
      const layout = structuredClone(design.layout.find(row => row.targetPartRef === part.id)); delete layout.targetPartRef; delete layout.childOrder;
      const mapping = design.nodeMappings.find(row => row.partRef === part.id);
      return [design.category, { layout, ...(mapping.element === undefined ? {} : { element: mapping.element }) }];
    })) }));
    const modes = [];
    for (const theme of ["light", "dark"]) {
      const nonce = `derive-${template.sourceRow}-${theme}`;
      const url = `${origin}/references/${template.bundle}.html?row=${template.sourceRow}&theme=${theme}&mode=edit&nonce=${nonce}`;
      await page.evaluate(`document.querySelector('#binding-frame').src=${JSON.stringify(url)}`);
      let context; const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        try { context = await referenceContext(page, "document.querySelector('#binding-frame')"); if (await context.evaluate("document.querySelector('#reference-root')?.dataset.referenceState==='ready'")) break; } catch { /* The frame has not attached yet. */ }
        context = undefined; await delay(50);
      }
      assert.ok(context, `${entry.id} ${theme}: original did not become ready`);
      await page.evaluate(`document.querySelector('#binding-frame').contentWindow.postMessage(${JSON.stringify({ channel: "axiom-reference", type: "update", nonce, edits: { component, design: component.web } })},'*')`);
      await context.evaluate("document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))))");
      const mapped = await context.evaluate(`(()=>{const voids=new Set(['AREA','BASE','BR','COL','EMBED','HR','IMG','INPUT','LINK','META','PARAM','SOURCE','TRACK','WBR','TEXTAREA','SELECT','OPTION','CANVAS','IFRAME']);const phrasing=new Set(['A','ABBR','B','BUTTON','CITE','CODE','DEL','DFN','EM','H1','H2','H3','H4','H5','H6','I','INS','KBD','LABEL','MARK','OUTPUT','P','Q','S','SAMP','SMALL','SPAN','STRONG','SUB','SUP','TIME','U','VAR']);return Array.from(document.querySelectorAll('[data-reference-part]')).map(e=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent?.trim()&&n.parentElement?.closest('[data-reference-part]')===e&&!n.parentElement?.closest('svg,style,script')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});return{id:e.dataset.referencePart,tag:e.tagName.toLowerCase(),text:Boolean(walker.nextNode()),content:!(e instanceof HTMLElement)||voids.has(e.tagName)?'none':phrasing.has(e.tagName)?'phrasing':'flow'}})})()`);
      // React Aria's collection <template> placeholders have no visual box or
      // live content; their presence is not an editable runtime binding.
      modes.push(mapped.filter(binding => binding.tag !== "template").map(({ id: partId, ...binding }) => ({ role: byId[partId], ...binding, content: contentModel(binding.tag) })).sort((a, b) => a.role.localeCompare(b.role)));
    }
    assert.deepEqual(modes[0], modes[1], `${entry.id}: light/dark bindings must agree`);
    result[template.id] = { sourceRow: template.sourceRow, commit: template.commit, parts, bindings: modes[0] };
    evidence.templates.push({ templateId: template.id, sourceRow: template.sourceRow, commit: template.commit, nativeParts: parts.length, boundParts: modes[0].length, themesAgree: true });
    if (evidence.templates.length % 20 === 0) console.error(`Derived ${evidence.templates.length}/196 original binding capabilities`);
  }
  assert.equal(Object.keys(result).length, 196);
  const destination = join(ROOT, "modules/ads-core/src/studio-reference-binding-data.ts");
  const rendererSha256 = createHash("sha256").update((await readFile(join(ROOT, "apps/studio/src/reference-frame-styles.ts"), "utf8")).replaceAll("\r\n", "\n")).digest("hex");
  const generated = `import type { StudioReferenceBindingProfile } from "./studio-reference-bindings.ts";\n\n/** Actual default DOM, light/dark verified by scripts/derive-reference-bindings.mjs. */\nexport const STUDIO_REFERENCE_BINDING_RENDERER_SHA256 = "${rendererSha256}";\nexport const STUDIO_REFERENCE_BINDINGS: Readonly<Record<string, StudioReferenceBindingProfile>> = ${JSON.stringify(result, null, 2)};\n`;
  if (check) assert.equal((await readFile(destination, "utf8")).replaceAll("\r\n", "\n"), generated, "Verified native bindings have drifted; inspect and regenerate the pinned profile.");
  else await writeFile(destination, generated);
  evidence.status = "PASSED";
} catch (error) { evidence.error = error.stack; process.exitCode = 1; }
finally {
  await terminate(browser);
  if (server && server.exitCode === null && server.signalCode === null) { const stopped = new Promise(resolve => server.once("exit", resolve)); server.kill(); await stopped; }
  if (temp && within(tmpdir(), temp)) await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await mkdir(join(ROOT, "dist/evidence/catalog-reference"), { recursive: true }); await writeFile(join(ROOT, "dist/evidence/catalog-reference/binding-derivation.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ status: evidence.status, templates: evidence.templates.length, error: evidence.error }));
}
