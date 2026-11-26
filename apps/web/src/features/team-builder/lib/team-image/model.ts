import { t } from '../../../preferences/lib/i18n';
import type { CatalogueItem, LoadoutOptions } from '@shared/catalogue';
import type { Formation } from '@shared/formations';
import { teamAlerts } from '../team-alerts';
import { teamCounts, teamPower, type Team } from '../team';
import { hasTeamLoadout } from '../loadouts';

export const IMAGE_LAYOUT = {
  width: 1440,
  padding: 24,
  gap: 24,
  analysisWidth: 310,
  contentY: 98,
  sectionHeader: 36,
  rosterGap: 18,
  rosterHeight: 220,
};

export function teamImageFilename(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
  return `hakuren-${slug || 'mon-equipe'}.png`;
}

export function teamImageModel(
  team: Team,
  formation: Formation,
  catalogue?: LoadoutOptions,
  tactics: CatalogueItem[] = [],
) {
  const counts = teamCounts(team);
  const alerts = teamAlerts(team, formation);
  const power = teamPower(team, catalogue);
  const offPosition = alerts.find((alert) => alert.code === 'off-position')?.slots.length ?? 0;
  const notes: string[] = [];
  if (hasTeamLoadout(team)) notes.push(t('Équipements et bonus permanents inclus.'));
  if (power.matchState)
    notes.push(
      t(
        '{0} passif(s) en attente du rang de build, de la puissance de lien ou d’un remplacement.',
        power.matchState,
      ),
    );
  if (power.unavailable || power.unresolved)
    notes.push(
      t('{0} bonus indisponible(s) ou non reconnu(s).', power.unavailable + power.unresolved),
    );
  const selectedTactics = Array.from({ length: 3 }, (_, index) => {
    const id = team.tactics?.[index] ?? null;
    return { id, item: tactics.find((item) => item.id === id) ?? null };
  });
  return {
    team,
    formation,
    counts,
    alerts,
    offPosition,
    power,
    notes,
    tactics: selectedTactics,
    playStyle: team.playStyle ?? null,
  };
}

export type TeamImageModel = ReturnType<typeof teamImageModel>;
