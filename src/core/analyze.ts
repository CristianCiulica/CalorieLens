/**
 * Meal analysis — the one place that talks to the vision model.
 * Shared by the landing page's inline analyzer and the full scanner.
 * Without an API key it falls back to plausible mock data so the UI
 * stays demonstrable.
 */

export type FoodCategory = 'protein' | 'carbs' | 'fat' | 'veggie' | 'fruit' | 'other';

export interface FoodItem {
  name: string;
  category: FoodCategory;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealAnalysis {
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

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const PROMPT = `You are a professional nutrition analysis AI. Analyze this food photo and return a JSON object with the following structure. Be as accurate as possible with portions and nutritional values.

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

export async function analyzeMeal(file: File): Promise<MealAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return apiKey ? analyzeWithGemini(file, apiKey) : analyzeWithMock();
}

async function analyzeWithGemini(file: File, apiKey: string): Promise<MealAnalysis> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }],
          },
        ],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || `API request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response from the model. Try a clearer photo.');
  }

  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);

  return { id: '', timestamp: '', date_group: 'Today', image_url: '', ...parsed };
}

const MOCK_MEALS: Omit<MealAnalysis, 'id' | 'timestamp' | 'date_group' | 'image_url'>[] = [
  {
    meal_name: 'Mediterranean Chicken Bowl',
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
    meal_name: 'Avocado & Egg Breakfast',
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
    meal_name: 'Wild Salmon & Broccoli',
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

/** Pre-computed breakdown for the "see a sample" path — no upload needed. */
export const SAMPLE_MEAL: MealAnalysis = {
  id: 'sample',
  timestamp: '',
  date_group: 'Today',
  image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=80',
  ...MOCK_MEALS[0],
};

async function analyzeWithMock(): Promise<MealAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 1800 + Math.random() * 800));
  const meal = MOCK_MEALS[Math.floor(Math.random() * MOCK_MEALS.length)];
  return { id: '', timestamp: '', date_group: 'Today', image_url: '', ...meal };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
