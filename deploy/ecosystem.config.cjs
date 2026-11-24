const path = require('node:path');
const root = path.resolve(__dirname, '..');
module.exports = {
  apps: [
    {
      name: 'hakuren-api',
      cwd: root,
      script: path.join(root, 'apps/api/dist/server.js'),
      interpreter: process.execPath,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '300M',
      kill_timeout: 10000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
