import './style.css';
import { gsap, ScrollTrigger } from './core/gsap';
import { reducedMotion } from './core/motion';
import { bindAnchors, initScroll, onScroll } from './core/scroll';
import { splitWords } from './core/split-text';
import { initMotionAttributes } from './core/motion-attrs';
import { SAMPLE_MEAL } from './core/analyze';
import { GOALS, itemRowsHtml, macroRowsHtml } from './core/nutrition';

const $ = <T extends HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);

function initNavbar(): void {
  const header = $('#navbar');
  const toggle = $<HTMLButtonElement>('#menu-toggle');
  const menu = $('#mobile-menu');
  if (!header || !toggle || !menu) return;

  let menuOpen = false;

  const paint = (y: number, direction: 1 | -1): void => {
    const glassy = y > 24 || menuOpen;
    header.classList.toggle('liquid-glass', glassy);
    header.style.borderBottom = glassy
      ? '1px solid rgba(242,239,234,0.10)'
      : '1px solid transparent';

    const hide = !menuOpen && direction === 1 && y > 480;
    header.classList.toggle('-translate-y-full', hide);
    header.classList.toggle('translate-y-0', !hide);
  };

  const [barTop, barBottom] = [...menu.ownerDocument.querySelectorAll<HTMLElement>('[data-bar]')];

  const setMenu = (open: boolean): void => {
    menuOpen = open;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    barTop?.classList.toggle('translate-y-[3px]', open);
    barTop?.classList.toggle('rotate-45', open);
    barBottom?.classList.toggle('-translate-y-[3px]', open);
    barBottom?.classList.toggle('-rotate-45', open);
    paint(window.scrollY, -1);
  };

  toggle.addEventListener('click', () => setMenu(!menuOpen));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  onScroll(paint);
}


function initHero(): void {
  const wrap = $('[data-hero]');
  const content = $('[data-hero-content]');
  const intro = $('[data-hero-intro]');
  const lines = [...document.querySelectorAll<HTMLElement>('[data-hero-line]')];
  const deck = $('[data-hero-deck]');
  const reassure = $('[data-hero-reassure]');
  if (!wrap || !content || !intro || !deck || !reassure || lines.length < 2) return;

  if (reducedMotion()) return;

  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .from(intro, { yPercent: 120, duration: 1 }, 0.1)
    .from(lines[0], { yPercent: 115, duration: 1.4 }, 0.2)
    .from(lines[1], { yPercent: 115, duration: 1.4 }, 0.34)
    .from(deck.children, { y: 24, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, 0.7)
    .from(reassure, { autoAlpha: 0, duration: 1.2 }, 1.1);

  gsap
    .timeline({
      scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom top', scrub: true },
    })
    .to(content, { yPercent: 18, autoAlpha: 0.15, ease: 'none' }, 0);
}

// ============================================================
// Manifesto — one sentence, scrubbed word by word from 12% to full ink.
// ============================================================

function initManifesto(): void {
  const host = $('[data-manifesto]');
  if (!host || reducedMotion()) return;

  const words = splitWords(host, 'scrub-word');
  gsap.to(words, {
    opacity: 1,
    ease: 'none',
    stagger: 0.6,
    scrollTrigger: { trigger: host, start: 'top 78%', end: 'bottom 45%', scrub: 0.4 },
  });
}


function initCardStack(): void {
  const stack = $('#stack');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-stack-card]')];
  if (!stack || !cards.length || reducedMotion()) return;

  const total = cards.length;


  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stack,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  timeline.duration(1);

  cards.forEach((card, i) => {
    if (i === total - 1) return;

    // Card i starts shrinking when card i+1 is about to cover it.
    const startTime = (i + 0.5) / total;
    const duration = 1 - startTime;

    const depth = total - 1 - i;

    timeline.fromTo(
      card,
      { scale: 1, filter: 'brightness(1) blur(0px)' },
      {
        scale: 1 - depth * 0.05,
        filter: `brightness(${1 - depth * 0.2}) blur(${depth * 3}px)`,
        duration,
        ease: 'none',
      },
      startTime,
    );
  });
}


