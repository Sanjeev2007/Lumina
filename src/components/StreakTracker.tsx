import React from 'react';
import { Streak, ThemeConfig, Book } from '../types';
import { Flame, Trophy, Calendar, CheckCircle, BarChart3, Clock, BookOpen, MessageSquare } from 'lucide-react';

interface StreakTrackerProps {
  streak: Streak;
  themeConfig: ThemeConfig;
  books: Book[];
}

export default function StreakTracker({ streak, themeConfig, books }: StreakTrackerProps) {
  // Generate last 30 days history for grid representation
  const generateLast30Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const hasRead = streak.history.includes(dateStr);
      const isToday = i === 0;
      
      days.push({
        date: d,
        dateStr,
        hasRead,
        isToday,
        dayLabel: d.getDate(),
        monthLabel: d.toLocaleDateString('default', { month: 'short' }),
        dayOfWeek: d.toLocaleDateString('default', { weekday: 'narrow' }),
      });
    }
    return days;
  };

  const activityDays = generateLast30Days();
  const readToday = activityDays[activityDays.length - 1].hasRead;

  // Stats summaries
  const totalBooks = books.length;
  const completedBooks = books.filter((b) => b.listId === 'completed' || b.currentPage === b.totalPages).length;
  const activeBooks = books.filter((b) => b.currentPage > 0 && b.currentPage < b.totalPages).length;
  const totalNotes = books.reduce((acc, b) => acc + (b.notes?.length || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Streak Stats Panel */}
      <div className={`p-6 rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-sm lg:col-span-1 flex flex-col justify-between transition-all duration-300`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500 animate-pulse fill-orange-500" />
              <h3 className="font-semibold text-lg tracking-tight">Daily Streak</h3>
            </div>
            {readToday ? (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/50 flex items-center gap-1 font-medium font-sans">
                <CheckCircle className="w-3 h-3" /> Completed Today
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100/60 text-amber-800 border border-amber-200/30 flex items-center gap-1 font-medium font-sans">
                <Clock className="w-3 h-3 animate-spin" /> Pending Today
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 my-4">
            <span className="text-5xl font-bold font-sans tracking-tight">{streak.currentStreak}</span>
            <span className="text-sm opacity-70">days in a row</span>
          </div>

          <p className="text-xs opacity-70 leading-relaxed mb-6">
            {readToday 
              ? "Magnificent job! Today's reading goal is complete. Keep the momentum going tomorrow."
              : "Read at least one page or log some reading notes today to maintain and grow your streak!"}
          </p>
        </div>

        <div className={`pt-4 border-t ${themeConfig.border} grid grid-cols-2 gap-4`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs opacity-60 mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Record Streak</span>
            </div>
            <span className="text-lg font-bold font-sans">{streak.longestStreak} days</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs opacity-60 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Days Logged</span>
            </div>
            <span className="text-lg font-bold font-sans">{streak.history.length} days</span>
          </div>
        </div>
      </div>

      {/* Grid Heatmap Visual */}
      <div className={`p-6 rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-sm lg:col-span-2 flex flex-col justify-between transition-all duration-300`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 opacity-80" />
              <h3 className="font-semibold text-base tracking-tight">Consistency Grid</h3>
            </div>
            <span className="text-xs opacity-60 font-mono">Last 30 Days</span>
          </div>

          {/* Grid Render */}
          <div className="grid grid-cols-10 gap-2 mb-4 mt-3">
            {activityDays.map((day, idx) => {
              return (
                <div
                  key={idx}
                  title={`${day.date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}: ${day.hasRead ? 'Read' : 'No Reading Activity'}`}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[9px] relative group transition-all duration-300 cursor-help ${
                    day.hasRead
                      ? themeConfig.id === 'obsidian'
                        ? 'bg-[#C5A059] text-[#0A0A0A] shadow-sm font-bold'
                        : 'bg-amber-600/90 text-white shadow-sm font-semibold'
                      : 'bg-zinc-200/50 dark:bg-zinc-800/40 opacity-55'
                  } ${day.isToday ? (themeConfig.id === 'obsidian' ? 'ring-2 ring-[#C5A059] ring-offset-2 ring-offset-neutral-900' : 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-neutral-100 dark:ring-offset-neutral-900') : ''}`}
                >
                  <span className="font-mono">{day.dayLabel}</span>
                  <span className="text-[7px] uppercase font-sans tracking-tighter opacity-70">
                    {day.monthLabel}
                  </span>

                  {/* Desktop Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-neutral-900 text-white text-[10px] rounded p-2 text-center shadow-lg">
                      {day.monthLabel} {day.dayLabel}
                      <div className={`font-semibold mt-0.5 ${themeConfig.id === 'obsidian' ? 'text-[#C5A059]' : 'text-amber-400'}`}>
                        {day.hasRead ? '✓ Completed' : '○ Not yet logged'}
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-neutral-900 rotate-45 mx-auto -mt-1"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Reading Metrics Summary */}
        <div className={`pt-4 border-t ${themeConfig.border} grid grid-cols-3 gap-2 text-center`}>
          <div className="flex flex-col items-center">
            <BookOpen className="w-4 h-4 text-amber-700/80 mb-1" />
            <span className="text-xs opacity-60">Total Library</span>
            <span className="text-base font-bold font-sans mt-0.5">{totalBooks}</span>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle className="w-4 h-4 text-emerald-600/80 mb-1" />
            <span className="text-xs opacity-60">Completed</span>
            <span className="text-base font-bold font-sans mt-0.5">{completedBooks}</span>
          </div>
          <div className="flex flex-col items-center">
            <MessageSquare className="w-4 h-4 text-blue-600/80 mb-1" />
            <span className="text-xs opacity-60">Bookmarks & Notes</span>
            <span className="text-base font-bold font-sans mt-0.5">{totalNotes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
