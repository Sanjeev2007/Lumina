import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Book, ReadingList, Streak, ThemeType, ThemeConfig } from './types';
import { getBooks, getLists, getStreak, getTheme } from './lib/db';
import {
  persistBook, removeBookEverywhere, persistLists,
  persistStreak, persistTheme, loadPdf, syncOnLogin,
} from './lib/store';
import { supabase, cloudEnabled, signOut } from './lib/supabase';
import { THEMES } from './lib/themes';
import StyleSelector from './components/StyleSelector';
import StreakTracker from './components/StreakTracker';
import BookShelf from './components/BookShelf';
import BookReader from './components/BookReader';
import AuthModal from './components/AuthModal';
import {
  BookOpen, Flame, Sparkles, Award, Compass,
  HelpCircle, Settings, Coffee, Star, Github, Cloud, LogOut, User,
} from 'lucide-react';

// Predefined system lists
const SYSTEM_LISTS: ReadingList[] = [
  { id: 'reading', name: 'Currently Reading', icon: 'book-open', color: 'amber', isSystem: true },
  { id: 'to-read', name: 'To Read', icon: 'tag', color: 'sky', isSystem: true },
  { id: 'completed', name: 'Completed', icon: 'check-circle', color: 'emerald', isSystem: true },
];

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('obsidian');
  const [books, setBooks] = useState<Book[]>([]);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [streak, setStreak] = useState<Streak>({
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    history: [],
  });

  // State for loaded app sections
  const [activeListId, setActiveListId] = useState<string>('all');
  const [activeBookForReader, setActiveBookForReader] = useState<Book | null>(null);
  const [activeBookPdfBlob, setActiveBookPdfBlob] = useState<Blob | null>(null);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Cloud sync / auth
  const [session, setSession] = useState<Session | null>(null);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);
  const userId = session?.user?.id ?? null;

  // Load initial settings and data from DB
  useEffect(() => {
    async function initAppData() {
      try {
        setAppLoading(true);

        // 1. Theme
        const storedTheme = await getTheme();
        if (storedTheme && Object.keys(THEMES).includes(storedTheme)) {
          setCurrentTheme(storedTheme as ThemeType);
        }

        // 2. Lists / Collections
        let storedLists = await getLists();
        if (!storedLists || storedLists.length === 0) {
          // Initialize default system lists (local; cloud seeded on sign-in)
          await persistLists(SYSTEM_LISTS, null);
          storedLists = SYSTEM_LISTS;
        }
        setLists(storedLists);

        // 3. Books
        const storedBooks = await getBooks();
        setBooks(storedBooks);

        // 4. Streak
        const storedStreak = await getStreak();
        setStreak(storedStreak);

      } catch (err) {
        console.error('Failed to initialize Lumina application:', err);
      } finally {
        setAppLoading(false);
      }
    }
    initAppData();
  }, []);

  // Track the Supabase auth session (no-op when cloud is not configured).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // On sign-in, pull the cloud library (and seed cloud from local if new).
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        setAppLoading(true);
        const snap = await syncOnLogin(userId);
        if (!active) return;
        setBooks(snap.books);
        if (snap.lists.length) setLists(snap.lists);
        if (snap.streak) setStreak(snap.streak);
        if (snap.theme && Object.keys(THEMES).includes(snap.theme)) {
          setCurrentTheme(snap.theme as ThemeType);
        }
      } catch (err) {
        console.error('Cloud sync failed:', err);
      } finally {
        if (active) setAppLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  // Update theme setting
  const handleThemeChange = async (themeId: ThemeType) => {
    setCurrentTheme(themeId);
    await persistTheme(themeId, userId);
  };

  // Upload book PDF & Metadata
  const handleUploadBook = async (
    title: string,
    author: string,
    totalPages: number,
    listId: string,
    file: File
  ) => {
    const bookId = crypto.randomUUID();
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    
    const newBook: Book = {
      id: bookId,
      title,
      author: author || 'Unknown Author',
      totalPages: totalPages || 100,
      currentPage: 0,
      lastReadDate: new Date().toISOString(),
      dateAdded: new Date().toISOString(),
      listId: listId || 'to-read',
      fileSize: fileSizeMB,
      notes: [],
      bookmarks: [],
    };

    // Save locally (+ cloud upload when signed in)
    await persistBook(newBook, userId, file);

    // Update local state
    setBooks((prev) => [newBook, ...prev]);
  };

  // Create customized collection list
  const handleCreateList = async (name: string, color: string, icon: string) => {
    const newList: ReadingList = {
      id: crypto.randomUUID(),
      name,
      color,
      icon,
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    await persistLists(updatedLists, userId);
  };

  // Modify / Update Book values
  const handleUpdateBook = async (updatedBook: Book) => {
    // Save to local state
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));

    // Persist metadata locally (+ cloud when signed in); no blob change here
    await persistBook(updatedBook, userId);

    // If currently reading, update reader state too
    if (activeBookForReader && activeBookForReader.id === updatedBook.id) {
      setActiveBookForReader(updatedBook);
    }
  };

  // Delete Book
  const handleDeleteBook = async (bookId: string) => {
    if (confirm('Are you sure you want to remove this book from your Lumina library?')) {
      await removeBookEverywhere(bookId, userId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (activeBookForReader?.id === bookId) {
        setActiveBookForReader(null);
        setActiveBookPdfBlob(null);
      }
    }
  };

  // Launch Reader view for selected PDF book
  const handleSelectBookToRead = async (book: Book) => {
    try {
      setAppLoading(true);
      const pdfBlob = await loadPdf(book.id, userId);

      if (!pdfBlob) {
        // Fallback: create dynamic placeholder guide PDF so they can read immediately
        const guideHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: 'Lora', Georgia, serif;
                padding: 40px;
                max-width: 650px;
                margin: 0 auto;
                background-color: #FAF6EE;
                color: #2B1B10;
                line-height: 1.6;
              }
              h1 { font-family: 'Inter', sans-serif; font-size: 28px; margin-bottom: 8px; color: #9E6D47; }
              h2 { font-family: 'Inter', sans-serif; font-size: 18px; margin-top: 30px; margin-bottom: 12px; }
              hr { border: 0; border-top: 1px solid #E8DFD0; margin: 24px 0; }
              .badge { background: #E8DFD0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }
            </style>
          </head>
          <body>
            <h1>Lumina Reader Guide</h1>
            <p>Welcome to your premium Kindle-like e-reader companion.</p>
            <hr />
            <h2>Reading Features Available:</h2>
            <ul>
              <li><strong>Track Reading Streaks:</strong> Build daily reading habits. Today is logged!</li>
              <li><strong>Save Custom Lists:</strong> Curate, filter and search books quickly.</li>
              <li><strong>Add Annotations:</strong> Bookmark pages and write notes dynamically while reading.</li>
            </ul>
          </body>
          </html>
        `;
        const simulatedBlob = new Blob([guideHtml], { type: 'text/html' });
        setActiveBookPdfBlob(simulatedBlob);
      } else {
        setActiveBookPdfBlob(pdfBlob);
      }
      
      setActiveBookForReader(book);
    } catch (err) {
      console.error('Failed to load PDF book:', err);
    } finally {
      setAppLoading(false);
    }
  };

  // Streak Habit Tracker logic (Calculate consecutive days)
  const handleUpdateStreak = useCallback(async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // If already read today, skip calculation to avoid duplication
    if (streak.history.includes(todayStr)) {
      return;
    }

    const newHistory = [...streak.history, todayStr].sort();

    // Calculate current consecutive streak backwards
    let calculatedStreak = 1; // Started reading today
    let checkDate = new Date(today);
    
    // Look backward day by day
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const cYear = checkDate.getFullYear();
      const cMonth = String(checkDate.getMonth() + 1).padStart(2, '0');
      const cDay = String(checkDate.getDate()).padStart(2, '0');
      const checkStr = `${cYear}-${cMonth}-${cDay}`;
      
      if (newHistory.includes(checkStr)) {
        calculatedStreak++;
      } else {
        break;
      }
    }

    const maxStreak = Math.max(streak.longestStreak, calculatedStreak);

    const updatedStreak: Streak = {
      currentStreak: calculatedStreak,
      longestStreak: maxStreak,
      lastReadDate: todayStr,
      history: newHistory,
    };

    setStreak(updatedStreak);
    await persistStreak(updatedStreak, userId);
  }, [streak, userId]);

  const themeConfig = THEMES[currentTheme];

  return (
    <div className={`min-h-screen ${themeConfig.bg} ${themeConfig.text} font-sans transition-colors duration-300 flex flex-col justify-between`}>

      {/* Sign-in modal */}
      {showAuth && <AuthModal themeConfig={themeConfig} onClose={() => setShowAuth(false)} />}

      {/* App Loader overlay */}
      {appLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
            <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium tracking-wide">Orchestrating Lumina Library...</p>
          </div>
        </div>
      )}

      {/* Dynamic Main Body Content */}
      {activeBookForReader && activeBookPdfBlob ? (
        /* Immersive Book Reader view */
        <BookReader
          book={activeBookForReader}
          pdfBlob={activeBookPdfBlob}
          themeConfig={themeConfig}
          onClose={() => {
            setActiveBookForReader(null);
            setActiveBookPdfBlob(null);
          }}
          onUpdateBook={handleUpdateBook}
          onUpdateStreak={handleUpdateStreak}
        />
      ) : (
        /* Standard Bookshelf & Habit Dashboard view */
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
          
          {/* Top Banner Navigation Header */}
          <header className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b ${themeConfig.border}`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 rounded-xl shadow-sm text-white">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${themeConfig.fontSerif}`}>Lumina</h1>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-600/15 text-amber-900 dark:text-amber-400 font-semibold border border-amber-500/20">Kindle Pro</span>
                </div>
                <p className="text-xs opacity-75 mt-0.5">Physical book aesthetics. Perfect digital execution.</p>
              </div>
            </div>

            {/* Quick reading streak banner */}
            <div className="flex items-center gap-4">
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${themeConfig.cardBg} ${themeConfig.border} shadow-xs`}>
                <Flame className="w-6 h-6 text-orange-500 fill-orange-500 animate-pulse" />
                <div>
                  <div className="text-[9px] opacity-70 uppercase tracking-wider font-mono">My Daily Streak</div>
                  <div className="text-sm font-bold font-sans">{streak.currentStreak} Days Consecutive</div>
                </div>
              </div>

              {/* Cloud sync / account control */}
              {cloudEnabled && (
                session ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountMenu((v) => !v)}
                      className={`p-3.5 rounded-xl border flex items-center gap-2 ${themeConfig.cardBg} ${themeConfig.border} shadow-xs cursor-pointer hover:border-amber-500/40 transition-colors`}
                      title="Account & sync"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                        {(session.user.email || '?').charAt(0)}
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="text-[9px] opacity-70 uppercase tracking-wider font-mono flex items-center gap-1"><Cloud className="w-2.5 h-2.5" /> Synced</div>
                        <div className="text-xs font-medium truncate max-w-[140px]">{session.user.email}</div>
                      </div>
                    </button>
                    {showAccountMenu && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowAccountMenu(false)} />
                        <div className={`absolute right-0 top-full mt-2 z-40 w-56 rounded-xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-xl p-1`}>
                          <div className={`px-3 py-2 border-b ${themeConfig.border}`}>
                            <p className="text-[10px] uppercase tracking-wider opacity-50 font-mono">Signed in as</p>
                            <p className="text-xs font-medium truncate">{session.user.email}</p>
                          </div>
                          <button
                            onClick={async () => { setShowAccountMenu(false); await signOut(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className={`p-3.5 rounded-xl text-white flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.02] ${themeConfig.accent} ${themeConfig.accentHover}`}
                    title="Sign in to sync across devices"
                  >
                    <Cloud className="w-5 h-5" />
                    <div className="hidden sm:block text-left">
                      <div className="text-[9px] opacity-80 uppercase tracking-wider font-mono">Cross-device</div>
                      <div className="text-xs font-bold">Sign in to sync</div>
                    </div>
                  </button>
                )
              )}
            </div>
          </header>

          {/* 1. Habit Streak Calendar and Progress Matrix */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-sm tracking-wider uppercase font-mono opacity-80 ${themeConfig.fontSerif} font-bold`}>Streak Dashboard</h2>
              <span className="text-[10px] opacity-60">Log progress to increment streaks</span>
            </div>
            <StreakTracker streak={streak} themeConfig={themeConfig} books={books} />
          </section>

          {/* 2. Visual Vibe Display Theme selector */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm tracking-wider uppercase font-mono opacity-80 font-bold">Premium Reading Styles</h2>
              <span className="text-xs opacity-60">Click a style card to instantly transform the look</span>
            </div>
            <StyleSelector
              currentTheme={currentTheme}
              onThemeChange={handleThemeChange}
              themeConfig={themeConfig}
            />
          </section>

          {/* 3. Core Bookshelf component */}
          <main className="space-y-3">
            <h2 className={`text-sm tracking-wider uppercase font-mono opacity-80 ${themeConfig.fontSerif} font-bold`}>My Bookshelf</h2>
            <BookShelf
              books={books}
              lists={lists}
              currentTheme={currentTheme}
              themeConfig={themeConfig}
              activeListId={activeListId}
              onActiveListChange={setActiveListId}
              onUploadBook={handleUploadBook}
              onCreateList={handleCreateList}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
              onSelectBookToRead={handleSelectBookToRead}
            />
          </main>
          
        </div>
      )}

      {/* Aesthetic layout footer */}
      {!activeBookForReader && (
        <footer className={`py-6 border-t ${themeConfig.border} text-center text-xs opacity-50 font-mono tracking-tight shrink-0 mt-8`}>
          <div className="w-full max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Lumina. Crafted with paperback aesthetics and digital precision.</p>
            <div className="flex items-center gap-3">
              <span>Mac & Phone Responsive Mode</span>
              <div className="h-3 w-px bg-zinc-400 opacity-30"></div>
              <span>Fully Offline-First</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
