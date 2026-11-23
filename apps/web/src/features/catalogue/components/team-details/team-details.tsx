import { teamPlayerHref, useLocation } from '@/app/navigation';
import { useState } from 'react';
import type { HistoricalTeamDetail } from '@shared/catalogue';
import { Select } from '@/components/ui/select/select';
import { TeamLogo } from '../team-logo/team-logo';
import { PlayerList } from '../player-list/player-list';
import { workLabel, count } from '../../lib/labels';
import styles from './team-details.module.scss';
export function TeamPanel({ team, titleId }: { team: HistoricalTeamDetail; titleId: string }) {
  const { params } = useLocation();
  const requestedWork = params.get('work');
  const [selected, setSelected] = useState(
    team.rosters.find((roster) => roster.work?.code === requestedWork)?.work?.code ??
      team.rosters[0]?.work?.code ??
      'unknown',
  );
  const roster = team.rosters.find((roster) => (roster.work?.code ?? 'unknown') === selected);
  return (
    <>
      <div className={styles.heading}>
        <TeamLogo name={team.name} src={team.logoUrl} />
        <div>
          <h2 id={titleId}>{team.name}</h2>
          <p>{count(team.playerCount)} personnages répertoriés</p>
        </div>
      </div>
      {team.rosters.length > 1 && (
        <Select
          label="Effectif par génération"
          showLabel
          value={selected}
          onChange={setSelected}
          options={team.rosters.map((roster) => ({
            value: roster.work?.code ?? 'unknown',
            label: roster.work ? workLabel(roster.work.code) : 'Autres joueurs répertoriés',
          }))}
        />
      )}
      <section className={styles.roster}>
        <h3>
          {roster?.work ? `Effectif - ${workLabel(roster.work.code)}` : 'Joueurs répertoriés'}
        </h3>
        {roster?.players.length ? (
          <PlayerList
            players={roster.players}
            rarity={null}
            playerLink={(id) => teamPlayerHref(team.id, id)}
          />
        ) : (
          <p>Aucun effectif documenté pour le moment.</p>
        )}
      </section>
    </>
  );
}
