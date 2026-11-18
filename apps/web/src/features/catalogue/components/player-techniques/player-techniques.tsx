import type { PlayerLearnset } from '@shared/catalogue';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import { PlayerDetailBlock } from '../player-detail-block/player-detail-block';
import { href, intercept } from '@/app/navigation';
import { CATEGORIES } from '../../lib/labels';
import styles from './player-techniques.module.scss';

function TechniqueRows({ moves }: { moves: PlayerLearnset[] }) {
  return (
    <ul className={styles.moves}>
      {moves.map((move) => {
        const target = href('techniques', { detail: move.technique.id }, false);
        return (
          <li key={move.id}>
            <a
              href={target}
              onClick={(event) => intercept(event, target, { overlay: true })}
              className={styles.move}
            >
              <span className={styles.level}>Niv. {move.level ?? '—'}</span>
              <span
                className={styles.icon}
                title={move.technique.category ? CATEGORIES[move.technique.category] : undefined}
              >
                <TechniqueTypeIcon category={move.technique.category} />
              </span>
              <span className={styles.name}>{move.technique.name}</span>
              <span
                className={styles.tension}
                aria-label={
                  move.technique.tension == null
                    ? 'Tension non renseignée'
                    : `${move.technique.tension} points de tension`
                }
              >
                {move.technique.tension == null ? '—' : `${move.technique.tension} TP`}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function PlayerTechniques({ moves }: { moves: PlayerLearnset[] }) {
  const main = moves.filter((move) => !move.alternatePath);
  const alternative = moves.filter((move) => move.alternatePath);
  return (
    <PlayerDetailBlock title="Techniques & pouvoirs">
      {moves.length ? (
        <>
          <TechniqueRows moves={main} />
          {alternative.length > 0 && (
            <>
              <h4 className={styles.branch}>Branche alternative</h4>
              <TechniqueRows moves={alternative} />
            </>
          )}
        </>
      ) : (
        <p className={styles.empty}>Techniques non renseignées pour cette rareté.</p>
      )}
    </PlayerDetailBlock>
  );
}
