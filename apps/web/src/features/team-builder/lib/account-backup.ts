import type { Team } from '@shared/teams';
import { decodeTeam } from './storage';
interface Backup {
  team: Team;
  revision: number | null;
}
const key = (userId: number) => `hakuren.account.${userId}.draft.v1`;
const recoveryKey = (userId: number) => `hakuren.account.${userId}.recovery.v1`;
export function readAccountBackup(
  storage: Storage,
  userId: number,
  recovery = false,
): Backup | null {
  const raw = storage.getItem(recovery ? recoveryKey(userId) : key(userId));
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<Backup> | null;
  const team = decodeTeam(value?.team);
  return team &&
    (value?.revision === null ||
      (Number.isSafeInteger(value?.revision) && Number(value?.revision) > 0))
    ? { team, revision: value!.revision! }
    : null;
}
export function writeAccountBackup(storage: Storage, userId: number, backup: Backup) {
  storage.setItem(key(userId), JSON.stringify(backup));
}
export function keepAccountRecovery(storage: Storage, userId: number, backup: Backup) {
  storage.setItem(recoveryKey(userId), JSON.stringify(backup));
}
export function clearAccountRecovery(storage: Storage, userId: number) {
  storage.removeItem(recoveryKey(userId));
}
export function importReceiptKey(userId: number) {
  return `hakuren.account.${userId}.local-import.v1`;
}
