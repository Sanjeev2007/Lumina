import { Book, ReadingList, Streak } from '../types';
import { supabase, PDF_BUCKET } from './supabase';

// Map between the app's camelCase types and the DB's snake_case rows.
function bookToRow(userId: string, b: Book) {
  return {
    user_id: userId,
    id: b.id,
    title: b.title,
    author: b.author,
    total_pages: b.totalPages,
    current_page: b.currentPage,
    last_read_date: b.lastReadDate,
    date_added: b.dateAdded,
    list_id: b.listId,
    file_size: b.fileSize,
    notes: b.notes ?? [],
    bookmarks: b.bookmarks ?? [],
    rating: b.rating ?? null,
    updated_at: new Date().toISOString(),
  };
}

function rowToBook(r: any): Book {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    totalPages: r.total_pages,
    currentPage: r.current_page,
    lastReadDate: r.last_read_date,
    dateAdded: r.date_added,
    listId: r.list_id,
    fileSize: r.file_size,
    notes: r.notes ?? [],
    bookmarks: r.bookmarks ?? [],
    rating: r.rating ?? undefined,
  };
}

export interface CloudSnapshot {
  books: Book[];
  lists: ReadingList[];
  streak: Streak | null;
  theme: string | null;
}

// Pull the full library for the signed-in user.
export async function pullCloud(userId: string): Promise<CloudSnapshot> {
  if (!supabase) return { books: [], lists: [], streak: null, theme: null };

  const [booksRes, listsRes, streakRes, settingsRes] = await Promise.all([
    supabase.from('books').select('*').eq('user_id', userId),
    supabase.from('lists').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  const books = (booksRes.data ?? []).map(rowToBook);
  const lists: ReadingList[] = (listsRes.data ?? []).map((r: any) => ({
    id: r.id, name: r.name, icon: r.icon, color: r.color, isSystem: r.is_system ?? false,
  }));
  const streak: Streak | null = streakRes.data
    ? {
        currentStreak: streakRes.data.current_streak ?? 0,
        longestStreak: streakRes.data.longest_streak ?? 0,
        lastReadDate: streakRes.data.last_read_date ?? null,
        history: streakRes.data.history ?? [],
      }
    : null;
  const theme: string | null = settingsRes.data?.theme ?? null;

  return { books, lists, streak, theme };
}

export async function upsertBookCloud(userId: string, book: Book) {
  if (!supabase) return;
  const { error } = await supabase.from('books').upsert(bookToRow(userId, book));
  if (error) console.error('Cloud upsertBook failed:', error.message);
}

export async function deleteBookCloud(userId: string, bookId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('books').delete().eq('user_id', userId).eq('id', bookId);
  if (error) console.error('Cloud deleteBook failed:', error.message);
}

export async function upsertListsCloud(userId: string, lists: ReadingList[]) {
  if (!supabase) return;
  const rows = lists.map((l) => ({
    user_id: userId, id: l.id, name: l.name, icon: l.icon, color: l.color, is_system: l.isSystem ?? false,
  }));
  const { error } = await supabase.from('lists').upsert(rows);
  if (error) console.error('Cloud upsertLists failed:', error.message);
}

export async function upsertStreakCloud(userId: string, streak: Streak) {
  if (!supabase) return;
  const { error } = await supabase.from('streaks').upsert({
    user_id: userId,
    current_streak: streak.currentStreak,
    longest_streak: streak.longestStreak,
    last_read_date: streak.lastReadDate,
    history: streak.history,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('Cloud upsertStreak failed:', error.message);
}

export async function upsertThemeCloud(userId: string, theme: string) {
  if (!supabase) return;
  const { error } = await supabase.from('settings').upsert({
    user_id: userId, theme, updated_at: new Date().toISOString(),
  });
  if (error) console.error('Cloud upsertTheme failed:', error.message);
}

// --- PDF file storage ---

function pdfPath(userId: string, bookId: string) {
  return `${userId}/${bookId}.pdf`;
}

export async function uploadPdfCloud(userId: string, bookId: string, blob: Blob) {
  if (!supabase) return;
  const { error } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(pdfPath(userId, bookId), blob, { upsert: true, contentType: 'application/pdf' });
  if (error) console.error('Cloud uploadPdf failed:', error.message);
}

export async function downloadPdfCloud(userId: string, bookId: string): Promise<Blob | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(pdfPath(userId, bookId));
  if (error) { console.error('Cloud downloadPdf failed:', error.message); return null; }
  return data ?? null;
}

export async function deletePdfCloud(userId: string, bookId: string) {
  if (!supabase) return;
  const { error } = await supabase.storage.from(PDF_BUCKET).remove([pdfPath(userId, bookId)]);
  if (error) console.error('Cloud deletePdf failed:', error.message);
}
