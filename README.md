# Lumina — Kindle-style PDF Reader & Reading Tracker

A premium, offline-first reading app for desktop and mobile. Import your own PDFs (from your device or Google Drive), read them in a distraction-free Kindle-style reader, organize books into collections, track daily reading streaks, and take notes — all in eye-safe custom themes. Everything lives locally in your browser (IndexedDB): no account, no cloud lock-in.

![Lumina library and streak dashboard](docs/screenshots/library.png)

## Features

- **A real reading experience** — a custom, paginated PDF reader (rendered with pdf.js) that turns one page at a time with tap zones, arrow keys, or a scrub slider. Minimal chrome auto-hides so it's just you and the page.
- **Auto-resume** — your place is saved automatically on every page turn and when you exit. Reopen a book and it picks up exactly where you left off; the shelf card shows your progress.
- **Import from anywhere** — add any PDF from your device (drag & drop or file picker), or paste a public **Google Drive** share link.
- **Collections** — three built-in lists (Currently Reading, To Read, Completed) plus your own custom collections with colored badges.
- **Reading streaks** — a habit tracker that logs consecutive reading days and your longest streak.
- **Notes, bookmarks & ratings** — mark pages, jot notes tied to a page, and rate your books.
- **Themes** — three hand-tuned reading styles: Warm Sepia, Sophisticated Dark, and Editorial Paper.
- **Offline-first & responsive** — books and progress persist locally in IndexedDB and the app works with no network, on Mac and phone.

## Screenshots

| Distraction-free reader | Reader controls |
|---|---|
| ![Reading a page](docs/screenshots/reader.png) | ![Reader with page controls](docs/screenshots/reader-controls.png) |

Import straight from a Google Drive share link:

![Google Drive import](docs/screenshots/drive-import.png)

## Tech stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS 4** for styling
- **pdf.js** (`pdfjs-dist`) for page rendering
- **lucide-react** icons, **motion** for animation
- **IndexedDB** for local persistence (books, PDFs, lists, streaks, settings)

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000` (Vite picks the next free port if it's taken).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (includes the Drive-import proxy) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Importing from Google Drive

The upload modal has a **Google Drive** tab: paste a share link for a PDF set to **"Anyone with the link"** and it imports into your library.

Because Google's download endpoint doesn't send CORS headers, the browser can't fetch it directly. Instead the app calls a same-origin proxy that fetches the file server-side (no CORS) and streams it back:

- **Production (Vercel):** [`api/drive.js`](api/drive.js) runs as a serverless function at `/api/drive`.
- **Dev/preview:** the same logic is mounted as Vite middleware (see [`vite.config.ts`](vite.config.ts) + [`lib/drive-proxy.js`](lib/drive-proxy.js)), so `npm run dev` and `npm run preview` work identically.

Private files return a clear error. Very large files stream through, but be mindful of your host's serverless execution/time limits.

## Deploying to Vercel

Zero config — Vercel auto-detects the Vite app and the `api/` function:

- **Framework Preset:** Vite
- **Build Command:** `npm run build` (default)
- **Output Directory:** `dist` (default)
- **Install Command:** `npm install` (default)

No environment variables are required. `api/drive.js` deploys automatically as a Node serverless function.

## Project structure

```
api/
  drive.js                Vercel serverless function: /api/drive proxy
lib/
  drive-proxy.js          Shared Drive fetch/stream core (prod + dev)
docs/
  screenshots/            Images used in this README
src/
  App.tsx                 App shell, state, IndexedDB orchestration
  components/
    BookShelf.tsx         Library grid/list, upload modal, collections
    BookReader.tsx        Custom pdf.js reader (pagination, auto-resume)
    StreakTracker.tsx     Reading-streak dashboard
    StyleSelector.tsx     Theme picker
  lib/
    db.ts                 IndexedDB read/write layer
    themes.ts             Theme definitions
  types.ts                Shared types
```

## License

MIT
