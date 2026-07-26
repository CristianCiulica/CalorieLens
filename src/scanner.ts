import './style.css';
import { gsap } from './core/gsap';
import { reducedMotion } from './core/motion';
import { initMagnetic } from './core/motion-attrs';
import { analyzeMeal, type MealAnalysis } from './core/analyze';
import { GOALS, MACROS, itemRowsHtml, macroRowsHtml } from './core/nutrition';

type ScannerState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// ============================================================
// DOM
// ============================================================

const sidebarToggle = $('sidebar-toggle');
const sidebar = $('scanner-sidebar');
const historyList = $('sidebar-history');

const workspaceIndex = $('workspace-index');
const workspaceStep = $('workspace-step');

const uploadZone = $('upload-zone');
const dropzone = $<HTMLLabelElement>('dropzone');
const dropzoneFrame = $('dropzone-frame');
const dropzoneTitle = $('dropzone-title');
const fileInput = $<HTMLInputElement>('file-input');
const cameraInput = $<HTMLInputElement>('camera-input');
const uploadError = $('upload-error');

const previewSection = $('preview-section');
const previewImage = $<HTMLImageElement>('preview-image');

const analyzingSection = $('analyzing-section');
const analyzingImage = $<HTMLImageElement>('analyzing-image');
const analyzingStage = $('analyzing-stage');
const analyzingSteps = $('analyzing-steps');

const resultsSection = $('results-section');
const resultPhoto = $<HTMLImageElement>('result-photo-img');
const resultsMealName = $('results-meal-name');
const totalCalories = $('total-calories');
const totalBar = $('total-bar');
const resultMacros = $('result-macros');
const resultDayNote = $('result-day-note');
const resultItemCount = $('result-item-count');
const foodItemsList = $('food-items-list');

const errorSection = $('error-section');
const errorMessage = $('error-message');

const dayDate = $('day-date');
const dayRemaining = $('day-remaining');
const dayRemainingLabel = $('day-remaining-label');
const dayBar = $('day-bar');
const dayEaten = $('day-eaten');
const dayMacros = $('day-macros');
const dayGoalNote = $('day-goal-note');
const dayLog = $('day-log');
const stripRemaining = $('strip-remaining');
const stripLabel = $('strip-label');
const stripEaten = $('strip-eaten');

const STEP_LABELS: Record<ScannerState, [string, string]> = {
  idle: ['01', 'Upload'],
  preview: ['02', 'Confirm'],
  analyzing: ['03', 'Analyzing'],
  results: ['04', 'Breakdown'],
  error: ['—', 'Error'],
};

// ============================================================
// State
// ============================================================

let selectedFile: File | null = null;
let selectedImageUrl = '';
let activeHistoryId: string | null = null;
let goalKey = localStorage.getItem('calorielens-goal') ?? 'maintain';
if (!GOALS[goalKey]) goalKey = 'maintain';

const scanHistory: MealAnalysis[] = [
  {
    id: 'scan-1',
    meal_name: 'Mediterranean Chicken Bowl',
    timestamp: '12:45 PM',
    date_group: 'Today',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
    total_calories: 628,
    total_protein: 34,
    total_carbs: 52,
    total_fat: 28,
    items: [
      { name: 'Grilled Chicken Breast', category: 'protein', portion: '150g', calories: 248, protein: 26, carbs: 0, fat: 14 },
      { name: 'Steamed Quinoa', category: 'carbs', portion: '1 cup', calories: 222, protein: 8, carbs: 39, fat: 4 },
      { name: 'Organic Mixed Greens', category: 'veggie', portion: '2 cups', calories: 18, protein: 0, carbs: 3, fat: 0 },
      { name: 'Extra Virgin Olive Oil', category: 'fat', portion: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14 },
      { name: 'Fresh Cherry Tomatoes', category: 'veggie', portion: '6 pieces', calories: 20, protein: 0, carbs: 10, fat: 0 },
    ],
  },
  {
    id: 'scan-2',
    meal_name: 'Avocado & Poached Eggs Toast',
    timestamp: '8:30 AM',
    date_group: 'Today',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&q=80',
    total_calories: 485,
    total_protein: 28,
    total_carbs: 42,
    total_fat: 22,
    items: [
      { name: 'Poached Eggs', category: 'protein', portion: '2 large', calories: 182, protein: 12, carbs: 2, fat: 14 },
      { name: 'Artisan Whole Wheat Toast', category: 'carbs', portion: '2 slices', calories: 160, protein: 8, carbs: 28, fat: 2 },
      { name: 'Sliced Hass Avocado', category: 'fat', portion: '½ medium', calories: 120, protein: 2, carbs: 6, fat: 10 },
      { name: 'Fresh Squeezed Juice', category: 'fruit', portion: '200ml', calories: 88, protein: 2, carbs: 20, fat: 0 },
    ],
  },
  {
    id: 'scan-3',
    meal_name: 'Wild Salmon & Roasted Broccoli',
    timestamp: 'Yesterday',
    date_group: 'Yesterday',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&q=80',
    total_calories: 520,
    total_protein: 42,
    total_carbs: 24,
    total_fat: 28,
    items: [
      { name: 'Pan-Seared Wild Salmon', category: 'protein', portion: '180g fillet', calories: 354, protein: 38, carbs: 0, fat: 22 },
      { name: 'Steamed Organic Broccoli', category: 'veggie', portion: '1 cup', calories: 55, protein: 4, carbs: 10, fat: 0 },
      { name: 'Whole Grain Brown Rice', category: 'carbs', portion: '½ cup', calories: 108, protein: 2, carbs: 22, fat: 1 },
    ],
  },
];

