import '@mantine/core/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/lightbox/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';
import '@mantine/schedule/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantinex/mantine-logo/styles.css';
import './reference.css';

import React, { Component, Suspense, lazy, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, DirectionProvider } from '@mantine/core';
import { CodeHighlightAdapterProvider, createShikiAdapter } from '@mantine/code-highlight';
import { Notifications } from '@mantine/notifications';
import { ModalsProviderDemo } from './upstream/ModalsProviderDemo';
import { theme } from './upstream/docs-theme';
import { demoLoaders, referenceTemplates } from './registry';
import outlineHeadings from './fixtures/table-of-contents.json';

export { referenceTemplates } from './registry';
export type ReferenceOptions = { theme: 'light' | 'dark' };

const codeAdapter = createShikiAdapter(async () => {
  const [{ createHighlighterCore }, { createOnigurumaEngine }, tsx, scss, html, bash, json] = await Promise.all([
    import('shiki/core'), import('shiki/engine/oniguruma'),
    import('@shikijs/langs/tsx'), import('@shikijs/langs/scss'), import('@shikijs/langs/html'),
    import('@shikijs/langs/bash'), import('@shikijs/langs/json'),
  ]);
  return createHighlighterCore({
    langs: [tsx.default, scss.default, html.default, bash.default, json.default],
    themes: [], engine: createOnigurumaEngine(import('shiki/wasm')),
  });
});

class ReferenceErrorBoundary extends Component<{ children: ReactNode; host: HTMLElement }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.host.dataset.referenceState = 'error';
    this.props.host.dataset.referenceError = error.message;
    console.error('Mantine reference template failed', error, info.componentStack);
  }
  render() {
    return this.state.error ? <div role="alert">{this.state.error.message}</div> : this.props.children;
  }
}

function DemoContent({ demo, host }: { demo: any; host: HTMLElement }) {
  const Demo = demo.component;
  const props = Object.fromEntries((demo.controls ?? []).filter((control: any) => control?.prop && control.initialValue !== undefined).map((control: any) => [control.prop, control.initialValue]));
  useEffect(() => {
    host.dataset.referenceState = 'ready';
    host.dispatchEvent(new CustomEvent('axiom-reference-ready', { bubbles: true }));
  }, [host]);
  return <div className="axiom-reference-demo" style={{ maxWidth: demo.maxWidth, minHeight: demo.minHeight, marginInline: demo.maxWidth ? 'auto' : undefined, display: demo.centered && !demo.maxWidth ? 'flex' : undefined, justifyContent: demo.centered && !demo.maxWidth ? 'center' : undefined }}><Demo {...props} /></div>;
}

/** Mounts one pinned official reference in its owning iframe document; it never evaluates user JSX. */
export function mountReferenceTemplate(element: HTMLElement, sourceRow: number, options: ReferenceOptions): () => void {
  const loader = demoLoaders[sourceRow];
  if (!loader) throw new Error(`Mantine source row ${sourceRow} is not in the selected reference catalog.`);
  const definition = referenceTemplates.find((entry) => entry.sourceRow === sourceRow)!;
  element.dataset.referenceState = 'loading';
  element.dataset.referenceSourceRow = String(sourceRow);
  element.dataset.referenceName = definition.name;
  delete element.dataset.referenceError;
  let documentContext: HTMLElement | undefined;
  if (definition.name === 'TableOfContents' && !element.ownerDocument.getElementById('mdx')) {
    documentContext = element.ownerDocument.createElement('div');
    documentContext.id = 'mdx';
    documentContext.dataset.referenceContext = 'official-document-headings';
    documentContext.setAttribute('aria-hidden', 'true');
    documentContext.style.cssText = 'position:absolute;left:-10000px;top:0;width:340px;pointer-events:none;';
    for (const [index, heading] of outlineHeadings.entries()) {
      const node = element.ownerDocument.createElement(`h${heading.depth}`);
      node.id = `reference-heading-${index}`;
      node.textContent = heading.title;
      documentContext.append(node);
    }
    element.ownerDocument.body.append(documentContext);
  }
  const LazyDemo = lazy(async () => {
    const { default: demo } = await loader();
    return { default: () => <DemoContent demo={demo} host={element} /> };
  });
  const root = createRoot(element);
  root.render(<ReferenceErrorBoundary host={element}>
    <DirectionProvider initialDirection="ltr" detectDirection={false}>
      <MantineProvider theme={theme} forceColorScheme={options.theme}>
        <CodeHighlightAdapterProvider adapter={codeAdapter}>
          <ModalsProviderDemo>
            {definition.package === '@mantine/notifications' ? <Notifications /> : null}
            <Suspense fallback={null}><LazyDemo /></Suspense>
          </ModalsProviderDemo>
        </CodeHighlightAdapterProvider>
      </MantineProvider>
    </DirectionProvider>
  </ReferenceErrorBoundary>);
  return () => { root.unmount(); documentContext?.remove(); delete element.dataset.referenceState; };
}
