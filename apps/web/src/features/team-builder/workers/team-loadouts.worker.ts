import type { LoadoutOptions } from '@shared/catalogue';
import type { Formation } from '@shared/formations';
import type { Team } from '../lib/team';
import { fillTeamLoadouts } from '../lib/auto-loadouts';

self.onmessage = (
  event: MessageEvent<{ team: Team; formation: Formation; catalogue: LoadoutOptions }>,
) => {
  try {
    const { team, formation, catalogue } = event.data;
    self.postMessage({ team: fillTeamLoadouts(team, formation, catalogue) });
  } catch {
    self.postMessage({ error: 'Le remplissage de l’équipe a échoué.' });
  }
};