// ============================================================
// Sidebar — open in the flow on wide screens, off-canvas below lg.
// ============================================================

const wideScreen = window.matchMedia('(min-width: 1024px)');
let sidebarOpen = wideScreen.matches;

function paintSidebar(): void {
  sidebar.classList.toggle('is-closed', !sidebarOpen);
  sidebarToggle.setAttribute('aria-expanded', String(sidebarOpen));
}

wideScreen.addEventListener('change', (e) => {
  sidebarOpen = e.matches;
  paintSidebar();
});
sidebarToggle.addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  paintSidebar();
});
paintSidebar();

function renderHistory(): void {
  if (!scanHistory.length) {
    historyList.innerHTML = `
      <p class="index-label pt-6">No scans yet</p>
      <p class="mt-3 text-sm leading-relaxed text-ink/40">
        Every meal you scan lands here, grouped by day.
      </p>`;
    return;
  }

  const groups = new Map<string, MealAnalysis[]>();
  scanHistory.forEach((item) => {
    const list = groups.get(item.date_group) ?? [];
    list.push(item);
    groups.set(item.date_group, list);
  });

  historyList.innerHTML = [...groups.entries()]
    .map(
      ([group, items]) => `
      <div class="pt-8 first:pt-2">
        <p class="index-label">${group}</p>
        <ul class="mt-3">
          ${items
            .map(
              (item) => `
            <li class="rule last:border-b last:border-b-ink/12">
              <button
                type="button"
                data-history-id="${item.id}"
                class="group flex w-full items-center gap-4 py-4 text-left transition-opacity ${
                  item.id === activeHistoryId ? '' : 'opacity-60 hover:opacity-100'
                }"
              >
                <img
                  src="${item.image_url}"
                  alt=""
                  class="h-11 w-11 shrink-0 rounded-xl object-cover"
                  onerror="this.style.visibility='hidden'"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium tracking-tight text-ink transition-transform duration-500 group-hover:translate-x-1">${item.meal_name}</span>
                  <span class="mt-0.5 block text-xs tabular-nums text-ink/45">${item.timestamp} · ${item.total_calories} kcal</span>
                </span>
              </button>
            </li>`,
            )
            .join('')}
        </ul>
      </div>`,
    )
    .join('');

  historyList.querySelectorAll<HTMLButtonElement>('[data-history-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = scanHistory.find((m) => m.id === btn.dataset.historyId);
      if (!item) return;
      activeHistoryId = item.id;
      selectedImageUrl = item.image_url;
      renderHistory();
      displayResults(item);
    });
  });
}

// ============================================================
// Today rail — the running total is what turns a scanner into a tracker.
// ============================================================

function todayMeals(): MealAnalysis[] {
  return scanHistory.filter((m) => m.date_group === 'Today');
}

