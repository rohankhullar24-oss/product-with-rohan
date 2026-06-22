"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme on mount
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    setTheme(initialTheme);
    applyThemeToDOM(initialTheme);
    setMounted(true);
  }, []);

  const applyThemeToDOM = (theme: Theme) => {
    // Apply dark class to HTML
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      // Remove light mode classes and add dark mode classes
      document.body.classList.remove("bg-white", "text-navy");
      document.body.classList.add("dark:bg-slate-950", "dark:text-slate-100");
      // Also apply inline styles for body to ensure dark mode is visible
      document.body.style.backgroundColor = "#0f172a !important";
      document.body.style.color = "#f1f5f9 !important";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark:bg-slate-950", "dark:text-slate-100");
      document.body.classList.add("bg-white", "text-navy");
      document.body.style.backgroundColor = "#ffffff !important";
      document.body.style.color = "#0f172a !important";
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyThemeToDOM(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return safe default if used outside provider
    return {
      theme: "light" as Theme,
      toggleTheme: () => {},
    };
  }
  return context;
}
