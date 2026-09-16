import * as React from "react";
import {createRoot} from "react-dom/client";
import {TooltipProvider} from "./upstream/registry/base-nova/ui/tooltip.tsx";
import {Toaster} from "./upstream/registry/base-nova/ui/toast.tsx";
import {Toaster as SonnerToaster} from "sonner";
import {DirectionProvider} from "@base-ui/react/direction-provider";
import {LanguageProvider} from "./upstream/apps/v4/components/language-selector.tsx";
import * as T58 from "./upstream/apps/v4/examples/base/accordion-demo.tsx";
import * as T59 from "./upstream/apps/v4/examples/base/alert-demo.tsx";
import * as T60 from "./upstream/apps/v4/examples/base/alert-dialog-demo.tsx";
import * as T61 from "./upstream/apps/v4/examples/base/aspect-ratio-demo.tsx";
import * as T62 from "./upstream/apps/v4/examples/base/attachment-demo.tsx";
import * as T63 from "./upstream/apps/v4/examples/base/avatar-demo.tsx";
import * as T64 from "./upstream/apps/v4/examples/base/badge-demo.tsx";
import * as T65 from "./upstream/apps/v4/examples/base/breadcrumb-demo.tsx";
import * as T66 from "./upstream/apps/v4/examples/base/bubble-demo.tsx";
import * as T67 from "./upstream/apps/v4/examples/base/button-demo.tsx";
import * as T68 from "./upstream/apps/v4/examples/base/button-group-demo.tsx";
import * as T69 from "./upstream/apps/v4/examples/base/calendar-demo.tsx";
import * as T70 from "./upstream/apps/v4/examples/base/card-demo.tsx";
import * as T71 from "./upstream/apps/v4/examples/base/carousel-demo.tsx";
import * as T72 from "./upstream/apps/v4/examples/base/chart-demo.tsx";
import * as T73 from "./upstream/apps/v4/examples/base/checkbox-demo.tsx";
import * as T74 from "./upstream/apps/v4/examples/base/collapsible-demo.tsx";
import * as T75 from "./upstream/apps/v4/examples/base/combobox-demo.tsx";
import * as T76 from "./upstream/apps/v4/examples/base/command-demo.tsx";
import * as T77 from "./upstream/apps/v4/examples/base/context-menu-demo.tsx";
import * as T78 from "./upstream/apps/v4/examples/base/data-table-demo.tsx";
import * as T79 from "./upstream/apps/v4/examples/base/date-picker-demo.tsx";
import * as T80 from "./upstream/apps/v4/examples/base/dialog-demo.tsx";
import * as T81 from "./upstream/apps/v4/examples/base/card-rtl.tsx";
import * as T82 from "./upstream/apps/v4/examples/base/drawer-demo.tsx";
import * as T83 from "./upstream/apps/v4/examples/base/dropdown-menu-demo.tsx";
import * as T84 from "./upstream/apps/v4/examples/base/empty-demo.tsx";
import * as T85 from "./upstream/apps/v4/examples/base/field-demo.tsx";
import * as T86 from "./upstream/apps/v4/examples/base/hover-card-demo.tsx";
import * as T87 from "./upstream/apps/v4/examples/base/input-demo.tsx";
import * as T88 from "./upstream/apps/v4/examples/base/input-group-demo.tsx";
import * as T89 from "./upstream/apps/v4/examples/base/input-otp-demo.tsx";
import * as T90 from "./upstream/apps/v4/examples/base/item-demo.tsx";
import * as T91 from "./upstream/apps/v4/examples/base/kbd-demo.tsx";
import * as T92 from "./upstream/apps/v4/examples/base/label-demo.tsx";
import * as T93 from "./upstream/apps/v4/examples/base/marker-demo.tsx";
import * as T94 from "./upstream/apps/v4/examples/base/menubar-demo.tsx";
import * as T95 from "./upstream/apps/v4/examples/base/message-demo.tsx";
import * as T96 from "./upstream/apps/v4/examples/base/message-scroller-demo.tsx";
import * as T97 from "./upstream/apps/v4/examples/base/native-select-demo.tsx";
import * as T98 from "./upstream/apps/v4/examples/base/navigation-menu-demo.tsx";
import * as T99 from "./upstream/apps/v4/examples/base/pagination-demo.tsx";
import * as T100 from "./upstream/apps/v4/examples/base/popover-demo.tsx";
import * as T101 from "./upstream/apps/v4/examples/base/progress-demo.tsx";
import * as T102 from "./upstream/apps/v4/examples/base/questionnaire-demo.tsx";
import * as T103 from "./upstream/apps/v4/examples/base/radio-group-demo.tsx";
import * as T104 from "./upstream/apps/v4/examples/base/resizable-demo.tsx";
import * as T105 from "./upstream/apps/v4/examples/base/scroll-area-demo.tsx";
import * as T106 from "./upstream/apps/v4/examples/base/select-demo.tsx";
import * as T107 from "./upstream/apps/v4/examples/base/separator-demo.tsx";
import * as T108 from "./upstream/apps/v4/examples/base/sheet-demo.tsx";
import * as T109 from "./upstream/apps/v4/examples/base/sidebar-demo.tsx";
import * as T110 from "./upstream/apps/v4/examples/base/skeleton-demo.tsx";
import * as T111 from "./upstream/apps/v4/examples/base/slider-demo.tsx";
import * as T112 from "./upstream/apps/v4/examples/base/spinner-demo.tsx";
import * as T113 from "./upstream/apps/v4/examples/base/switch-demo.tsx";
import * as T114 from "./upstream/apps/v4/examples/base/table-demo.tsx";
import * as T115 from "./upstream/apps/v4/examples/base/tabs-demo.tsx";
import * as T116 from "./upstream/apps/v4/examples/base/textarea-demo.tsx";
import * as T117 from "./upstream/apps/v4/examples/base/toast-demo.tsx";
import * as T118 from "./upstream/apps/v4/examples/base/toggle-demo.tsx";
import * as T119 from "./upstream/apps/v4/examples/base/toggle-group-demo.tsx";
import * as T120 from "./upstream/apps/v4/examples/base/tooltip-demo.tsx";
import * as T121 from "./upstream/apps/v4/examples/base/typography-demo.tsx";

