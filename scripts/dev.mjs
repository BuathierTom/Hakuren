import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tasks = [
  ['api', ['run', 'dev', '--workspace', '@hakuren/api']],
  ['web', ['run', 'dev', '--workspace', '@hakuren/web']],
];
let stopping = false;
const children = tasks.map(([name, args]) => {
  const child = spawn(npm, args, {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  });
  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${name}] arrêté (${signal ?? code})`);
      stop(code ?? 1);
    }
  });
  return child;
});
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