function renderDay(): void {
  const goal = GOALS[goalKey];
  const meals = todayMeals();

  const eaten = meals.reduce((a, m) => a + m.total_calories, 0);
  const remaining = goal.calories - eaten;
  const over = remaining < 0;

  dayDate.textContent = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });

  dayRemaining.textContent = Math.abs(remaining).toLocaleString('en-US');
  dayRemaining.style.color = over ? 'var(--color-fat)' : 'var(--color-ink)';
  dayRemainingLabel.textContent = over ? 'kcal over target' : 'kcal left today';
  dayEaten.textContent = `${eaten.toLocaleString('en-US')} of ${goal.calories.toLocaleString('en-US')} kcal`;

  dayBar.style.width = `${Math.min(100, (eaten / goal.calories) * 100)}%`;
  dayBar.style.background = over ? 'var(--color-fat)' : 'rgba(242, 239, 234, 0.75)';

  stripRemaining.textContent = Math.abs(remaining).toLocaleString('en-US');
  stripRemaining.style.color = over ? 'var(--color-fat)' : 'var(--color-ink)';
  stripLabel.textContent = over ? ' kcal over' : ' kcal left';
  stripEaten.textContent = ` · ${eaten.toLocaleString('en-US')} of ${goal.calories.toLocaleString('en-US')}`;

  // Macro progress against the goal, same hairline language as the readout.
  dayMacros.innerHTML = MACROS.map((macro) => {
    const key = macro.key.replace('total_', '') as 'protein' | 'carbs' | 'fat';
    const consumed = meals.reduce((a, m) => a + (m[macro.key] ?? 0), 0);
    const target = goal[key];
    const pct = Math.min(100, (consumed / target) * 100);
    return `
      <div>
        <div class="flex items-baseline justify-between">
          <dt class="text-sm text-ink/50">${macro.label}</dt>
          <dd class="text-sm font-medium tabular-nums text-ink">${consumed}<span class="text-ink/40">/${target}g</span></dd>
        </div>
        <div class="mt-2 h-px w-full bg-ink/10">
          <div class="h-[2px] -translate-y-[0.5px] origin-left transition-[width] duration-700 ease-out" style="width: ${pct}%; background: ${macro.color}"></div>
        </div>
      </div>`;
  }).join('');

  dayGoalNote.textContent = goal.note;

  dayLog.innerHTML = meals.length
    ? meals
        .map(
          (m) => `
        <li class="rule last:border-b last:border-b-ink/12">
          <div class="flex items-baseline justify-between gap-4 py-3">
            <span class="min-w-0 truncate text-sm text-ink/70">${m.meal_name}</span>
            <span class="shrink-0 text-sm tabular-nums text-ink/45">${m.total_calories}</span>
          </div>
        </li>`,
        )
        .join('')
    : '<li class="py-3 text-sm text-ink/40">Nothing logged yet.</li>';
}

function paintGoalButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-goal]').forEach((btn) => {
    const on = btn.dataset.goal === goalKey;
    btn.classList.toggle('btn-line', !on);
    btn.classList.toggle('btn-pill', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-goal]').forEach((btn) =>
  btn.addEventListener('click', () => {
    if (!btn.dataset.goal) return;
    goalKey = btn.dataset.goal;
    localStorage.setItem('calorielens-goal', goalKey);
    paintGoalButtons();
    renderDay();
  }),
);

// ============================================================
// State machine
// ============================================================

function setState(next: ScannerState): void {
  uploadZone.hidden = next !== 'idle';
  previewSection.hidden = next !== 'preview';
  analyzingSection.hidden = next !== 'analyzing';
  resultsSection.hidden = next !== 'results';
  errorSection.hidden = next !== 'error';

  [workspaceIndex.textContent, workspaceStep.textContent] = STEP_LABELS[next];
  if (next === 'idle') uploadError.hidden = true;
  document.querySelector('main')?.scrollTo({ top: 0 });
}

// ============================================================
// File handling — the dropzone frame tightens on drag-over.
// ============================================================

function setDragOver(over: boolean): void {
  dropzone.classList.toggle('scale-[0.985]', over);
  dropzone.classList.toggle('bg-elev-6', over);
  dropzoneFrame.classList.toggle('inset-3', over);
  dropzoneFrame.classList.toggle('border-ink', over);
  dropzoneFrame.classList.toggle('inset-6', !over);
  dropzoneFrame.classList.toggle('group-hover:inset-4', !over);
  dropzoneFrame.classList.toggle('group-hover:border-ink/30', !over);
  dropzoneTitle.textContent = over ? 'Release the photo' : 'Drag your food photo here';
}

function handleFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    uploadError.textContent = 'Unsupported format. Use a JPEG, PNG or WebP image.';
    uploadError.hidden = false;
    return;
  }

  selectedFile = file;
  activeHistoryId = null;

  if (selectedImageUrl.startsWith('blob:')) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = URL.createObjectURL(file);
  previewImage.src = selectedImageUrl;
  analyzingImage.src = selectedImageUrl;

  setState('preview');
  if (!reducedMotion()) {
    gsap.from(previewSection, { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out' });
  }
}

$('btn-camera').addEventListener('click', () => cameraInput.click());
$('btn-new-scan').addEventListener('click', () => resetScanner());
$('btn-new-scan-rail').addEventListener('click', () => resetScanner());
$('btn-change').addEventListener('click', () => setState('idle'));
$('btn-scan-again').addEventListener('click', () => resetScanner());
$('btn-error-new').addEventListener('click', () => resetScanner());
$('btn-analyze').addEventListener('click', () => selectedFile && void runAnalysis(selectedFile));
$('btn-retry').addEventListener('click', () => {
  if (selectedFile) void runAnalysis(selectedFile);
  else resetScanner();
});

// Undo: drop the scan just logged back out of today.
$('btn-discard').addEventListener('click', () => {
  const index = scanHistory.findIndex((m) => m.id === activeHistoryId);
  if (index >= 0) scanHistory.splice(index, 1);
  resetScanner();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
  fileInput.value = '';
});

cameraInput.addEventListener('change', () => {
  const file = cameraInput.files?.[0];
  if (file) handleFile(file);
  cameraInput.value = '';
});

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
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
});