const templates = {
  58: {Component: T58.default, name: "Accordion", style: "base-nova", previewClassName: "*:data-[slot=accordion]:max-w-sm h-[300px]"},
  59: {Component: T59.default, name: "Alert", style: "base-nova", previewClassName: "h-auto sm:h-72 p-6"},
  60: {Component: T60.default, name: "Alert Dialog", style: "base-nova", previewClassName: "h-56"},
  61: {Component: T61.default, name: "Aspect Ratio", style: "base-nova", previewClassName: ""},
  62: {Component: T62.AttachmentDemo, name: "Attachment", style: "base-rhea", previewClassName: "h-auto theme-blue bg-surface dark:bg-background"},
  63: {Component: T63.default, name: "Avatar", style: "base-nova", previewClassName: "h-72"},
  64: {Component: T64.default, name: "Badge", style: "base-nova", previewClassName: ""},
  65: {Component: T65.BreadcrumbDemo, name: "Breadcrumb", style: "base-nova", previewClassName: "p-2"},
  66: {Component: T66.BubbleDemo, name: "Bubble", style: "base-rhea", previewClassName: "h-auto theme-blue"},
  67: {Component: T67.default, name: "Button", style: "base-nova", previewClassName: ""},
  68: {Component: T68.default, name: "Button Group", style: "base-nova", previewClassName: ""},
  69: {Component: T69.default, name: "Calendar", style: "base-nova", previewClassName: "h-96"},
  70: {Component: T70.default, name: "Card", style: "base-nova", previewClassName: "h-[30rem]"},
  71: {Component: T71.default, name: "Carousel", style: "base-nova", previewClassName: "h-80 sm:h-[32rem]"},
  72: {Component: T72.ChartDemo, name: "Chart", style: "base-nova", previewClassName: ""},
  73: {Component: T73.default, name: "Checkbox", style: "base-nova", previewClassName: "h-80"},
  74: {Component: T74.default, name: "Collapsible", style: "base-nova", previewClassName: ""},
  75: {Component: T75.default, name: "Combobox", style: "base-nova", previewClassName: ""},
  76: {Component: T76.CommandDemo, name: "Command", style: "base-nova", previewClassName: "h-[24.5rem]"},
  77: {Component: T77.ContextMenuDemo, name: "Context Menu", style: "base-nova", previewClassName: ""},
  78: {Component: T78.DataTableDemo, name: "Data Table", style: "base-nova", previewClassName: "items-start h-auto px-4 md:px-8"},
  79: {Component: T79.DatePickerDemo, name: "Date Picker", style: "base-nova", previewClassName: ""},
  80: {Component: T80.DialogDemo, name: "Dialog", style: "base-nova", previewClassName: ""},
  81: {Component: T81.CardRtl, name: "Direction", style: "base-nova", previewClassName: "h-auto"},
  82: {Component: T82.DrawerDemo, name: "Drawer", style: "base-rhea", previewClassName: ""},
  83: {Component: T83.DropdownMenuDemo, name: "Dropdown Menu", style: "base-nova", previewClassName: ""},
  84: {Component: T84.default, name: "Empty", style: "base-nova", previewClassName: "h-96 p-0"},
  85: {Component: T85.default, name: "Field", style: "base-nova", previewClassName: "h-[800px] p-6 md:h-[850px]"},
  86: {Component: T86.default, name: "Hover Card", style: "base-nova", previewClassName: "h-80"},
  87: {Component: T87.InputDemo, name: "Input", style: "base-nova", previewClassName: "*:max-w-xs"},
  88: {Component: T88.InputGroupDemo, name: "Input Group", style: "base-nova", previewClassName: "h-[26rem]"},
  89: {Component: T89.InputOTPDemo, name: "Input OTP", style: "base-nova", previewClassName: ""},
  90: {Component: T90.ItemDemo, name: "Item", style: "base-nova", previewClassName: ""},
  91: {Component: T91.default, name: "Kbd", style: "base-nova", previewClassName: ""},
  92: {Component: T92.default, name: "Label", style: "base-nova", previewClassName: ""},
  93: {Component: T93.MarkerDemo, name: "Marker", style: "base-rhea", previewClassName: "h-auto theme-blue"},
  94: {Component: T94.default, name: "Menubar", style: "base-nova", previewClassName: ""},
  95: {Component: T95.MessageDemo, name: "Message", style: "base-rhea", previewClassName: "h-auto theme-blue"},
  96: {Component: T96.MessageScrollerDemo, name: "Message Scroller", style: "base-rhea", previewClassName: "h-auto theme-blue bg-surface dark:bg-background p-4 min-[480px]:p-8 min-[560px]:p-10 sm:px-10 sm:py-16"},
  97: {Component: T97.default, name: "Native Select", style: "base-nova", previewClassName: ""},
  98: {Component: T98.default, name: "Navigation Menu", style: "base-nova", previewClassName: "h-96"},
  99: {Component: T99.default, name: "Pagination", style: "base-nova", previewClassName: ""},
  100: {Component: T100.default, name: "Popover", style: "base-nova", previewClassName: ""},
  101: {Component: T101.default, name: "Progress", style: "base-nova", previewClassName: ""},
  102: {Component: T102.QuestionnaireDemo, name: "Questionnaire", style: "base-nova", previewClassName: "min-h-[560px] p-4 sm:p-8"},
  103: {Component: T103.RadioGroupDemo, name: "Radio Group", style: "base-nova", previewClassName: ""},
  104: {Component: T104.default, name: "Resizable", style: "base-nova", previewClassName: "h-80"},
  105: {Component: T105.ScrollAreaDemo, name: "Scroll Area", style: "base-nova", previewClassName: "h-96"},
  106: {Component: T106.SelectDemo, name: "Select", style: "base-nova", previewClassName: ""},
  107: {Component: T107.default, name: "Separator", style: "base-nova", previewClassName: ""},
  108: {Component: T108.default, name: "Sheet", style: "base-nova", previewClassName: ""},
  109: {Component: T109.default, name: "Sidebar", style: "base-nova", previewClassName: ""},
  110: {Component: T110.SkeletonDemo, name: "Skeleton", style: "base-nova", previewClassName: ""},
  111: {Component: T111.SliderDemo, name: "Slider", style: "base-nova", previewClassName: ""},
  112: {Component: T112.SpinnerDemo, name: "Spinner", style: "base-nova", previewClassName: ""},
  113: {Component: T113.SwitchDemo, name: "Switch", style: "base-nova", previewClassName: ""},
  114: {Component: T114.TableDemo, name: "Table", style: "base-nova", previewClassName: "h-[30rem]"},
  115: {Component: T115.TabsDemo, name: "Tabs", style: "base-nova", previewClassName: "h-96"},
  116: {Component: T116.default, name: "Textarea", style: "base-nova", previewClassName: "*:max-w-xs"},
  117: {Component: T117.ToastDemo, name: "Toast", style: "base-nova", previewClassName: ""},
  118: {Component: T118.ToggleDemo, name: "Toggle", style: "base-nova", previewClassName: ""},
  119: {Component: T119.ToggleGroupDemo, name: "Toggle Group", style: "base-nova", previewClassName: ""},
  120: {Component: T120.TooltipDemo, name: "Tooltip", style: "base-nova", previewClassName: ""},
  121: {Component: T121.TypographyDemo, name: "Typography", style: "base-nova", previewClassName: ""},
} as const;

