import { ThemeConfig } from '../types';

export const THEMES: Record<string, ThemeConfig> = {
  sepia: {
    id: 'sepia',
    name: 'Warm Sepia',
    bg: 'bg-[#FAF6EE]',
    cardBg: 'bg-[#F3ECE0]',
    text: 'text-[#2B1B10]',
    textMuted: 'text-[#705A4A]',
    border: 'border-[#E8DFD0]',
    accent: 'bg-[#9E6D47]',
    accentHover: 'hover:bg-[#835634]',
    fontSerif: 'font-serif',
    navbarBg: 'bg-[#F3ECE0]',
    statusBarBg: 'bg-[#FAF6EE]'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Sophisticated Dark',
    bg: 'bg-[#0A0A0A]',
    cardBg: 'bg-[#141414]',
    text: 'text-[#E5E5E5]',
    textMuted: 'text-[#8E8E93]',
    border: 'border-[#262626]',
    accent: 'bg-[#C5A059]',
    accentHover: 'hover:bg-[#B38F46]',
    fontSerif: 'font-serif',
    navbarBg: 'bg-[#141414]',
    statusBarBg: 'bg-[#0A0A0A]'
  },
  paper: {
    id: 'paper',
    name: 'Editorial Paper',
    bg: 'bg-[#FCFCFC]',
    cardBg: 'bg-[#F5F5F5]',
    text: 'text-[#111111]',
    textMuted: 'text-[#666666]',
    border: 'border-[#E5E5E5]',
    accent: 'bg-[#111111]',
    accentHover: 'hover:bg-[#333333]',
    fontSerif: 'font-serif',
    navbarBg: 'bg-[#F5F5F5]',
    statusBarBg: 'bg-[#FCFCFC]'
  }
};
