import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = env.VITE_BASE_URL || 'http://localhost:3004';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          secure: false,
        },
        '/kml-exports': {
          target: baseUrl,
          changeOrigin: true,
        }
      }
    }
  }
})