// Exact outer constraints supplied by the pinned docs ComponentPreview.
const outerClasses: Readonly<Partial<Record<number, string>>> = {
  "72": "theme-blue [&_.preview]:h-auto [&_.preview]:p-0 [&_.preview]:lg:min-h-[404px] [&_.preview>div]:w-full [&_.preview>div]:border-none [&_.preview>div]:shadow-none",
  "96": "rounded-[34px] sm:rounded-4xl",
  "109": "w-full",
  "121": "[&_.preview]:h-auto!"
};

export const sourceRows = Object.keys(templates).map(Number);

class ReferenceBoundary extends React.Component<{host: HTMLElement; children: React.ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error: Error) { this.props.host.dataset.referenceState = "error"; this.props.host.dataset.referenceError = error.message; }
  render() { return this.state.failed ? <p role="alert">The original reference template could not render.</p> : this.props.children; }
}

function ReadySignal({host}: {host: HTMLElement}) {
  React.useEffect(() => { if (host.dataset.referenceState !== "error") host.dataset.referenceState = "ready"; }, [host]);
  return null;
}

export function mountReferenceTemplate(element: HTMLElement, sourceRow: number, options: {theme: "light" | "dark"}): () => void {
  const template = templates[sourceRow as keyof typeof templates];
  if (!template) throw new Error(`Unknown shadcn/ui template source row ${sourceRow}`);
  const document = element.ownerDocument;
  document.documentElement.classList.toggle("dark", options.theme === "dark");
  document.documentElement.style.colorScheme = options.theme;
  element.dataset.referenceState = "loading";
  delete element.dataset.referenceError;
  const root = createRoot(element);
  const Component = template.Component;
  const dir = sourceRow === 81 ? "rtl" : "ltr";
  root.render(<ReferenceBoundary host={element}><DirectionProvider direction={dir}><LanguageProvider defaultLanguage={dir === "rtl" ? "ar" : "en"}>
    <TooltipProvider><Toaster><SonnerToaster theme={options.theme}/>
      <div data-reference-template={sourceRow} data-reference-provider="shadcn/ui" className={`${template.style} ${outerClasses[sourceRow] ?? ""}`}>
        <div dir={dir} className={`reference-stage preview relative flex min-h-72 w-full items-center justify-center p-10 ${template.previewClassName}`}>
          <Component />
        </div>
      </div>
    </Toaster></TooltipProvider>
  </LanguageProvider></DirectionProvider><ReadySignal host={element}/></ReferenceBoundary>);
  return () => root.unmount();
}
