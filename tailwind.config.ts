import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      fontFamily: {
        // Inter injetada via next/font (variável --font-inter)
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Namespace oficial Nummiq (DS §79) — theme-aware via canais RGB
        nummiq: {
          black: "rgb(var(--nq-bg) / <alpha-value>)",
          soft: "rgb(var(--nq-bg-soft) / <alpha-value>)",
          surface1: "rgb(var(--nq-surface-1) / <alpha-value>)",
          surface2: "rgb(var(--nq-surface-2) / <alpha-value>)",
          surface3: "rgb(var(--nq-surface-3) / <alpha-value>)",
          surface4: "rgb(var(--nq-surface-4) / <alpha-value>)",
          platinum: "rgb(var(--nq-platinum) / <alpha-value>)",
          silver: "rgb(var(--nq-silver) / <alpha-value>)",
          white: "rgb(var(--nq-white) / <alpha-value>)",
          muted: "rgb(var(--nq-muted) / <alpha-value>)",
          success: "rgb(var(--nq-success) / <alpha-value>)",
          danger: "rgb(var(--nq-danger) / <alpha-value>)",
          warning: "rgb(var(--nq-warning) / <alpha-value>)",
          info: "rgb(var(--nq-info) / <alpha-value>)",
        },
        // Semânticos legados (rebaseados aos valores Nummiq em globals.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "rgb(var(--nq-success) / <alpha-value>)",
        danger: "rgb(var(--nq-danger) / <alpha-value>)",
        warning: "rgb(var(--nq-warning) / <alpha-value>)",
        info: "rgb(var(--nq-info) / <alpha-value>)",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        // aliases legados (shadcn) para não quebrar componentes existentes
        DEFAULT: "10px",
      },
      transitionTimingFunction: {
        nq: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      boxShadow: {
        nq: "0 0 0 1px rgba(255,255,255,.04), 0 12px 40px rgba(0,0,0,.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