function initCounters(): void {
  document.querySelectorAll<HTMLElement>('.counter').forEach((counter) => {
    const target = Number(counter.dataset.target);
    const decimals = Number(counter.dataset.decimals ?? 0);

    const format = (v: number): string =>
      v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

    if (reducedMotion()) {
      counter.textContent = format(target);
      return;
    }

    const state = { value: 0 };
    const tween = gsap.to(state, {
      value: target,
      duration: 2,
      ease: 'power2.out',
      paused: true,
      onUpdate: () => (counter.textContent = format(state.value)),
    });

    ScrollTrigger.create({
      trigger: counter,
      start: 'top 85%',
      once: true,
      onEnter: () => tween.play(),
    });
  });
}

// ============================================================
// FAQ — accordion on hairlines. The plus marker is two CSS lines that
// rotate into a cross; the panel animates via grid rows.
// ============================================================

function initFaq(): void {
  const list = $('#faq-list');
  if (!list) return;

  const rows = [...list.querySelectorAll<HTMLElement>('[data-faq-trigger]')].map((trigger) => ({
    trigger,
    panel: trigger.parentElement?.querySelector<HTMLElement>('[data-faq-panel]') ?? null,
    cross: trigger.querySelector<HTMLElement>('[data-faq-cross]'),
  }));

  let open = 0;

  const paint = (): void => {
    rows.forEach((row, i) => {
      const isOpen = open === i;
      row.trigger.setAttribute('aria-expanded', String(isOpen));
      if (row.panel) row.panel.style.gridTemplateRows = isOpen ? '1fr' : '0fr';
      row.cross?.classList.toggle('scale-y-0', isOpen);
    });
  };

  rows.forEach((row, i) => {
    row.trigger.addEventListener('click', () => {
      open = open === i ? -1 : i;
      paint();
    });
  });

  paint();
}

// ============================================================
// Footer — the wordmark rises letter by letter as it enters.
// ============================================================

