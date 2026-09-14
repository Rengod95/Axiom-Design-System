import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { listStudioCatalog, getStudioCatalogRecipe, studioCatalogPresentation } from "../../../modules/ads-core/src/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const bundle = await build({ absWorkingDir: root, stdin: { contents: `
  import { createElement } from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import { CatalogThumbnail } from './apps/studio/src/catalog-thumbnail.tsx';
  import { CatalogPreview } from './apps/studio/src/catalog-preview.tsx';
  import { catalogDetailedVector } from './apps/studio/src/catalog-vector.tsx';
  import { canonicalJson, createStudioStarter, STUDIO_PROFILE, planStudioComponentCreate, inspectStudioProject } from './modules/ads-core/src/index.ts';
  let count=0; const id=()=> 'specimen.generated.'+(++count);
  const project={id:'project.specimen',name:'Specimens',revision:'specimen.initial',documents:Object.fromEntries(createStudioStarter('project.specimen').map(document=>[document.id,{document,originalText:canonicalJson(document),sourceUri:'memory:initial',validation:'envelope-only',validationProfile:STUDIO_PROFILE,diagnostics:[]}]))};
  export function thumbnail(entry){return renderToStaticMarkup(createElement(CatalogThumbnail,{entry}));}
  export function detail(shape,variant,name){return catalogDetailedVector(shape,variant,'test',name)!==null;}
  export function preview(catalogId,legacy=false){
    const plan=planStudioComponentCreate(project,{catalogId},id);
    if(!plan.valid)throw Error(JSON.stringify(plan.diagnostics));
    const added=plan.changes.upserts.find(update=>update.document.kind==='component').document;
    const component=inspectStudioProject(plan.project).components.find(item=>item.id===added.id);
    if(legacy){component.parts=component.parts.filter(part=>['root','body'].includes(part.role));for(const design of [component.web,component.mobile])for(const layout of Object.values(design.layout))layout.childOrder=layout.childOrder.filter(id=>component.parts.some(part=>part.id===id));}
    const before=JSON.stringify(component);
    const html=renderToStaticMarkup(createElement(CatalogPreview,{component,category:'Web',mode:'edit',selectedPart:null,onSelect(){},locale:'en'}));
    return {html,before,after:JSON.stringify(component),parts:component.parts.map(({id,role})=>({id,role}))};
  }
`, resolveDir: root, loader: "tsx" }, bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false, logLevel: "silent" });
const module = { exports: {} as { thumbnail(entry: ReturnType<typeof listStudioCatalog>[number]): string; detail(shape: string, variant: string, name: string): boolean; preview(id: string, legacy?: boolean): { html: string; before: string; after: string; parts: { id: string; role: string }[] } } };
new Function("module", "exports", "require", bundle.outputFiles[0]!.text)(module, module.exports, createRequire(import.meta.url));
const views = module.exports;

test("all 209 catalog components have named vector specimens and specialized entries never use a generic Card drawing", () => {
  const entries = listStudioCatalog().filter(entry => entry.kind === "component"); assert.equal(entries.length, 209);
  for (const entry of entries) {
    const html = views.thumbnail(entry), recipe = getStudioCatalogRecipe(entry.id)!, presentation = studioCatalogPresentation(entry, recipe.semantic.kind);
    assert.match(html, /<svg[^>]+role="img"/); assert.ok(html.includes(`data-catalog-id="${entry.id}"`));
    assert.ok(html.includes(`data-specimen-shape="${presentation.shape}"`));
    if (recipe.semantic.kind === "unsupported") assert.ok(entry.familyIds.includes("axiom.family/chart") || views.detail(presentation.shape, presentation.variant, entry.name), `${entry.id} has a dedicated silhouette`);
  }
  for (const group of [["calendar", "datefield", "monthpicker", "timepicker"], ["barchart", "donutchart", "piechart", "radarchart", "scatterchart"], ["checkbox", "switch", "chip"], ["grid", "stack", "center", "box"], ["progress", "ringprogress", "semicircleprogress", "skeleton"]]) {
    const shapes = group.map(name => views.thumbnail(listStudioCatalog().find(entry => entry.id === `catalog.${name}`)!).replace(/<title[^>]*>.*?<\/title>/, "").replace(/data-catalog-id="[^"]*"|data-specimen-shape="[^"]*"|aria-labelledby="[^"]*"/g, ""));
    assert.equal(new Set(shapes).size, group.length, `Different component shapes remain visually distinguishable: ${group}`);
  }
});

test("catalog source identity renders the actual control or selectable specialized part tree without mutating source", () => {
  const cases: Record<string, RegExp> = { checkbox: /type="checkbox"/, switch: /role="switch"/, textinput: /type="text"/, card: /<article/, rating: /catalog-rating/, skeleton: /catalog-skeleton/, ringprogress: /role="progressbar"/, calendar: /data-structure-kind="calendar"/, tree: /data-structure-kind="tree"/, donutchart: /data-structure-kind="donutchart"/, colorpicker: /catalog-color-area/, inputotp: /data-structure-part="digit_6"/, richtexteditor: /catalog-rich-content/, splitter: /data-structure-part="second_pane"/ };
  for (const [name, expected] of Object.entries(cases)) {
    const rendered = views.preview(`catalog.${name}`);
    assert.match(rendered.html, expected, name); assert.equal(rendered.after, rendered.before, name);
    assert.ok(rendered.html.includes(`data-catalog-id="catalog.${name}"`));
    assert.match(rendered.html, /<dt>Variant<\/dt>/); assert.match(rendered.html, /<dt>Parts<\/dt>/);
    if (getStudioCatalogRecipe(`catalog.${name}`)!.semantic.kind === "unsupported") {
      for (const part of rendered.parts) assert.ok(rendered.html.includes(`data-part-id="${part.id}"`), `${name} exposes authored ${part.role} selection`);
      assert.match(rendered.html, /dedicated interactions and target output are not yet supported/);
      assert.doesNotMatch(rendered.html, /<article/);
    }
  }
});

test("old saved root/body structures retain data and show the correct family with a visible blueprint recovery path", () => {
  for (const name of ["calendar", "tree", "donutchart"]) {
    const rendered = views.preview(`catalog.${name}`, true);
    assert.equal(rendered.after, rendered.before); assert.equal(rendered.parts.length, 2);
    assert.match(rendered.html, /data-testid="catalog-legacy-note"/); assert.match(rendered.html, /from Library to create the current editable part blueprint/);
    assert.match(rendered.html, /class="catalog-thumbnail"/); assert.doesNotMatch(rendered.html, /<article/);
  }
});
