import type { StudioCatalogEntry, StudioSemanticKind } from "./studio-catalog-contracts.ts";

/** Axiom-authored visual composition. This never upgrades an execution/target capability. */
export interface StudioCatalogPresentation {
  shape: string;
  variant: string;
  axis: "horizontal" | "vertical";
  padding: number;
  gap: number;
  minHeight: number;
  surface: boolean;
  border: boolean;
  width: number;
  height: number;
  parts: { role: string; parent: string; text?: string; axis?: "horizontal" | "vertical" }[];
}

const SHAPES: Readonly<Record<string, string>> = {
  affix: "affix", aspectratio: "aspect-ratio", backgroundimage: "image", colorswatch: "color-swatch", themeicon: "theme-icon",
  alphaslider: "color-slider", hueslider: "color-slider", colorslider: "color-slider", angleslider: "angle-slider",
  colorarea: "color-area", colorfield: "color-field", colorinput: "color-field", colorpicker: "color-picker", colorswatchpicker: "swatches", colorwheel: "color-wheel",
  attachment: "attachment", bubble: "message", message: "message", marker: "marker", burger: "burger",
  calendar: "calendar", rangecalendar: "calendar", minicalendar: "mini-calendar", datepicker: "calendar", datepickerinput: "date-popup", daterangepicker: "date-range",
  datefield: "date-field", dateinput: "date-field", datetimepicker: "date-time", inlinedatetimepicker: "date-time",
  monthpicker: "month-grid", monthpickerinput: "month-popup", yearpicker: "year-grid", yearpickerinput: "year-popup",
  timefield: "time-field", timeinput: "time-field", timepicker: "time-picker", timevalue: "time-value",
  carousel: "carousel", lightbox: "lightbox", cascader: "cascader", tree: "tree", navigationtree: "tree", treeselect: "tree-select",
  command: "command", spotlight: "command", copybutton: "copy-button", dropzone: "dropzone", fileinput: "file-input",
  floatingindicator: "floating-indicator", floatingwindow: "window", form: "form", gridlist: "grid-list",
  inputotp: "otp", otpfield: "otp", pininput: "otp", jsoninput: "code-editor", maskinput: "masked-input",
  loadingoverlay: "loading-overlay", navigationprogress: "navigation-progress", navigationmenu: "navigation-menu", stepper: "stepper", tableofcontents: "toc",
  numberformatter: "number", rollingnumber: "rolling-number", overflowlist: "overflow-list", overlay: "overlay",
  resizable: "splitter", splitter: "splitter", richtexteditor: "rich-editor", scrollarea: "scroll", scroller: "scroll", marquee: "marquee",
  ringprogress: "ring-progress", semicircleprogress: "semi-progress", skeleton: "skeleton", spinner: "spinner", loader: "loader",
  actionicon: "icon-button", closebutton: "close-button", unstyledbutton: "text-button", chip: "chip",
  breadcrumb: "breadcrumb", breadcrumbs: "breadcrumb", pagination: "pagination", navlink: "nav-link",
  blockquote: "blockquote", code: "code", codehighlight: "code-block", kbd: "kbd", highlight: "highlight", mark: "mark", title: "heading", typography: "typography",
  box: "box", center: "center", container: "container", flex: "flex", grid: "grid", simplegrid: "simple-grid", space: "space", stack: "stack",
  card: "card", paper: "paper", empty: "empty", emptystate: "empty", datalist: "data-list", timeline: "timeline",
  pill: "pill", pillsinput: "pills-input", taggroup: "tag-group", tokengroup: "tag-group", listbox: "list-box", nativeselect: "native-select",
  checkboxgroup: "checkbox-group", radiogroup: "radio-group", segmentedcontrol: "segmented", togglegroup: "toggle-group", togglebuttongroup: "toggle-group",
  drawer: "drawer", sheet: "sheet", modal: "modal", alertdialog: "alert-dialog", hovercard: "hover-card", previewcard: "hover-card",
  contextmenu: "context-menu", dropdownmenu: "dropdown-menu", menubar: "menubar", fieldset: "fieldset", group: "group", inputgroup: "input-group",
  actionbar: "action-bar", buttongroup: "button-group", indicator: "indicator", notification: "notification", passwordinput: "password", searchfield: "search",
  disclosure: "disclosure", disclosuregroup: "disclosure-group", collapse: "collapse", collapsible: "collapsible", spoiler: "spoiler",
};

