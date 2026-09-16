# Base UI reference templates

The OTP Field and Preview Card templates mount the original CSS Modules hero demos from the pinned Base UI commit recorded in `provenance.json`, using `@base-ui/react` 1.8.0. Files under `vendor/` remain byte-identical upstream sources. `LICENSE.upstream` preserves MIT terms.

Install this private package with `npm ci --ignore-scripts`, then run `node scripts/build-reference-base-ui.mjs` from the repository root. The build checks source SHA-256 values and emits standalone JavaScript/CSS, notices, provenance, and light/dark PNG previews with an asset manifest. The package lock is independent of the Studio's dependencies.

`mountReferenceTemplate(element, sourceRow, {theme})` returns an unmount function. The embedding iframe must set `style.colorScheme` to the requested theme because the original styles use `prefers-color-scheme`. Static 640 × 400 previews retain the original component proportions; Preview Card is hovered to reveal its popup.

Upstream component paint and anatomy are preserved. Studio edits are explicit sparse changes applied by the outer reference bridge; unsupported generated targets must report that boundary.
