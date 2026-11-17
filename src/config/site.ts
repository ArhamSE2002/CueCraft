/**
 * Centralized Brand & Platform Configuration for CueCraft
 * 
 * All user-facing product branding, names, descriptions, and site assets
 * are centralized here so rebranding or updating copy can be done in one place.
 */

export const siteConfig = {
  name: 'CueCraft',
  tagline: 'Precision Snooker Ballistics & Championship Simulation',
  description:
    'A professional snooker learning and gaming platform combining authentic 2D/3D physics simulation with structured pedagogical ballistics.',
  url: 'https://cuecraft.app',
  author: 'CueCraft Engineering Team',
  keywords: [
    'snooker simulator',
    'cue ball control',
    'snooker physics',
    'side spin ballistics',
    'cushion rebound angles',
    'snooker training',
    '3d snooker',
    '2d snooker canvas',
  ],
  navLinks: [
    { title: 'Home', href: '/' },
    { title: 'Play Simulator', href: '/play' },
    { title: 'Learning Center', href: '/learn' },
    { title: 'Interactive Lessons', href: '/lessons' },
    { title: 'Philosophy', href: '/about' },
  ],
  links: {
    github: 'https://github.com/cuecraft/cuecraft',
    docs: '/learn',
  },
  theme: {
    accentColor: '#C5A059',
    tableGreen: '#0B2B1E',
    darkSurface: '#080B0F',
  },
};

export type SiteConfig = typeof siteConfig;
