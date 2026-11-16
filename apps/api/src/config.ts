import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface AppConfig {
  host: string;
  port: number;
  databaseUrl: string | undefined;
  production: boolean;
}

export function loadEnvironment(): void {
  const path = fileURLToPath(new URL('../../../.env', import.meta.url));
  if (existsSync(path)) process.loadEnvFile(path);
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT doit être un entier compris entre 1 et 65535.');
  }
  const databaseUrl = env.DATABASE_URL?.trim() || undefined;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'mysql:') {
      throw new Error('DATABASE_URL doit utiliser le protocole mysql://.');
    }
    if (!url.hostname || url.pathname.length < 2 || url.pathname === '/') {
      throw new Error('DATABASE_URL doit préciser un serveur et une base MySQL.');
    }
  }
  return {
    host: env.HOST || '127.0.0.1',
    port,
    databaseUrl,
    production: env.NODE_ENV === 'production',
  };
}
