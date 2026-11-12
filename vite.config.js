import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

const baseLogger = createLogger();
const customLogger = {
  ...baseLogger,
  error(msg, options) {
    const text = String(msg || '');
    const errCode = options?.error?.code || '';
    const isBenignSocketError =
      errCode === 'ECONNABORTED' ||
      errCode === 'ECONNRESET' ||
      errCode === 'EPIPE' ||
      errCode === 'ECONNREFUSED' ||
      text.includes('ECONNABORTED') ||
      text.includes('ECONNRESET') ||
      text.includes('EPIPE') ||
      text.includes('ECONNREFUSED');

    if (
      isBenignSocketError &&
      (text.includes('ws proxy error') ||
        text.includes('ws proxy socket error') ||
        text.includes('http proxy error'))
    ) {
      return;
    }
    baseLogger.error(msg, options);
  }
};

function attachCleanWsProxyHandlers(proxy) {
  // Vite attaches its default 'error' and 'proxyReqWs' listeners right after configure() returns.
  // Using nextTick lets us replace those noisy listeners with resilient handlers that suppress ECONNABORTED/ECONNRESET.
  process.nextTick(() => {
    proxy.removeAllListeners('error');
    proxy.removeAllListeners('proxyReqWs');

    proxy.on('error', (err, _req, res) => {
      if (res && typeof res.writeHead === 'function') {
        if (!res.headersSent && !res.writableEnded) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend is starting up, please wait a moment...' }));
        }
      } else if (res && typeof res.end === 'function') {
        try {
          res.end();
        } catch {}
      }
      if (err && ['ECONNREFUSED', 'ECONNABORTED', 'EPIPE', 'ECONNRESET'].includes(err.code)) {
        return;
      }
    });

    proxy.on('proxyReqWs', (proxyReq, _req, socket) => {
      proxyReq.on('error', () => {});
      socket.on('error', () => {});
    });
  });
}

// https://vite.dev/config/
export default defineConfig(() => {
  const portArgIdx = process.argv.indexOf('--port');
  const port = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? process.argv[portArgIdx + 1] : '3000';
  const backendPort = port === '3010' ? 3002 : (port === '3020' ? 3003 : 3001);

  return {
    customLogger,
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1500
    },
    cacheDir: `node_modules/.vite-cache-${port}`,
    server: {
      port: parseInt(port, 10),
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/socket.io': {
          target: `http://127.0.0.1:${backendPort}`,
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            attachCleanWsProxyHandlers(proxy);
          }
        },
        '/api': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
          configure: (proxy) => {
            attachCleanWsProxyHandlers(proxy);
          }
        },
        '/opennds_auth': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
          configure: (proxy) => {
            attachCleanWsProxyHandlers(proxy);
          }
        }
      }
    }
  };
});
