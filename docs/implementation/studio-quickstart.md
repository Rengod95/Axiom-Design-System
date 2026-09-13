# Run Studio and deliver source

The [ADR-0014 profile](../adr/0014-studio-authoring-and-target-delivery.md) implements a local editor for shared tokens, named themes and Button/Card/Toast. Use Node 24.19.0 and pnpm 11.19.0 from the repository root.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm studio
```

Open `http://127.0.0.1:4317`. Create a design system, select a shared token in the left navigation and edit its value in the inspector. Switch named themes to inspect context overrides. Select a component or its rendered Part to change sample content and the selected Web/Mobile layout. Run mode exercises activation and controlled Toast close requests. Edit mode selects Parts. The inspector's Source tab retains invalid JSON as an editable buffer and can capture it as a source draft.

Edits first produce a transient preview. Review changes shows affected documents and source field differences. Applying the reviewed candidate creates one revision and one Undo entry. Closing the review keeps its candidate available for resumption; rejecting discards it. Undo/redo use the same persisted command service as the Node adapter. Export is disabled while a buffer or proposal is unapplied. The project-source button downloads the source-preserving project bundle. The Export dialog downloads an owned source ZIP for React/CSS, React Native/Expo, SwiftUI or Compose. Each archive carries exact source/context/profile pins and per-file hashes. A generated badge is separate from platform execution.

Browser storage is origin-scoped IndexedDB. Keep the same hostname and port to reopen this local workspace. Different origins, private profiles, cleared site data and eviction do not share it. The server serves only built HTML/JS/CSS on loopback; no network backend or remote account is involved. A saved document survives process restart in the tested Chromium profile. Unsaved field buffers are not automatically durable: capture a source draft or download the source before leaving. Safari, Firefox, full offline installation and eviction recovery are not certified by this increment.

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
pnpm test:targets
```

The Studio runner launches a dedicated Chromium profile, uses real keyboard/pointer/composition input, checks reviewed mutation and recovery, and downloads all four archives. The target runner consumes emitted source in a Web SSR/hydration app and a separate locked Expo application. It emits evidence under `dist/evidence` and `dist/target-verification`; generated files are excluded from the active source tree. These checks fail if their required browser/compiler cannot run; native SwiftUI/Compose compilation remains explicitly unverified.
