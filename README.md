# KKS AI Smart Trainer

Offline AI design studio with LoRA/AnimateDiff training simulation, dataset prep, generation, and a Myanmar-language AI assistant.

## Features

- **Dashboard** — manage AI training projects (image & video)
- **Dataset** — upload, auto-caption, and export training data
- **Training** — configure and simulate LoRA / AnimateDiff training with live console logs
- **Generate** — text-to-image and image-to-video generation gallery
- **AI Assistant** — Myanmar-language chat assistant (offline rules engine)
- **Supabase backend** — projects, chat history, training jobs, and dataset files persisted

## Setup (after downloading source)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

The Supabase database schema is pre-applied via the migration in
`supabase/migrations/`. Credentials are in `.env`.

## Build

```bash
npm run build      # production build → dist/
npm run typecheck   # TypeScript check
```

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS 3
- Supabase (Postgres + RLS)
- lucide-react icons
