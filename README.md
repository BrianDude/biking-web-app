# 🚴 Fat Burn Ride — 60-Min Cycling Trainer

A mobile-first React app that guides you through a structured 60-minute fat-burning bike workout. The full-screen background dynamically reflects your current training stage, with sprint cues and heart-rate reminders built in.

**Live URL:** https://BrianDude.github.io/biking-web-app/

---

## Workout Structure

| Stage           | Duration | BPM Target | Color                  |
|-----------------|----------|------------|------------------------|
| Warm Up         | 10 min   | 117–136    | Green  `#4ade80`       |
| Steady Burn     | 15 min   | 136–156    | Yellow `#facc15`       |
| HIIT Intervals  | 20 min   | 146–176    | Orange `#f97316`       |
| Cooldown Burn   | 10 min   | 136–156    | Yellow `#facc15`       |
| Cool Down       | 5 min    | 97–117     | Indigo `#818cf8`       |

- **HIIT sprint cues** fire at minutes 28, 32, 36, 40, and 44 (1-minute all-out efforts)
- **Heart-rate reminders** every 3–5 min depending on stage
- **Warning flash** — background blinks for the last 10 seconds of each stage

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

---

## Build

```bash
npm run build
```

Output goes to `dist/`. The base path is already set to `/biking-web-app/` in `vite.config.ts`.

---

## Deploy to GitHub Pages

```bash
npm run deploy
```

This runs `npm run build` first (via `predeploy`), then pushes the `dist/` folder to the `gh-pages` branch using the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package.

**One-time repo setup** (already done):
```bash
git init
git remote add origin https://github.com/BrianDude/biking-web-app.git
git push -u origin main
```

Then in your GitHub repo settings → **Pages** → set source to the `gh-pages` branch.

---

## Tech Stack

- [React 19](https://react.dev/) + TypeScript
- [Vite 8](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [gh-pages](https://www.npmjs.com/package/gh-pages) for deployment
