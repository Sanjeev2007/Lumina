import React, { useState, useEffect } from 'react';
import { Book, BookNote, ThemeConfig } from '../types';
import { 
  ArrowLeft, BookOpen, Bookmark, Check, Calendar, 
  MessageSquare, Star, Plus, Trash2, Sliders, ChevronRight, 
  ChevronLeft, Info, Maximize2, Share2, HelpCircle 
} from 'lucide-react';

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
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [currentPageInput, setCurrentPageInput] = useState<number>(book.currentPage || 1);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newNotePage, setNewNotePage] = useState<number>(book.currentPage || 1);
  const [showNotesPanel, setShowNotesPanel] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Ratings helper
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Initialize PDF Object URL
  useEffect(() => {
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);

    // Mark today as read when they open the reader
    onUpdateStreak();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [pdfBlob, onUpdateStreak]);

  // Keep input in sync with book
  useEffect(() => {
    setCurrentPageInput(book.currentPage || 1);
    setNewNotePage(book.currentPage || 1);
  }, [book.currentPage]);

  // Handle manual page updates
  const handlePageChange = (newPage: number) => {
    const validatedPage = Math.max(1, Math.min(newPage, book.totalPages || 999));
    setCurrentPageInput(validatedPage);
    
    // Update main book state
    const updatedBook = {
      ...book,
      currentPage: validatedPage,
      lastReadDate: new Date().toISOString(),
    };
    onUpdateBook(updatedBook);
    
    // Increment streaks on activity
    onUpdateStreak();
  };

  // Log a new note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: BookNote = {
      id: crypto.randomUUID(),
      page: newNotePage,
      text: newNoteText.trim(),
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedBook = {
      ...book,
      notes: [newNote, ...(book.notes || [])],
      lastReadDate: new Date().toISOString(),
    };

    onUpdateBook(updatedBook);
    setNewNoteText('');
    onUpdateStreak();
  };

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    const updatedBook = {
      ...book,
      notes: (book.notes || []).filter((note) => note.id !== noteId),
    };
    onUpdateBook(updatedBook);
  };

  // Toggle page bookmark
  const toggleBookmark = () => {
    const page = book.currentPage;
    const isBookmarked = book.bookmarks?.includes(page);
    let newBookmarks = [...(book.bookmarks || [])];

    if (isBookmarked) {
      newBookmarks = newBookmarks.filter((b) => b !== page);
    } else {
      newBookmarks.push(page);
      newBookmarks.sort((a, b) => a - b);
    }

    onUpdateBook({
      ...book,
      bookmarks: newBookmarks,
    });
  };

  // Change rating
  const handleRating = (rating: number) => {
    onUpdateBook({
      ...book,
      rating,
    });
  };

  const progressPercent = Math.round(((book.currentPage || 1) / (book.totalPages || 100)) * 100);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${themeConfig.bg} ${themeConfig.text} overflow-hidden font-sans transition-colors duration-300`}>
      
      {/* Dynamic Header */}
      <header className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b ${themeConfig.navbarBg} ${themeConfig.border} shadow-sm z-10 shrink-0`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer`}
            title="Back to Bookshelf"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="max-w-[180px] sm:max-w-xs md:max-w-md">
            <h1 className={`text-sm sm:text-base font-bold ${themeConfig.fontSerif} tracking-tight truncate`}>
              {book.title}
            </h1>
            <p className="text-[11px] opacity-75 truncate">{book.author}</p>
          </div>
        </div>

        {/* Reader Control Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Rating Selector */}
          <div className="hidden md:flex items-center gap-1 mr-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200/20">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-0.5 cursor-pointer hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    star <= (hoverRating ?? book.rating ?? 0)
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-zinc-400'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Quick bookmark toggle */}
          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${
              book.bookmarks?.includes(book.currentPage) ? 'text-amber-600' : 'opacity-70'
            }`}
            title="Bookmark this Page"
          >
            <Bookmark className={`w-4 h-4 ${book.bookmarks?.includes(book.currentPage) ? 'fill-current' : ''}`} />
          </button>

          {/* Show / Hide Notes and Annotations */}
          <button
            onClick={() => setShowNotesPanel(!showNotesPanel)}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer relative ${
              showNotesPanel ? 'bg-black/5 dark:bg-white/5' : 'opacity-70'
            }`}
            title="Notes & Annotations"
          >
            <MessageSquare className="w-4 h-4" />
            {(book.notes?.length || 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[8px] font-bold px-1 rounded-full h-3.5 min-w-[14px] flex items-center justify-center font-mono">
                {book.notes.length}
              </span>
            )}
          </button>

          {/* Setup configurations */}
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${
              showSettingsPanel ? 'bg-black/5 dark:bg-white/5' : 'opacity-70'
            }`}
            title="Reader Display Options"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Reader View Space (Split pane if notes are shown) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* PDF Embedded Screen Frame */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative p-3 sm:p-5">
          {/* Real PDF frame / fallback */}
          <div className="flex-1 rounded-xl overflow-hidden border border-zinc-200/20 dark:border-zinc-800/20 shadow-sm relative bg-[#27272A] dark:bg-black/80 flex flex-col">
            {pdfUrl ? (
              <iframe
                id="kindle-pdf-frame"
                src={`${pdfUrl}#page=${book.currentPage}`}
                className="w-full h-full bg-[#333336]"
                title="Ebook PDF Viewer"
                key={book.currentPage} // Re-render ensures jumping to correct page when changed
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                <BookOpen className="w-12 h-12 mb-3 animate-pulse opacity-60" />
                <p className="text-sm">Mounting Kindle Reader engine...</p>
              </div>
            )}

            {/* Float helper in PDF Reader */}
            <div className="absolute bottom-4 right-4 bg-zinc-900/90 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 shadow-lg backdrop-blur border border-zinc-700/50 pointer-events-none sm:pointer-events-auto">
              <span className="opacity-70">Native Scroll Supported</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            </div>
          </div>

          {/* Bottom Controls / Progress Tracker Bar */}
          <div className={`mt-3 py-3 px-4 rounded-xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-sm shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors duration-300`}>
            {/* Page back / forth button controls */}
            <div className="flex items-center gap-1 order-2 sm:order-1">
              <button
                onClick={() => handlePageChange(book.currentPage - 1)}
                disabled={book.currentPage <= 1}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 text-xs">
                <span className="opacity-70 font-sans">Page</span>
                <input
                  type="number"
                  value={currentPageInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setCurrentPageInput(val);
                  }}
                  onBlur={() => handlePageChange(currentPageInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePageChange(currentPageInput);
                  }}
                  className={`w-14 px-1.5 py-0.5 rounded border text-center font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                />
                <span className="opacity-70 font-sans">of {book.totalPages || '?'}</span>
              </div>

              <button
                onClick={() => handlePageChange(book.currentPage + 1)}
                disabled={book.currentPage >= book.totalPages}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slider bar progress logger */}
            <div className="flex-1 max-w-sm sm:max-w-md w-full mx-4 order-1 sm:order-2">
              <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                <span>PROGRESS</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <input
                type="range"
                min="1"
                max={book.totalPages || 100}
                value={book.currentPage}
                onChange={(e) => handlePageChange(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Rating summary */}
            <div className="text-xs opacity-80 order-3 flex items-center gap-2">
              <span className="font-mono font-medium">Kindle PDF Mode</span>
            </div>
          </div>
        </div>

        {/* Display options / configurations flyout panel */}
        {showSettingsPanel && (
          <div className={`absolute sm:relative top-0 right-0 h-full w-72 border-l ${themeConfig.navbarBg} ${themeConfig.border} p-5 shadow-2xl sm:shadow-none z-25 overflow-y-auto flex flex-col justify-between transition-colors duration-300`}>
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sm tracking-tight uppercase opacity-80">Display Options</h3>
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>

              {/* PDF helper instructions */}
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-black/5 dark:bg-white/5 border border-zinc-200/10">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>PDF Pro-Tip</span>
                  </div>
                  <p className="opacity-80 leading-relaxed">
                    Double-click the PDF reader page to zoom, or use the reader's native top options to search word text or rotate.
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="font-semibold mb-2">Bookmarked Pages</h4>
                  {(!book.bookmarks || book.bookmarks.length === 0) ? (
                    <p className="opacity-60 italic text-[11px]">No pages bookmarked yet. Tap the bookmark icon in the header to save key pages.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {book.bookmarks.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`px-2 py-1 rounded text-[11px] font-mono border ${themeConfig.border} ${themeConfig.bg} hover:border-amber-500/50 transition-colors cursor-pointer`}
                        >
                          Pg {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <h4 className="font-semibold mb-1">Book Rating</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className="p-1 cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= (book.rating ?? 0)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-zinc-400 opacity-60'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`pt-4 border-t ${themeConfig.border} text-[10px] opacity-60`}>
              <p>Uploaded PDF: {book.fileSize}</p>
              <p className="mt-1">ID: {book.id.substring(0, 8)}...</p>
            </div>
          </div>
        )}

        {/* Notes and Annotations Sidebar Panel */}
        {showNotesPanel && (
          <div className={`absolute sm:relative top-0 right-0 h-full w-80 border-l ${themeConfig.navbarBg} ${themeConfig.border} flex flex-col shadow-2xl sm:shadow-none z-25 overflow-hidden transition-colors duration-300`}>
            
            {/* Notes Panel Header */}
            <div className={`p-4 border-b ${themeConfig.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm tracking-tight">Kindle Book Notes</h3>
              </div>
              <button
                onClick={() => setShowNotesPanel(false)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs"
              >
                Close
              </button>
            </div>

            {/* Notes Input logger */}
            <form onSubmit={handleAddNote} className={`p-4 border-b ${themeConfig.border} ${themeConfig.bg}`}>
              <div className="flex items-center justify-between mb-2 text-xs">
                <label className="font-semibold">Add Annotation</label>
                <div className="flex items-center gap-1">
                  <span className="opacity-70">On Page</span>
                  <input
                    type="number"
                    min="1"
                    max={book.totalPages || 999}
                    value={newNotePage}
                    onChange={(e) => setNewNotePage(parseInt(e.target.value) || 1)}
                    className={`w-12 px-1 py-0.5 rounded border text-center font-mono text-[11px] ${themeConfig.bg} ${themeConfig.border}`}
                  />
                </div>
              </div>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Type your highlight quote or custom reading note..."
                rows={3}
                className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none ${themeConfig.bg} ${themeConfig.border}`}
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className={`mt-2 w-full py-1.5 px-3 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  newNoteText.trim() ? 'bg-amber-700 hover:bg-amber-800' : 'bg-zinc-400 opacity-55 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Save Note
              </button>
            </form>

            {/* List of notes logged */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 obsidian-scrollbar">
              {(!book.notes || book.notes.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-10">
                  <BookOpen className="w-8 h-8 mb-2 opacity-50 text-amber-700" />
                  <p className="text-xs italic">No notes logged for this book.</p>
                  <p className="text-[10px] mt-1 max-w-[180px]">Add highlights, quotes, or personal notes above to build your Kindle annotations bank!</p>
                </div>
              ) : (
                book.notes.map((note) => (
                  <div key={note.id} className={`p-3 rounded-lg border ${themeConfig.bg} ${themeConfig.border} space-y-2 text-xs relative group hover:border-amber-500/30 transition-all`}>
                    <div className="flex items-center justify-between text-[10px] opacity-75">
                      <button
                        onClick={() => handlePageChange(note.page)}
                        className="font-mono font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        Page {note.page} <ChevronRight className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {note.date}</span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
    </div>
  );
}
