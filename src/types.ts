export interface BookNote {
  id: string;
  page: number;
  text: string;
  date: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  lastReadDate: string;
  dateAdded: string;
  listId: string;
  fileSize: string;
  notes: BookNote[];
  bookmarks: number[];
  rating?: number;
}

export interface ReadingList {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class prefix (e.g. "amber", "emerald", "sky")
  isSystem?: boolean;
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  history: string[]; // List of YYYY-MM-DD dates the user read
}

export type ThemeType = 'sepia' | 'obsidian' | 'paper';

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  bg: string;
  cardBg: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentHover: string;
  fontSerif: string;
  navbarBg: string;
  statusBarBg: string;
}
