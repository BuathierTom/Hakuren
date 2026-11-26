import { t } from '@/features/preferences/lib/i18n';
import { FavoriteButton } from '@/features/favorites/components/favorite-button/favorite-button';
import type { HistoricalTeam } from '@shared/catalogue';
import { href, intercept } from '@/app/navigation';
import { TeamLogo } from '../team-logo/team-logo';
import { count, workLabel } from '../../lib/labels';
import styles from './team-list.module.scss';
export function TeamList({ teams }: { teams: HistoricalTeam[] }) {
  return (
    <ul className={styles.list}>
      {teams.map((team) => {
        const target = href('teams', { detail: team.id });
        return (
          <li key={team.id} className={styles.entry}>
            <a href={target} onClick={(event) => intercept(event, target, { overlay: true })}>
              <TeamLogo name={team.name} src={team.logoUrl} />
              <span className={styles.name}>
                <strong>{team.name}</strong>
                {team.works.length > 0 && (
                  <small>{team.works.map((work) => workLabel(work.code)).join(' - ')}</small>
                )}
              </span>
              <span className={styles.count}>
                {count(team.playerCount)}{' '}
                {team.playerCount === 1 ? t('personnage') : t('personnages')}
              </span>
            </a>
            <FavoriteButton kind="teams" targetId={team.id} name={team.name} />
          </li>
        );
      })}
    </ul>
  );
}
