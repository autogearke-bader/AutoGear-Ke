/**
 * Mekh - Sitemap Generator
 * 
 * This script fetches live technicians and published articles from Supabase
 * and generates a sitemap.xml file for SEO purposes.
 * 
 * Usage: node scripts/generate-sitemap.js
 * Or: npm run sitemap
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple .env file parser
 */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`Warning: .env file not found at ${filePath}`);
    return;
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    process.env[key] = value;
  }
}

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
loadEnvFile(envPath);

// Supabase configuration - load from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase configuration.');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Base URL for the website
const BASE_URL = 'https://mekh.app';

// Service slugs for programmatic SEO pages
const SERVICE_SLUGS = [
  'window-tinting',
  'car-wrapping',
  'ppf',
  'ceramic-coating',
  'car-detailing',
  'headlight-restoration',
  'car-tuning',
];

// Location slugs for programmatic SEO pages
const LOCATION_SLUGS = [
  'nairobi',
  'kileleshwa',
  'thika-road',
  'parklands',
  'lavington',
  'westlands',
  'karen',
  'kilimani',
  'garden-estate',
  'langata',
  'ruiru',
  'industrial-area',
  'ngong-road',
  'kiambu-road',
];

// Static pages that always exist
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/technicians', priority: '0.9', changefreq: 'daily' },
  { url: '/blogs', priority: '0.8', changefreq: 'daily' },
  { url: '/join', priority: '0.7', changefreq: 'monthly' },
  { url: '/about', priority: '0.5', changefreq: 'monthly' },
  { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  { url: '/terms', priority: '0.3', changefreq: 'yearly' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
];

/**
 * Format a URL object into XML sitemap entry
 */
const toUrl = ({ url, priority, changefreq, lastmod }) => {
  let xml = `  <url>
    <loc>${BASE_URL}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;
  
  if (lastmod) {
    xml += `
    <lastmod>${lastmod}</lastmod>`;
  }
  
  xml += `
  </url>`;
  
  return xml;
};

/**
 * Extract date from ISO timestamp
 */
const extractDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.split('T')[0];
};

/**
 * Main sitemap generation function
 */
const generate = async () => {
  console.log('Starting sitemap generation...\n');

  // Track if we successfully fetched data
  let fetchedData = false;
  let technicians = [];
  let articles = [];

  try {
    // Fetch live technicians
    console.log('Fetching live technicians from Supabase...');
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('slug, created_at')
        .eq('status', 'live');

      if (error) {
        console.warn('Warning fetching technicians:', error.message);
      } else {
        technicians = data || [];
        console.log(`Found ${technicians.length} live technicians`);
      }
    } catch (techErr) {
      console.warn('Warning: Could not fetch technicians:', techErr.message);
    }

    // Fetch published articles
    console.log('Fetching published articles from Supabase...');
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('slug, updated_at')
        .eq('is_published', true);

      if (error) {
        console.warn('Warning fetching articles:', error.message);
      } else {
        articles = data || [];
        console.log(`Found ${articles.length} published articles`);
      }
    } catch (articleErr) {
      console.warn('Warning: Could not fetch articles:', articleErr.message);
    }

    fetchedData = true;

  } catch (error) {
    console.warn('\n⚠️ Network error fetching from Supabase, using fallback data');
    console.warn('   The sitemap will be generated with static pages only');
    // Continue with empty arrays - we still want to generate the static sitemap
  }

  // Map technicians to URL objects
  const technicianUrls = technicians.map(t => ({
    url: `/technician/${t.slug}`,
    priority: '0.9',
    changefreq: 'weekly',
    lastmod: extractDate(t.created_at),
  }));

  // Map articles to URL objects
  const articleUrls = articles.map(a => ({
    url: `/blogs/${a.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
    lastmod: extractDate(a.updated_at),
  }));

  // Generate service-location page URLs (Programmatic SEO)
  // Uses /services/:service/:location pattern
  const serviceLocationUrls = [];
  for (const service of SERVICE_SLUGS) {
    for (const location of LOCATION_SLUGS) {
      serviceLocationUrls.push({
        url: `/services/${service}/${location}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: null,
      });
    }
  }

  console.log(`Generated ${serviceLocationUrls.length} service-location page URLs`);

  // Combine all URLs
  const allUrls = [
    ...staticPages,
    ...technicianUrls,
    ...articleUrls,
    ...serviceLocationUrls,
  ];

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(toUrl).join('\n')}
</urlset>`;

  // Write to file - output to dist folder for deployment
  // Ensure dist directory exists
  const distDir = path.join(__dirname, '..', 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
  
  const outputPath = path.join(distDir, 'sitemap.xml');
  writeFileSync(outputPath, xml);
  
  console.log(`\n✅ Sitemap generated successfully!`);
  console.log(`   Total URLs: ${allUrls.length}`);
  console.log(`   - Static pages: ${staticPages.length}`);
  console.log(`   - Technician profiles: ${technicianUrls.length}`);
  console.log(`   - Blog articles: ${articleUrls.length}`);
  console.log(`   - Service-location pages: ${serviceLocationUrls.length}`);
  console.log(`   Output: ${outputPath}`);
};

// Run the generator
generate();
