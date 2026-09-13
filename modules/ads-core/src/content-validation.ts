import type { JsonObject, JsonValue } from "./contracts.ts";
import type { ContentReportSink } from "./domain-contracts.ts";
import { isObject, isValidId } from "./documents.ts";

const INLINE_MARKS = new Set(["strong", "emphasis", "underline", "strike", "code"]);
const LINK_TARGETS = new Set(["_self", "_blank"]);
const LINK_FORBIDDEN_CHARACTERS = /[\s\u0000-\u001f\u007f-\u009f]/u;
const ABSOLUTE_WEB_LINK = /^https?:\/\//iu;
const MAIL_LINK = /^mailto:/iu;

/** JSON Pointer encoding keeps user field names as data in diagnostics. */
export function contentPointer(path: string, field: string): string { return `${path}/${field.replaceAll("~", "~0").replaceAll("/", "~1")}`; }

function extraFields(value: JsonObject, allowed: readonly string[], path: string, report: ContentReportSink): void {
  for (const key of Object.keys(value)) {
    report.tick();
    if (!allowed.includes(key)) report.unverified("AdditionalField", contentPointer(path, key), "Additional content fields are preserved without interpretation.");
  }
}

interface Dimension { value: number; unit: string }

function dimension(value: JsonValue, path: string, report: ContentReportSink): Dimension | undefined {
  report.handled("Dimension", path);
  if (!isObject(value) || typeof value.value !== "number" || !Number.isFinite(value.value) || typeof value.unit !== "string" || !value.unit.length) {
    report.error(path, "Dimension requires a finite numeric value and a nonempty unit string.");
    return undefined;
  }
  extraFields(value, ["value", "unit"], path, report);
  if (value.value < 0) report.error(contentPointer(path, "value"), "A size or size bound cannot be negative.");
  report.unverified("DimensionUnitSupport", contentPointer(path, "unit"), "Unit identity is preserved; conversion and output-target support are not verified.");
  return { value: value.value, unit: value.unit };
}

function sizePolicy(value: JsonObject, path: string, report: ContentReportSink): void {
  const fixed = Object.hasOwn(value, "value"), minimum = Object.hasOwn(value, "min"), maximum = Object.hasOwn(value, "max");
  if (value.mode === "fixed" && !fixed) report.error(contentPointer(path, "value"), "Fixed size requires an explicit value.");
  if ((value.mode === "hug" || value.mode === "fill") && fixed) report.error(contentPointer(path, "value"), "Hug and fill sizes cannot contain a fixed value.");
  const current = fixed ? dimension(value.value!, contentPointer(path, "value"), report) : undefined;
  const min = minimum ? dimension(value.min!, contentPointer(path, "min"), report) : undefined;
  const max = maximum ? dimension(value.max!, contentPointer(path, "max"), report) : undefined;
  if (min && max) {
    if (min.unit !== max.unit) report.error(path, "Size bounds must use the same unit; no conversion is inferred.");
    else if (min.value > max.value) report.error(contentPointer(path, "min"), "Minimum size cannot exceed maximum size.");
  }
  for (const [bound, isMin] of [[min, true], [max, false]] as const) {
    if (!current || !bound) continue;
    if (current.unit !== bound.unit) report.error(contentPointer(path, "value"), "Fixed size and its bounds must use the same unit.");
    else if (isMin ? current.value < bound.value : current.value > bound.value) report.error(contentPointer(path, "value"), "Fixed size lies outside its declared bounds.");
  }
}

function listMetadata(value: JsonValue, path: string, report: ContentReportSink): void {
  report.handled("ListMetadata", path);
  if (!isObject(value)) { report.error(path, "List metadata must be an object."); return; }
  extraFields(value, ["id", "ordered", "start", "level"], path, report);
  if (!isValidId(value.id)) report.error(contentPointer(path, "id"), "List metadata requires a stable list identity.");
  if (typeof value.ordered !== "boolean") report.error(contentPointer(path, "ordered"), "List ordered must be a boolean.");
  if (typeof value.start !== "number" || !Number.isInteger(value.start) || value.start <= 0) report.error(contentPointer(path, "start"), "List start must be a positive integer.");
  if (typeof value.level !== "number" || !Number.isInteger(value.level) || value.level < 0) report.error(contentPointer(path, "level"), "List level must be a nonnegative integer.");
}

