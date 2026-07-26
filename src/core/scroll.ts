import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { reducedMotion } from './motion';

/**
 * Owns the Lenis smooth-scroll instance and keeps GSAP ScrollTrigger in
 * sync with it. Exposes the current scroll offset and direction so the
 * navbar can hide on the way down and return on the way up.
 */
let lenis: Lenis | null = null;
let scrollY = 0;
let direction: 1 | -1 = 1;

type Listener = (y: number, dir: 1 | -1) => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((fn) => fn(scrollY, direction));
}

const onNativeScroll = (): void => {
  if (lenis) return;
  const y = window.scrollY;
  direction = y >= scrollY ? 1 : -1;
  scrollY = y;
  emit();
};

export function initScroll(): void {
  if (lenis) return;

  if (!reducedMotion()) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });

    lenis.on('scroll', (e: Lenis) => {
      ScrollTrigger.update();
      scrollY = e.scroll;
      direction = e.direction >= 0 ? 1 : -1;
      emit();
    });

    // Drive Lenis from the GSAP ticker so both share one rAF loop.
    gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Fallback updates for reduced-motion / native scroll.
  window.addEventListener('scroll', onNativeScroll, { passive: true });
}

/** Subscribe to scroll position + direction. Fires immediately once. */
export function onScroll(fn: Listener): void {
  listeners.add(fn);
  fn(scrollY, direction);
}

export function scrollTo(target: string | number): void {
  if (lenis) {
    lenis.scrollTo(target, { offset: -96, duration: 1.4 });
    return;
  }
  const el = typeof target === 'string' ? document.querySelector(target) : null;
  if (el) {
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target });
  }
}

/** Wires every in-page anchor through the smooth-scroll instance. */
export function bindAnchors(root: ParentNode = document): void {
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      event.preventDefault();
      scrollTo(href === '#top' ? 0 : href);
    });
  });
}
