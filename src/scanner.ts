import './style.css';
import { gsap } from './core/gsap';
import { reducedMotion } from './core/motion';
import { initMagnetic } from './core/motion-attrs';
import { analyzeMeal, type MealAnalysis } from './core/analyze';

type ScannerState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// ============================================================
// DOM
// ============================================================

const sidebarToggle = $('sidebar-toggle');
const sidebar = $('scanner-sidebar');
const btnNewScan = $('btn-new-scan');
const historyList = $('sidebar-history');

const uploadZone = $('upload-zone');
const dropzone = $<HTMLLabelElement>('dropzone');
const dropzoneFrame = $('dropzone-frame');
const dropzoneTitle = $('dropzone-title');
const fileInput = $<HTMLInputElement>('file-input');
const cameraInput = $<HTMLInputElement>('camera-input');
const btnCamera = $('btn-camera');
const uploadError = $('upload-error');

const previewSection = $('preview-section');
const previewImage = $<HTMLImageElement>('preview-image');
const btnAnalyze = $('btn-analyze');
const btnChange = $('btn-change');

const analyzingSection = $('analyzing-section');
const analyzingImage = $<HTMLImageElement>('analyzing-image');

const resultsSection = $('results-section');
const resultPhoto = $<HTMLImageElement>('result-photo-img');
const resultsMealName = $('results-meal-name');
const totalCalories = $('total-calories');
const totalBar = $('total-bar');
const resultMacros = $('result-macros');
const foodItemsList = $('food-items-list');
const btnScanAgain = $('btn-scan-again');

const errorSection = $('error-section');
const errorMessage = $('error-message');
const btnRetry = $('btn-retry');

// ============================================================
// State
// ============================================================

let selectedFile: File | null = null;
let selectedImageUrl = '';
let activeHistoryId: string | null = null;

const scanHistory: MealAnalysis[] = [
  {
    id: 'scan-1',
    meal_name: 'Mediterranean Chicken Bowl',
    timestamp: '12:45 PM',
    date_group: 'Today',
    image_url: '/hero-mockup.jpg',
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
// Sidebar — hairline rows, grouped by day. No boxes, no shadows.
// ============================================================

// Open by default on wide screens; off-canvas on anything narrower.
const wideScreen = window.matchMedia('(min-width: 1024px)');
let sidebarOpen = wideScreen.matches;
wideScreen.addEventListener('change', (e) => {
  sidebarOpen = e.matches;
  paintSidebar();
});

function paintSidebar(): void {
  sidebar.classList.toggle('is-closed', !sidebarOpen);
  sidebarToggle.setAttribute('aria-expanded', String(sidebarOpen));
}

sidebarToggle.addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  paintSidebar();
});

paintSidebar();

btnNewScan.addEventListener('click', () => resetScanner());

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
                  onerror="this.src='/hero-mockup.jpg'"
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
// State machine
// ============================================================

function setState(next: ScannerState): void {
  uploadZone.hidden = next !== 'idle';
  previewSection.hidden = next !== 'preview';
  analyzingSection.hidden = next !== 'analyzing';
  resultsSection.hidden = next !== 'results';
  errorSection.hidden = next !== 'error';
  if (next === 'idle') uploadError.hidden = true;
}

// ============================================================
// File handling — the dropzone frame tightens on drag-over.
// ============================================================

function setDragOver(over: boolean): void {
  dropzone.classList.toggle('scale-[0.985]', over);
  dropzone.classList.toggle('bg-white', over);
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

btnCamera.addEventListener('click', () => cameraInput.click());

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

btnAnalyze.addEventListener('click', () => selectedFile && void runAnalysis(selectedFile));
btnChange.addEventListener('click', () => setState('idle'));
btnScanAgain.addEventListener('click', () => resetScanner());
btnRetry.addEventListener('click', () => {
  if (selectedFile) void runAnalysis(selectedFile);
  else resetScanner();
});

function resetScanner(): void {
  selectedFile = null;
  activeHistoryId = null;
  if (selectedImageUrl.startsWith('blob:')) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = '';
  foodItemsList.innerHTML = '';
  renderHistory();
  setState('idle');
}

// ============================================================
// Analysis
// ============================================================

async function runAnalysis(file: File): Promise<void> {
  setState('analyzing');

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
  }
}

// ============================================================
// Results — the total counts up, every bar draws in from the left.
// ============================================================

const MACROS = [
  { key: 'total_protein', label: 'Protein', kcalPerGram: 4, color: 'var(--color-protein)' },
  { key: 'total_carbs', label: 'Carbs', kcalPerGram: 4, color: 'var(--color-carbs)' },
  { key: 'total_fat', label: 'Fat', kcalPerGram: 9, color: 'var(--color-fat)' },
] as const;

function displayResults(analysis: MealAnalysis): void {
  resultPhoto.src = analysis.image_url || selectedImageUrl || '/hero-mockup.jpg';
  resultsMealName.textContent = analysis.meal_name;

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

  foodItemsList.innerHTML = analysis.items
    .map(
      (item, i) => `
      <li class="rule group last:border-b last:border-b-ink/12">
        <div class="grid gap-2 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-8">
          <span class="index-label" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <p class="text-lg font-medium tracking-tight text-ink transition-transform duration-500 group-hover:translate-x-2">${item.name}</p>
            <p class="mt-1 text-sm text-ink/45">${item.portion} · ${item.protein}g protein · ${item.carbs}g carbs · ${item.fat}g fat</p>
          </div>
          <p class="text-lg font-medium tabular-nums tracking-tight text-ink">${item.calories}<span class="text-ink/40"> kcal</span></p>
        </div>
      </li>`,
    )
    .join('');

  setState('results');
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

    gsap.from(totalBar, { scaleX: 0, duration: 1.6, ease: 'power3.out' });
    gsap.from('[data-macro-bar]', { scaleX: 0, duration: 1.4, ease: 'power3.out', stagger: 0.08 });
    gsap.from(foodItemsList.children, {
      y: 18,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.05,
      delay: 0.2,
    });
  });
}

// ============================================================
// Boot
// ============================================================

renderHistory();
setState('idle');
initMagnetic();
