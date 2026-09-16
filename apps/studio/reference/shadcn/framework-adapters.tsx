import * as React from "react";

/** Framework-neutral equivalents of Next's rendered anchor and image elements. */
export const ReferenceLink = React.forwardRef<HTMLAnchorElement, React.ComponentProps<"a">>(function ReferenceLink(props, ref) {
  return <a {...props} ref={ref} />;
});

export function ReferenceImage({fill, priority, quality: _quality, unoptimized: _unoptimized, loader: _loader, ...props}: React.ComponentProps<"img"> & {fill?: boolean; priority?: boolean; quality?: number; unoptimized?: boolean; loader?: unknown}) {
  return <img {...props} loading={priority ? "eager" : (props.loading ?? "lazy")} decoding="async" style={fill ? {position: "absolute", height: "100%", width: "100%", inset: 0, ...props.style} : props.style} />;
}
