"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { toTiny } from "@/lib/tiny-text";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem("helios-theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to dark mode (night)
      setThemeState("dark");
      applyTheme("dark");
    }
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
      if (body) {
        body.classList.add("dark");
        body.classList.remove("light");
      }
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
      if (body) {
        body.classList.remove("dark");
        body.classList.add("light");
      }
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("helios-theme", newTheme);
    } catch (e) {
      console.warn("Could not persist theme to localStorage:", e);
    }
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 w-28 rounded-full bg-neutral-100 dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-white/[0.08] border border-neutral-200 dark:border-white/10 text-xs select-none shadow-2xs transition-all ${className}`}
    >
      <button
        type="button"
        id="theme-day-btn"
        onClick={() => setTheme("light")}
        title="Day Mode (Full White)"
        aria-label="Day Mode (Full White)"
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          !isDark
            ? "bg-white text-black shadow-xs border border-neutral-200/80 font-bold"
            : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
        }`}
      >
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>{toTiny("Day")}</span>
      </button>

      <button
        type="button"
        id="theme-night-btn"
        onClick={() => setTheme("dark")}
        title="Night Mode (Dark)"
        aria-label="Night Mode (Dark)"
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          isDark
            ? "bg-white text-black shadow-xs border border-white/20 font-bold"
            : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
        }`}
      >
        <Moon className="h-3.5 w-3.5 text-neutral-900 dark:text-black" />
        <span>{toTiny("Night")}</span>
      </button>
    </div>
  );
}
