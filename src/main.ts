import './style.css';
import { gsap, ScrollTrigger } from './core/gsap';
import { reducedMotion } from './core/motion';
import { bindAnchors, initScroll, onScroll } from './core/scroll';
import { splitWords } from './core/split-text';
import { initMotionAttributes } from './core/motion-attrs';
import { ACCEPTED_TYPES, SAMPLE_MEAL, analyzeMeal, type MealAnalysis } from './core/analyze';

const $ = <T extends HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);

// ============================================================
// Navbar — transparent over the hero, glass after the fold.
// Hides on scroll-down, returns on scroll-up.
// ============================================================

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
      ? '1px solid rgba(29,29,31,0.08)'
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

// ============================================================
// Hero — masked headline lines rise on load, the block drifts on exit.
// ============================================================

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

// ============================================================
// How it works — sticky card stack. As the next card scrolls over it,
// the one underneath shrinks, dims and blurs slightly.
// ============================================================

function initCardStack(): void {
  const stack = $('#stack');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-stack-card]')];
  if (!stack || !cards.length || reducedMotion()) return;

  const total = cards.length;

  // One scrubbed timeline (duration 1 == container progress 0→1);
  // each card shrinks over [i/total, 1], the last one stays at 1.
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

// ============================================================
// Stats — counters ride a GSAP tween triggered once per figure.
// ============================================================

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

// ============================================================
// Your day — goal presets drive the daily targets and the week chart.
// Switching a goal re-counts every number and redraws the bars.
// ============================================================

interface Goal {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string;
}

const GOALS: Record<string, Goal> = {
  cut: {
    label: 'Cut',
    calories: 1850,
    protein: 165,
    carbs: 150,
    fat: 60,
    note: 'A moderate deficit with protein kept high, so what you lose is fat and not the work you put in.',
  },
  maintain: {
    label: 'Maintain',
    calories: 2300,
    protein: 150,
    carbs: 240,
    fat: 75,
    note: 'Hold your weight steady while training. The split leaves room for carbs around sessions.',
  },
  build: {
    label: 'Build',
    calories: 2750,
    protein: 180,
    carbs: 300,
    fat: 85,
    note: 'A controlled surplus. Enough to add tissue, small enough that most of it is muscle.',
  },
};

const WEEK_SCALE = 2900;

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
      bar.style.background = values[i] > goal.calories ? 'var(--color-fat)' : 'var(--color-ink)';
      bar.style.opacity = values[i] > goal.calories ? '0.85' : '0.9';
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
// Inline analyzer — the product itself, embedded in the page.
// Idle dropzone → drag-over → scanning → breakdown, every state designed.
// ============================================================

const MACROS = [
  { key: 'total_protein', label: 'Protein', kcalPerGram: 4, color: 'var(--color-protein)' },
  { key: 'total_carbs', label: 'Carbs', kcalPerGram: 4, color: 'var(--color-carbs)' },
  { key: 'total_fat', label: 'Fat', kcalPerGram: 9, color: 'var(--color-fat)' },
] as const;

