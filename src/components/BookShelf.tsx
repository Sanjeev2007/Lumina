import React, { useState, useRef } from 'react';
import { Book, ReadingList, ThemeConfig } from '../types';
import {
  BookOpen, Plus, FolderPlus, ListFilter, Trash2, Edit2,
  Search, Upload, ArrowRight, Check, Star, Settings, ChevronDown,
  Grid, List as ListIcon, X, Tag, FileText, Bookmark, MessageSquare, AlertCircle,
  HardDrive, Cloud, Link2, Loader2, Download
} from 'lucide-react';

interface BookShelfProps {
  books: Book[];
  lists: ReadingList[];
  currentTheme: string;
  themeConfig: ThemeConfig;
  activeListId: string;
  onActiveListChange: (listId: string) => void;
  onUploadBook: (title: string, author: string, totalPages: number, listId: string, file: File) => void;
  onCreateList: (name: string, color: string, icon: string) => void;
  onUpdateBook: (updatedBook: Book) => void;
  onDeleteBook: (id: string) => void;
  onSelectBookToRead: (book: Book) => void;
}

export default function BookShelf({
  books,
  lists,
  themeConfig,
  activeListId,
  onActiveListChange,
  onUploadBook,
  onCreateList,
  onUpdateBook,
  onDeleteBook,
  onSelectBookToRead,
}: BookShelfProps) {
  // UI states
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);

  // Search and View states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'recently_read' | 'rating' | 'progress'>('recently_read');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form states - Upload
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadAuthor, setUploadAuthor] = useState<string>('');
  const [uploadPages, setUploadPages] = useState<number>(100);
  const [uploadListId, setUploadListId] = useState<string>('to-read');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload source tab + Google Drive link import
  const [uploadSource, setUploadSource] = useState<'device' | 'drive'>('device');
  const [driveLink, setDriveLink] = useState<string>('');
  const [driveLoading, setDriveLoading] = useState<boolean>(false);

  // Form states - Create List
  const [newListName, setNewListName] = useState<string>('');
  const [newListColor, setNewListColor] = useState<string>('amber');
  const [newListIcon, setNewListIcon] = useState<string>('tag');

  // Form states - Edit Book
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');
  const [editPages, setEditPages] = useState<number>(100);
  const [editCurrentPage, setEditCurrentPage] = useState<number>(0);
  const [editListId, setEditListId] = useState<string>('');

  // Handle Drag & Drop events
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadError('Please upload a valid PDF document.');
      return;
    }
    setUploadError('');
    setSelectedFile(file);
    
    // Auto-fill title from filename
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
    setUploadTitle(cleanName);
    setUploadAuthor('Self Uploaded');
  };

  // Extract a Google Drive file id from the many share-link formats users paste.
  const extractDriveFileId = (raw: string): string | null => {
    const url = raw.trim();
    if (!url) return null;
    // https://drive.google.com/file/d/FILE_ID/view  |  /d/FILE_ID (docs)
    const pathMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];
    // ...?id=FILE_ID  |  &id=FILE_ID  (open?id=, uc?id=)
    const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (queryMatch) return queryMatch[1];
    // Raw id pasted on its own
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
    return null;
  };

  // Fetch a "anyone with the link" Drive PDF and load it into the shared upload form.
  const handleFetchFromDrive = async () => {
    setUploadError('');
    const fileId = extractDriveFileId(driveLink);
    if (!fileId) {
      setUploadError("That doesn't look like a Google Drive link. Paste something like drive.google.com/file/d/FILE_ID/view");
      return;
    }

    setDriveLoading(true);
    try {
      // Same-origin proxy (api/drive.js) fetches from Google server-side,
      // sidestepping the browser CORS block on Drive's download endpoint.
      const res = await fetch(`/api/drive?id=${encodeURIComponent(fileId)}`);
      if (!res.ok) {
        let serverMsg = '';
        try {
          const j = await res.json();
          serverMsg = j?.error || '';
        } catch {
          /* body wasn't JSON */
        }
        throw new Error(serverMsg || `Drive request failed (${res.status}).`);
      }

      const blob = await res.blob();
      if (blob.type.includes('text/html') || blob.type.includes('application/json')) {
        throw new Error('This file is not publicly downloadable. Set sharing to “Anyone with the link”.');
      }
      if (blob.size === 0) throw new Error('The downloaded file was empty.');

      const file = new File([blob], `drive-${fileId}.pdf`, { type: 'application/pdf' });
      setSelectedFile(file);
      // Prefill metadata; the user can refine before adding to the shelf.
      if (!uploadTitle.trim()) setUploadTitle('Imported from Drive');
      if (!uploadAuthor.trim()) setUploadAuthor('Google Drive');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not fetch this file from Drive.');
    } finally {
      setDriveLoading(false);
    }
  };

  // Reset the whole upload modal to a clean state.
  const resetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadError('');
    setUploadSource('device');
    setDriveLink('');
    setDriveLoading(false);
  };

  const triggerUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF book to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please provide a book title.');
      return;
    }

    onUploadBook(uploadTitle, uploadAuthor, uploadPages, uploadListId, selectedFile);

    // Reset form
    setUploadTitle('');
    setUploadAuthor('');
    setUploadPages(100);
    setUploadListId('to-read');
    resetUploadModal();
  };

  const triggerCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    onCreateList(newListName.trim(), newListColor, newListIcon);
    setNewListName('');
    setShowListModal(false);
  };

  const triggerEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForEdit) return;

    const validatedCurrentPage = Math.min(editCurrentPage, editPages);

    const updatedBook: Book = {
      ...selectedBookForEdit,
      title: editTitle.trim() || selectedBookForEdit.title,
      author: editAuthor.trim() || selectedBookForEdit.author,
      totalPages: editPages || 100,
      currentPage: validatedCurrentPage,
      listId: editListId,
    };

    onUpdateBook(updatedBook);
    setShowEditModal(false);
    setSelectedBookForEdit(null);
  };

  const openEditModal = (book: Book) => {
    setSelectedBookForEdit(book);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditPages(book.totalPages);
    setEditCurrentPage(book.currentPage);
    setEditListId(book.listId);
    setShowEditModal(true);
  };

  // Filter books by active list and search text
  const filteredBooks = books
    .filter((book) => {
      // List check
      if (activeListId !== 'all') {
        if (activeListId === 'reading') {
          return book.listId === 'reading';
        } else if (activeListId === 'to-read') {
          return book.listId === 'to-read';
        } else if (activeListId === 'completed') {
          return book.listId === 'completed';
        } else {
          return book.listId === activeListId;
        }
      }
      return true;
    })
    .filter((book) => {
      // Search check
      const query = searchQuery.toLowerCase();
      return (
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      );
    });

  // Sort filtered books
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'recently_read') {
      return new Date(b.lastReadDate).getTime() - new Date(a.lastReadDate).getTime();
    }
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'progress') {
      const aPercent = (a.currentPage / a.totalPages) || 0;
      const bPercent = (b.currentPage / b.totalPages) || 0;
      return bPercent - aPercent;
    }
    return 0;
  });

  const LIST_COLORS = [
    { name: 'amber', bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200' },
    { name: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200' },
    { name: 'sky', bg: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200' },
    { name: 'rose', bg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200' },
    { name: 'violet', bg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      
      {/* LEFT NAVIGATION PANEL: Reading Lists / Collections */}
      <div className="md:col-span-1 space-y-6">
        
        {/* Quick Lists Drawer Panel */}
        <div className={`p-5 rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-sm transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm tracking-tight opacity-70 uppercase">My Collections</h3>
            <button
              onClick={() => setShowListModal(true)}
              className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer`}
              title="Create Custom Collection"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {/* System list: All */}
            <button
              onClick={() => onActiveListChange('all')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-sm transition-all cursor-pointer ${
                activeListId === 'all' 
                  ? themeConfig.id === 'obsidian'
                    ? 'bg-[#1A1A1A] text-[#C5A059] font-semibold border-l-4 border-[#C5A059]'
                    : 'bg-amber-600/10 text-amber-900 dark:text-amber-300 font-semibold border-l-4 border-amber-600' 
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 opacity-75" />
                <span>All Books</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono">{books.length}</span>
            </button>

            {/* Render lists */}
            {lists.map((list) => {
              const listCount = books.filter((b) => b.listId === list.id).length;
              const isActive = activeListId === list.id;
              
              return (
                <button
                  key={list.id}
                  onClick={() => onActiveListChange(list.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-sm transition-all cursor-pointer ${
                    isActive
                      ? themeConfig.id === 'obsidian'
                        ? 'bg-[#1A1A1A] text-[#C5A059] font-semibold border-l-4 border-[#C5A059]'
                        : 'bg-amber-600/10 text-amber-900 dark:text-amber-300 font-semibold border-l-4 border-amber-600'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Tag className={`w-4 h-4 text-current opacity-75`} />
                    <span>{list.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-mono">{listCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action widget: Upload quick button */}
        <button
          onClick={() => setShowUploadModal(true)}
          className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-white font-medium text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${themeConfig.accent} ${themeConfig.accentHover}`}
        >
          <Upload className="w-4 h-4" /> Upload Ebook PDF
        </button>
      </div>

      {/* RIGHT MAIN PANEL: Bookshelf and Search */}
      <div className="md:col-span-3 space-y-6">
        
        {/* Search, Filter, Sort and View Selection Header */}
        <div className={`p-4 rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300`}>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
            />
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-2 text-xs">
              <ListFilter className="w-3.5 h-3.5 opacity-60" />
              <span className="opacity-70 uppercase font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className={`px-2 py-1 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.border}`}
              >
                <option value="recently_read">Recent activity</option>
                <option value="title">Alphabetical title</option>
                <option value="rating">High Rating</option>
                <option value="progress">Reading progress</option>
              </select>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5 border-zinc-200/50 dark:border-zinc-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-amber-600/10 text-amber-900 dark:text-amber-400' : 'opacity-60'}`}
                title="Grid layout"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'list' ? 'bg-amber-600/10 text-amber-900 dark:text-amber-400' : 'opacity-60'}`}
                title="List layout"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Books display area */}
        {sortedBooks.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} border-dashed`}>
            <div className="flex justify-center mb-4">
              <BookOpen className="w-12 h-12 text-amber-700 opacity-60" />
            </div>
            <h4 className="font-semibold text-lg">No books found</h4>
            <p className="text-xs opacity-70 mt-1 max-w-sm mx-auto">
              {searchQuery 
                ? "We couldn't find any books matching that search criteria. Try another word."
                : "Your collection is empty. Upload your first PDF book to start tracking and reading!"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-4 py-2 rounded-xl text-white text-xs font-semibold bg-amber-700 hover:bg-amber-800 transition-all cursor-pointer"
              >
                Upload First Book
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBooks.map((book) => {
              const progressVal = Math.round((book.currentPage / book.totalPages) * 100) || 0;
              const belongsToList = lists.find((l) => l.id === book.listId);
              
              return (
                <div
                  key={book.id}
                  className={`group relative rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} hover:border-amber-600/30 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between`}
                >
                  <div>
                    {/* List Tag */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        belongsToList?.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200' :
                        belongsToList?.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200' :
                        belongsToList?.color === 'sky' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200' :
                        belongsToList?.color === 'rose' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200' :
                        'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200'
                      }`}>
                        <Tag className="w-2.5 h-2.5" />
                        {belongsToList?.name || 'Reading'}
                      </span>

                      {/* Delete book option */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(book)}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 cursor-pointer"
                          title="Edit details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteBook(book.id)}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-red-500 hover:text-red-600 cursor-pointer"
                          title="Delete book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Book Cover mock-ups / Title */}
                    <div className="space-y-1 mt-1">
                      <h4 className={`font-semibold text-sm leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors ${themeConfig.fontSerif} line-clamp-2`}>
                        {book.title}
                      </h4>
                      <p className="text-xs opacity-75 truncate">{book.author}</p>
                    </div>

                    {/* Stats icons */}
                    <div className="flex gap-2.5 items-center mt-3 text-[10px] opacity-60">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {book.totalPages} Pages</span>
                      {(book.bookmarks?.length || 0) > 0 && (
                        <span className="flex items-center gap-0.5"><Bookmark className="w-3 h-3 text-amber-600" /> {book.bookmarks.length}</span>
                      )}
                      {(book.notes?.length || 0) > 0 && (
                        <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3 text-blue-600" /> {book.notes.length}</span>
                      )}
                    </div>
                  </div>

                  {/* Rating / Progress indicator */}
                  <div className="mt-5 space-y-4 pt-4 border-t border-zinc-200/20 dark:border-zinc-800/20">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] opacity-75">
                        <span>PAGE {book.currentPage} OF {book.totalPages}</span>
                        <span className="font-mono">{progressVal}%</span>
                      </div>
                      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${themeConfig.id === 'obsidian' ? 'bg-[#C5A059]' : 'bg-amber-600'}`}
                          style={{ width: `${progressVal}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Book Rating representation */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= (book.rating || 0)
                                ? themeConfig.id === 'obsidian'
                                  ? 'text-[#C5A059] fill-[#C5A059]'
                                  : 'text-amber-500 fill-amber-500'
                                : 'text-zinc-300 dark:text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => onSelectBookToRead(book)}
                        className={`py-1.5 px-3.5 rounded-xl text-white font-medium text-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.01] ${themeConfig.accent} ${themeConfig.accentHover}`}
                      >
                        {book.currentPage > 0 ? 'Resume' : 'Read'} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className={`rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} overflow-hidden shadow-sm transition-colors duration-300`}>
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className={`border-b ${themeConfig.border} bg-black/5 dark:bg-white/5 opacity-80 text-[10px] uppercase tracking-wider font-mono`}>
                  <th className="p-4">Book Details</th>
                  <th className="p-4 hidden sm:table-cell">Collection</th>
                  <th className="p-4 hidden md:table-cell">Rating</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/10">
                {sortedBooks.map((book) => {
                  const progressVal = Math.round((book.currentPage / book.totalPages) * 100) || 0;
                  const belongsToList = lists.find((l) => l.id === book.listId);
                  
                  return (
                    <tr key={book.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="font-semibold text-sm truncate max-w-xs">{book.title}</div>
                        <div className="text-xs opacity-75 truncate max-w-xs">{book.author}</div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                          belongsToList?.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200' :
                          belongsToList?.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200' :
                          belongsToList?.color === 'sky' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200' :
                          belongsToList?.color === 'rose' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200' :
                          'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200'
                        }`}>
                          {belongsToList?.name || 'Reading'}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= (book.rating || 0)
                                  ? themeConfig.id === 'obsidian'
                                    ? 'text-[#C5A059] fill-[#C5A059]'
                                    : 'text-amber-500 fill-amber-500'
                                  : 'text-zinc-300 dark:text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 w-32 sm:w-48">
                          <div className="flex-1">
                            <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${themeConfig.id === 'obsidian' ? 'bg-[#C5A059]' : 'bg-amber-600'}`}
                                style={{ width: `${progressVal}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] opacity-60 mt-1 font-mono">{book.currentPage} / {book.totalPages} Pages</div>
                          </div>
                          <span className="font-mono font-medium">{progressVal}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectBookToRead(book)}
                            className={`py-1 px-3 rounded-lg text-white font-medium text-xs cursor-pointer transition-all ${themeConfig.accent} ${themeConfig.accentHover}`}
                          >
                            Read
                          </button>
                          
                          {/* Options */}
                          <button
                            onClick={() => openEditModal(book)}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteBook(book.id)}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-red-500 hover:text-red-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL 1: UPLOAD BOOK MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 ${themeConfig.cardBg} ${themeConfig.border} shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}>
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/20">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold tracking-tight">Add Book PDF</h3>
              </div>
              <button
                onClick={resetUploadModal}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={triggerUploadSubmit} className="space-y-4 overflow-y-auto pr-1">

              {/* Source tab switcher: local device vs. Google Drive link */}
              <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${themeConfig.border} bg-black/5 dark:bg-white/5`}>
                <button
                  type="button"
                  onClick={() => { setUploadSource('device'); setUploadError(''); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    uploadSource === 'device'
                      ? `${themeConfig.cardBg} shadow-sm text-amber-700 dark:text-amber-400`
                      : 'opacity-60 hover:opacity-90'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" /> My Device
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadSource('drive'); setUploadError(''); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    uploadSource === 'drive'
                      ? `${themeConfig.cardBg} shadow-sm text-amber-700 dark:text-amber-400`
                      : 'opacity-60 hover:opacity-90'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" /> Google Drive
                </button>
              </div>

              {/* SOURCE: My Device — drag & drop / browse */}
              {uploadSource === 'device' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                  isDragging
                    ? 'border-amber-600 bg-amber-600/5'
                    : selectedFile
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-zinc-300 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">PDF SELECTED</p>
                    <p className="text-xs opacity-75 truncate max-w-xs mx-auto">{selectedFile.name}</p>
                    <p className="text-[10px] opacity-60 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-600/10 text-amber-700 dark:text-amber-400 rounded-full w-11 h-11 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold">Drag & drop your PDF here, or click to browse</p>
                    <p className="text-[10px] opacity-60">Any Standard Ebook / Novel PDF. Max recommended size: 45MB.</p>
                  </div>
                )}
              </div>
              )}

              {/* SOURCE: Google Drive — paste a share link */}
              {uploadSource === 'drive' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold opacity-80 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Google Drive share link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/…/view"
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchFromDrive(); } }}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                      />
                      <button
                        type="button"
                        onClick={handleFetchFromDrive}
                        disabled={driveLoading || !driveLink.trim()}
                        className={`px-3 py-2 rounded-lg text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                          driveLoading || !driveLink.trim()
                            ? 'bg-zinc-400 opacity-55 cursor-not-allowed'
                            : themeConfig.accent + ' ' + themeConfig.accentHover + ' cursor-pointer'
                        }`}
                      >
                        {driveLoading
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching</>
                          : <><Download className="w-3.5 h-3.5" /> Fetch</>}
                      </button>
                    </div>
                    <p className="text-[10px] opacity-60 leading-relaxed">
                      The file must be shared as <span className="font-semibold">“Anyone with the link”</span>. In Drive: Share → General access → Anyone with the link, then copy the link here.
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-full shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Fetched from Drive</p>
                        <p className="text-[10px] opacity-70 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — ready to add below</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-lg bg-red-100 text-red-800 border border-red-200/50 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Book Info Metadata */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold opacity-80">Book Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Meditations"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold opacity-80">Author</label>
                    <input
                      type="text"
                      placeholder="e.g. Marcus Aurelius"
                      value={uploadAuthor}
                      onChange={(e) => setUploadAuthor(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold opacity-80">Total Pages</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 180"
                      value={uploadPages}
                      onChange={(e) => setUploadPages(parseInt(e.target.value) || 100)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold opacity-80">Initial Collection</label>
                    <select
                      value={uploadListId}
                      onChange={(e) => setUploadListId(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                    >
                      <option value="to-read">To Read (Pending)</option>
                      <option value="reading">Currently Reading</option>
                      <option value="completed">Completed</option>
                      {lists.filter(l => !l.isSystem).map((customList) => (
                        <option key={customList.id} value={customList.id}>
                          {customList.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="pt-4 border-t border-zinc-200/20 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetUploadModal}
                  className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || !uploadTitle.trim()}
                  className={`px-4 py-2 rounded-xl text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    selectedFile && uploadTitle.trim()
                      ? themeConfig.accent + ' ' + themeConfig.accentHover
                      : 'bg-zinc-400 opacity-55 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Bookshelf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE LIST MODAL */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-sm rounded-2xl border p-6 ${themeConfig.cardBg} ${themeConfig.border} shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm tracking-tight uppercase opacity-80">New Collection</h3>
              <button
                onClick={() => setShowListModal(false)}
                className="p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={triggerCreateListSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-80">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic Philosophy"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                />
              </div>

              {/* Color selectors */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold opacity-80">Visual Badge Accent</label>
                <div className="flex items-center gap-2">
                  {LIST_COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setNewListColor(col.name)}
                      className={`w-7 h-7 rounded-full cursor-pointer border flex items-center justify-center ${
                        col.name === 'amber' ? 'bg-amber-500' :
                        col.name === 'emerald' ? 'bg-emerald-500' :
                        col.name === 'sky' ? 'bg-sky-500' :
                        col.name === 'rose' ? 'bg-rose-500' : 'bg-violet-500'
                      } ${newListColor === col.name ? 'ring-2 ring-amber-600 ring-offset-2 ring-offset-neutral-100' : ''}`}
                    >
                      {newListColor === col.name && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  className={`px-4 py-2 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all ${
                    newListName.trim()
                      ? themeConfig.accent + ' ' + themeConfig.accentHover
                      : 'bg-zinc-400 opacity-55 cursor-not-allowed'
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT BOOK DETAILS MODAL */}
      {showEditModal && selectedBookForEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-2xl border p-6 ${themeConfig.cardBg} ${themeConfig.border} shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm tracking-tight uppercase opacity-80">Edit Book Details</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBookForEdit(null);
                }}
                className="p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={triggerEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-80">Book Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-80">Author</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold opacity-80">Current Page</label>
                  <input
                    type="number"
                    min="0"
                    max={editPages}
                    value={editCurrentPage}
                    onChange={(e) => setEditCurrentPage(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold opacity-80">Total Pages</label>
                  <input
                    type="number"
                    min="1"
                    value={editPages}
                    onChange={(e) => setEditPages(parseInt(e.target.value) || 100)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-80">Change Collection</label>
                <select
                  value={editListId}
                  onChange={(e) => setEditListId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                >
                  <option value="to-read">To Read</option>
                  <option value="reading">Currently Reading</option>
                  <option value="completed">Completed</option>
                  {lists.filter(l => !l.isSystem).map((customList) => (
                    <option key={customList.id} value={customList.id}>
                      {customList.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedBookForEdit(null);
                  }}
                  className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all ${themeConfig.accent} ${themeConfig.accentHover}`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
