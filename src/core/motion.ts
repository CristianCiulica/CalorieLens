/**
 * Central source of truth for the user's motion preference.
 * Animation-heavy features (Lenis, GSAP reveals) consult this before
 * doing any work. `?static=1` forces the no-motion path — used for
 * visual audits and automated screenshots.
 */
const query = window.matchMedia('(prefers-reduced-motion: reduce)');
const forced = new URLSearchParams(window.location.search).has('static');

let reduced = forced || query.matches;
query.addEventListener('change', (e) => {
  reduced = forced || e.matches;
});

export function reducedMotion(): boolean {
  return reduced;
}
