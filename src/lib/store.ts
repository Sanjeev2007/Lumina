// Orchestration layer: always writes to local IndexedDB (instant, offline),
// and additionally syncs to Supabase when a userId is present (signed in).
// Pass userId = null for guest mode — everything stays local.
import { Book, ReadingList, Streak } from '../types';
import * as db from './db';
import * as cloud from './cloud';

export async function persistBook(book: Book, userId: string | null, blob?: Blob) {
  await db.saveBook(book, blob);
  if (userId) {
    await cloud.upsertBookCloud(userId, book);
    if (blob) await cloud.uploadPdfCloud(userId, book.id, blob);
  }
}

export async function removeBookEverywhere(bookId: string, userId: string | null) {
  await db.deleteBook(bookId);
  if (userId) {
    await cloud.deleteBookCloud(userId, bookId);
    await cloud.deletePdfCloud(userId, bookId);
  }
}

export async function persistLists(lists: ReadingList[], userId: string | null) {
  await db.saveLists(lists);
  if (userId) await cloud.upsertListsCloud(userId, lists);
}

export async function persistStreak(streak: Streak, userId: string | null) {
  await db.saveStreak(streak);
  if (userId) await cloud.upsertStreakCloud(userId, streak);
}

export async function persistTheme(theme: string, userId: string | null) {
  await db.saveTheme(theme);
  if (userId) await cloud.upsertThemeCloud(userId, theme);
}

// Get a book's PDF: prefer the local cache; if missing and signed in, pull it
// from cloud storage and cache it locally for next time.
export async function loadPdf(bookId: string, userId: string | null): Promise<Blob | null> {
  const local = await db.getBookPdf(bookId);
  if (local) return local;
  if (userId) {
    const remote = await cloud.downloadPdfCloud(userId, bookId);
    if (remote) {
      await db.savePdfBlob(bookId, remote);
      return remote;
    }
  }
  return null;
}

// On sign-in: pull the cloud library, cache it locally, and push up any
// guest-mode books that exist only on this device (first-time migration).
export async function syncOnLogin(userId: string): Promise<cloud.CloudSnapshot> {
  const snap = await cloud.pullCloud(userId);

  // Push local-only books (and their PDFs) that the cloud doesn't have yet.
  const localBooks = await db.getBooks();
  const cloudIds = new Set(snap.books.map((b) => b.id));
  for (const lb of localBooks) {
    if (!cloudIds.has(lb.id)) {
      await cloud.upsertBookCloud(userId, lb);
      const blob = await db.getBookPdf(lb.id);
      if (blob) await cloud.uploadPdfCloud(userId, lb.id, blob);
      snap.books.push(lb);
    }
  }

  // Seed a brand-new cloud account from local data; otherwise cloud wins.
  const localLists = await db.getLists();
  if (snap.lists.length === 0 && localLists.length) {
    await cloud.upsertListsCloud(userId, localLists);
    snap.lists = localLists;
  }
  const localStreak = await db.getStreak();
  if (!snap.streak) {
    await cloud.upsertStreakCloud(userId, localStreak);
    snap.streak = localStreak;
  }
  const localTheme = await db.getTheme();
  if (!snap.theme) {
    await cloud.upsertThemeCloud(userId, localTheme);
    snap.theme = localTheme;
  }

  // Cache the cloud snapshot locally so the UI is instant next launch.
  for (const b of snap.books) await db.saveBook(b);
  if (snap.lists.length) await db.saveLists(snap.lists);
  if (snap.streak) await db.saveStreak(snap.streak);
  if (snap.theme) await db.saveTheme(snap.theme);

  return snap;
}
