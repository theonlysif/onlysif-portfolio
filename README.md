# onlysif portfolio

A macOS Finder-style personal portfolio site. Built with Vite + vanilla JS.

**Live at:** [sif.fyi](https://www.sif.fyi/)

## What's in here

- A fake macOS file system explorer as a portfolio
- A virtual filesystem (`/about`, `/work`, `/products`, etc.) with real content
- A built-in AI chat powered by Gemini 2.5 Flash
- 40 terminal easter eggs (`sudo rm -rf /`, `git log`, `top`, `man asif`, etc.)
- A settings panel with dark/light mode toggle, accent color picker, language toggle
- Productivity log dashboard
- Mobile responsive with iOS keyboard handling
- Time-based light/dark mode (7am–7pm light, 7pm–7am dark)
- Conversation logging via Supabase

## Stack

- Vite (no framework)
- Gemini 2.5 Flash API (SSE streaming)
- Supabase (conversation logging)
- Web Audio API (sound effects)
- Deployed on Netlify

## Setup

```bash
npm install
cp .env.example .env
# fill in your API keys in .env
npm run dev
```

## Customising it as your own

1. Replace the filesystem content in `main.js` (the `FS` object) with your own work history, projects, etc.
2. Replace the `SYSTEM_PROMPT` with your own personal context so the AI chat represents you.
3. Update the chooser options in `index.html` to point to your own variant pages.

Built with [Claude Code](https://claude.ai/claude-code).
