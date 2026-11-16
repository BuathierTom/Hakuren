import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));

function readPort(value: string, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} doit être un entier compris entre 1 et 65535.`);
  }
  return port;
}

export default defineConfig(() => {
  // Read server ports without changing Vite's NODE_ENV or exposing backend variables to the client.
  const env = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
  const port = readPort(process.env.FRONT_PORT ?? env.FRONT_PORT ?? '5173', 'FRONT_PORT');
  const apiPort = readPort(process.env.API_PORT ?? env.API_PORT ?? '3001', 'API_PORT');
  if (port === apiPort) throw new Error('FRONT_PORT et API_PORT doivent être différents.');

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
    },
  };
});
