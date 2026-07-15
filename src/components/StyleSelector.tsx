import React from 'react';
import { THEMES } from '../lib/themes';
import { ThemeType, ThemeConfig } from '../types';
import { Sparkles, Palette, BookOpen, Moon, Book } from 'lucide-react';

interface StyleSelectorProps {
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  themeConfig: ThemeConfig;
}

export default function StyleSelector({
  currentTheme,
  onThemeChange,
  themeConfig,
}: StyleSelectorProps) {
  const themesList = Object.values(THEMES);

  return (
    <div className={`p-6 rounded-2xl border ${themeConfig.cardBg} ${themeConfig.border} shadow-sm transition-all duration-300`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${themeConfig.id === 'obsidian' ? 'bg-[#C5A059]/10' : 'bg-amber-100/60'}`}>
          <Palette className={`w-5 h-5 ${themeConfig.id === 'obsidian' ? 'text-[#C5A059]' : 'text-amber-800'}`} />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Vibe & Aesthetics</h2>
          <p className="text-xs opacity-75">Personalize your physical reading backdrop</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themesList.map((t) => {
          const isActive = currentTheme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all duration-300 hover:scale-[1.01] ${t.bg} ${t.text} ${
                isActive
                  ? t.id === 'obsidian'
                    ? 'ring-2 ring-[#C5A059]/60 scale-[1.02] border-[#C5A059]/50 shadow-sm'
                    : 'ring-2 ring-amber-600/50 scale-[1.02] border-amber-600/40 shadow-sm'
                  : 'border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300/60'
              }`}
            >
              {/* Vibe Preview Header */}
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-sm font-medium tracking-tight">{t.name}</span>
                {isActive && (
                  <span className="flex h-2 w-2 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${t.id === 'obsidian' ? 'bg-[#C5A059]' : 'bg-amber-500'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${t.id === 'obsidian' ? 'bg-[#C5A059]' : 'bg-amber-600'}`}></span>
                  </span>
                )}
              </div>

              {/* Theme Mockup Preview */}
              <div className={`w-full h-16 rounded-lg p-2 border ${t.cardBg} ${t.border} flex flex-col justify-between overflow-hidden text-[10px]`}>
                <div className="flex gap-1 items-center opacity-60">
                  {t.id === 'obsidian' ? <Moon className="w-3 h-3 text-[#C5A059]" /> : <BookOpen className="w-3 h-3" />}
                  <span className="font-mono">Page 14</span>
                </div>
                <div className={`font-serif leading-tight opacity-90 line-clamp-2`}>
                  {t.id === 'sepia' && "The warm afternoon sun cast golden rays across the room..."}
                  {t.id === 'obsidian' && "Golden threads weave wisdom into currently reading papers..."}
                  {t.id === 'paper' && "Standard editorial letters read with crisp literary accuracy..."}
                </div>
              </div>

              {/* Theme description badge */}
              <div className="mt-3 flex items-center justify-between w-full">
                <span className="text-[10px] opacity-70">
                  {t.id === 'sepia' && 'Cozy Paperback'}
                  {t.id === 'obsidian' && 'Premium Gold & Dark'}
                  {t.id === 'paper' && 'Crisp Literary'}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono border ${t.border} ${t.cardBg}`}>
                  {t.fontSerif === 'font-serif' ? 'Serif' : 'Sans'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
