import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// Security: Define which environment variables are exposed to the client
// Only variables starting with VITE_ are exposed to the client
// Server-only secrets (without VITE_ prefix) will not be available in the browser
const clientEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Filter to only include allowed client-side env vars
    const filteredEnv: Record<string, string> = {};
    for (const key of clientEnvVars) {
      if (env[key]) {
        filteredEnv[key] = env[key];
      }
    }
    
    return {
      // Prevent exposing server-only env vars to client
      // This ensures variables without VITE_ prefix are not exposed
      envPrefix: 'VITE_', // Only expose VITE_ prefixed variables
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'https://mekh.app',
            changeOrigin: true,
            secure: true,
          },
          '/uploads': {
            target: 'https://mekh.app',
            changeOrigin: true,
            secure: true,
          }
        }
      },
      plugins: [
        react(),
        tailwindcss(),
        ...(process.env.ANALYZE === 'true' ? [
          visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
            filename: 'dist/bundle-analysis.html',
          })
        ] : []),
        VitePWA({
          registerType: 'prompt',
          includeAssets: [], // Images loaded via runtimeCaching instead
          manifest: false, // disable auto-generation, use public/manifest.json
          manifestFilename: 'manifest.json',
            workbox: {
              navigateFallback: 'index.html',
              navigateFallbackDenylist: [/^\/api/, /^\/rest\/v1\//, /^\/sitemap\.xml/],
              // Only precache the absolute essentials
              // Only precache small essential files
              globPatterns: ['**/*.{html,ico,svg}', 'assets/*.css'],

              // Exclude large chunks — let runtimeCaching handle them
              globIgnores: [
                '**/AdminPage-*.js',       // 232 KB — admin only
                '**/vendor-leaflet-*.js',  // 149 KB — map pages only
                '**/vendor-supabase-*.js', // 166 KB — loaded on demand
                '**/vendor-react-*.js',    // 188 KB — loaded on demand
                '**/vendor-misc-*.js',     // 63 KB
                '**/index-*.js',           // 60 KB
                '**/supabase/**',          // Never cache Supabase files
              ],

              skipWaiting: true, // Force new service worker to activate immediately
              clientsClaim: true, // Take control of all clients immediately
              maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
              runtimeCaching: [
                // Cache JS and CSS at runtime (served instantly after first visit)
                {
                  urlPattern: /\/assets\/.+\.(js|css)$/i,
                  handler: 'NetworkFirst', // Always try network first for fresh content
                  options: {
                    cacheName: 'static-assets-v5',
                    expiration: {
                      maxEntries: 60,
                      maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days (reduced from 30)
                    },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'esm-sh-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cloudinary-images',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                // Bypass service worker for authentication requests to prevent CORS issues
                urlPattern: /^https:\/\/.*supabase\.co\/auth\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'supabase-auth',
                  expiration: {
                    maxEntries: 0,
                    maxAgeSeconds: 0
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                // Always fetch fresh data for Supabase REST API requests (technicians, etc.)
                urlPattern: /^https:\/\/.*supabase\.co\/rest\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'supabase-api',
                  expiration: {
                    maxEntries: 0,
                    maxAgeSeconds: 0
                  }
                }
              },
              {
                // Bypass service worker for storage requests (needed for auth)
                urlPattern: /^https:\/\/.*supabase\.co\/storage\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'supabase-storage',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 5
                  }
                }
              },
              {
                // Bypass service worker for TikTok API requests (they don't support CORS)
                urlPattern: /^https:\/\/www\.tiktok\.com\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'tiktok-api',
                  expiration: {
                    maxEntries: 0,
                    maxAgeSeconds: 0
                  }
                }
              },
              {
                // Bypass service worker for all external API requests that don't support CORS
                urlPattern: /^https:\/\/.*\.(tiktok|instagram|facebook)\.com\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'social-media-api',
                  expiration: {
                    maxEntries: 0,
                    maxAgeSeconds: 0
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'supabase-all',
                  expiration: {
                    maxEntries: 0,
                    maxAgeSeconds: 0
                  }
                }
              },
              {
                urlPattern: /^https:\/\/api\.cloudinary\.com\/.*/i,
                handler: 'NetworkOnly',
                options: {
                  cacheName: 'cloudinary-api',
                  expiration: {
                    maxEntries: 0,
                    maxAgeSeconds: 0
                  }
                }
              }
            ],
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      esbuild: {
        drop: ['console', 'debugger'],
        legalComments: 'none',
      },
      build: {
        minify: 'esbuild',
        rollupOptions: {
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              // Prevent hashing of favicon files — they need predictable URLs
              const name = assetInfo.name;
              if (name && (name.includes('favicon') || name === 'favicon.ico')) {
                return '[name].[ext]'; // No hash for favicons
              }
              return 'assets/[name]-[hash].[ext]';
            },
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-router': ['react-router-dom'],
              'vendor-helmet': ['react-helmet-async'],
            },
          },
        },
      },
      base: '/', // Use absolute paths for root deployment
    };
});
