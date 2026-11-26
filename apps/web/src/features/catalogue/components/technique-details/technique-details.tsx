import { catalogueName, catalogueDescription } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import type { TechniqueDetail, TechniqueSummary } from '@shared/catalogue';
import { ElementBadge, PositionBadge } from '../catalogue-badges/catalogue-badges';
import { Portrait } from '../player-portrait/player-portrait';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import { catalogueDetailHref, href, intercept } from '@/app/navigation';
import { age, CATEGORIES, count, workLabel } from '../../lib/labels';
import { TechniquePreview } from '../technique-preview/technique-preview';
import { EntryStatistics } from '../entry-statistics/entry-statistics';
import styles from './technique-details.module.scss';

function TechniqueLink({ technique }: { technique: TechniqueSummary }) {
  const target = catalogueDetailHref('techniques', technique.id, false);
  return (
    <a
      className={styles.techniqueLink}
      href={target}
      onClick={(event) => intercept(event, target, { overlay: true })}
    >
      <TechniqueTypeIcon category={technique.category} />
      <strong>{catalogueName(technique)}</strong>
    </a>
  );
}
export function TechniquePanel({
  technique,
  titleId,
}: {
  technique: TechniqueDetail;
  titleId: string;
}) {
  const userTarget = href('players', { technique: technique.id }, false);
  const fields = [
    { label: 'ID', value: technique.gameId ?? '—' },
    ...(technique.power != null ? [{ label: t('Puissance'), value: String(technique.power) }] : []),
    ...(technique.tension != null ? [{ label: 'Tension', value: `${technique.tension} TP` }] : []),
    ...(technique.notes?.length
      ? [{ label: t('Notes'), value: technique.notes.map((note) => t(note)).join(' - ') }]
      : []),
  ];
  return (
    <>
      <div className={styles.hero}>
        <span className={styles.icon}>
          <TechniqueTypeIcon category={technique.category} />
        </span>
        <div>
          {technique.category && (
            <span className={styles.eyebrow}>{t(CATEGORIES[technique.category])}</span>
          )}
          <h2 id={titleId}>{catalogueName(technique)}</h2>
          <ElementBadge element={technique.element} />
        </div>
      </div>
      {catalogueDescription(technique) && (
        <p className={styles.description}>{catalogueDescription(technique)}</p>
      )}
      <EntryStatistics fields={fields} />
      {technique.preview && (
        <TechniquePreview
          key={technique.preview.url}
          preview={technique.preview}
          name={catalogueName(technique)}
        />
      )}
      {technique.grantedTechnique && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h3>{t('Technique accordée')}</h3>
          </div>
          <TechniqueLink technique={technique.grantedTechnique} />
        </section>
      )}
      {!!technique.grantedBy?.length && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h3>{t('Pouvoirs associés')}</h3>
          </div>
          {technique.grantedBy.map((entry) => (
            <TechniqueLink key={entry.id} technique={entry} />
          ))}
        </section>
      )}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>{t('Joueurs associés')}</h3>
          <span>{count(technique.userCount)}</span>
        </div>
        {technique.users.length ? (
          <>
            <div className={styles.related}>
              {technique.users.slice(0, 6).map((player) => {
                const target = catalogueDetailHref('players', player.id, false);
                return (
                  <a
                    key={player.id}
                    href={target}
                    onClick={(event) => intercept(event, target, { overlay: true })}
                  >
                    <Portrait src={player.portraitUrl} small />
                    <span>
                      <strong>{catalogueName(player)}</strong>
                      <small>
                        {age(player.ageGroup)} -{' '}
                        {player.origin ? workLabel(player.origin.code) : ''} - N°{' '}
                        {player.number ?? '—'}
                      </small>
                    </span>
                    <PositionBadge position={player.position} />
                  </a>
                );
              })}
            </div>
            <a
              className={styles.viewAll}
              href={userTarget}
              onClick={(event) => intercept(event, userTarget)}
            >
              {t('Voir les joueurs dans le catalogue')}
            </a>
          </>
        ) : (
          <p className={styles.empty}>{t('Aucun joueur associé répertorié.')}</p>
        )}
      </section>
    </>
  );
}
