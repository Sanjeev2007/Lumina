# Lumina — Kindle-style PDF Reader & Reading Tracker

A premium, offline-first reading app for desktop and mobile. Upload your own PDFs, organize them into collections, track daily reading streaks, take notes and bookmarks, and read in eye-safe custom themes. Everything lives locally in your browser (IndexedDB) — no account, no server, no cloud lock-in.

## Features

- **Bring your own books** — upload any PDF from your device (drag & drop or file picker), or paste a public Google Drive share link.
- **Collections** — three built-in lists (Currently Reading, To Read, Completed) plus your own custom collections with colored badges.
- **Reading streaks** — a habit tracker that logs consecutive reading days and tracks your longest streak.
- **Reader tools** — per-book bookmarks, notes, page progress, and star ratings.
- **Themes** — three hand-tuned reading styles: Warm Sepia, Sophisticated Dark, and Editorial Paper.
- **Offline-first** — books and progress are stored locally in IndexedDB; the app works with no network.
- **Responsive** — designed for both Mac and phone.

## Tech stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS 4** for styling
- **lucide-react** icons, **motion** for animation
- **IndexedDB** for local persistence (books, lists, streaks, settings)

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000` (Vite picks the next free port if it's taken).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Importing from Google Drive

The upload modal has a **Google Drive** tab: paste a share link for a PDF set to **"Anyone with the link"** and it imports into your library.

Because Google's download endpoint doesn't send CORS headers, the browser can't fetch it directly. Instead the app calls a same-origin proxy that fetches the file server-side (no CORS) and streams it back:

- **Production (Vercel):** `api/drive.js` runs as a serverless function at `/api/drive`.
- **Dev/preview:** the same logic is mounted as Vite middleware (see [`vite.config.ts`](vite.config.ts) + [`lib/drive-proxy.js`](lib/drive-proxy.js)), so `npm run dev` and `npm run preview` work identically.

The file must be shared publicly ("Anyone with the link"); private files return a clear error. Very large files stream through, but be mindful of your host's serverless execution/time limits.

## Deploying to Vercel

Zero config — Vercel auto-detects the Vite app and the `api/` function:

- **Framework Preset:** Vite
- **Build Command:** `npm run build` (default)
- **Output Directory:** `dist` (default)
- **Install Command:** `npm install` (default)

No environment variables are required. `api/drive.js` deploys automatically as a Node serverless function.

## Project structure

```
src/
  App.tsx                 App shell, state, IndexedDB orchestration
  components/
    BookShelf.tsx         Library grid/list, upload modal, collections
    BookReader.tsx        Immersive reader view
    StreakTracker.tsx     Reading-streak dashboard
    StyleSelector.tsx     Theme picker
  lib/
    db.ts                 IndexedDB read/write layer
    themes.ts             Theme definitions
  types.ts                Shared types
```

## License

MIT
