import type { MealAnalysis } from './analyze';

/**
 * The readout vocabulary shared by the landing showcase and the scanner:
 * the macro triad, the goal presets, and the two markup fragments that
 * render a breakdown. Keeping them here means both surfaces stay identical
 * without the app importing the landing page's boot script.
 */

export const MACROS = [
  { key: 'total_protein', label: 'Protein', kcalPerGram: 4, color: 'var(--color-protein)' },
  { key: 'total_carbs', label: 'Carbs', kcalPerGram: 4, color: 'var(--color-carbs)' },
  { key: 'total_fat', label: 'Fat', kcalPerGram: 9, color: 'var(--color-fat)' },
] as const;

export interface Goal {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string;
}

export const GOALS: Record<string, Goal> = {
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

/** Macro rows: each bar's length is that macro's share of the meal's calories. */
export function macroRowsHtml(meal: MealAnalysis): string {
  const kcal = MACROS.map((m) => (meal[m.key] ?? 0) * m.kcalPerGram);
  const total = kcal.reduce((a, b) => a + b, 0) || 1;

  return MACROS.map((macro, i) => {
    const grams = meal[macro.key] ?? 0;
    const share = (kcal[i] / total) * 100;
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
}

/** Item breakdown as hairline rows — the audit trail behind the total. */
export function itemRowsHtml(meal: MealAnalysis): string {
  return meal.items
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
}
