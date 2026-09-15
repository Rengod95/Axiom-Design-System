import { Children, cloneElement, Fragment, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

/** Extend native semantic anchors without replacing their event handlers, refs or accessibility. */
export function decorateCatalogParts(node: ReactNode, append: (partId: string) => ReactNode, order: Record<string, string[]>): ReactNode {
  const flatten = (children: ReactNode): ReactNode[] => Children.toArray(children).flatMap(child => isValidElement(child) && child.type === Fragment ? flatten((child.props as { children?: ReactNode }).children) : [child]);
  const visit = (children: ReactNode): ReactNode => Children.map(children, child => {
    if (!isValidElement(child) || typeof child.type !== "string" && child.type !== Fragment) return child;
    const element = child as ReactElement<{ children?: ReactNode; "data-part-id"?: string }>;
    const partId = element.props["data-part-id"];
    const nested = visit(element.props.children);
    const extra = partId ? append(partId) : null;
    if (extra == null && element.props.children === undefined) return element;
    const combined = [...flatten(nested), ...flatten(extra)];
    // Keep anonymous semantic wrappers in place; sort only source-backed siblings.
    const sequence = order[partId!] ?? [];
    const positions = combined.flatMap((item, index) => isValidElement(item) && typeof (item.props as { "data-part-id"?: string })["data-part-id"] === "string" ? [index] : []);
    const ordered = positions.map(index => combined[index]!).sort((a, b) => sequence.indexOf((a as ReactElement<{ "data-part-id": string }>).props["data-part-id"]) - sequence.indexOf((b as ReactElement<{ "data-part-id": string }>).props["data-part-id"]));
    positions.forEach((position, index) => { combined[position] = ordered[index]!; });
    return cloneElement(element, {}, combined);
  });
  const result = visit(node); return Array.isArray(result) && result.length === 1 ? result[0] : result;
}
