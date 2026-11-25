/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Architectural Daylight Paper & Ink (Public Web Pages)
        studio: {
          bg: '#F6F5F0',
          paper: '#FFFFFF',
          muted: '#ECEAE3',
          border: '#E2DFD5',
          ink: '#0F1419',
          sub: '#475569',
          faint: '#64748B',
        },
        // Matte Obsidian Telemetry Tokens (Simulator /play)
        arena: {
          bg: '#0C0F13',
          panel: '#141920',
          elevated: '#1D242E',
          border: '#28313E',
          text: '#F8FAFC',
          muted: '#94A3B8',
          faint: '#64748B',
        },
        // High-Contrast Sport Accents
        emerald: {
          DEFAULT: '#059669',
          bright: '#10B981',
          dark: '#047857',
        },
        cobalt: {
          DEFAULT: '#0284C7',
          bright: '#38BDF8',
        },
        // Preserve legacy token aliases mapped cleanly to new design palette
        felt: {
          darkest: '#0B1310',
          surface: '#059669',
          light: '#10B981',
          accent: '#34D399',
          border: '#1F3A2F',
        },
        surface: {
          base: '#0C0F13',
          card: '#141920',
          elevated: '#1D242E',
          subtle: '#28313E',
        },
        brass: {
          primary: '#10B981',
          hover: '#34D399',
          muted: '#059669',
          dark: '#064E3B',
        },
        chalk: {
          cyan: '#38BDF8',
        },
        ivory: {
          pure: '#FFFFFF',
          text: '#F8FAFC',
          muted: '#94A3B8',
          faint: '#64748B',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'felt-inset': 'inset 0 2px 16px rgba(0, 0, 0, 0.45)',
        'brass-glow': '0 6px 24px rgba(16, 185, 129, 0.25)',
        'paper': '0 1px 2px rgba(15, 20, 25, 0.04), 0 12px 32px rgba(15, 20, 25, 0.06)',
        'stage': '0 24px 64px -16px rgba(15, 20, 25, 0.22)',
      },
    },
  },
  plugins: [],
};
