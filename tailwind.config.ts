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
        background: "#000000",
        surface: {
          DEFAULT: "#0D0F12",
          secondary: "#16191E",
          tertiary: "#1D2128",
          card: "#0F1217",
        },
        border: {
          DEFAULT: "#22272F",
          subtle: "#1B2026",
          strong: "#2E3642",
        },
        accent: {
          DEFAULT: "#37E310",
          hover: "#2fc70e",
          glow: "rgba(55, 227, 16, 0.25)",
          dim: "rgba(55, 227, 16, 0.1)",
        },
        foreground: {
          DEFAULT: "#FFFFFF",
          muted: "#9CA3AF",
          subtle: "#6B7280",
        },
        status: {
          active: "#37E310",
          inactive: "#6B7280",
          archived: "#EF4444",
          suspended: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(55, 227, 16, 0.3)",
        "glow-sm": "0 0 10px -2px rgba(55, 227, 16, 0.25)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
