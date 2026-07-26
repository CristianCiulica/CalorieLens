import { gsap, ScrollTrigger } from './gsap';
import { reducedMotion } from './motion';
import { splitWords } from './split-text';

export type RevealMode = 'fade' | 'blur' | 'words' | 'letters' | 'scale';

const BOUND = 'data-motion-bound';

/** Splits a word span into per-letter spans (letters mode only). */
function explode(word: HTMLElement): Element[] {
  const letters = [...(word.textContent ?? '')];
  word.textContent = '';
  return letters.map((letter) => {
    const span = document.createElement('span');
    span.className = 'reveal-word';
    span.textContent = letter;
    word.appendChild(span);
    return span;
  });
}

/**
 * Scroll-linked entrance animation.
 *
 *   <h2 data-reveal>fades + rises</h2>
 *   <h1 data-reveal="words" data-reveal-stagger="0.06">word-by-word blur</h1>
 */
export function initReveals(root: ParentNode = document): void {
  if (reducedMotion()) return;

  root.querySelectorAll<HTMLElement>(`[data-reveal]:not([${BOUND}])`).forEach((host) => {
    host.setAttribute(BOUND, '');

    const mode = (host.dataset.reveal || 'blur') as RevealMode;
    const delay = Number(host.dataset.revealDelay ?? 0);
    const stagger = Number(host.dataset.revealStagger ?? 0.05);
    const startAt = host.dataset.revealStart || 'top 85%';

    let targets: Element[] | HTMLElement = host;
    if (mode === 'words' || mode === 'letters') {
      targets = splitWords(host, 'reveal-word');
      if (mode === 'letters') {
        targets = (targets as Element[]).flatMap((word) => explode(word as HTMLElement));
      }
    }

    const tween = gsap.from(targets, {
      opacity: 0,
      y: mode === 'scale' ? 0 : 32,
      scale: mode === 'scale' ? 0.92 : 1,
      filter: mode === 'fade' ? 'none' : 'blur(12px)',
      duration: 1.1,
      ease: 'power3.out',
      delay,
      stagger: Array.isArray(targets) ? stagger : 0,
      clearProps: 'filter',
      paused: true,
    });

    ScrollTrigger.create({
      trigger: host,
      start: startAt,
      once: true,
      onEnter: () => tween.play(),
    });
  });
}

/**
 * Cursor-following pull on fine pointers only. The element eases back
 * with an elastic settle when the cursor leaves.
 */
export function initMagnetic(root: ParentNode = document): void {
  if (reducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

  root.querySelectorAll<HTMLElement>(`[data-magnetic]:not([${BOUND}])`).forEach((host) => {
    host.setAttribute(BOUND, '');
    const strength = Number(host.dataset.magnetic || 0.25);

    const xTo = gsap.quickTo(host, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(host, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });

    host.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    });
    host.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/**
 * Scroll-linked parallax: the host drifts vertically while it travels
 * through the viewport, scrubbed by ScrollTrigger (transform-only, GPU
 * composited). speed 1 ≈ ±120px total drift; negative reverses.
 *
 * Don't put data-parallax and data-reveal on the same element — both
 * write `y`. Nest instead.
 */
export function initParallax(root: ParentNode = document): void {
  if (reducedMotion()) return;

  root.querySelectorAll<HTMLElement>(`[data-parallax]:not([${BOUND}])`).forEach((host) => {
    host.setAttribute(BOUND, '');
    const drift = 120 * Number(host.dataset.parallax || 0.3);

    gsap.fromTo(
      host,
      { y: drift },
      {
        y: -drift,
        ease: 'none',
        scrollTrigger: {
          trigger: host,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

export function initMotionAttributes(root: ParentNode = document): void {
  initReveals(root);
  initMagnetic(root);
  initParallax(root);
}
