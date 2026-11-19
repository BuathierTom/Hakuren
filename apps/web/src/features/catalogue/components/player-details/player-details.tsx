import { useState } from 'react';
import type { PlayerDetail, PlayerForm } from '@shared/catalogue';
import { ElementBadge, PositionBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { GenderIcon, PlayStyleIcon } from '../game-icon/game-icon';
import { Portrait } from '../player-portrait/player-portrait';
import { href, intercept } from '@/app/navigation';
import { age, role, workLabel, GENDERS, PLAY_STYLES } from '../../lib/labels';
import { PLAYER_FORMS, playerForms, playerMoves, playerStats } from '../../lib/player-forms';
import { PlayerTechniques } from '../player-techniques/player-techniques';
import { PlayerStats } from '../player-stats/player-stats';
import styles from './player-details.module.scss';

export function PlayerPanel({ player, titleId }: { player: PlayerDetail; titleId: string }) {
  const [rarity, setRarity] = useState<PlayerForm>('common');
  const forms = playerForms(player);
  const specialForms = forms.filter((form) => form !== 'common');
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
      <div className={styles.hero}>
        <div className={styles.portrait}>
          <Portrait src={player.portraitUrl} />
        </div>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>JOUEUR N° {player.number?.padStart(4, '0') ?? '—'}</span>
          <div className={styles.name}>
            <h2 id={titleId}>{player.name}</h2>
            {specialForms.length > 0 && (
              <div className={styles.rarities} aria-label="Raretés disponibles">
                {specialForms.map((form) => (
                  <RarityBadge key={form} name={PLAYER_FORMS[form]} />
                ))}
              </div>
            )}
          </div>
          <div className={styles.attributes}>
            <PositionBadge position={player.position} />
            <ElementBadge element={player.element} />
            {player.gender && (
              <span
                className={styles.attribute}
                role="img"
                aria-label={GENDERS[player.gender]}
                title={GENDERS[player.gender]}
              >
                {player.gender === 'neutral' ? (
                  GENDERS[player.gender]
                ) : (
                  <GenderIcon gender={player.gender} />
                )}
              </span>
            )}
            {player.playStyle && (
              <span
                className={styles.attribute}
                role="img"
                aria-label={PLAY_STYLES[player.playStyle]}
                title={PLAY_STYLES[player.playStyle]}
              >
                <PlayStyleIcon style={player.playStyle} />
              </span>
            )}
          </div>
          <p className={styles.meta}>
            {age(player.ageGroup)} - {role(player.role)}
          </p>
        </div>
        {player.description && <p className={styles.description}>{player.description}</p>}
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
      </div>
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
              const target = href('players', { detail: variant.id });
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
