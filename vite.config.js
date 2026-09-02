import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const portArgIdx = process.argv.indexOf('--port');
  const port = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? process.argv[portArgIdx + 1] : '5173';
  const backendPort = port === '5174' ? 3002 : (port === '5175' ? 3003 : 3001);

  return {
    plugins: [react()],
    cacheDir: `node_modules/.vite-cache-${port}`,
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/socket.io': {
          target: `http://localhost:${backendPort}`,
          ws: true,
          changeOrigin: true
        },
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true
        },
        '/opennds_auth': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true
        }
      }
    }
  };
});
