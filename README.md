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

The Drive tab accepts a share link for a PDF set to **"Anyone with the link"**. Note that Google's download endpoint does not send CORS headers, so a direct in-browser fetch is blocked by the browser for most files. Reliable Drive import requires either a small server-side proxy or the Google Drive Picker (OAuth) — not yet wired up. For now, downloading the PDF and using the **My Device** tab is the dependable path.

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
