export type IconName = "undo" | "redo" | "download" | "arrow" | "chevron" | "close" | "check" | "component" | "token" | "layers" | "code" | "refresh" | "link" | "monitor" | "phone";
const paths: Record<IconName, string> = {
  undo: "M7 4 3 8l4 4M3 8h8a5 5 0 0 1 0 10H8", redo: "m13 4 4 4-4 4m4-4H9a5 5 0 0 0 0 10h3",
  download: "M10 2v11m-4-4 4 4 4-4M3 14v4h14v-4", arrow: "M3 10h13m-5-5 5 5-5 5", chevron: "m8 5 5 5-5 5", close: "m5 5 10 10M15 5 5 15", check: "m4 10 4 4 8-9",
  component: "m10 2 8 8-8 8-8-8Zm-4 8h8m-4-4v8", token: "M4 4h12v12H4Zm4 0v12m-4-8h12", layers: "m10 2 8 5-8 5-8-5Zm-8 9 8 5 8-5m-16 5 8 4 8-4", code: "m6 5-5 5 5 5m8-10 5 5-5 5M12 2 8 18", refresh: "M17 7a7 7 0 1 0 0 6m0-10v4h-4", link: "m8 12 4-4m-5 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m3-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0", monitor: "M2 3h16v11H2Zm8 11v4m-4 0h8", phone: "M6 1h8v18H6Zm3 15h2",
};
export function Icon({ name, size = 15 }: { name: IconName; size?: number }) { return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>; }
