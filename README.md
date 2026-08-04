# onlysif portfolio

A macOS Finder-style personal portfolio site. Built with Vite + vanilla JS.

**Live at:** [onlysif.com](https://onlysif.com)

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

## Proposals

`proposals/*.md` build into plain PDFs in `out/`, styled to match the site — Inter,
white, hairline rules, lowercase. Nothing fancy, they're meant to be forwarded
over WhatsApp and read on a phone.

```bash
npx playwright install chromium   # once
npm run proposal                  # build all
npm run proposal konproz          # build the ones matching "konproz"
npm run proposal -- --html        # also write HTML, for a browser preview
```

Each build prints how deep the content runs (`1.35 deep` = a page and a bit).
Aim for 1–1.5. Copy `proposals/_template.md` to start a new one.

The markdown is normal markdown plus two things:

- `- label :: value` makes a two-column row, label left and value right
- `- **label** :: value` makes that row the total line, for the number they care about

`## headings` open sections, `> text` is a muted aside, and the frontmatter
carries the title, client, date, contact links, and the output filename.

## Customising it as your own

1. Replace the filesystem content in `main.js` (the `FS` object) with your own work history, projects, etc.
2. Replace the `SYSTEM_PROMPT` with your own personal context so the AI chat represents you.
3. Update the chooser options in `index.html` to point to your own variant pages.

Built with [Claude Code](https://claude.ai/claude-code).
