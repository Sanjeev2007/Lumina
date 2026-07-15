import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Book, BookNote, ThemeConfig } from '../types';
import {
  ArrowLeft, BookOpen, Bookmark, Calendar, MessageSquare, Star,
  Plus, Trash2, Sliders, ChevronRight, ChevronLeft, Loader2, AlertCircle, X,
} from 'lucide-react';

// pdf.js needs a worker; Vite resolves this to a hashed URL at build time.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface BookReaderProps {
  book: Book;
  pdfBlob: Blob;
  themeConfig: ThemeConfig;
  onClose: () => void;
  onUpdateBook: (updatedBook: Book) => void;
  onUpdateStreak: () => void;
}

export default function BookReader({
  book,
  pdfBlob,
  themeConfig,
  onClose,
  onUpdateBook,
  onUpdateStreak,
}: BookReaderProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(book.totalPages || 1);
  const [page, setPage] = useState<number>(Math.max(1, book.currentPage || 1));
  const [loadError, setLoadError] = useState<string>('');
  const [rendering, setRendering] = useState<boolean>(true);
  const [chromeVisible, setChromeVisible] = useState<boolean>(true);

  const [showNotesPanel, setShowNotesPanel] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Always-fresh refs so persistence never writes stale metadata.
  const bookRef = useRef(book);
  bookRef.current = book;
  const pageRef = useRef(page);
  pageRef.current = page;

  // Persist reading position (the automatic bookmark) + activity date.
  const persistPage = useCallback((p: number, extra?: Partial<Book>) => {
    onUpdateBook({
      ...bookRef.current,
      currentPage: p,
      lastReadDate: new Date().toISOString(),
      ...extra,
    });
  }, [onUpdateBook]);

  // --- Load the PDF document from the stored blob ---
  useEffect(() => {
    let cancelled = false;
    let doc: pdfjsLib.PDFDocumentProxy | null = null;

    (async () => {
      try {
        setRendering(true);
        setLoadError('');
        const data = await pdfBlob.arrayBuffer();
        const task = pdfjsLib.getDocument({ data });
        doc = await task.promise;
        if (cancelled) { doc.destroy(); return; }

        setPdfDoc(doc);
        setNumPages(doc.numPages);

        // Resume at the saved page, clamped to the real page count.
        const startPage = Math.min(Math.max(1, book.currentPage || 1), doc.numPages);
        setPage(startPage);

        // Correct the shelf's page count if it was a guess, and sync position.
        if (doc.numPages !== book.totalPages || (book.currentPage || 0) !== startPage) {
          onUpdateBook({
            ...bookRef.current,
            totalPages: doc.numPages,
            currentPage: startPage,
            lastReadDate: new Date().toISOString(),
          });
        }

        // Opening the book counts as reading today.
        onUpdateStreak();
      } catch (err) {
        if (!cancelled) setLoadError('This PDF could not be opened. It may be corrupted or password-protected.');
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }
      if (doc) doc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBlob]);

  // --- Track the reading-area size for fit-to-screen rendering ---
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pdfDoc]);

  // --- Render the current page to the canvas ---
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || containerSize.w === 0) return;
    let cancelled = false;

    (async () => {
      try {
        setRendering(true);
        const pageObj = await pdfDoc.getPage(page);
        if (cancelled) return;

        const unscaled = pageObj.getViewport({ scale: 1 });
        const padding = 24;
        const availW = containerSize.w - padding * 2;
        const availH = containerSize.h - padding * 2;
        const fit = Math.min(availW / unscaled.width, availH / unscaled.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pageObj.getViewport({ scale: fit * dpr });

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }
        const task = pageObj.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (err: any) {
        // RenderingCancelledException is expected when flipping pages quickly.
        if (!cancelled && err?.name !== 'RenderingCancelledException') setRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, page, containerSize]);

  // --- Chrome auto-hide (Kindle-style immersion) ---
  const pokeChrome = useCallback(() => {
    setChromeVisible(true);
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    chromeTimerRef.current = setTimeout(() => setChromeVisible(false), 3500);
  }, []);

  useEffect(() => {
    pokeChrome();
    return () => { if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current); };
  }, [pokeChrome]);

  // --- Navigation ---
  const goTo = useCallback((target: number) => {
    const clamped = Math.min(Math.max(1, target), numPages || 1);
    setPage(clamped);
    persistPage(clamped);
    onUpdateStreak();
  }, [numPages, persistPage, onUpdateStreak]);

  const next = useCallback(() => goTo(pageRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(pageRef.current - 1), [goTo]);

  // Keyboard: arrows / space / escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); pokeChrome(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); pokeChrome(); }
      else if (e.key === 'Escape') { handleClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev, pokeChrome]);

  // Exit: place the automatic bookmark (save latest page) then leave.
  const handleClose = useCallback(() => {
    persistPage(pageRef.current);
    onClose();
  }, [persistPage, onClose]);

  // --- Notes ---
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote: BookNote = {
      id: crypto.randomUUID(),
      page,
      text: newNoteText.trim(),
      date: new Date().toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    };
    onUpdateBook({ ...bookRef.current, notes: [newNote, ...(book.notes || [])], lastReadDate: new Date().toISOString() });
    setNewNoteText('');
    onUpdateStreak();
  };

  const handleDeleteNote = (noteId: string) => {
    onUpdateBook({ ...bookRef.current, notes: (book.notes || []).filter((n) => n.id !== noteId) });
  };

  // --- Manual bookmarks (mark specific pages) ---
  const isBookmarked = book.bookmarks?.includes(page);
  const toggleBookmark = () => {
    let next = [...(book.bookmarks || [])];
    if (isBookmarked) next = next.filter((b) => b !== page);
    else { next.push(page); next.sort((a, b) => a - b); }
    onUpdateBook({ ...bookRef.current, bookmarks: next });
  };

  const handleRating = (rating: number) => onUpdateBook({ ...bookRef.current, rating });

  const progressPercent = Math.round((page / (numPages || 1)) * 100);
  const isDark = themeConfig.id === 'obsidian';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${themeConfig.bg} ${themeConfig.text} overflow-hidden font-sans select-none`}>

      {/* ===== Reading surface ===== */}
      <div ref={viewportRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm opacity-80">{loadError}</p>
            <button onClick={handleClose} className={`mt-2 px-4 py-2 rounded-xl text-white text-xs font-semibold ${themeConfig.accent} ${themeConfig.accentHover} cursor-pointer`}>
              Back to Library
            </button>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={`rounded-sm transition-opacity duration-200 ${rendering ? 'opacity-40' : 'opacity-100'} ${
              isDark ? 'shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5' : 'shadow-[0_8px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/5'
            }`}
          />
        )}

        {rendering && !loadError && (
          <div className="absolute z-10 flex items-center gap-2 text-xs opacity-70 pointer-events-none">
            <Loader2 className="w-4 h-4 animate-spin" /> {pdfDoc ? 'Rendering page…' : 'Opening book…'}
          </div>
        )}
      </div>

      {/* ===== Tap zones: left = prev, center = toggle chrome, right = next ===== */}
      {!loadError && (
        <div className="absolute inset-0 z-10 flex">
          <button aria-label="Previous page" onClick={() => { prev(); pokeChrome(); }} className="h-full w-1/3 cursor-w-resize focus:outline-none group">
            <ChevronLeft className={`w-7 h-7 ml-3 transition-opacity opacity-0 group-hover:opacity-30 ${page <= 1 ? '!opacity-0' : ''}`} />
          </button>
          <button aria-label="Toggle menu" onClick={() => (chromeVisible ? setChromeVisible(false) : pokeChrome())} className="h-full w-1/3 cursor-pointer focus:outline-none" />
          <button aria-label="Next page" onClick={() => { next(); pokeChrome(); }} className="h-full w-1/3 cursor-e-resize focus:outline-none group flex items-center justify-end">
            <ChevronRight className={`w-7 h-7 mr-3 transition-opacity opacity-0 group-hover:opacity-30 ${page >= numPages ? '!opacity-0' : ''}`} />
          </button>
        </div>
      )}

      {/* ===== Top bar (auto-hides) ===== */}
      <header
        className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-md ${themeConfig.navbarBg}/80 ${themeConfig.border} transition-all duration-300 ${
          chromeVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer" title="Back to Library (saves your page)">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className={`text-sm sm:text-base font-bold ${themeConfig.fontSerif} tracking-tight truncate`}>{book.title}</h1>
            <p className="text-[11px] opacity-70 truncate">{book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-0.5 mr-1 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => handleRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(null)} className="p-0.5 cursor-pointer hover:scale-110 transition-transform">
                <Star className={`w-3.5 h-3.5 ${star <= (hoverRating ?? book.rating ?? 0) ? 'text-amber-500 fill-amber-500' : 'text-zinc-400 opacity-70'}`} />
              </button>
            ))}
          </div>
          <button onClick={toggleBookmark} className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${isBookmarked ? 'text-amber-600' : 'opacity-70'}`} title="Bookmark this page">
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => { setShowNotesPanel(!showNotesPanel); setShowSettingsPanel(false); }} className={`relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${showNotesPanel ? 'bg-black/5 dark:bg-white/5' : 'opacity-70'}`} title="Notes">
            <MessageSquare className="w-4 h-4" />
            {(book.notes?.length || 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[8px] font-bold px-1 rounded-full h-3.5 min-w-[14px] flex items-center justify-center font-mono">{book.notes.length}</span>
            )}
          </button>
          <button onClick={() => { setShowSettingsPanel(!showSettingsPanel); setShowNotesPanel(false); }} className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${showSettingsPanel ? 'bg-black/5 dark:bg-white/5' : 'opacity-70'}`} title="Bookmarks & display">
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===== Bottom bar (auto-hides) ===== */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 px-4 sm:px-8 py-3 border-t backdrop-blur-md ${themeConfig.navbarBg}/80 ${themeConfig.border} transition-all duration-300 ${
          chromeVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => { prev(); pokeChrome(); }} disabled={page <= 1} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed" title="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono opacity-80 tabular-nums whitespace-nowrap">{page} / {numPages}</span>
          <input
            type="range" min={1} max={numPages || 1} value={page}
            onChange={(e) => { setPage(parseInt(e.target.value)); pokeChrome(); }}
            onMouseUp={(e) => goTo(parseInt((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => goTo(parseInt((e.target as HTMLInputElement).value))}
            className="flex-1 h-1.5 rounded-lg bg-zinc-300/60 dark:bg-zinc-700 accent-amber-600 cursor-pointer"
          />
          <span className="text-xs font-mono opacity-60 tabular-nums w-9 text-right">{progressPercent}%</span>
          <button onClick={() => { next(); pokeChrome(); }} disabled={page >= numPages} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed" title="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== Always-on hairline progress (visible when chrome hidden) ===== */}
      <div className={`absolute bottom-0 inset-x-0 z-10 h-0.5 bg-black/5 dark:bg-white/5 transition-opacity duration-300 ${chromeVisible ? 'opacity-0' : 'opacity-100'}`}>
        <div className={`h-full ${isDark ? 'bg-[#C5A059]' : 'bg-amber-600'}`} style={{ width: `${progressPercent}%` }} />
      </div>

      {/* ===== Settings / Bookmarks panel ===== */}
      {showSettingsPanel && (
        <div className={`absolute top-0 right-0 h-full w-72 z-30 border-l ${themeConfig.navbarBg} ${themeConfig.border} p-5 shadow-2xl overflow-y-auto flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm tracking-tight uppercase opacity-80">Bookmarks & Display</h3>
              <button onClick={() => setShowSettingsPanel(false)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-5 text-xs">
              <div className="p-3.5 rounded-lg bg-black/5 dark:bg-white/5">
                <p className="opacity-80 leading-relaxed">Your page is saved automatically as you read and when you exit — reopen the book to resume right where you left off.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Bookmarked Pages</h4>
                {(!book.bookmarks || book.bookmarks.length === 0) ? (
                  <p className="opacity-60 italic text-[11px]">No pages bookmarked yet. Tap the bookmark icon in the header to save a page.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {book.bookmarks.map((p) => (
                      <button key={p} onClick={() => { goTo(p); setShowSettingsPanel(false); }} className={`px-2 py-1 rounded text-[11px] font-mono border ${themeConfig.border} ${themeConfig.bg} hover:border-amber-500/50 transition-colors cursor-pointer`}>Pg {p}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-1.5">Book Rating</h4>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => handleRating(star)} className="p-1 cursor-pointer hover:scale-110 transition-transform">
                      <Star className={`w-5 h-5 ${star <= (book.rating ?? 0) ? 'text-amber-500 fill-amber-500' : 'text-zinc-400 opacity-60'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={`pt-4 border-t ${themeConfig.border} text-[10px] opacity-60`}>
            <p>PDF size: {book.fileSize}</p>
            <p className="mt-1">{numPages} pages</p>
          </div>
        </div>
      )}

      {/* ===== Notes panel ===== */}
      {showNotesPanel && (
        <div className={`absolute top-0 right-0 h-full w-80 z-30 border-l ${themeConfig.navbarBg} ${themeConfig.border} flex flex-col shadow-2xl overflow-hidden`}>
          <div className={`p-4 border-b ${themeConfig.border} flex items-center justify-between`}>
            <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-600" /><h3 className="font-bold text-sm tracking-tight">Notes</h3></div>
            <button onClick={() => setShowNotesPanel(false)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleAddNote} className={`p-4 border-b ${themeConfig.border} ${themeConfig.bg}`}>
            <div className="flex items-center justify-between mb-2 text-xs">
              <label className="font-semibold">Add note</label>
              <span className="opacity-70 font-mono text-[11px]">on page {page}</span>
            </div>
            <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder="Highlight, quote, or thought…" rows={3} className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none ${themeConfig.bg} ${themeConfig.border}`} />
            <button type="submit" disabled={!newNoteText.trim()} className={`mt-2 w-full py-1.5 px-3 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${newNoteText.trim() ? 'bg-amber-700 hover:bg-amber-800' : 'bg-zinc-400 opacity-55 cursor-not-allowed'}`}>
              <Plus className="w-3.5 h-3.5" /> Save note
            </button>
          </form>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(!book.notes || book.notes.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-10">
                <BookOpen className="w-8 h-8 mb-2 opacity-50 text-amber-700" />
                <p className="text-xs italic">No notes yet.</p>
              </div>
            ) : (
              book.notes.map((note) => (
                <div key={note.id} className={`p-3 rounded-lg border ${themeConfig.bg} ${themeConfig.border} space-y-2 text-xs group hover:border-amber-500/30 transition-all`}>
                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <button onClick={() => { goTo(note.page); setShowNotesPanel(false); }} className="font-mono font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5">Page {note.page} <ChevronRight className="w-3 h-3" /></button>
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {note.date}</span>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer" title="Delete"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
