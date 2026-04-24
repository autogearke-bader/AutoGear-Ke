/**
 * Mekh — Dynamic Sitemap Worker
 * Deploy this as a Cloudflare Worker routed to /sitemap.xml
 *
 * Environment variables to set in the Worker (Settings > Variables):
 *   SUPABASE_URL       — your Supabase project URL
 *   SUPABASE_ANON_KEY  — your Supabase anon/public key
 *
 * The sitemap is cached for 1 hour (3600s). Adjust CACHE_TTL as needed.
 */

const BASE_URL = 'https://mekh.app';
const CACHE_TTL = 3600; // seconds — how long Cloudflare caches the sitemap

const SERVICE_SLUGS = [
  'window-tinting',
  'car-wrapping',
  'ppf',
  'ceramic-coating',
  'face-lifting',
  'car-detailing',
  'headlight-restoration',
  'chrome-deletion',
];

const LOCATION_SLUGS = [
  'nairobi',
  'kileleshwa',
  'thika-road',
  'parklands',
  'lavington',
  'park-rd',
  'westlands',
  'karen',
  'kilimani',
  'garden-estate',
  'langata',
  'waiyaki-way',
  'dagoretti-corner',
  'wambugu-road',
  'ruiru',
  'industrial-area',
  'ngong-road',
];

const STATIC_PAGES = [
  { url: '/',            priority: '1.0', changefreq: 'daily'   },
  { url: '/technicians', priority: '0.9', changefreq: 'daily'   },
  { url: '/blogs',       priority: '0.8', changefreq: 'daily'   },
  { url: '/join',        priority: '0.7', changefreq: 'monthly' },
  { url: '/about',       priority: '0.5', changefreq: 'monthly' },
  { url: '/contact',     priority: '0.5', changefreq: 'monthly' },
  { url: '/terms',       priority: '0.3', changefreq: 'yearly'  },
  { url: '/privacy',     priority: '0.3', changefreq: 'yearly'  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractDate(timestamp) {
  return timestamp ? timestamp.split('T')[0] : null;
}

function urlEntry({ url, priority, changefreq, lastmod }) {
  const loc      = `<loc>${BASE_URL}${url}</loc>`;
  const freq     = `<changefreq>${changefreq}</changefreq>`;
  const pri      = `<priority>${priority}</priority>`;
  const mod      = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    ${[loc, freq, pri, mod].filter(Boolean).join('\n    ')}\n  </url>`;
}

async function querySupabase(env, table, select, filter) {
  const params = new URLSearchParams({ select, ...filter });
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/${table}?${params}`,
    {
      headers: {
        apikey:        env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    console.error(`Supabase error on ${table}: ${res.status} ${res.statusText}`);
    return [];
  }

  return res.json();
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const cacheKey = new Request(request.url, request);
    const cache    = caches.default;

    // 1. Serve from Cloudflare cache if available
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // 2. Fetch live data from Supabase in parallel
    const [technicians, articles] = await Promise.all([
      querySupabase(env, 'technicians', 'slug,created_at', { status: 'eq.live' }),
      querySupabase(env, 'articles',    'slug,updated_at', { is_published: 'eq.true' }),
    ]);

    // 3. Build URL sets
    const technicianUrls = technicians.map(t => ({
      url:        `/technician/${t.slug}`,
      priority:   '0.9',
      changefreq: 'weekly',
      lastmod:    extractDate(t.created_at),
    }));

    const articleUrls = articles.map(a => ({
      url:        `/blogs/${a.slug}`,
      priority:   '0.7',
      changefreq: 'monthly',
      lastmod:    extractDate(a.updated_at),
    }));

    const serviceLocationUrls = SERVICE_SLUGS.flatMap(service =>
      LOCATION_SLUGS.map(location => ({
        url:        `/${service}/${location}`,
        priority:   '0.8',
        changefreq: 'weekly',
        lastmod:    null,
      }))
    );

    const allUrls = [
      ...STATIC_PAGES,
      ...technicianUrls,
      ...articleUrls,
      ...serviceLocationUrls,
    ];

    // 4. Render XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(urlEntry).join('\n')}
</urlset>`;

    // 5. Build response with cache headers
    const response = new Response(xml, {
      headers: {
        'Content-Type':  'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
        'X-Sitemap-URLs': String(allUrls.length),
      },
    });

    // 6. Store in Cloudflare edge cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};