import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const portArgIdx = process.argv.indexOf('--port');
  const port = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? process.argv[portArgIdx + 1] : '3000';
  const backendPort = port === '3010' ? 3002 : (port === '3020' ? 3003 : 3001);

  return {
    plugins: [react()],
    cacheDir: `node_modules/.vite-cache-${port}`,
    server: {
      port: parseInt(port, 10),
      strictPort: true,
      host: '0.0.0.0',
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
