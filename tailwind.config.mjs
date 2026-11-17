/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        felt: {
          darkest: '#05160E',
          surface: '#0B2B1E',
          light: '#134430',
          accent: '#1D6648',
          border: '#163826',
        },
        surface: {
          base: '#080B0F',
          card: '#0E141C',
          elevated: '#161F2B',
          subtle: '#1F2B3A',
        },
        brass: {
          primary: '#C5A059',
          hover: '#DFC07C',
          muted: '#786033',
          dark: '#4A3B1F',
        },
        chalk: {
          cyan: '#2DD4BF',
        },
        ivory: {
          pure: '#FFFFFF',
          text: '#F7F5EE',
          muted: '#C8CFDA',
          faint: '#7D8796',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'felt-inset': 'inset 0 4px 20px rgba(0, 0, 0, 0.75), inset 0 0 10px rgba(0, 0, 0, 0.5)',
        'brass-glow': '0 0 15px rgba(197, 160, 89, 0.25)',
        'cushion': '0 8px 24px rgba(0, 0, 0, 0.65)',
        'pocket': 'inset 0 0 12px rgba(0, 0, 0, 0.95)',
      },
    },
  },
  plugins: [],
};
