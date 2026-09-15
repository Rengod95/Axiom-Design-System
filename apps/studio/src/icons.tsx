export type IconName = "edit" | "magnet" | "undo" | "redo" | "download" | "arrow" | "chevron" | "close" | "check" | "component" | "token" | "layers" | "code" | "refresh" | "link" | "monitor" | "phone" | "search" | "plus" | "minus" | "settings" | "sun" | "moon" | "cursor" | "hand" | "fit" | "grid" | "library" | "folder" | "copy" | "trash" | "more" | "help" | "palette" | "type" | "filter" | "eye" | "eye-off" | "lock" | "unlock" | "panel" | "move" | "align" | "play" | "rotate" | "history" | "upload" | "panel-left";
const paths: Record<IconName, string> = {
  edit: "m13 2 5 5L7 18H2v-5Zm-8 9 5 5M11 4l5 5",
  magnet: "M3 3h4v7a3 3 0 0 0 6 0V3h4v7a7 7 0 0 1-14 0Zm0 4h4m6 0h4",
  "panel-left": "M2 3h16v14H2Zm5 0v14",
  undo: "M7 4 3 8l4 4M3 8h8a5 5 0 0 1 0 10H8", redo: "m13 4 4 4-4 4m4-4H9a5 5 0 0 0 0 10h3",
  download: "M10 2v11m-4-4 4 4 4-4M3 14v4h14v-4", arrow: "M3 10h13m-5-5 5 5-5 5", chevron: "m8 5 5 5-5 5", close: "m5 5 10 10M15 5 5 15", check: "m4 10 4 4 8-9",
  component: "M8 3H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm7 7h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z", token: "M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm6 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", layers: "m10 2 8 5-8 5-8-5Zm-8 9 8 5 8-5m-16 5 8 4 8-4", code: "m6 5-5 5 5 5m8-10 5 5-5 5M12 2 8 18", refresh: "M17 7a7 7 0 1 0 0 6m0-10v4h-4", link: "m8 12 4-4m-5 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m3-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0", monitor: "M2 3h16v11H2Zm8 11v4m-4 0h8", phone: "M6 1h8v18H6Zm3 15h2",
  search: "M13 13 18 18M15 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0", plus: "M10 3v14M3 10h14", minus: "M3 10h14",
  settings: "M3 5h14M3 15h14M7 2v6m6 4v6", sun: "M10 1v2m0 14v2M1 10h2m14 0h2M4 4l1 1m10 10 1 1M4 16l1-1M15 5l1-1M14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0", moon: "M17 12A8 8 0 0 1 8 3a8 8 0 1 0 9 9",
  cursor: "m4 2 12 9-6 1-3 6Z", hand: "M6 9V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v4c0 5-3 7-7 7-4 0-5-4-8-7a1.5 1.5 0 0 1 2-2l2 2",
  fit: "M2 7V2h5m6 0h5v5m0 6v5h-5M7 18H2v-5M6 6h8v8H6Z", grid: "M3 3h5v5H3Zm9 0h5v5h-5ZM3 12h5v5H3Zm9 0h5v5h-5Z", library: "M3 2v16m5-16v16m4-16 5 15M1 18h18", folder: "M2 5V3h6l2 3h8v11H2Z",
  copy: "M7 7h11v11H7ZM3 13H2V2h11v1", trash: "M3 5h14M7 5V2h6v3M5 5l1 13h8l1-13M8 8v7m4-7v7", more: "M3 10h.01M10 10h.01M17 10h.01", help: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0M7 7a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 3h.01",
  palette: "M10 2a8 8 0 1 0 0 16h1a2 2 0 0 0 0-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3c0-3-4-5-8-5M6 6h.01M4 10h.01M8 4h.01M13 5h.01", type: "M3 4V2h14v2M10 2v16m-4 0h8", filter: "M2 4h16M5 10h10m-7 6h4",
  eye: "M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0", "eye-off": "M2 2l16 16M8 4l2-.1c6 0 9 6 9 6a18 18 0 0 1-3 3M4 6c-2 1-3 4-3 4s3 6 9 6l3-.5",
  lock: "M4 9h12v9H4Zm3 0V5a3 3 0 0 1 6 0v4m-3 4v2", unlock: "M4 9h12v9H4Zm3 0V5a3 3 0 0 1 6 0m-3 8v2", panel: "M2 3h16v14H2Zm11 0v14", move: "M10 1v18M1 10h18M7 4l3-3 3 3M7 16l3 3 3-3M4 7l-3 3 3 3m12-6 3 3-3 3", align: "M3 1v18M6 4h11v4H6Zm0 8h7v4H6Z", play: "m6 3 11 7-11 7Z", rotate: "M16 7a7 7 0 1 0 1 6M17 2v5h-5", history: "M3 7a7 7 0 1 1-1 5m0-9v5h5m3-3v5l3 2", upload: "M10 14V2m-4 4 4-4 4 4M3 14v4h14v-4",
};
export function Icon({ name, size = 16 }: { name: IconName; size?: number }) { return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>; }
