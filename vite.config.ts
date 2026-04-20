import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => {
  const baseUrl = 'http://127.0.0.1:3004'; // Força o alvo do proxy para o seu Node local

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        manifest: {
          id: '/',
          name: 'Ouvidoria Orienta — Tarifa Zero',
          short_name: 'Tarifa Zero',
          description: 'Acompanhamento em tempo real dos ônibus do Tarifa Zero de Duque de Caxias.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0b3b6e',
          theme_color: '#0b3b6e',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,kml,json}'],
          maximumFileSizeToCacheInBytes: 5000000 // Aumentado para 5MB devido aos KMLs e imagens
        }
      })
    ],
    server: {
      allowedHosts: true,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          secure: false,
          // Required for SSE: disable response buffering
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
                proxyRes.headers['x-accel-buffering'] = 'no';
              }
            });
          }
        },
        '/kml-exports': {
          target: baseUrl,
          changeOrigin: true,
        }
      }
    }
  }
})
