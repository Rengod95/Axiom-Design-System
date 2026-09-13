export interface FormDraft {
  id: string;
  label: string;
  dirty: boolean;
  valid: boolean;
  apply(): boolean;
  reset(): void;
  focus(): void;
}

/** Local lexical input is separate from the reviewed project proposal. */
export class DraftRegistry {
  #forms = new Map<string, FormDraft>();
  #listeners = new Set<() => void>();
  #snapshot: readonly FormDraft[] = [];
  subscribe = (listener: () => void) => { this.#listeners.add(listener); return () => { this.#listeners.delete(listener); }; };
  getSnapshot = () => this.#snapshot;
  #publish() { this.#snapshot = [...this.#forms.values()].filter(form => form.dirty); for (const listener of this.#listeners) listener(); }
  set(form: FormDraft) { this.#forms.set(form.id, form); this.#publish(); }
  remove(id: string) { this.#forms.delete(id); this.#publish(); }
  flush(): boolean {
    const forms = [...this.#forms.values()].filter(form => form.dirty);
    const invalid = forms.find(form => !form.valid);
    if (invalid) { invalid.focus(); return false; }
    for (const form of forms) {
      if (!form.apply()) { form.focus(); return false; }
      this.#forms.set(form.id, { ...form, dirty: false });
    }
    this.#publish();
    return true;
  }
  resetAll() { for (const form of this.#forms.values()) if (form.dirty) form.reset(); }
}
