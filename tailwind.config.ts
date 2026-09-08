import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F8F9FA",
          tertiary: "#F1F3F5",
          card: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E5E7EB",
          subtle: "#F3F4F6",
          strong: "#000000",
        },
        accent: {
          DEFAULT: "#000000",
          hover: "#262626",
          glow: "rgba(0, 0, 0, 0.08)",
          dim: "rgba(0, 0, 0, 0.04)",
        },
        foreground: {
          DEFAULT: "#000000",
          muted: "#4B5563",
          subtle: "#9CA3AF",
        },
        status: {
          active: "#000000",
          inactive: "#9CA3AF",
          archived: "#4B5563",
          suspended: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 15px -3px rgba(0, 0, 0, 0.08)",
        "glow-sm": "0 0 8px -2px rgba(0, 0, 0, 0.06)",
        card: "0 2px 10px -1px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
