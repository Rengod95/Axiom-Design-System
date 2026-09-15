import { useState } from "react";
import type { JsonObject, ResolvedFoundationToken } from "../../../modules/ads-core/src/index.ts";
import { Icon } from "./icons.tsx";
import type { Locale } from "./locales.ts";
import { copy } from "./ui.tsx";
import { colorHex, object } from "./ui-utils.ts";
import { DOMAIN_LABELS } from "./foundation-starter-panel.tsx";

/** Domain membership is source metadata; names never assign a token to a domain. */
export function SidebarTokens({ tokens, foundation, query, selected, locale, onSelect }: { tokens: ResolvedFoundationToken[]; foundation?: JsonObject | undefined; query: string; selected: string | null; locale: Locale; onSelect(id: string): void }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const domains = Array.isArray(foundation?.domains) ? foundation.domains.filter(object) : [];
  const filtered = tokens.filter(token => token.name.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = new Map<string, ResolvedFoundationToken[]>();
  for (const token of filtered) { const id = token.domain ?? "unassigned"; groups.set(id, [...groups.get(id) ?? [], token]); }
  return <div className="sidebar-domains">{[...groups].map(([id, items]) => {
    const domain = domains.find(domain => domain.id === id), name = String(domain?.name ?? (id === "unassigned" ? copy(locale, "미분류", "Unassigned") : id));
    const translation = DOMAIN_LABELS[name.toLowerCase()], label = translation ? copy(locale, ...translation) : name;
    const open = query.trim().length > 0 || expanded.has(id), panelId = `sidebar-domain-${id}`;
    return <section className="sidebar-domain" key={id} data-domain={id}>
      <button type="button" className="sidebar-domain-toggle" aria-expanded={open} aria-controls={panelId} data-testid={`sidebar-domain-${id}`} onClick={() => setExpanded(before => { const next = new Set(before); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>
        <Icon name="chevron" size={12} /><span>{label}</span><small>{items.length}</small>
      </button>
      <div id={panelId} hidden={!open}>{items.map(token => {
        const visibleName = token.name.toLowerCase().startsWith(`${name.toLowerCase()}.`) ? token.name.slice(name.length + 1) : token.name;
        const segments = visibleName.split("."), leaf = segments.pop()!, path = segments.join(" / ");
        return <button type="button" key={token.id} data-testid={`token-${token.id}`} title={token.name} aria-label={token.name} aria-pressed={selected === token.id} className={`nav-item sidebar-token ${selected === token.id ? "active" : ""}`} onClick={() => onSelect(token.id)}>
          <span className="nav-icon">{colorHex(token.value) ? <i className="swatch" style={{ background: colorHex(token.value)! }} /> : <Icon name="token" size={13} />}</span>
          <span className="nav-name token-name-segments">{path && <span>{path}</span>}<strong>{leaf}</strong></span>
        </button>;
      })}</div>
    </section>;
  })}{!filtered.length && <p className="nav-empty">{copy(locale, "검색 결과가 없습니다.", "No matching tokens.")}</p>}</div>;
}
