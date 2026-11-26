interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
interface InstallState {
  available: boolean;
  ios: boolean;
  installed: boolean;
  pending: boolean;
}
let prompt: InstallPrompt | null = null;
let initialized = false;
let state: InstallState = { available: false, ios: false, installed: false, pending: false };
const listeners = new Set<() => void>();
const update = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
};
export function initializeInstallation() {
  if (initialized) return;
  initialized = true;
  const mode = window.matchMedia('(display-mode: standalone)');
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = () =>
    mode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const refresh = () =>
    update({ ios, installed: installed(), available: !installed() && (ios || prompt !== null) });
  mode.addEventListener('change', refresh);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    prompt = null;
    update({ installed: true, available: false, pending: false });
  });
  refresh();
}
export const installationSnapshot = () => state;
export function subscribeInstallation(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export async function installApp() {
  if (!prompt || state.pending || state.installed) return;
  const current = prompt;
  prompt = null;
  update({ pending: true });
  try {
    await current.prompt();
    const choice = await current.userChoice;
    update({ installed: choice.outcome === 'accepted', available: false });
  } finally {
    update({ pending: false, available: state.ios && !state.installed });
  }
}