/** Canonical identity drives composition; user-renamed component labels never select a renderer. */
export function studioCatalogPresentation(entry: StudioCatalogEntry, kind: StudioSemanticKind): StudioCatalogPresentation {
  const variant = entry.id.slice("catalog.".length), family = entry.familyIds[0]?.split("/")[1];
  const shape = SHAPES[variant] ?? (family === "chart" ? variant : kind === "unsupported" ? "reference" : kind);
  const boxed = ["surface", "toast", "alert"].includes(kind) || ["calendar", "date-popup", "date-range", "date-time", "month-grid", "month-popup", "year-grid", "year-popup", "command", "window", "form", "rich-editor", "code-editor", "dropzone", "tree-select", "cascader"].includes(shape);
  const horizontal = ["button", "checkbox", "radio", "switch", "toggle", "badge", "avatar", "link", "toolbar"].includes(kind) || ["flex", "group", "input-group", "space", "otp", "time-field", "date-field", "masked-input", "file-input", "stepper", "overflow-list", "copy-button"].includes(shape);
  const presentation: StudioCatalogPresentation = { shape, variant, axis: horizontal ? "horizontal" : "vertical", padding: boxed ? 16 : kind === "button" || kind === "toggle" ? 10 : 0, gap: ["badge", "text", "separator"].includes(kind) ? 0 : 8, minHeight: ["button", "checkbox", "radio", "switch", "toggle"].includes(kind) ? 44 : 0, surface: boxed || ["button", "toggle", "badge"].includes(kind), border: boxed || ["button", "toggle"].includes(kind), width: ["avatar", "badge", "loading"].includes(kind) || ["theme-icon", "color-swatch"].includes(shape) ? 160 : ["button", "toggle", "checkbox", "radio", "switch"].includes(kind) ? 240 : family === "chart" ? 380 : 320, height: ["calendar", "date-popup", "date-range", "date-time"].includes(shape) ? 480 : ["month-grid", "year-grid", "month-popup", "year-popup"].includes(shape) ? 440 : ["button", "checkbox", "radio", "switch", "toggle", "badge", "avatar", "text", "link", "separator"].includes(kind) ? 224 : ["tree", "tree-select", "toc"].includes(shape) ? 300 : 360, parts: [] };
  const part = (role: string, parent = "body", text?: string, axis?: "horizontal" | "vertical") => presentation.parts.push({ role: role.replaceAll("-", "_"), parent: parent.replaceAll("-", "_"), ...(text === undefined ? {} : { text }), ...(axis ? { axis } : {}) });
  // Additional parts are optional source structure, preserving already-saved bounded contracts.
  if (kind === "layout" && !["box", "space"].includes(shape)) {
    if (["grid", "simple-grid"].includes(shape)) {
      for (let row = 1; row <= 2; row++) { part(`row-${row}`, "body", undefined, "horizontal"); for (let col = 1; col <= 3; col++) part(`item-${(row - 1) * 3 + col}`, `row-${row}`, String((row - 1) * 3 + col)); }
    } else { part("item-one", "body", "One"); part("item-two", "body", "Two"); part("item-three", "body", "Three"); }
  }
  if (kind !== "unsupported") return presentation;
  if (family === "chart") {
    part("plot"); part("axis", "plot", "Jan · Feb · Mar · Apr · May"); part("series", "plot", "24, 48, 36, 72, 60"); part("legend", "body", "Sample series");
  } else if (["calendar", "date-popup", "date-range", "date-time", "mini-calendar", "month-grid", "month-popup", "year-grid", "year-popup"].includes(shape)) {
    if (shape.endsWith("popup") || shape === "date-range") part("input", "body", shape === "date-range" ? "Sep 14 – Sep 20, 2026" : shape === "month-popup" ? "September 2026" : shape === "year-popup" ? "2026" : "Sep 14, 2026");
    part("calendar-header", "body", shape.startsWith("year") ? "2024 – 2035" : shape.startsWith("month") ? "2026" : "September 2026", "horizontal");
    part("previous", "calendar-header", "‹"); part("heading", "calendar-header", shape.startsWith("year") ? "2024 – 2035" : shape.startsWith("month") ? "2026" : "September 2026"); part("next", "calendar-header", "›");
    if (shape.startsWith("month") || shape.startsWith("year")) {
      for (let row = 0; row < 4; row++) { part(`row-${row + 1}`, "body", undefined, "horizontal"); for (let col = 0; col < 3; col++) part(`cell-${row * 3 + col + 1}`, `row-${row + 1}`, shape.startsWith("year") ? String(2024 + row * 3 + col) : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][row * 3 + col]!); }
    } else {
      part("weekdays", "body", "M    T    W    T    F    S    S");
      for (let row = 0; row < (shape === "mini-calendar" ? 1 : 5); row++) { part(`week-${row + 1}`, "body", undefined, "horizontal"); for (let col = 0; col < 7; col++) { const day = row * 7 + col; part(`day-${day + 1}`, `week-${row + 1}`, day === 0 || day > 30 ? " " : String(day)); } }
    }
    if (shape === "date-time") part("time", "body", "09 : 30 AM");
  } else if (["date-field", "time-field", "time-value", "time-picker", "masked-input"].includes(shape)) {
    part("input", "body", shape === "date-field" ? "09 / 14 / 2026" : shape === "masked-input" ? "+1 (555) 012-3456" : "09 : 30 AM");
    if (shape === "time-picker") { part("time-options", "body", undefined, "horizontal"); ["09:00", "09:30", "10:00"].forEach((text, i) => part(`option-${i + 1}`, "time-options", text)); }
  } else if (["tree", "tree-select", "cascader", "toc"].includes(shape)) {
    if (shape === "tree-select") part("input", "body", "Select a folder");
    part("branch", "body", "▾  Design system"); part("item-one", "branch", "Foundations"); part("item-two", "branch", "Components"); part("item-three", "body", "▸  Assets");
  } else if (shape === "otp") { for (let i = 1; i <= (variant === "pininput" ? 4 : 6); i++) part(`digit-${i}`, "body", i < 4 ? String(i + 2) : "·"); }
  else if (shape === "command") { part("search", "body", "Search commands…"); part("results", "body"); ["Create component", "Open foundation", "Search library"].forEach((text, i) => part(`result-${i + 1}`, "results", text)); }
  else if (shape === "rich-editor" || shape === "code-editor") { part("toolbar", "body", shape === "rich-editor" ? "B     I     U       ≡       ↶  ↷" : "JSON"); part("editor", "body", shape === "rich-editor" ? "Write something meaningful.\nCompose your content here." : '{\n  "name": "Axiom",\n  "version": 1\n}'); }
  else if (["color-picker", "color-area", "color-wheel", "color-slider", "color-field", "color-swatch", "swatches"].includes(shape)) {
    if (["color-picker", "color-area", "color-wheel"].includes(shape)) part("color-area");
    if (["color-picker", "color-slider"].includes(shape)) part("color-track");
    if (["color-field", "color-picker"].includes(shape)) part("input", "body", "#8DFC52");
    if (["swatches", "color-swatch"].includes(shape)) { part("swatches", "body", undefined, "horizontal"); for (let i = 1; i <= (shape === "color-swatch" ? 1 : 5); i++) part(`swatch-${i}`, "swatches"); }
  } else if (["carousel", "lightbox"].includes(shape)) { part("viewport"); part("slide", "viewport", "Featured image"); part("controls", "body", undefined, "horizontal"); part("previous", "controls", "‹"); part("pagination", "controls", "● ○ ○"); part("next", "controls", "›"); }
  else if (shape === "splitter") { part("panes", "body", undefined, "horizontal"); part("first-pane", "panes", "First pane"); part("handle", "panes", "⋮"); part("second-pane", "panes", "Second pane"); }
  else if (["scroll", "marquee", "overflow-list", "grid-list"].includes(shape)) { part("viewport", "body", undefined, shape === "marquee" || shape === "overflow-list" ? "horizontal" : "vertical"); for (let i = 1; i <= 5; i++) part(`item-${i}`, "viewport", `Item ${i}`); }
  else if (shape === "dropzone" || shape === "file-input" || shape === "attachment") { part("file-icon", "body", "↥"); part("label", "body", shape === "attachment" ? "design-system.fig" : shape === "file-input" ? "Choose a file" : "Drop files here"); part("description", "body", shape === "attachment" ? "2.4 MB" : "PNG, SVG or PDF"); }
  else if (shape === "message" || shape === "marker") { part("avatar", "body", "AX"); part("message", "body", shape === "marker" ? "Unread messages" : "Your changes look good."); part("timestamp", "body", "09:41"); }
  else if (shape === "form") { part("label", "body", "Email address"); part("input", "body", "you@example.com"); part("submit", "body", "Continue"); }
  else if (shape === "window") { part("window-header", "body", "Untitled window"); part("content", "body", "Window content"); part("resize-handle", "body", "◢"); }
  else if (shape === "stepper") { for (let i = 1; i <= 3; i++) part(`step-${i}`, "body", `${i}  ${["Account", "Details", "Complete"][i - 1]}`); }
  else if (["navigation-menu", "floating-indicator"].includes(shape)) { part("items", "body", undefined, "horizontal"); ["Overview", "Activity", "Settings"].forEach((text, i) => part(`item-${i + 1}`, "items", text)); }
  else if (["number", "rolling-number"].includes(shape)) part("value", "body", "1,234.56");
  else if (shape === "copy-button") { part("icon", "body", "⧉"); part("label", "body", "Copy"); }
  else if (shape === "burger") { part("line-one"); part("line-two"); part("line-three"); }
  else if (shape === "angle-slider") { part("dial"); part("value", "body", "45°"); }
  else if (shape === "image" || shape === "aspect-ratio" || shape === "theme-icon") part("image", "body", shape === "aspect-ratio" ? "16 : 9" : shape === "theme-icon" ? "✦" : "Image");
  else if (["overlay", "loading-overlay", "navigation-progress", "affix"].includes(shape)) { part("content", "body", "Page content"); part("overlay", "body", shape === "loading-overlay" ? "Loading…" : shape === "affix" ? "↑ Back to top" : " "); }
  return presentation;
}

const PROVIDER_CATALOGS: Readonly<Record<string, string>> = {
  "shadcn/ui": "https://ui.shadcn.com/docs/components", "Mantine Core": "https://mantine.dev/core/package/",
  "Mantine Charts": "https://mantine.dev/charts/getting-started/", "Mantine Dates": "https://mantine.dev/dates/getting-started/",
  "Mantine Schedule": "https://mantine.dev/schedule/getting-started/",
  "Mantine Other Extensions": "https://mantine.dev/x/extensions/", "Base UI": "https://base-ui.com/react/overview/quick-start", "React Aria": "https://react-aria.adobe.com/",
};
/** Verified provider indexes, not an assertion that upstream packages implement this Axiom instance. */
export function studioCatalogProvenance(entry: StudioCatalogEntry): { provider: string; name: string; sourceRow: number; catalogUrl: string }[] {
  return entry.providerVariants.map(variant => {
    const catalogUrl = PROVIDER_CATALOGS[variant.provider];
    if (!catalogUrl) throw new Error(`Catalog provenance is missing for ${variant.provider}.`);
    return { ...variant, catalogUrl };
  });
}
