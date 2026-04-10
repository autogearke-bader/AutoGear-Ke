import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

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
            target: 'https://autogearke.com',
            changeOrigin: true,
            secure: true,
          },
          '/uploads': {
            target: 'https://autogearke.com',
            changeOrigin: true,
            secure: true,
          }
        }
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'assets/tiktok-placeholder.png'],
          manifest: {
            name: 'AutoGear Ke - Car Services Marketplace',
            short_name: 'AutoGear',
            description: 'Kenya\'s Car Services Marketplace - Find the best car service technicians for tinting, wrapping, PPF, ceramic coating, detailing & tuning.',
            theme_color: '#e8a020',
            background_color: '#080909',
            display: 'standalone',
            orientation: 'any',
            scope: '/',
            start_url: '/',
            lang: 'en',
            categories: ['business', 'lifestyle', 'shopping'],
            icons: [
              {
                src: '/assets/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png'
              },
              {
                src: '/assets/favicon-32.png',
                sizes: '32x32',
                type: 'image/png'
              },
              {
                src: '/assets/favicon-48.png',
                sizes: '48x48',
                type: 'image/png'
              },
              {
                src: '/assets/favicon-64.png',
                sizes: '64x64',
                type: 'image/png'
              },
              {
                src: '/assets/logo-4.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/assets/logo-4.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            shortcuts: [
              {
                name: 'Book a Service',
                short_name: 'Book',
                description: 'Find and book a car service technician',
                url: '/?action=book',
                icons: [{ src: '/assets/logo-4.png', sizes: '96x96' }]
              },
              {
                name: 'Find Technicians',
                short_name: 'Find',
                description: 'Search for car service professionals',
                url: '/?action=search',
                icons: [{ src: '/assets/logo-4.png', sizes: '96x96' }]
              },
              {
                name: 'My Bookings',
                short_name: 'Bookings',
                description: 'View your service bookings',
                url: '/?action=bookings',
                icons: [{ src: '/assets/logo-4.png', sizes: '96x96' }]
              }
            ]
          },
          workbox: {
            navigateFallback: 'index.html',
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            globIgnores: ['**/apple-touch-icon.png', '**/favicon-32.png', '**/favicon-48.png', '**/favicon-64.png', '**/logo-4.png'],
            navigateFallbackDenylist: [/^\/api/, /^\/rest/],
            runtimeCaching: [
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
                // Cache Supabase REST API requests but not auth
                urlPattern: /^https:\/\/.*supabase\.co\/rest\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 5 // 5 minutes
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  },
                  networkTimeoutSeconds: 10
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
            ]
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        assetsInlineLimit: 0,
        // Security: Remove console logs and debug info in production
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        },
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-ui': ['react-helmet-async', 'leaflet', 'dompurify', 'quill'],
            },
          },
        },
      },
      base: '/', // Use absolute paths for root deployment
    };
});
