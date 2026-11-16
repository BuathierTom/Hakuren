import { useState } from 'react';
import type { TechniqueDetail } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { ElementBadge, PositionBadge } from '../catalogue-badges/catalogue-badges';
import { Portrait } from '../player-portrait/player-portrait';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import { href, intercept } from '@/app/navigation';
import { age, CATEGORIES, count, workLabel } from '../../lib/labels';
import { TechniquePreview } from '../technique-preview/technique-preview';
import styles from './technique-details.module.scss';

export function TechniquePanel({
  technique,
  titleId,
  selectedWork,
}: {
  technique: TechniqueDetail;
  titleId: string;
  selectedWork: string | null;
}) {
  const works = [
    ...new Map(technique.profiles.map((profile) => [profile.work.code, profile.work])).values(),
  ];
  const [episode, setEpisode] = useState(
    works.find((w) => w.code === selectedWork)?.code ??
      works.find((w) => w.code === 'VR')?.code ??
      works[0]?.code ??
      'VR',
  );
  const profiles = technique.profiles.filter((profile) => profile.work.code === episode);
  const [profileId, setProfileId] = useState<number | null>(null);
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];
  const userTarget = href('players', { technique: technique.id }, false);
  return (
    <>
      <div className={styles.techniqueHero}>
        <span className={styles.largeIcon}>
          <TechniqueTypeIcon category={technique.category} />
        </span>
        <div>
          <span className={styles.eyebrow}>
            {technique.category ? CATEGORIES[technique.category] : 'TYPE À CONFIRMER'}
          </span>
          <h2 id={titleId}>{technique.name}</h2>
          <ElementBadge element={profile ? profile.element : technique.element} />
        </div>
      </div>
      {technique.aliases.length > 0 && (
        <p className={styles.aliasLine}>Autres noms : {technique.aliases.join(', ')}</p>
      )}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Valeurs par épisode</h3>
        </div>
        {works.length > 0 && (
          <div className={styles.episodes}>
            {works.map((work) => (
              <button
                key={work.code}
                aria-pressed={episode === work.code}
                onClick={() => {
                  setEpisode(work.code);
                  setProfileId(null);
                }}
              >
                {workLabel(work.code)}
              </button>
            ))}
          </div>
        )}
        {profiles.length > 1 && (
          <label className={styles.profileSelect}>
            Profil
            <select
              value={profile?.id ?? ''}
              onChange={(event) => setProfileId(Number(event.target.value))}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rarity?.name ?? 'Profil de base'}
                </option>
              ))}
            </select>
          </label>
        )}
        {profile ? (
          <>
            <div className={styles.powerStats}>
              <div>
                <span>Puissance</span>
                <strong>{profile.power ?? '—'}</strong>
              </div>
              <div>
                <span>Coût</span>
                <strong>{profile.cost ?? '—'}</strong>
              </div>
              <div>
                <span>Épisode</span>
                <strong className={styles.workValue}>{workLabel(profile.work.code)}</strong>
              </div>
            </div>
            {profile.parameters && (
              <div className={styles.parameters}>
                {Object.entries(profile.parameters)
                  .filter(([key]) => ['KP', 'Attack', 'Damage', 'SP'].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <span>
                        {
                          (
                            { KP: 'KP', Attack: 'Attaque', Damage: 'Dégâts', SP: 'SP' } as Record<
                              string,
                              string
                            >
                          )[key]
                        }
                      </span>
                      <strong>
                        {Array.isArray(value) && value.length
                          ? `${value[0]} → ${value.at(-1)}`
                          : typeof value === 'number'
                            ? value
                            : '—'}
                      </strong>
                    </div>
                  ))}
              </div>
            )}
            <p className={styles.caption}>
              Les valeurs affichées concernent uniquement {workLabel(profile.work.code)}
              {profile.rarity ? `, rareté ${profile.rarity.name}` : ''}.
            </p>
          </>
        ) : (
          <p className={styles.unknown}>Puissance et coût non renseignés pour cette technique.</p>
        )}
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Utilisateurs répertoriés</h3>
          <span>{count(technique.userCount)}</span>
        </div>
        {technique.users.length ? (
          <>
            <div className={styles.related}>
              {technique.users.map((player) => {
                const target = href('players', { detail: player.id }, false);
                return (
                  <a
                    key={player.id}
                    href={target}
                    onClick={(event) => intercept(event, target, { overlay: true })}
                  >
                    <Portrait src={player.portraitUrl} small />
                    <span>
                      <strong>{player.name}</strong>
                      <small>
                        {age(player.ageGroup)} ·{' '}
                        {player.origin ? workLabel(player.origin.code) : ''} · N°{' '}
                        {player.number ?? '—'}
                      </small>
                    </span>
                    <PositionBadge position={player.position} />
                    <Icon name="right" size={16} />
                  </a>
                );
              })}
            </div>
            <a
              className={styles.viewAll}
              href={userTarget}
              onClick={(event) => intercept(event, userTarget)}
            >
              Voir les joueurs dans le catalogue
              <Icon name="arrow" size={16} />
            </a>
          </>
        ) : (
          <p className={styles.unknown}>
            Les utilisateurs de cette technique ne sont pas encore renseignés.
          </p>
        )}
      </section>
      {technique.preview && <TechniquePreview preview={technique.preview} name={technique.name} />}
      {technique.sourceUrl && (
        <a className={styles.source} href={technique.sourceUrl} target="_blank" rel="noreferrer">
          Source de la fiche
          <Icon name="external" size={14} />
        </a>
      )}
    </>
  );
}
