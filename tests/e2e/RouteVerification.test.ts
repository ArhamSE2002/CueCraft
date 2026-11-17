import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Astro Build & SSG Route Verification', () => {
  const distDir = path.resolve(__dirname, '../../dist');

  const routes = [
    { file: 'index.html', title: 'CueCraft — Precision Snooker' },
    { file: 'play/index.html', title: 'Play Simulator — CueCraft' },
    { file: 'learn/index.html', title: 'The Science of Snooker' },
    { file: 'learn/cue-ball-control/index.html', title: 'Cue-Ball Control' },
    { file: 'learn/side-spin-ballistics/index.html', title: 'Side Spin' },
    { file: 'learn/cushion-rebounds/index.html', title: 'Cushion Rebounds' },
    { file: 'learn/collision-angles/index.html', title: 'Ball Collision Angles' },
    { file: 'learn/speed-and-distance/index.html', title: 'Speed, Distance' },
    { file: 'learn/topspin-and-backspin/index.html', title: 'Topspin' },
    { file: 'lessons/index.html', title: 'Interactive Lessons' },
    { file: 'about/index.html', title: 'Platform Philosophy' },
  ];

  it('verifies dist directory exists with all 11 static HTML pages', () => {
    expect(fs.existsSync(distDir)).toBe(true);

    for (const route of routes) {
      const filePath = path.join(distDir, route.file);
      expect(fs.existsSync(filePath), `Route file missing: ${route.file}`).toBe(true);
    }
  });

  it('validates SEO metadata, title, and Open Graph tags across all pages', () => {
    for (const route of routes) {
      const filePath = path.join(distDir, route.file);
      const html = fs.readFileSync(filePath, 'utf-8');

      // Title
      expect(html).toContain('<title>');
      expect(html).toContain(route.title);

      // Viewport & Charset
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<meta charset="UTF-8"');

      // Canonical URL
      expect(html).toContain('<link rel="canonical"');

      // Open Graph Tags
      expect(html).toContain('<meta property="og:title"');
      expect(html).toContain('<meta property="og:description"');
      expect(html).toContain('<meta property="og:type"');

      // Non-empty body
      expect(html.length).toBeGreaterThan(1500);
    }
  });

  it('ensures educational articles contain schema.org JSON-LD structured data', () => {
    const articlePath = path.join(distDir, 'learn/cue-ball-control/index.html');
    const html = fs.readFileSync(articlePath, 'utf-8');

    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@context":"https://schema.org"');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"headline"');
  });

  it('ensures client-side JavaScript bundles are generated for interactive islands', () => {
    const astroDir = path.join(distDir, '_astro');
    expect(fs.existsSync(astroDir)).toBe(true);

    const files = fs.readdirSync(astroDir);
    // Should include generated JS for GameShell and InteractiveHeroDemo
    const hasGameShell = files.some((f) => f.includes('GameShell') && f.endsWith('.js'));
    const hasHeroDemo = files.some((f) => f.includes('InteractiveHeroDemo') && f.endsWith('.js'));

    expect(hasGameShell).toBe(true);
    expect(hasHeroDemo).toBe(true);
  });
});