function resetScanner(): void {
  selectedFile = null;
  activeHistoryId = null;
  if (selectedImageUrl.startsWith('blob:')) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = '';
  foodItemsList.innerHTML = '';
  renderHistory();
  renderDay();
  setState('idle');
}

// ============================================================
// Analysis
// ============================================================

const STAGES = ['Finding the plate.', 'Sizing each portion.', 'Totalling the macros.'];

/** Walks the three stage labels while the request is in flight. */
function runStages(): () => void {
  const steps = [...analyzingSteps.children] as HTMLElement[];
  let i = 0;

  const advance = (): void => {
    analyzingStage.textContent = STAGES[i];
    steps.forEach((step, n) => {
      step.classList.toggle('text-ink/30', n > i);
      step.classList.toggle('text-ink', n === i);
      step.classList.toggle('text-ink/55', n < i);
    });
    i = Math.min(i + 1, STAGES.length - 1);
  };

  advance();
  const timer = window.setInterval(advance, 900);
  return () => window.clearInterval(timer);
}

async function runAnalysis(file: File): Promise<void> {
  setState('analyzing');
  const stopStages = runStages();

  try {
    const analysis = await analyzeMeal(file);
    analysis.image_url = selectedImageUrl;
    analysis.id = 'scan-' + Date.now();
    analysis.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    analysis.date_group = 'Today';

    scanHistory.unshift(analysis);
    activeHistoryId = analysis.id;
    renderHistory();
    displayResults(analysis);
  } catch (err) {
    errorMessage.textContent =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    setState('error');
  } finally {
    stopStages();
  }
}

// ============================================================
// Results — the total counts up, every bar draws in from the left.
// ============================================================

/** Staggers freshly injected rows in; the end state needs no animation. */
function revealRows(list: HTMLElement): void {
  const rows = [...list.children] as HTMLElement[];
  rows.forEach((row, i) => {
    row.classList.add('row-enter');
    row.style.transitionDelay = `${0.2 + i * 0.05}s`;
  });

  requestAnimationFrame(() => {
    rows.forEach((row) => {
      row.classList.add('row-enter-active');
      row.classList.remove('row-enter');
    });
  });
}

function displayResults(analysis: MealAnalysis): void {
  resultPhoto.src = analysis.image_url || selectedImageUrl;
  resultsMealName.textContent = analysis.meal_name;
  resultMacros.innerHTML = macroRowsHtml(analysis);
  foodItemsList.innerHTML = itemRowsHtml(analysis);
  resultItemCount.textContent = `${analysis.items.length} item${analysis.items.length === 1 ? '' : 's'}`;

  // Tie the meal back to the day it just landed in.
  const goal = GOALS[goalKey];
  const eaten = todayMeals().reduce((a, m) => a + m.total_calories, 0);
  const left = goal.calories - eaten;
  resultDayNote.textContent =
    left >= 0
      ? `Logged to today. ${left.toLocaleString('en-US')} kcal left against your ${goal.label.toLowerCase()} target.`
      : `Logged to today. That puts you ${Math.abs(left).toLocaleString('en-US')} kcal over your ${goal.label.toLowerCase()} target.`;

  setState('results');
  renderDay();
  initMagnetic();

  if (reducedMotion()) {
    totalCalories.textContent = analysis.total_calories.toLocaleString('en-US');
    return;
  }

  requestAnimationFrame(() => {
    const state = { value: 0 };
    gsap.to(state, {
      value: analysis.total_calories,
      duration: 1.6,
      ease: 'power3.out',
      onUpdate: () =>
        (totalCalories.textContent = Math.round(state.value).toLocaleString('en-US')),
    });

    gsap.from(totalBar, { scaleX: 0, duration: 1.6, ease: 'power3.out', clearProps: 'transform' });
    gsap.from('[data-macro-bar]', {
      scaleX: 0,
      duration: 1.4,
      ease: 'power3.out',
      stagger: 0.08,
      clearProps: 'transform',
    });
    revealRows(foodItemsList);
  });
}

// ============================================================
// Boot
// ============================================================

paintGoalButtons();
renderHistory();
renderDay();
setState('idle');
initMagnetic();
