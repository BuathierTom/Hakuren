export function clearDeletedAccount(storage: Storage, userId: number) {
  const prefix = `hakuren.account.${userId}.`;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
