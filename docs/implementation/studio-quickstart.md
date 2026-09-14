# Run Studio and deliver source

The [ADR-0015 workbench](../adr/0015-studio-workbench-and-catalog-authoring.md) extends the local editor with typed Foundation management, catalog component authoring and a navigable canvas. Use Node 24.19.0 and pnpm 11.19.0 from the repository root.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm studio
```

Open `http://127.0.0.1:4317`. Create a design system, select a shared token in the left navigation and edit its value in the inspector. Switch named themes to inspect context overrides. Select a component or its rendered Part to change sample content and the selected Web/Mobile layout. Run mode exercises activation and controlled Toast close requests. Edit mode selects Parts. The inspector's Source tab retains invalid JSON as an editable buffer and can capture it as a source draft.

Edits first produce a transient preview. Review changes shows affected documents and source field differences. Applying the reviewed candidate creates one revision and one Undo entry. Closing the review keeps its candidate available for resumption; rejecting discards it. Undo/redo use the same persisted command service as the Node adapter. Export is disabled while a buffer or proposal is unapplied. The project-source button downloads the source-preserving project bundle. The Export dialog downloads an owned source ZIP for React/CSS, React Native/Expo, SwiftUI or Compose. Each archive carries exact source/context/profile pins and per-file hashes. A generated badge is separate from platform execution.

Browser storage is origin-scoped IndexedDB. Keep the same hostname and port to reopen this local workspace. Different origins, private profiles, cleared site data and eviction do not share it. The server serves only built HTML/JS/CSS and the pinned SUIT font/license on loopback; no network backend or remote account is involved. A saved document survives process restart in the tested Chromium profile. Unsaved field buffers are not automatically durable: capture a source draft or download the source before leaving. Safari, Firefox, full offline installation and eviction recovery are not certified by this increment.

## Node delivery and upgrades

The browser ZIP is a fresh source export. To connect an existing Node ADS store to an owned source directory, use the separate delivery adapter. `--store` refers to an existing FileStore populated through the core `ads-studio` command profile, not directly to an arbitrary JSON file. A Studio project bundle can be restored into an empty same-project store using the [kernel bundle workflow](kernel-quickstart.md).

```sh
pnpm delivery help
pnpm delivery export --store ./my-store --out ./new-react-source --target react
pnpm delivery plan --store ./my-store --root ./consumer-design --target react --out ./delivery-plan.json
pnpm delivery apply --plan ./delivery-plan.json --review <plan-digest>
pnpm delivery doctor --root ./consumer-design
pnpm delivery rollback --root ./consumer-design --receipt <receipt-id> --review <receipt-id>
```

Read the plan before providing its digest. Fresh export requires an absent output directory. A connection plan initializes a directory without colliding generated paths, or compares the immutable generated baseline, current user bytes and new generated source. Unrelated project files and user-only edits remain; competing changes stop the entire apply. Changes after planning invalidate the reviewed digest. This first profile applies the whole conflict-free file set; partial hunks and selective baselines remain unsupported. Filesystem transactions use a single writer lock and pending recovery record. `recover --root DIR --review rollback` explicitly restores a supported incomplete transaction; it is not an automatic overwrite of intervening edits.

Doctor reports source integrity and observed user changes. It does not install packages, compile native code or advance `installedRelease`. The generated package README gives consumer commands and host requirements. React Native's React 19.2.3 pin is separate from the Studio/Web React 19.3.0 runtime. SwiftUI currently targets iOS 17+ and uses UIKit announcements. Compose needs its declared Android toolchain. Platform verification remains the consumer's next step where the recorded evidence says `not-run`.

## Repeat the checks

```sh
pnpm check
pnpm test
pnpm build
pnpm test:browser
pnpm test:studio
pnpm test:workbench
pnpm test:targets
```

The Studio runner launches a dedicated Chromium profile, uses real keyboard/pointer/composition input, checks reviewed mutation and recovery, and downloads all four archives. The target runner consumes emitted source in a Web SSR/hydration app and a separate locked Expo application. It emits evidence under `dist/evidence` and `dist/target-verification`; generated files are excluded from the active source tree. These checks fail if their required browser/compiler cannot run; native SwiftUI/Compose compilation remains explicitly unverified.

## Workbench operations

The Library lists all 239 catalog identities, including 209 component entries that create independent component and Web/Mobile design documents. Parts, templates and utilities remain visibly separate reference entries. Adding an entry creates editable source; unsupported dedicated interactions and target contracts produce explicit diagnostics instead of unrelated fallback controls.

Foundation supports 13 structured value types, aliases, name/description, domain and tier classification, search/filter/sort, selected-token bulk edits, and guarded deletion with a compatible replacement. Themes edit axes, contexts, named sets, resolution order and token overrides. Apply an inspector form to the preview, then review the combined source change. Incomplete numeric/hex input remains in its form and blocks navigation/export until reset or repaired.

Use V/H for select/pan, Space-drag to pan, Ctrl/Command-wheel or +/- to zoom, 0 for 100%, Shift-1 for all frames and Shift-2 for selection. Frame labels support shift-selection and drag; empty-canvas drag selects an area. Resize handles, keyboard arrows and multi-selection alignment/distribution update explicit frame geometry. Viewport navigation does not change source revisions. Ctrl/Command-K finds commands and project objects.

The right inspector edits component content, selected Part layout/appearance and compatible token bindings. Catalog definitions additionally expose part/value lifecycle, sizing policies, accessibility labels/descriptions and motion easing where the source profile permits them. Existing builtin semantic profiles retain their bounded fields. Light/dark UI preferences and Korean/English labels are independent from the project’s authored themes. At narrow widths, Browse/Workspace/Inspect keep each panel accessible. Axiom UI in the sidebar shows the shared UI tokens and working controls.

Foundation → Files accepts DTCG JSON files or pasted text. Review the import preview, choose keep/update/reject for matching names, optionally add a prefix, and apply it to the common reviewed proposal. Resolver inputs use explicitly supplied local files and context chips; one selected combination becomes base tokens while its source definitions remain preserved. Property/composite bindings stay live when their source changes and survive name, description and deprecation edits. The inspector offers source-token/property controls and recoverable expression JSON input.

Files → Export downloads the selected context with either references or resolved values. This does not include all theme/group/classification/policy authoring; use the top-bar project source bundle for the full ADS system. Preserved originals are available separately. See the [interchange continuation](foundation-interchange-continuation.md) for verified scope and remaining requirements.
