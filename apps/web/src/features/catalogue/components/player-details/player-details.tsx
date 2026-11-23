import { useState } from 'react';
import type { PlayerDetail, PlayerForm } from '@shared/catalogue';
import { Portrait } from '../player-portrait/player-portrait';
import { href, intercept } from '@/app/navigation';
import { age, workLabel } from '../../lib/labels';
import { PLAYER_FORMS, playerForms, playerMoves, playerStats } from '../../lib/player-forms';
import { PlayerTechniques } from '../player-techniques/player-techniques';
import { PlayerStats } from '../player-stats/player-stats';
import { PlayerProfileHeader } from './player-profile-header';
import styles from './player-details.module.scss';

export function PlayerPanel({
  player,
  titleId,
  playerLink,
}: {
  player: PlayerDetail;
  titleId: string;
  playerLink?: (id: number) => string;
}) {
  const [rarity, setRarity] = useState<PlayerForm>('common');
  const forms = playerForms(player);
  const stats = playerStats(player, rarity);
  const moves = playerMoves(player, rarity);
  const ceiling =
    Math.ceil(
      Math.max(
        300,
        ...player.statProfiles.flatMap((profile) =>
          Object.values(profile.values).map((value) => value ?? 0),
        ),
        ...Object.values(player.statistics?.values ?? {}).map((value) => value ?? 0),
      ) / 50,
    ) * 50;
  return (
    <>
      <PlayerProfileHeader
        player={player}
        titleId={titleId}
        aside={
          <dl className={styles.origin}>
            <div>
              <dt>Œuvre d’origine</dt>
              <dd>{player.origin?.name ?? 'Origine non renseignée'}</dd>
            </div>
            <div>
              <dt>Équipe</dt>
              <dd>{player.teams.length ? player.teams.join(' / ') : 'Équipe non renseignée'}</dd>
            </div>
          </dl>
        }
      />
      <div className={styles.formButtons} role="group" aria-label="Rareté du joueur">
        {forms.map((form) => (
          <button
            key={form}
            type="button"
            aria-pressed={rarity === form}
            onClick={() => setRarity(form)}
          >
            {PLAYER_FORMS[form]}
          </button>
        ))}
      </div>
      <div className={styles.panels} aria-live="polite">
        <PlayerStats stats={stats} ceiling={ceiling} />
        <PlayerTechniques key={rarity} moves={moves} />
      </div>
      {player.variants.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h3>Les autres versions</h3>
            <span>{player.variants.length}</span>
          </div>
          <div className={styles.related}>
            {player.variants.map((variant) => {
              const target = playerLink?.(variant.id) ?? href('players', { detail: variant.id });
              return (
                <a
                  key={variant.id}
                  href={target}
                  onClick={(event) => intercept(event, target, { replace: true })}
                >
                  <Portrait src={variant.portraitUrl} small />
                  <span>
                    <strong>{variant.name}</strong>
                    <small>
                      {variant.formLabel ?? age(variant.ageGroup)} -{' '}
                      {variant.origin ? workLabel(variant.origin.code) : 'Origine inconnue'} - N°{' '}
                      {variant.number ?? '—'}
                    </small>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
