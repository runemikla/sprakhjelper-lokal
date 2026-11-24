import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-roboto)', 'system-ui', 'sans-serif'],
        slab: ['var(--font-roboto-slab)', 'Georgia', 'serif'],
      },
      colors: {
        // Vestland fylkeskommune's profile colours. Use them as surfaces
        // (boxes, tiles, chart bars) with ink text, never as text on white.
        // The dark blue in the coat of arms is not a profile colour.
        vlfk: {
          ink: '#1D1D1B',
          'ink-muted': '#5C5C59',
          'surface-muted': '#F4F4F2',
          lyseblaa: '#9ADBE8',
          'mork-rosa': '#E06287',
          lilla: '#CAA2DD',
          limegronn: '#E1D555',
          turkis: '#00C7B1',
          lysegronn: '#B7DD79',
          gul: '#FDDA25',
          'rod-oransje': '#FF5C39',
          morkegronn: '#50A684',
          mint: '#3CDBC0',
          oransje: '#FF9E1B',
          'lys-rosa': '#F8B5C4',
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        // VLFK profile: small, sharp corners. 8px for panels and cards,
        // 4px for buttons, fields and inner boxes, 2px for tags.
        "3xl": "8px",
        "2xl": "8px",
        xl: "8px",
        lg: "4px",
        md: "4px",
        DEFAULT: "4px",
        sm: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

