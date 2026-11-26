import { locale, t } from '@/features/preferences/lib/i18n';
import { TeamStrategy } from '../team-strategy/team-strategy';
import { useMemo } from 'react';
import type { LoadoutOptions } from '@shared/catalogue';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import type { Formation } from '@shared/formations';
import { POWER_LABELS, teamCounts, teamPower, type Team } from '../../lib/team';
import { teamAlerts } from '../../lib/team-alerts';
import { Icon } from '@/components/ui/icon/icon';
import styles from './team-analysis.module.scss';
import { hasTeamLoadout } from '../../lib/loadouts';
export function TeamAnalysis({
  team,
  formation,
  onChange,
}: {
  team: Team;
  formation: Formation;
  onChange: (update: (team: Team) => Team) => void;
}) {
  const counts = teamCounts(team);
  const alerts = teamAlerts(team, formation);
  const offPosition = alerts.find((alert) => alert.code === 'off-position')?.slots ?? [];
  const hasLoadout = hasTeamLoadout(team);
  const loadout = useRequest<LoadoutOptions>(hasLoadout ? '/api/catalogue/loadouts' : null);
  const power = useMemo(() => teamPower(team, loadout.data ?? undefined), [team, loadout.data]);
  return (
    <aside className={styles.analysis} aria-label={t('Analyse de l’équipe')}>
      <h2>{t('Analyse')}</h2>
      <div className={styles.body}>
        <h3>{t('Composition')}</h3>
        <div className={styles.metrics}>
          <div>
            <strong>
              {counts.starters}
              <small>/11</small>
            </strong>
            <span>{t('Titulaires')}</span>
          </div>
          <div data-warning={offPosition.length > 0}>
            <strong>{offPosition.length}</strong>
            <span>{t('Hors poste')}</span>
          </div>
          <div data-warning={alerts.length > 0}>
            <strong>{alerts.length}</strong>
            <span>{t('Alertes')}</span>
          </div>
        </div>
        <div className={styles.limits} aria-label={t('Limites sur le terrain')}>
          <span data-full={counts.heroes === 2}>
            {t('Héro')} {counts.heroes}/2
          </span>
          <span data-full={counts.basaras === 1}>Basara {counts.basaras}/1</span>
        </div>
        {alerts.length > 0 && (
          <ul className={styles.alerts} aria-label={t('Alertes de composition')} aria-live="polite">
            {alerts.map((alert) => (
              <li key={alert.code}>
                <Icon name="warning" size={15} />
                <span>{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
        <section
          className={styles.power}
          aria-label={t('Puissance cumulée')}
          aria-busy={loadout.loading}
        >
          <h3>{t('Puissance cumulée')}</h3>
          <dl aria-live="polite">
            {Object.entries(POWER_LABELS).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {loadout.loading || loadout.error
                    ? '—'
                    : power.totals[key as keyof typeof power.totals].toLocaleString(locale())}
                </dd>
              </div>
            ))}
          </dl>
          {loadout.loading && (
            <p className={styles.note} role="status">
              {t('Chargement des bonus…')}
            </p>
          )}
          {loadout.error && (
            <div className={styles.note} role="alert">
              <p>{t('Impossible de calculer les bonus pour le moment.')}</p>
              <button type="button" onClick={loadout.retry}>
                {t('Réessayer')}
              </button>
            </div>
          )}
          {hasLoadout && !loadout.loading && !loadout.error && (
            <>
              {power.matchState > 0 && (
                <p className={styles.note}>
                  {t(
                    power.matchState > 1
                      ? '{0} passifs en attente du rang de build, de la puissance de lien ou d’un remplacement.'
                      : '{0} passif en attente du rang de build, de la puissance de lien ou d’un remplacement.',
                    power.matchState,
                  )}
                </p>
              )}
              {(power.unavailable > 0 || power.unresolved > 0) && (
                <p className={styles.note}>
                  {t(
                    power.unavailable + power.unresolved > 1
                      ? '{0} bonus indisponibles ou non reconnus.'
                      : '{0} bonus indisponible ou non reconnu.',
                    power.unavailable + power.unresolved,
                  )}
                </p>
              )}
            </>
          )}
        </section>
        <TeamStrategy team={team} onChange={onChange} />
      </div>
    </aside>
  );
}
