# Studio blueprint workbench

This increment follows the owner's 2026-09-14 request for resizable navigation, domain-organized tokens, accurate library specimens, a clearer canvas, optical 12px corners, translucent chrome, and domain-specific Foundation displays. It extends the existing reviewed authoring profile; it does not certify all Foundation semantics or native runtime execution.

## Recovery point

The clean pre-change commit is `7f10dc910144d8eb453f9489f5a00a0b6001202a`, recorded locally by `rollback/studio-before-blueprint-20260914`. The checkpoint protects application source. Authored projects remain in their browser's IndexedDB journal and must not be reset to roll back application styling. Export a project source bundle to move authored data between browser origins.

## Requested behavior

| Request | Implementation contract |
| --- | --- |
| Resize left navigation | Pointer drag, keyboard arrows/Home/End, double-click reset; width preference survives reload and collapse. Default 232px, bounded 196–400px, with a 280px cap on compact desktop layouts. |
| Transparent scrolling | Existing native scroll viewports keep wheel, touch, keyboard and sticky positioning. Overlay thumbs add pointer and keyboard control without a native gutter or track background. Canvas pan/zoom retains its own gesture handler. |
| Domain token navigation | Source domain membership defines sections, initially collapsed. Search exposes matches. Visual names omit the owning domain prefix and separate the path from its final segment; accessible names retain the full token name. |
| Canvas mode clarity | Design selects parts and arranges/resizes frames; Interact exercises temporary controls. The target switch selects the Web or Mobile design. Mode labels, distinct pencil/play icons and tooltips explain the distinction. |
| Preview environment | The rectangular artboard uses the active project's resolved `token.surface`; metadata uses `token.content`. Authored transparent roots and control silhouettes retain their original values. |
| Canvas tools | A compact round dock emphasizes the active selection/pan tool. Grid, snap, fit and zoom actions have named hover/focus tooltips. |
| Optical corner system | 12px is the control reference, 8px nested/list details, 16px elevated surfaces, and circular or pill geometry for round tools. Authored component/token radii remain their own data. |
| Materials | Achromatic surfaces with fluorescent green accents; 32px structural blur, panel/header alpha 54%/58%, no inset highlights on structural headers or footer. Reduced transparency uses opaque surfaces. |
| Domain directory | Each domain has exactly one geometric blueprint and a separated card boundary, rather than multiple token previews. |
| Numeric authoring | Shared value, gradient and ruler sliders expose native range semantics alongside exact numeric text. Incomplete text remains recoverable; valid changes join the existing reviewed plan. |
| Color scales and relationships | Square swatches with 4px gaps and a 128px maximum; sparse groups retain this scale and the ten 50–900 brand stops fit one Full HD row. Primitive scales and semantic roles have separate hierarchy. Edges use actual references after active theme overrides, with a moving highlight disabled by reduced-motion preference. |
| Spacing and sizing | Rows share a vertical ruler origin and a domain-wide length scale, including primitive and semantic rows. |
| Radius, border and shadow | Radius retains its corner geometry; stroke uses horizontal line specimens; elevation objects sit on an open plane. Semantic references remain distinguishable from base values. |
| Typography | Real family, weight, size, line height and tracking render as editorial text specimens rather than uniform cards. |
| Fonts | Geist and Geist Mono are served from the same bounded static asset allowlist as the application. New starter choices default to Geist and the Studio green; existing projects are unchanged. |
| Starter contrast | New starters choose the higher-contrast neutral foreground independently for the generated light and dark action backgrounds. The suggested green yields approximately 9.19:1 and 13.31:1; reapplying a starter preserves existing authored values and overrides. |

## Library truth

The old creation route retained the selected catalog identity, but generic appearance defaults and an unsupported-family fallback rendered many entries as the same card. The correction preserves identity, creates category-specific editable structures and silhouettes, and distinguishes an Axiom adaptation from a provider's shipped runtime. Legacy root/body sources remain unchanged and show their catalog identity with a clear path to create the current blueprint. Default canvas frames use the catalog's dimensions and variable row heights; explicitly authored frame positions and sizes retain priority. Catalog source references are provenance, not a claim that an upstream package is executing in Studio. Unsupported interaction contracts must continue to be reported explicitly by preview and target diagnostics.

## Reference interpretation

The owner's supplied images establish the pill dock, line-based blueprint drawings and compact white-thumb slider direction. The [shadcn Scroll Area reference](https://ui.shadcn.com/docs/components/base/scroll-area) informs the transparent scrollbar treatment and separation of viewport from thumb; Studio keeps its own native scroll viewports and does not introduce a new UI framework dependency.

## Verification scope

The required repository checks remain unchanged. Additional real-browser cases cover native overlay scroll interaction, panel width persistence, closed/searchable domain groups, slider precision and reviewed undo, one domain blueprint per card, Full HD color rows, and actual theme-dependent graph edges. Visual evidence uses disposable test databases in light/dark desktop and mobile layouts; no user project content is published as test evidence. Execution results are recorded separately after the complete change is checked.
