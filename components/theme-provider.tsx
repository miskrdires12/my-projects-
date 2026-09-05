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
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 px-3 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 flex items-center gap-1.5 ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      id="theme-toggle-btn"
      title={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
      aria-label={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
      className={`group relative h-9 px-3 rounded-full border transition-all duration-200 cursor-pointer flex items-center gap-2 font-medium text-xs select-none ${
        isDark
          ? "bg-[#181820] hover:bg-[#22222c] border-white/20 text-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.15)] active:scale-95"
          : "bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-900 shadow-sm active:scale-95"
      } ${className}`}
    >
      <span className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 text-amber-300" />
        ) : (
          <Moon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45 text-neutral-900" />
        )}
      </span>
      <span className="font-semibold tracking-wide">
        {isDark ? toTiny("Day Mode") : toTiny("Night Mode")}
      </span>
    </button>
  );
}