function initFooter(): void {
  const year = $('#footer-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const host = $('#wordmark');
  if (!host) return;

  host.innerHTML = [...'CalorieLens']
    .map((letter) => `<span class="mask-line !inline-block align-bottom"><span class="wm-letter">${letter}</span></span>`)
    .join('');

  if (reducedMotion()) return;

  const tween = gsap.from(host.querySelectorAll('.wm-letter'), {
    yPercent: 110,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.045,
    paused: true,
  });

  ScrollTrigger.create({ trigger: host, start: 'top 95%', once: true, onEnter: () => tween.play() });
}

// ============================================================
// Nutrition marquee — a factual strip, not decoration. The track holds
// the list twice so the -50% translate loops seamlessly.
// ============================================================

const REFERENCE_FOODS = [
  ['Chicken breast', '165 kcal', '31 g protein'],
  ['Rolled oats', '389 kcal', '17 g protein'],
  ['Greek yogurt 2%', '73 kcal', '10 g protein'],
  ['Salmon', '208 kcal', '20 g protein'],
  ['Cooked lentils', '116 kcal', '9 g protein'],
  ['Whole egg', '155 kcal', '13 g protein'],
  ['Avocado', '160 kcal', '2 g protein'],
  ['White rice, cooked', '130 kcal', '2.7 g protein'],
  ['Almonds', '579 kcal', '21 g protein'],
  ['Broccoli', '34 kcal', '2.8 g protein'],
  ['Sweet potato', '86 kcal', '1.6 g protein'],
  ['Cottage cheese', '98 kcal', '11 g protein'],
];

function initMarquee(): void {
  const track = $('#marquee-track');
  if (!track) return;

  const item = ([name, kcal, protein]: string[]): string => `
    <span class="flex shrink-0 items-baseline gap-3 px-7">
      <span class="text-base font-medium tracking-tight text-ink">${name}</span>
      <span class="text-sm tabular-nums text-ink/45">${kcal} · ${protein} / 100 g</span>
      <span class="ml-4 h-1 w-1 rounded-full bg-ink/20"></span>
    </span>`;

  const once = REFERENCE_FOODS.map(item).join('');
  track.innerHTML = once + once;
}


const WEEK_SCALE = 2900;
/** Dimmed paper — a solid bone block this large would glare on the ground. */
const BAR_BODY = 'rgba(242, 239, 234, 0.72)';

function initDayTargets(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-goal]')];
  const caloriesEl = $('#goal-calories');
  const noteEl = $('#goal-note');
  const macrosEl = $('#goal-macros');
  const targetLine = $('#week-target');
  const targetLabel = $('#week-target-label');
  const summary = $('#week-summary');
  const bars = [...document.querySelectorAll<HTMLElement>('[data-week-bar]')];
  if (!buttons.length || !caloriesEl || !noteEl || !macrosEl || !targetLine) return;
  if (!targetLabel || !summary || !bars.length) return;

  const values = bars.map((bar) => Number(bar.dataset.value));
  const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  let current = 0;
  let active = 'maintain';

  const paint = (key: string): void => {
    const goal = GOALS[key];
    active = key;

    buttons.forEach((btn) => {
      const on = btn.dataset.goal === key;
      btn.classList.toggle('btn-line', !on);
      btn.classList.toggle('btn-pill', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    noteEl.textContent = goal.note;

    // Macro rows — the bar length is that macro's share of the day's calories.
    const rows = [
      { label: 'Protein', grams: goal.protein, kcal: goal.protein * 4, color: 'var(--color-protein)' },
      { label: 'Carbs', grams: goal.carbs, kcal: goal.carbs * 4, color: 'var(--color-carbs)' },
      { label: 'Fat', grams: goal.fat, kcal: goal.fat * 9, color: 'var(--color-fat)' },
    ];
    const kcalTotal = rows.reduce((a, r) => a + r.kcal, 0) || 1;

    macrosEl.innerHTML = rows
      .map(
        (row) => `
        <div>
          <div class="flex items-baseline justify-between">
            <dt class="text-sm text-ink/50">${row.label}</dt>
            <dd class="text-base font-medium tabular-nums text-ink">${row.grams}<span class="text-ink/40">g · ${Math.round((row.kcal / kcalTotal) * 100)}%</span></dd>
          </div>
          <div class="mt-2 h-px w-full bg-ink/10">
            <div data-goal-bar class="h-[2px] -translate-y-[0.5px] origin-left transition-[width] duration-700 ease-out" style="width: ${(row.kcal / kcalTotal) * 100}%; background: ${row.color}"></div>
          </div>
        </div>`,
      )
      .join('');

    // Week chart — bars over the dashed target line switch to the warn tone.
    const over = values.filter((v) => v > goal.calories).length;
    targetLine.style.bottom = `${(goal.calories / WEEK_SCALE) * 100}%`;
    targetLabel.textContent = `Target ${goal.calories.toLocaleString('en-US')}`;
    summary.textContent = `Avg ${average.toLocaleString('en-US')} · ${over} day${over === 1 ? '' : 's'} over`;

    bars.forEach((bar, i) => {
      bar.style.height = `${(values[i] / WEEK_SCALE) * 100}%`;

      // Only the slice standing above the target line carries colour. A fully
      // tinted bar would put a lot of chroma on a dark ground for no extra
      // meaning — the overshoot is the information.
      const overshoot = Math.max(0, values[i] - goal.calories);
      const share = (overshoot / values[i]) * 100;
      bar.style.background = overshoot
        ? `linear-gradient(to bottom, var(--color-fat) 0 ${share}%, ${BAR_BODY} ${share}% 100%)`
        : BAR_BODY;
      bar.title = `${values[i].toLocaleString('en-US')} kcal`;
    });

    // Count the headline figure to its new value.
    if (reducedMotion()) {
      caloriesEl.textContent = goal.calories.toLocaleString('en-US');
      current = goal.calories;
      return;
    }
    const state = { value: current };
    gsap.to(state, {
      value: goal.calories,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () =>
        (caloriesEl.textContent = Math.round(state.value).toLocaleString('en-US')),
      onComplete: () => (current = goal.calories),
    });
    gsap.from('[data-goal-bar]', { scaleX: 0, duration: 1, ease: 'power3.out', stagger: 0.06 });
  };

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => btn.dataset.goal && paint(btn.dataset.goal)),
  );

  paint(active);

  // The bars grow out of the axis the first time the chart is seen.
  if (reducedMotion()) return;
  const chart = $('#week-chart');
  if (!chart) return;

  const grow = gsap.from(bars, {
    scaleY: 0,
    transformOrigin: 'bottom center',
    duration: 1.1,
    ease: 'power3.out',
    stagger: 0.06,
    paused: true,
  });
  const line = gsap.from(targetLine, { autoAlpha: 0, duration: 0.8, delay: 0.6, paused: true });

  ScrollTrigger.create({
    trigger: chart,
    start: 'top 80%',
    once: true,
    onEnter: () => {
      grow.play();
      line.play();
    },
  });
}

// ============================================================
// Showcase — the landing shows the shape of an answer, it doesn't take
// uploads. Scanning happens in the app at /scan.html.
// ============================================================

function initShowcase(): void {
  const photo = $<HTMLImageElement>('#showcase-photo');
  const meal = $('#showcase-meal');
  const macros = $('#showcase-macros');
  const items = $('#showcase-items');
  const counter = $('[data-showcase-count]');
  const bar = $('[data-showcase-bar]');
  if (!photo || !meal || !macros || !items || !counter || !bar) return;

  photo.src = SAMPLE_MEAL.image_url;
  meal.textContent = SAMPLE_MEAL.meal_name;
  macros.innerHTML = macroRowsHtml(SAMPLE_MEAL);
  items.innerHTML = itemRowsHtml(SAMPLE_MEAL);

  if (reducedMotion()) {
    counter.textContent = SAMPLE_MEAL.total_calories.toLocaleString('en-US');
    return;
  }

  // The total counts up and the bars draw once the panel is on screen.
  const state = { value: 0 };
  const count = gsap.to(state, {
    value: SAMPLE_MEAL.total_calories,
    duration: 1.6,
    ease: 'power3.out',
    paused: true,
    onUpdate: () => (counter.textContent = Math.round(state.value).toLocaleString('en-US')),
  });
  const draw = gsap.from([bar, ...macros.querySelectorAll('[data-macro-bar]')], {
    scaleX: 0,
    duration: 1.5,
    ease: 'power3.out',
    stagger: 0.08,
    paused: true,
  });

  ScrollTrigger.create({
    trigger: counter,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      count.play();
      draw.play();
    },
  });
}

// ============================================================
// Waitlist
// ============================================================

function initWaitlist(): void {
  const form = $<HTMLFormElement>('#waitlist-form');
  const submit = $<HTMLButtonElement>('#waitlist-submit');
  const email = $<HTMLInputElement>('#waitlist-email');
  if (!form || !submit || !email) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit.innerHTML = '<span>You’re on the list</span>';
    submit.disabled = true;
    email.disabled = true;
    email.classList.add('opacity-40');
  });
}

// ============================================================
// Boot
// ============================================================

initScroll();
bindAnchors();
initNavbar();
initHero();
initMarquee();
initManifesto();
initCardStack();
initDayTargets();
initCounters();
initFaq();
initFooter();
initShowcase();
initWaitlist();
initMotionAttributes();

// Late layout shifts (web fonts, images) invalidate the trigger positions.
setTimeout(() => ScrollTrigger.refresh(), 500);
