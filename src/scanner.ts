import './style.css'
import './scanner.css'

// ============================================================
// Types
// ============================================================

interface FoodItem {
  name: string;
  category: 'protein' | 'carbs' | 'fat' | 'veggie' | 'fruit' | 'other';
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealAnalysis {
  id: string;
  meal_name: string;
  timestamp: string;
  date_group: 'Today' | 'Yesterday' | 'Previous 7 Days';
  image_url: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  items: FoodItem[];
}

type ScannerState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error';

// ============================================================
// Theme Management
// ============================================================

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  
  const storedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
  setTheme(initialTheme);

  toggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

function setTheme(theme: string) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);
}

initTheme();

// ============================================================
// DOM Elements
// ============================================================

const sidebarToggle = document.getElementById('sidebar-toggle')!;
const sidebar = document.getElementById('scanner-sidebar')!;
const btnSidebarNewScan = document.getElementById('btn-new-scan')!;
const sidebarHistoryContainer = document.getElementById('sidebar-history')!;

const uploadZone = document.getElementById('upload-zone')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const cameraInput = document.getElementById('camera-input') as HTMLInputElement;
const btnUpload = document.getElementById('btn-upload')!;
const btnCamera = document.getElementById('btn-camera')!;

const previewSection = document.getElementById('preview-section')!;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const btnAnalyze = document.getElementById('btn-analyze')!;
const btnChange = document.getElementById('btn-change')!;

const analyzingSection = document.getElementById('analyzing-section')!;

const resultsSection = document.getElementById('results-section')!;
const resultPhotoImg = document.getElementById('result-photo-img') as HTMLImageElement;
const resultsMealName = document.getElementById('results-meal-name')!;
const totalCaloriesEl = document.getElementById('total-calories')!;
const macroProteinEl = document.getElementById('macro-protein')!;
const macroCarbsEl = document.getElementById('macro-carbs')!;
const macroFatEl = document.getElementById('macro-fat')!;
const donutChart = document.getElementById('donut-chart')!;
const foodItemsList = document.getElementById('food-items-list')!;
const btnScanAgain = document.getElementById('btn-scan-again')!;

const errorSection = document.getElementById('error-section')!;
const errorMessage = document.getElementById('error-message')!;
const btnRetry = document.getElementById('btn-retry')!;

// ============================================================
// State & History Memory
// ============================================================

let _currentState: ScannerState = 'idle';
let selectedFile: File | null = null;
let selectedImageUrl: string = '';
let activeHistoryId: string | null = null;

// Initial Pre-populated History (Frontend demo state)
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
    ]
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
    ]
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
    ]
  }
];

// ============================================================
// Sidebar Management
// ============================================================

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

btnSidebarNewScan.addEventListener('click', () => {
  resetScanner();
});

