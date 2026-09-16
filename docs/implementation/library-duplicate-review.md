# Library duplicate review — 2026-09-15

The owner requested duplicate removal before upstream design-template implementation. This review compares all 239 inventory identities and 330 provider rows. Library discovery now exposes 225 rows (196 components), removing 14 duplicate discovery cards. Existing saved IDs, original sources and all provider variants remain intact.

| Consolidated names | Library name | Evidence and reason |
| --- | --- | --- |
| Breadcrumbs | Breadcrumb | Both are the full hierarchical breadcrumb trail; singular/plural naming is not a separate end-user component. [Source 1](https://ui.shadcn.com/docs/components/base/breadcrumb), [Source 2](https://mantine.dev/core/breadcrumbs/), [Source 3](https://react-aria.adobe.com/Breadcrumbs) |
| Anchor | Link | Both provide navigation to an href; provider styling and disabled conventions can be templates of Link. [Source 1](https://mantine.dev/core/anchor/), [Source 2](https://react-aria.adobe.com/Link) |
| ToggleButton | Toggle | Both are a persistent on/off pressed button, rather than an immediate command. [Source 1](https://ui.shadcn.com/docs/components/base/toggle), [Source 2](https://react-aria.adobe.com/ToggleButton) |
| ToggleButtonGroup | Toggle Group | Both coordinate selectable toggle buttons and support single/multiple selection. [Source 1](https://ui.shadcn.com/docs/components/base/toggle-group), [Source 2](https://react-aria.adobe.com/ToggleButtonGroup) |
| Divider | Separator | Both provide horizontal/vertical separation; Mantine label/dashed options are retained as design variants. [Source 1](https://ui.shadcn.com/docs/components/base/separator), [Source 2](https://mantine.dev/core/divider/) |
| ProgressBar | Progress | Both represent task completion with determinate and indeterminate progress. [Source 1](https://ui.shadcn.com/docs/components/base/progress), [Source 2](https://react-aria.adobe.com/ProgressBar), [Source 3](https://base-ui.com/react/components/progress) |
| NumberInput | NumberField | Both provide numeric text entry with optional increment/decrement controls. Locale formatting, draft-string handling and validation remain provider-specific contracts. [Source 1](https://react-aria.adobe.com/NumberField), [Source 2](https://mantine.dev/core/number-input/), [Source 3](https://base-ui.com/react/components/number-field) |
| Splitter | Resizable | Both are a group of resizable panes with handles and keyboard resizing. Pane defaults and redistribution remain provider variants. [Source 1](https://ui.shadcn.com/docs/components/base/resizable), [Source 2](https://mantine.dev/core/splitter/) |
| EmptyState | Empty | Both compose an empty-data illustration/icon, title, description and optional recovery action. [Source 1](https://ui.shadcn.com/docs/components/base/empty), [Source 2](https://mantine.dev/core/empty-state/) |
| DisclosureGroup | Accordion | React Aria explicitly identifies DisclosureGroup as an accordion coordinating single/multiple expanded sections. [Source 1](https://react-aria.adobe.com/DisclosureGroup), [Source 2](https://ui.shadcn.com/docs/components/base/accordion) |
| Disclosure | Collapsible | Both are a single user-controlled collapsible content region with a trigger and content panel. Required heading details remain provider templates. [Source 1](https://ui.shadcn.com/docs/components/base/collapsible), [Source 2](https://react-aria.adobe.com/Disclosure) |
| Dropdown Menu | Menu | Both are an action-menu popup opened by a trigger. Context Menu and Menubar remain separate acquisition patterns. [Source 1](https://ui.shadcn.com/docs/components/base/dropdown-menu), [Source 2](https://mantine.dev/core/menu/), [Source 3](https://react-aria.adobe.com/Menu) |
| TextInput | TextField | Both are a complete accessible text field with input, label, description/error. Raw Input remains a separate primitive. [Source 1](https://mantine.dev/core/text-input/), [Source 2](https://mantine.dev/core/input/), [Source 3](https://react-aria.adobe.com/TextField) |
| FileButton | FileTrigger | Both wrap an arbitrary pressable control to open a native file chooser; neither itself defines the selected-file field presentation. [Source 1](https://mantine.dev/core/file-button/), [Source 2](https://react-aria.adobe.com/FileTrigger) |

## Distinct responsibilities remain visible

Input and TextField, Dialog and Modal, ScrollArea and Scroller, HoverCard and PreviewCard, and determinate Progress and Meter remain distinct. Identical placeholder output is an implementation defect rather than proof of upstream equivalence. Spinner/Loader and segmented code-entry variants are not removed merely because their current Axiom approximations look alike.

The original Foundation inventory is historical reference data and is not rewritten. `listStudioLibrary` is the curated discovery projection; `listStudioCatalog` and `getStudioCatalogEntry` keep every stored source ID. Searches include removed display aliases. Provider-specific insertion will use the selected original source recipe.

This review does not certify pixel parity or native implementation. Upstream template work follows this completed discovery consolidation.
