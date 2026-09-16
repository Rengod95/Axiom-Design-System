# React Aria reference templates

The 21 selected first demos use `react-aria-components` 1.21.1 and the pinned React Spectrum commit recorded in `provenance.json`. Files under `vendor/` are byte-identical upstream sources; `demos/` supplies the documented initial props and mounts those sources. `LICENSE.upstream` preserves Apache-2.0 terms.

Install this private package with `npm ci --ignore-scripts`, then run `node scripts/build-reference-react-aria.mjs` from the repository root. The build checks source SHA-256 values and emits the standalone JavaScript/CSS, notices, provenance, and light/dark PNG previews with an asset manifest. The package lock is independent of the Studio's dependencies.

`mountReferenceTemplate(element, sourceRow, {theme})` returns an unmount function. Run it in the dedicated iframe, whose `style.colorScheme` must match the requested theme: the original styles use `prefers-color-scheme`. Static 640 × 400 previews center and proportionally fit the original demo; PreviewTrigger is hovered to expose its popup. They do not replace interactive rendering or accessibility checks.

Upstream component paint and anatomy are preserved. Studio edits are explicit sparse changes applied by the outer reference bridge; unsupported generated targets must report that boundary.
