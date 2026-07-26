import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

gsap.defaults({
  ease: 'power3.out',
  duration: 1,
});

export { gsap, ScrollTrigger };

/** Premium easing used across the site (matches CSS cubic-bezier(0.22, 1, 0.36, 1)). */
export const EASE_OUT_EXPO = 'expo.out';
export const EASE_SMOOTH = 'power3.out';