function renderHistorySidebar() {
  sidebarHistoryContainer.innerHTML = '';

  if (scanHistory.length === 0) {
    sidebarHistoryContainer.innerHTML = `
      <div class="history-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8v4l3 3"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        <p>No past scans yet</p>
      </div>
    `;
    return;
  }

  // Group items by date_group
  const groups: Record<string, MealAnalysis[]> = {};
  scanHistory.forEach(item => {
    if (!groups[item.date_group]) groups[item.date_group] = [];
    groups[item.date_group].push(item);
  });

  Object.entries(groups).forEach(([groupName, items]) => {
    const groupHeader = document.createElement('div');
    groupHeader.className = 'history-group-title';
    groupHeader.textContent = groupName;
    sidebarHistoryContainer.appendChild(groupHeader);

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = `history-item ${item.id === activeHistoryId ? 'active' : ''}`;
      el.innerHTML = `
        <img class="history-thumb" src="${item.image_url}" alt="${item.meal_name}" onerror="this.src='/hero-mockup.jpg'" />
        <div class="history-info">
          <div class="history-title">${item.meal_name}</div>
          <div class="history-meta">
            <span>${item.timestamp}</span>
            <span>•</span>
            <span class="history-calories">${item.total_calories} cal</span>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        loadHistoryItem(item);
      });

      sidebarHistoryContainer.appendChild(el);
    });
  });
}

function loadHistoryItem(item: MealAnalysis) {
  activeHistoryId = item.id;
  selectedImageUrl = item.image_url;
  renderHistorySidebar();
  displayResults(item);
}

// ============================================================
// State Management
// ============================================================

function setState(newState: ScannerState) {
  _currentState = newState;

  uploadZone.style.display = 'none';
  previewSection.classList.remove('active');
  analyzingSection.classList.remove('active');
  resultsSection.classList.remove('active');
  errorSection.classList.remove('active');

  switch (newState) {
    case 'idle':
      uploadZone.style.display = '';
      break;
    case 'preview':
      previewSection.classList.add('active');
      break;
    case 'analyzing':
      analyzingSection.classList.add('active');
      break;
    case 'results':
      resultsSection.classList.add('active');
      break;
    case 'error':
      errorSection.classList.add('active');
      break;
  }
}

// ============================================================
// File Handling
// ============================================================

function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    showError('Please upload an image file (JPG, PNG, etc.).');
    return;
  }

  selectedFile = file;
  activeHistoryId = null;

  if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(selectedImageUrl);
  }

  selectedImageUrl = URL.createObjectURL(file);
  previewImage.src = selectedImageUrl;
  setState('preview');
}

btnUpload.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

btnCamera.addEventListener('click', (e) => {
  e.stopPropagation();
  cameraInput.click();
});

uploadZone.addEventListener('click', () => {
  fileInput.click();
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

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
});

btnAnalyze.addEventListener('click', () => {
  if (selectedFile) {
    analyzeMeal(selectedFile);
  }
});

btnChange.addEventListener('click', () => {
  setState('idle');
});

btnScanAgain.addEventListener('click', () => {
  resetScanner();
});

btnRetry.addEventListener('click', () => {
  if (selectedFile) {
    analyzeMeal(selectedFile);
  } else {
    resetScanner();
  }
});

function resetScanner() {
  selectedFile = null;
  activeHistoryId = null;
  if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(selectedImageUrl);
    selectedImageUrl = '';
  }
  foodItemsList.innerHTML = '';
  renderHistorySidebar();
  setState('idle');
}

// ============================================================
// AI Analysis
// ============================================================

async function analyzeMeal(file: File) {
  setState('analyzing');

  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    let analysis: MealAnalysis;

    if (apiKey) {
      analysis = await analyzeWithGemini(file, apiKey);
    } else {
      analysis = await analyzeWithMock();
    }

    // Assign image URL & push to history
    analysis.image_url = selectedImageUrl;
    analysis.id = 'scan-' + Date.now();
    analysis.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    analysis.date_group = 'Today';

    scanHistory.unshift(analysis);
    activeHistoryId = analysis.id;
    renderHistorySidebar();

    displayResults(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    showError(message);
  }
}

async function analyzeWithGemini(file: File, apiKey: string): Promise<MealAnalysis> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const prompt = `You are a professional nutrition analysis AI. Analyze this food photo and return a JSON object with the following structure. Be as accurate as possible with portions and nutritional values.

Return ONLY valid JSON, no markdown codeblocks, no extra text:
{
  "meal_name": "Brief professional name for the overall meal",
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "items": [
    {
      "name": "Food item name",
      "category": "protein" | "carbs" | "fat" | "veggie" | "fruit" | "other",
      "portion": "estimated portion size",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `API request failed (${response.status})`
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from AI. Try a clearer photo.');
  }

  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);

  return {
    id: '',
    timestamp: '',
    date_group: 'Today',
    image_url: '',
    ...parsed
  };
}

async function analyzeWithMock(): Promise<MealAnalysis> {
  await new Promise(resolve => setTimeout(resolve, 1800 + Math.random() * 800));

  const mockMeals: MealAnalysis[] = [
    {
      id: '',
      timestamp: '',
      date_group: 'Today',
      image_url: '',
      meal_name: "Mediterranean Chicken Bowl",
      total_calories: 628,
      total_protein: 34,
      total_carbs: 52,
      total_fat: 28,
      items: [
        { name: "Grilled Chicken Breast", category: "protein", portion: "150g", calories: 248, protein: 26, carbs: 0, fat: 14 },
        { name: "Steamed Quinoa", category: "carbs", portion: "1 cup", calories: 222, protein: 8, carbs: 39, fat: 4 },
        { name: "Organic Mixed Greens", category: "veggie", portion: "2 cups", calories: 18, protein: 0, carbs: 3, fat: 0 },
        { name: "Extra Virgin Olive Oil", category: "fat", portion: "1 tbsp", calories: 120, protein: 0, carbs: 0, fat: 14 },
        { name: "Fresh Cherry Tomatoes", category: "veggie", portion: "6 pieces", calories: 20, protein: 0, carbs: 10, fat: 0 },
      ]
    },
    {
      id: '',
      timestamp: '',
      date_group: 'Today',
      image_url: '',
      meal_name: "Avocado & Egg Breakfast",
      total_calories: 485,
      total_protein: 28,
      total_carbs: 42,
      total_fat: 22,
      items: [
        { name: "Poached Eggs", category: "protein", portion: "2 large", calories: 182, protein: 12, carbs: 2, fat: 14 },
        { name: "Artisan Whole Wheat Toast", category: "carbs", portion: "2 slices", calories: 160, protein: 8, carbs: 28, fat: 2 },
        { name: "Sliced Hass Avocado", category: "fat", portion: "½ medium", calories: 120, protein: 2, carbs: 6, fat: 10 },
        { name: "Fresh Squeezed Juice", category: "fruit", portion: "200ml", calories: 88, protein: 2, carbs: 20, fat: 0 },
      ]
    },
    {
      id: '',
      timestamp: '',
      date_group: 'Today',
      image_url: '',
      meal_name: "Wild Salmon & Broccoli",
      total_calories: 520,
      total_protein: 42,
      total_carbs: 24,
      total_fat: 28,
      items: [
        { name: "Pan-Seared Wild Salmon", category: "protein", portion: "180g fillet", calories: 354, protein: 38, carbs: 0, fat: 22 },
        { name: "Steamed Organic Broccoli", category: "veggie", portion: "1 cup", calories: 55, protein: 4, carbs: 10, fat: 0 },
        { name: "Whole Grain Brown Rice", category: "carbs", portion: "½ cup", calories: 108, protein: 2, carbs: 22, fat: 1 },
      ]
    }
  ];

  return mockMeals[Math.floor(Math.random() * mockMeals.length)];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================
// Display Results & SVG Category Icons
// ============================================================

function getCategoryIconSvg(category: string): string {
  switch (category) {
    case 'protein':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    case 'carbs':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M5 20v-8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8M12 4v5"></path></svg>`;
    case 'fat':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`;
    case 'veggie':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.5 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>`;
    case 'fruit':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 5V2M12 5c2 0 4-1 4-3"></path></svg>`;
    default:
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4M12 16h.01"></path></svg>`;
  }
}

function displayResults(analysis: MealAnalysis) {
  resultPhotoImg.src = analysis.image_url || selectedImageUrl || '/hero-mockup.jpg';
  resultsMealName.textContent = analysis.meal_name;

  animateCounter(totalCaloriesEl, analysis.total_calories, 1000);

  setTimeout(() => {
    animateCounter(macroProteinEl, analysis.total_protein, 800, 'g');
    animateCounter(macroCarbsEl, analysis.total_carbs, 800, 'g');
    animateCounter(macroFatEl, analysis.total_fat, 800, 'g');
  }, 200);

  setTimeout(() => {
    animateDonut(analysis.total_protein, analysis.total_carbs, analysis.total_fat);
  }, 300);

  foodItemsList.innerHTML = '';
  analysis.items.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'food-item';
    el.innerHTML = `
      <div class="food-item-info">
        <div class="food-item-emoji">${getCategoryIconSvg(item.category || 'other')}</div>
        <div>
          <div class="food-item-name">${item.name}</div>
          <div class="food-item-portion">${item.portion}</div>
        </div>
      </div>
      <div class="food-item-calories">${item.calories} cal</div>
    `;
    foodItemsList.appendChild(el);
  });

  setState('results');
}

// ============================================================
// Animations
// ============================================================

function animateCounter(
  element: HTMLElement,
  target: number,
  duration: number,
  suffix: string = ''
) {
  const start = performance.now();

  function update(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);

    element.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function animateDonut(protein: number, carbs: number, fat: number) {
  const total = protein + carbs + fat;
  if (total === 0) return;

  const proteinDeg = (protein / total) * 360;
  const carbsDeg = (carbs / total) * 360;
  const fatDeg = (fat / total) * 360;

  const proteinEnd = proteinDeg;
  const carbsEnd = proteinEnd + carbsDeg;
  const fatEnd = carbsEnd + fatDeg;

  donutChart.style.background = `conic-gradient(
    #28cd41 0deg ${proteinEnd}deg,
    #0071e3 ${proteinEnd}deg ${carbsEnd}deg,
    #ff9500 ${carbsEnd}deg ${fatEnd}deg,
    var(--border-color) ${fatEnd}deg 360deg
  )`;
  donutChart.style.borderRadius = '50%';

  const duration = 1200;
  const start = performance.now();

  function updateDonut(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentProtein = proteinEnd * eased;
    const currentCarbs = proteinEnd + carbsDeg * eased;
    const currentFat = currentCarbs + fatDeg * eased;

    donutChart.style.background = `conic-gradient(
      #28cd41 0deg ${currentProtein}deg,
      #0071e3 ${currentProtein}deg ${currentCarbs}deg,
      #ff9500 ${currentCarbs}deg ${currentFat}deg,
      var(--border-color) ${currentFat}deg 360deg
    )`;

    if (progress < 1) {
      requestAnimationFrame(updateDonut);
    }
  }

  requestAnimationFrame(updateDonut);
}

// ============================================================
// Error
// ============================================================

function showError(message: string) {
  errorMessage.textContent = message;
  setState('error');
}

// ============================================================
// Init
// ============================================================

renderHistorySidebar();
setState('idle');
console.log('[CalorieLens Scanner] Ready — state:', _currentState);
