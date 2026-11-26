import { useSyncExternalStore } from 'react';
import { installationSnapshot, subscribeInstallation, installApp } from '../lib/installation';

export function useInstallation() {
  return {
    ...useSyncExternalStore(subscribeInstallation, installationSnapshot),
    install: installApp,
  };
}
