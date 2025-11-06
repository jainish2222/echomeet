import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext();
const THEMES = ["lime", "rose", "orange", "purple"];

export function ThemeProvider({ children, defaultTheme = "lime" }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || defaultTheme);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, THEMES }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
