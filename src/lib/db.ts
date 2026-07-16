import { Book, ReadingList, Streak } from '../types';

const DB_NAME = 'KindlePdfReaderDB';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store for book metadata
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      
      // Store for heavy PDF Blobs (separated for performance)
      if (!db.objectStoreNames.contains('pdf_files')) {
        db.createObjectStore('pdf_files');
      }
      
      // Store for reading lists
      if (!db.objectStoreNames.contains('lists')) {
        db.createObjectStore('lists', { keyPath: 'id' });
      }
      
      // Store for user stats / streaks
      if (!db.objectStoreNames.contains('streaks')) {
        db.createObjectStore('streaks');
      }

      // Store for settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };
  });
}

export async function saveBook(book: Book, pdfBlob?: Blob): Promise<void> {
  try {
    const db = await openDB();
    
    // Save metadata
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Save heavy file if provided
    if (pdfBlob) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('pdf_files', 'readwrite');
        const store = tx.objectStore('pdf_files');
        const request = store.put(pdfBlob, book.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('Failed to save book to IndexedDB:', error);
  }
}

export async function getBooks(): Promise<Book[]> {
  try {
    const db = await openDB();
    return await new Promise<Book[]>((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get books from IndexedDB:', error);
    return [];
  }
}

export async function savePdfBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pdf_files', 'readwrite');
      const request = tx.objectStore('pdf_files').put(blob, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to cache PDF blob to IndexedDB:', error);
  }
}

export async function getBookPdf(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction('pdf_files', 'readonly');
      const store = tx.objectStore('pdf_files');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get book PDF from IndexedDB:', error);
    return null;
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    const db = await openDB();
    
    // Delete metadata
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Delete PDF file
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pdf_files', 'readwrite');
      const store = tx.objectStore('pdf_files');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to delete book from IndexedDB:', error);
  }
}

export async function saveLists(lists: ReadingList[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('lists', 'readwrite');
    const store = tx.objectStore('lists');
    
    // Clear existing
    store.clear();
    
    for (const list of lists) {
      store.put(list);
    }
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save lists to IndexedDB:', error);
  }
}

export async function getLists(): Promise<ReadingList[]> {
  try {
    const db = await openDB();
    return await new Promise<ReadingList[]>((resolve, reject) => {
      const tx = db.transaction('lists', 'readonly');
      const store = tx.objectStore('lists');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get lists from IndexedDB:', error);
    return [];
  }
}

export async function saveStreak(streak: Streak): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('streaks', 'readwrite');
      const store = tx.objectStore('streaks');
      const request = store.put(streak, 'user_streak');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save streak to IndexedDB:', error);
  }
}

export async function getStreak(): Promise<Streak> {
  const defaultStreak: Streak = {
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    history: [],
  };

  try {
    const db = await openDB();
    return await new Promise<Streak>((resolve, reject) => {
      const tx = db.transaction('streaks', 'readonly');
      const store = tx.objectStore('streaks');
      const request = store.get('user_streak');
      request.onsuccess = () => {
        resolve(request.result || defaultStreak);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get streak from IndexedDB:', error);
    return defaultStreak;
  }
}

export async function saveTheme(theme: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put(theme, 'theme');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save theme setting to IndexedDB:', error);
  }
}

export async function getTheme(): Promise<string> {
  try {
    const db = await openDB();
    return await new Promise<string>((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('theme');
      request.onsuccess = () => resolve(request.result || 'obsidian');
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get theme from IndexedDB:', error);
    return 'obsidian';
  }
}
