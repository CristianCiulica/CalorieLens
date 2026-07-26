/**
 * Wraps every word of `host` in a <span class="{className}" aria-hidden>,
 * preserving element children (e.g. <em> or <strong>) and every
 * whitespace boundary — including the space between a text node and an
 * adjacent element, which a naive textContent split would swallow.
 * Sets aria-label on the host so screen readers get the intact sentence.
 */
export function splitWords(host: HTMLElement, className: string): Element[] {
  const spans: Element[] = [];

  const wrap = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text.trim()) return;
      const frag = document.createDocumentFragment();
      for (const token of text.split(/(\s+)/)) {
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          frag.appendChild(document.createTextNode(' '));
          continue;
        }
        const span = document.createElement('span');
        span.className = className;
        span.setAttribute('aria-hidden', 'true');
        span.textContent = token;
        frag.appendChild(span);
        spans.push(span);
      }
      node.parentNode?.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.childNodes].forEach(wrap);
    }
  };

  host.setAttribute('aria-label', (host.textContent ?? '').trim().replace(/\s+/g, ' '));
  [...host.childNodes].forEach(wrap);
  return spans;
}
