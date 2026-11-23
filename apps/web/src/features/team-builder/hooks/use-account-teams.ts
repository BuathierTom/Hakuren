import { useEffect, useState, useSyncExternalStore } from 'react';
import { TeamAccount } from '../lib/team-account';
const none = () => null;
const subscribe = () => () => {};
export function useAccountTeams(userId: number | null) {
  const [account] = useState(() => (userId === null ? null : new TeamAccount(userId)));
  const state = useSyncExternalStore(account?.subscribe ?? subscribe, account?.getSnapshot ?? none);
  useEffect(() => {
    if (!account) return;
    void account.load();
    return account.close;
  }, [account]);
  return { account, state };
}
