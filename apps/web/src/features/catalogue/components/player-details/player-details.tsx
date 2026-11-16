import { useState } from 'react';
import type { PlayerDetail, StatKey } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { ElementBadge, PositionBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { Portrait } from '../player-portrait/player-portrait';
import { href, intercept } from '@/app/navigation';
import { age, role, workLabel } from '../../lib/labels';
import { PlayerTechniques } from '../player-techniques/player-techniques';
import styles from './player-details.module.scss';

const STAT_NAMES: Record<StatKey, string> = {
  power: 'Frappe',
  control: 'Contrôle',
  technique: 'Technique',
  pressure: 'Pression',
  physical: 'Physique',
  agility: 'Agilité',
  intelligence: 'Intelligence',
};
export function PlayerPanel({
  player,
  titleId,
  selectedWork,
}: {
  player: PlayerDetail;
  titleId: string;
  selectedWork: string | null;
}) {
  const [episode, setEpisode] = useState(
    player.appearances.find((w) => w.code === selectedWork)?.code ??
      player.appearances.find((w) => w.code === 'VR')?.code ??
      player.appearances[0]?.code ??
      'VR',
  );
  const assignedTeams = new Set(player.history.flatMap((entry) => entry.teams));
  const unassignedTeams = player.recordedTeams.filter((team) => !assignedTeams.has(team));
  const history = player.history.find((h) => h.work.code === episode);
  const largestStat = Math.max(
    1,
    ...Object.values(player.statistics?.values ?? {}).map((value) => value ?? 0),
  );
  return (
    <>
      <div className={styles.playerHero}>
        <div className={styles.heroPortrait} data-element={player.element}>
          <Portrait src={player.portraitUrl} />
        </div>
        <div className={styles.heroIdentity}>
          <span className={styles.eyebrow}>JOUEUR N° {player.number?.padStart(4, '0') ?? '—'}</span>
          <h2 id={titleId}>{player.name}</h2>
          <div className={styles.badges}>
            <PositionBadge position={player.position} />
            <ElementBadge element={player.element} />
            {player.rarities.map((rarity) => (
              <RarityBadge key={rarity.code} name={rarity.name} />
            ))}
          </div>
          <p>
            {age(player.ageGroup)}
            <span>·</span>
            {role(player.role)}
          </p>
          {player.aliases.length > 0 && (
            <p className={styles.aliases}>Aussi connu sous : {player.aliases.join(', ')}</p>
          )}
        </div>
      </div>
      <div className={styles.origin}>
        <span>Œuvre d’origine</span>
        <strong>{player.origin?.name ?? 'À confirmer'}</strong>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>À travers les générations</h3>
          <span>{player.appearances.length} apparitions</span>
        </div>
        <div className={styles.episodes} aria-label="Choisir un épisode">
          {player.appearances.map((work) => (
            <button
              key={work.code}
              aria-pressed={episode === work.code}
              onClick={() => {
                setEpisode(work.code);
              }}
            >
              {workLabel(work.code)}
            </button>
          ))}
        </div>
        <div className={styles.history}>
          <span>Équipe connue dans {workLabel(episode)}</span>
          {history?.teams.length ? (
            <div className={styles.teamTags}>
              {history.teams.map((team) => (
                <span key={team}>{team}</span>
              ))}
            </div>
          ) : (
            <p>Équipe non renseignée pour cet épisode.</p>
          )}
        </div>
        {unassignedTeams.length > 0 && (
          <div className={styles.recordedTeams}>
            <span>Équipes répertoriées</span>
            <p>{unassignedTeams.join(' · ')}</p>
            <small>Leur répartition par épisode est encore à compléter.</small>
          </div>
        )}
      </section>

      <PlayerTechniques player={player} episode={episode} key={episode} />

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Paramètres Victory Road</h3>
          {player.statistics && <span>Niveau {player.statistics.level ?? '—'}</span>}
        </div>
        {player.statistics ? (
          <div className={styles.stats}>
            {Object.entries(STAT_NAMES).map(([key, label]) => {
              const value = player.statistics!.values[key as StatKey];
              return (
                <div key={key}>
                  <div>
                    <span>{label}</span>
                    <strong>{value ?? '—'}</strong>
                  </div>
                  <div className={styles.statTrack}>
                    <span
                      style={{ width: `${value === null ? 0 : (value / largestStat) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.unknown}>Paramètres non renseignés pour cette variante.</p>
        )}
      </section>

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
                      {variant.formLabel ?? age(variant.ageGroup)} ·{' '}
                      {variant.origin ? workLabel(variant.origin.code) : 'Origine inconnue'} · N°{' '}
                      {variant.number ?? '—'}
                    </small>
                  </span>
                  <Icon name="right" size={17} />
                </a>
              );
            })}
          </div>
        </section>
      )}
      {player.sourceUrl && (
        <a className={styles.source} href={player.sourceUrl} target="_blank" rel="noreferrer">
          Consulter le codex officiel
          <Icon name="external" size={14} />
        </a>
      )}
    </>
  );
}
