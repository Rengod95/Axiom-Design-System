# Library component design baselines

The focused Library recipes now create editable source designs with control-specific geometry and paint. The changes cover Button/toggle, input/textarea/number input/Select, Checkbox/Radio/Switch, Tabs and Card/surface semantics. They do not restyle all 209 catalog components or claim that an upstream provider package is installed.

Previously the creation path wrote one generic root appearance rule. Field controls and labels received no authored appearance, and filled/outlined variants resolved to the same design. A high-specificity legacy preview selector also overrode the softer specimen border and selected-tab treatment.

The creation helper now writes these defaults through the existing source plan:

- Filled and outlined surfaces differ through fill and border; authored Foundation surface, foreground, border, type and radius bindings remain live.
- Field controls have a 40px minimum height, 10px padding, a full-width policy, editable border/radius and separate 12px label/description typography. Textareas start at 96px.
- Button labels receive a defined weight and line height; disabled and pressed feedback remain separate from consumer-owned values.
- Choice labels align with the native controls. Tabs have a padded grouped track, borderless triggers and one selected fill while retaining a visible keyboard focus outline.
- Card headers, body text and horizontal action content have independent hierarchy and spacing.

The helper only runs when a new catalog source is created. Existing user-authored components are not migrated or overwritten. Internal Web paint stays in the Web design; native inner controls retain platform-owned geometry and styling until their explicit target mappings support more. The React target emits its own HTML affordance CSS and does not import Studio variables or stylesheets.

Three focused regressions exercise valid creation/export across 11 representative entries, persistent token bindings/control geometry and native preservation. The separate native harness tests remain distinct from native execution. The isolated Chromium visual check captured 1440px and 390px in light/dark, found no horizontal page overflow, and confirmed that selected tabs have a different fill without a resting outline. Captures and computed evidence are in `dist/evidence/library-baseline-*.png` and `dist/evidence/library-baseline-visual.json`. This check uses a dedicated fixture and does not read or modify the user's saved Studio workspace.

Further provider-specific recipes, more expressive behavior and complete platform styling require their own contracts and consumer verification. Provider catalog provenance remains reference information; these are Axiom-authored adaptations.
