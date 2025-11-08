// theme/ThemeProvider.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

/* ---------------- ACCENT COLORS (Modern Startup Palette) ---------------- */
const ACCENTS = {
  azure: { 500: "59 130 246", 600: "37 99 235" },     // Stripe / Google blue
  indigo: { 500: "99 102 241", 600: "79 70 229" },    // Linear / Vercel purple-blue
  emerald: { 500: "16 185 129", 600: "5 150 105" },   // Fintech green
  rose: { 500: "236 72 153", 600: "219 39 119" },     // Figma pink
};

/* ---------------- BACKGROUND THEMES (Big Tech Inspired) ---------------- */
const BGS = {
  dark: {
    bg: "13 17 23",
    surface: "22 27 34",
    text: "240 240 240",
    muted: "160 160 160",
    border: "42 47 55",
  },
  light: {
    bg: "250 250 250",
    surface: "255 255 255",
    text: "20 20 20",
    muted: "100 100 100",
    border: "230 230 230",
  },
  neutral: {
    bg: "245 245 245",
    surface: "255 255 255",
    text: "25 25 25",
    muted: "105 105 105",
    border: "220 220 220",
  },
  black: {
    bg: "10 10 10",
    surface: "25 25 25",
    text: "235 235 235",
    muted: "155 155 155",
    border: "45 45 45",
  },
};

/* ---------------- APPLY THEME ---------------- */
function applyTheme(bgKey, accentKey) {
  const root = document.documentElement;
  const bg = BGS[bgKey];
  const ac = ACCENTS[accentKey];

  if (!bg) console.warn(`[ThemeProvider] Unknown bg "${bgKey}" → using dark`);
  if (!ac) console.warn(`[ThemeProvider] Unknown accent "${accentKey}" → using indigo`);

  const bgTheme = bg || BGS.dark;
  const acTheme = ac || ACCENTS.indigo;

  // Apply base colors
  root.style.setProperty("--bg", bgTheme.bg);
  root.style.setProperty("--surface", bgTheme.surface);
  root.style.setProperty("--text", bgTheme.text);
  root.style.setProperty("--muted", bgTheme.muted);
  root.style.setProperty("--border", bgTheme.border);
  root.style.setProperty("--accent-500", acTheme[500]);
  root.style.setProperty("--accent-600", acTheme[600]);

  root.setAttribute("data-bg", bgKey);
  root.setAttribute("data-accent", accentKey);
}

/* ---------------- PROVIDER ---------------- */
export const ThemeProvider = ({ children }) => {
  const [bg, setBg] = useState("dark");
  const [accent, setAccent] = useState("indigo");

  useEffect(() => {
    applyTheme(bg, accent);
  }, [bg, accent]);

  const THEMES = Object.keys(ACCENTS);
  const BGTHEMES = Object.keys(BGS);

  return (
    <ThemeContext.Provider value={{ bg, setBg, accent, setAccent, THEMES, BGTHEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

/* ---------------- HOOK ---------------- */
export const useTheme = () => useContext(ThemeContext);