function safeLink(value: JsonValue, path: string, report: ContentReportSink): void {
  report.handled("SafeLink", path);
  if (!isObject(value)) { report.error(path, "A link must be an object with an href."); return; }
  extraFields(value, ["href", "target"], path, report);
  if (Object.hasOwn(value, "target") && (typeof value.target !== "string" || !LINK_TARGETS.has(value.target))) report.error(contentPointer(path, "target"), "Link target must be _self or _blank.");
  const href = value.href;
  if (typeof href !== "string" || !href || LINK_FORBIDDEN_CHARACTERS.test(href)) {
    report.error(contentPointer(path, "href"), "Link href must be nonempty and contain no literal whitespace or control characters.");
    return;
  }
  if (href.startsWith("#")) {
    if (href.length === 1) report.error(contentPointer(path, "href"), "A same-document fragment must name a nonempty fragment.");
    return;
  }
  try {
    const parsed = new URL(href);
    const web = ABSOLUTE_WEB_LINK.test(href) && (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
    const mail = MAIL_LINK.test(href) && parsed.protocol === "mailto:" && !parsed.host && !href.slice(href.indexOf(":") + 1).startsWith("//");
    const authority = web ? href.slice(href.indexOf("://") + 3).split(/[/?#]/u)[0]! : "";
    if ((!web && !mail) || parsed.username || parsed.password || authority.includes("@")) report.error(contentPointer(path, "href"), "Only absolute http/https, mailto and same-document fragments without credentials are supported.");
  } catch { report.error(contentPointer(path, "href"), "Link href is not a supported absolute URL or same-document fragment."); }
}

/** Enforce only the content and local scalar relationships explicitly fixed by ADR-0012. */
export function inspectRecordContent(name: string, value: JsonObject, path: string, report: ContentReportSink): void {
  if (name === "VariantAxis" && Array.isArray(value.options) && typeof value.default === "string" && !value.options.includes(value.default)) report.error(contentPointer(path, "default"), "Variant default must belong to its options.");
  if (name === "ThemeAxis" && Object.hasOwn(value, "default") && Array.isArray(value.contexts) && typeof value.default === "string" && !value.contexts.includes(value.default)) report.error(contentPointer(path, "default"), "Theme default must belong to its contexts.");
  if (name === "Slot" && typeof value.min === "number" && typeof value.max === "number" && value.min > value.max) report.error(contentPointer(path, "min"), "Slot minimum cannot exceed its finite maximum.");
  if (name === "SizePolicy") sizePolicy(value, path, report);
  if (name === "TextBlock") {
    const hasList = Object.hasOwn(value, "list");
    if (value.kind === "list-item" && !hasList) report.error(contentPointer(path, "list"), "A list-item requires list metadata.");
    if (value.kind === "paragraph" && hasList) report.error(contentPointer(path, "list"), "A paragraph cannot carry list metadata.");
    if (hasList) listMetadata(value.list!, contentPointer(path, "list"), report);
  }
  if (name === "InlineRun") {
    const marksPath = contentPointer(path, "marks");
    report.handled("InlineMark", marksPath);
    if (Array.isArray(value.marks)) value.marks.forEach((mark, index) => {
      report.tick();
      if (typeof mark !== "string" || !INLINE_MARKS.has(mark)) report.error(contentPointer(marksPath, String(index)), "Inline mark must be strong, emphasis, underline, strike or code.");
    });
    if (Object.hasOwn(value, "link")) safeLink(value.link!, contentPointer(path, "link"), report);
  }
}
