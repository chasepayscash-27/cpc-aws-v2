/**
 * Scroll the page back to the top.
 *
 * `html, body { height: 100%; overflow-x: auto; }` in App.css makes <body>
 * (not the window) the scroll container, so `window.scrollTo` alone is a
 * no-op. Scroll every candidate container so this works regardless of which
 * one is actually scrolling.
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return;
  const targets = new Set<Element>([document.documentElement, document.body]);
  if (document.scrollingElement) targets.add(document.scrollingElement);
  window.scrollTo({ top: 0, behavior });
  targets.forEach((el) => {
    if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior });
  });
}
