# Studio and target dependency decisions

[ADR-0014](../adr/0014-studio-authoring-and-target-delivery.md) owns these exact pins. Source identifiers remain stable; compatibility versions are manifest data. Studio imports React/React DOM only in its UI boundary. Browser storage retains its isolated SHA-256 dependency. Core and target planning have no platform or UI runtime dependencies. esbuild is build tooling; the workspace permits only `esbuild@0.28.2` dependency build scripts, while CI installs with `--ignore-scripts`.

| Scope | Pins | License/evidence boundary |
| --- | --- | --- |
| Studio and generated Web | React/React DOM 19.3.0; matching types 19.3.0; TypeScript 5.9.3 | MIT; actual DOM/SSR consumer checks |
| Browser build | esbuild 0.28.2 | MIT; locally bundled assets, no CDN/eval |
| RN/Expo consumer | Expo 57.0.17, React Native 0.86.3, React 19.2.3, React types 19.3.0 | MIT; independent runtime pin and committed transitive fixture lock |
| SwiftUI candidate | Swift 6.3.3, Swift tools 6.0, iOS 17+ | Swift Apache-2.0 with Runtime Library Exception; Apple SDK terms separate; compiler not run |
| Compose candidate | AGP 9.1.1, Gradle 9.3.1, JDK 17, Kotlin/Compose compiler 2.2.10, Compose BOM 2026.08.00, SDK 37/build-tools 36.0.0, minSdk 26 | AndroidX/Kotlin/AGP/Gradle Apache-2.0; JDK vendor terms separate; compiler not run |

The Web and RN React versions are intentionally different because the selected RN renderer targets React 19.2.3. Generated source package metadata keeps conditional export ordering (`types`, `react-native`, `default`) meaningful to TypeScript/Metro. Canonical ADS key sorting is not applied to that ordered host contract.

Primary selection references: [React versions](https://react.dev/versions), [esbuild API](https://esbuild.github.io/api/), [Expo SDK 57](https://expo.dev/changelog/sdk-57), [AGP 9.0 compatibility](https://developer.android.com/build/releases/agp-9-0-0-release-notes), [Compose BOM mapping](https://developer.android.com/develop/ui/compose/bom/bom-mapping), [Swift installation](https://www.swift.org/install/). AGP 9's built-in Kotlin is used; the generated project does not add a second Kotlin Android plugin. These pins define a source/build candidate, not proof of native support on this Windows host.

Generated archives include `NOTICE.md`, source/context/profile metadata and package dependency declarations. No external font, raster asset or icon package is embedded. Dependency licenses remain in the consuming package manager's distributions; this implementation does not replace those notices or publish third-party packages.

## Studio font asset

ADR-0015 adds the official [SUIT](https://github.com/sun-typeface/SUIT) publisher package `@sun-typeface/suit` 2.0.5 under OFL-1.1. esbuild includes the variable WOFF2 as a local asset; the build distributes its original license alongside it as `SUIT-OFL.txt`. Generated consumer archives do not gain this Studio-only asset dependency. The local font is loaded with `font-display: swap` and no remote font service.
