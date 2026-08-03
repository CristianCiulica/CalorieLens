# CalorieLens

Point a camera at a meal, get calories and a full macro breakdown in seconds.
No manual logging, no account.

CalorieLens is a two-surface web app: an editorial landing page, and a scanner
app that reads a photo of a plate and turns it into a nutrition breakdown that
lands in your daily log.

## Features
**Landing** — a scroll-driven page: masked headline reveals, a scrubbed
manifesto, a sticky card stack for the four steps, animated accuracy counters,
a goal switcher (Cut / Maintain / Build) wired to a seven-day calorie chart,
and a hairline FAQ accordion.

**Scanner** (`/scan.html`) — the app itself, on a three-column shell:
- Drop a photo or shoot one; every state is designed — idle, drag-over,
  preview, staged analysis, breakdown, error.
- The result gives you a total, a protein / carbs / fat split, and every item
  the model found with the portion each number assumes.
- A history rail groups past scans by day.
- A "Today" rail tracks calories left, macro progress against your goal, and
  the meals logged so far. Goal choice persists in `localStorage`.

## Stack

- **Vite** + **TypeScript**, no UI framework
- **Tailwind CSS v4** for utilities, on top of a hand-written design system
- **GSAP** + ScrollTrigger for motion, **Lenis** for smooth scroll
- **Google Gemini 2.0 Flash** for image analysis
## Getting started
```bash
npm install
npm run dev