function initAnalyzer(): void {
  const dropzone = $<HTMLLabelElement>('#dropzone');
  const frame = $('#dropzone-frame');
  const title = $('#dropzone-title');
  const input = $<HTMLInputElement>('#dropzone-input');
  const errorLine = $('#dropzone-error');
  const aside = $('#dropzone-aside');
  const sampleBtn = $('#sample-scan');

  const panel = $('#analyzer-panel');
  const preview = $<HTMLImageElement>('#analyzer-preview');
  const scrim = $('#analyzer-scrim');
  const sweep = $('#analyzer-sweep');
  const resetBtn = $('#analyzer-reset');

  const loadingBox = $('#analyzer-loading');
  const errorBox = $('#analyzer-error');
  const errorMessage = $('#analyzer-error-message');
  const retryBtn = $('#analyzer-retry');
  const resultBox = $('#analyzer-result');
  const resultMeal = $('#result-meal');
  const resultMacros = $('#result-macros');
  const resultItems = $('#result-items');
  const resultFooter = $('#result-footer');

  if (!dropzone || !frame || !title || !input || !errorLine || !panel || !preview) return;
  if (!scrim || !sweep || !resetBtn || !loadingBox || !errorBox || !errorMessage) return;
  if (!retryBtn || !resultBox || !resultMeal || !resultMacros || !resultItems || !resultFooter) return;

  let objectUrl: string | null = null;
  let currentFile: File | null = null;

  const setDragOver = (over: boolean): void => {
    dropzone.classList.toggle('scale-[0.985]', over);
    dropzone.classList.toggle('bg-white', over);
    frame.classList.toggle('inset-3', over);
    frame.classList.toggle('border-ink', over);
    frame.classList.toggle('inset-6', !over);
    frame.classList.toggle('group-hover:inset-4', !over);
    frame.classList.toggle('group-hover:border-ink/30', !over);
    title.textContent = over ? 'Release the photo' : 'Drag your photo here';
  };

  const showIdle = (message?: string): void => {
    dropzone.hidden = false;
    panel.hidden = true;
    if (aside) aside.hidden = false;
    errorLine.hidden = !message;
    if (message) errorLine.textContent = message;
  };

  const showPanel = (state: 'loading' | 'error' | 'result'): void => {
    dropzone.hidden = true;
    errorLine.hidden = true;
    if (aside) aside.hidden = true;
    panel.hidden = false;
    scrim.hidden = state !== 'loading';
    sweep.hidden = state !== 'loading';
    preview.classList.toggle('scale-105', state === 'loading');
    loadingBox.hidden = state !== 'loading';
    errorBox.hidden = state !== 'error';
    resultBox.hidden = state !== 'result';
    resultFooter.hidden = state !== 'result';
    if (state !== 'result') resultItems.innerHTML = '';
  };

  const renderResult = (analysis: MealAnalysis): void => {
    resultMeal.textContent = analysis.meal_name;

    const macroKcal = MACROS.map((m) => (analysis[m.key] ?? 0) * m.kcalPerGram);
    const macroTotal = macroKcal.reduce((a, b) => a + b, 0) || 1;

    resultMacros.innerHTML = MACROS.map((macro, i) => {
      const grams = analysis[macro.key] ?? 0;
      const share = (macroKcal[i] / macroTotal) * 100;
      return `
        <div>
          <div class="flex items-baseline justify-between">
            <dt class="text-sm text-ink/50">${macro.label}</dt>
            <dd class="text-base font-medium tabular-nums text-ink">${grams}<span class="text-ink/40">g</span></dd>
          </div>
          <div class="mt-2 h-px w-full bg-ink/10">
            <div data-macro-bar class="h-[2px] -translate-y-[0.5px] origin-left" style="width: ${share}%; background: ${macro.color}"></div>
          </div>
        </div>`;
    }).join('');

    resultItems.innerHTML = analysis.items
      .map(
        (item, i) => `
        <li class="rule last:border-b last:border-b-ink/12">
          <div class="grid gap-2 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-8">
            <span class="index-label" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
            <div>
              <p class="text-lg font-medium tracking-tight text-ink">${item.name}</p>
              <p class="mt-1 text-sm text-ink/45">${item.portion} · ${item.protein}g protein · ${item.carbs}g carbs · ${item.fat}g fat</p>
            </div>
            <p class="text-lg font-medium tabular-nums tracking-tight text-ink">${item.calories}<span class="text-ink/40"> kcal</span></p>
          </div>
        </li>`,
      )
      .join('');

    showPanel('result');

    if (reducedMotion()) {
      const counter = document.querySelector<HTMLElement>('[data-verdict-count]');
      if (counter) counter.textContent = String(analysis.total_calories);
      return;
    }

    // The total counts up and every bar draws in from the left.
    requestAnimationFrame(() => {
      const counter = document.querySelector<HTMLElement>('[data-verdict-count]');
      const bar = document.querySelector<HTMLElement>('[data-verdict-bar]');

      if (counter) {
        const state = { value: 0 };
        gsap.to(state, {
          value: analysis.total_calories,
          duration: 1.6,
          ease: 'power3.out',
          onUpdate: () => (counter.textContent = Math.round(state.value).toLocaleString('en-US')),
        });
      }
      if (bar) gsap.from(bar, { scaleX: 0, duration: 1.6, ease: 'power3.out' });
      gsap.from('[data-macro-bar]', { scaleX: 0, duration: 1.4, ease: 'power3.out', stagger: 0.08 });
      gsap.from(resultItems.children, {
        y: 18,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.05,
        delay: 0.2,
      });
      ScrollTrigger.refresh();
    });
  };

  const run = async (file: File): Promise<void> => {
    currentFile = file;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;

    showPanel('loading');

    try {
      const analysis = await analyzeMeal(file);
      analysis.image_url = objectUrl ?? '';
      renderResult(analysis);
    } catch (e) {
      errorMessage.textContent = e instanceof Error ? e.message : 'Unknown error';
      showPanel('error');
    }
  };

  const handleFile = (file: File | undefined | null): void => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showIdle('Unsupported format. Use a JPEG, PNG or WebP image.');
      return;
    }
    void run(file);
  };

  input.addEventListener('change', () => handleFile(input.files?.[0]));

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDragOver(true);
  });
  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    setDragOver(false);
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer?.files?.[0]);
  });

  resetBtn.addEventListener('click', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    currentFile = null;
    input.value = '';
    showIdle();
    ScrollTrigger.refresh();
  });

  retryBtn.addEventListener('click', () => {
    if (currentFile) void run(currentFile);
    else showIdle();
  });

  // A pre-computed breakdown, for readers who don't have a plate on hand.
  sampleBtn?.addEventListener('click', () => {
    currentFile = null;
    preview.src = SAMPLE_MEAL.image_url;
    renderResult(SAMPLE_MEAL);
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
initAnalyzer();
initWaitlist();
initMotionAttributes();

// Late layout shifts (web fonts, images) invalidate the trigger positions.
setTimeout(() => ScrollTrigger.refresh(), 500);
