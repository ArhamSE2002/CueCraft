/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        felt: {
          darkest: '#041B11',
          surface: '#0B3B26',
          light: '#115739',
          accent: '#197A50',
          border: '#1C4D36',
        },
        surface: {
          base: '#070A0F',
          card: '#0E141D',
          elevated: '#161F2D',
          subtle: '#233044',
        },
        brass: {
          primary: '#E2B857',
          hover: '#F2CE74',
          muted: '#8E7232',
          dark: '#4F3F1A',
        },
        chalk: {
          cyan: '#2DD4BF',
        },
        ivory: {
          pure: '#FFFFFF',
          text: '#FAF7F0',
          muted: '#CBD5E1',
          faint: '#7E8CA0',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'felt-inset': 'inset 0 4px 24px rgba(0, 0, 0, 0.8), inset 0 0 12px rgba(0, 0, 0, 0.55)',
        'brass-glow': '0 0 22px rgba(226, 184, 87, 0.3)',
        'cushion': '0 14px 36px rgba(0, 0, 0, 0.72)',
        'pocket': 'inset 0 0 12px rgba(0, 0, 0, 0.95)',
      },
    },
  },
  plugins: [],
};
