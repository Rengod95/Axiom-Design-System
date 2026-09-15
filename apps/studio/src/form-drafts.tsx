import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DraftRegistry } from "./draft-registry.ts";
import type { FormDraft } from "./draft-registry.ts";

const DraftContext = createContext<DraftRegistry | null>(null);
export function FormDraftProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new DraftRegistry());
  return <DraftContext.Provider value={registry}>{children}</DraftContext.Provider>;
}
export function useDraftRegistry() {
  const registry = useContext(DraftContext);
  if (!registry) throw new Error("Form drafts require a workspace provider.");
  return registry;
}
export function useFormDraft(form: Omit<FormDraft, "focus"> & { focus?(): void }) {
  const registry = useDraftRegistry(), current = useRef(form);
  current.current = form;
  useEffect(() => {
    registry.set({ id: form.id, label: form.label, dirty: form.dirty, valid: form.valid,
      apply: () => current.current.apply(), reset: () => current.current.reset(),
      focus: () => {
        if (current.current.focus) return current.current.focus();
        const target = document.querySelector<HTMLElement>(`[data-draft-form="${form.id}"]`);
        const element = target?.classList.contains("context-draft-anchor") ? target.parentElement : target;
        const control = element?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)') ?? element?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
        const previousFocus = document.activeElement;
        for (let parent: HTMLElement | null = control ?? element ?? null; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
        const focus = () => { if (control?.isConnected && [previousFocus, control, document.body].includes(document.activeElement)) { control.scrollIntoView({ block: "nearest" }); control.focus({ preventScroll: true }); } };
        // Native disclosure also needs a rendered frame when reduced motion removes its transitions.
        requestAnimationFrame(() => { const animations = control?.closest("details")?.getAnimations({ subtree: true }) ?? []; void Promise.allSettled(animations.map(animation => animation.finished)).then(() => requestAnimationFrame(focus)); });
      },
    });
  }, [registry, form.id, form.label, form.dirty, form.valid]);
  useEffect(() => () => registry.remove(form.id), [registry, form.id]);
}
