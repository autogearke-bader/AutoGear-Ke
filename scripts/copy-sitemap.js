/**
 * AutoGear Ke - Copy Sitemap to Public
 * 
 * Copies the generated sitemap.xml from dist to public folder
 * so it gets included in Vite's build output.
 * 
 * Usage: node scripts/copy-sitemap.js
 */

import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const distSitemap = path.join(__dirname, '..', 'dist', 'sitemap.xml');
const publicSitemap = path.join(__dirname, '..', 'public', 'sitemap.xml');

if (existsSync(distSitemap)) {
  copyFileSync(distSitemap, publicSitemap);
  console.log('✅ Sitemap copied to public folder');
} else {
  console.warn('⚠️ Sitemap not found in dist folder - skipping copy');
}