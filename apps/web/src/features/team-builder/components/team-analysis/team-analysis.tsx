import { useMemo } from 'react';
import type { LoadoutOptions } from '@shared/catalogue';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import type { Formation } from '@shared/formations';
import { POWER_LABELS, teamCounts, teamPower, type Team } from '../../lib/team';
import { teamAlerts } from '../../lib/team-alerts';
import { Icon } from '@/components/ui/icon/icon';
import styles from './team-analysis.module.scss';
import { hasTeamLoadout } from '../../lib/loadouts';
export function TeamAnalysis({ team, formation }: { team: Team; formation: Formation }) {
  const counts = teamCounts(team);
  const alerts = teamAlerts(team, formation);
  const offPosition = alerts.find((alert) => alert.code === 'off-position')?.slots ?? [];
  const hasLoadout = hasTeamLoadout(team);
  const loadout = useRequest<LoadoutOptions>(hasLoadout ? '/api/catalogue/loadouts' : null);
  const power = useMemo(() => teamPower(team, loadout.data ?? undefined), [team, loadout.data]);
  return (
    <aside className={styles.analysis} aria-label="Analyse de l’équipe">
      <h2>Analyse</h2>
      <div className={styles.body}>
        <h3>Composition</h3>
        <div className={styles.metrics}>
          <div>
            <strong>
              {counts.starters}
              <small>/11</small>
            </strong>
            <span>Titulaires</span>
          </div>
          <div data-warning={offPosition.length > 0}>
            <strong>{offPosition.length}</strong>
            <span>Hors poste</span>
          </div>
          <div data-warning={alerts.length > 0}>
            <strong>{alerts.length}</strong>
            <span>Alertes</span>
          </div>
        </div>
        <div className={styles.limits} aria-label="Limites sur le terrain">
          <span data-full={counts.heroes === 2}>Héro {counts.heroes}/2</span>
          <span data-full={counts.basaras === 1}>Basara {counts.basaras}/1</span>
        </div>
        {alerts.length > 0 && (
          <ul className={styles.alerts} aria-label="Alertes de composition" aria-live="polite">
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
          aria-label="Puissance cumulée"
          aria-busy={loadout.loading}
        >
          <h3>Puissance cumulée</h3>
          <dl aria-live="polite">
            {Object.entries(POWER_LABELS).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {loadout.loading || loadout.error
                    ? '—'
                    : power.totals[key as keyof typeof power.totals].toLocaleString('fr-FR')}
                </dd>
              </div>
            ))}
          </dl>
          {loadout.loading && (
            <p className={styles.note} role="status">
              Chargement des bonus…
            </p>
          )}
          {loadout.error && (
            <div className={styles.note} role="alert">
              <p>Impossible de calculer les bonus pour le moment.</p>
              <button type="button" onClick={loadout.retry}>
                Réessayer
              </button>
            </div>
          )}
          {hasLoadout && !loadout.loading && !loadout.error && (
            <>
              {power.matchState > 0 && (
                <p className={styles.note}>
                  {power.matchState} passif{power.matchState > 1 ? 's' : ''} en attente du rang de
                  build, de la puissance de lien ou d’un remplacement.
                </p>
              )}
              {(power.unavailable > 0 || power.unresolved > 0) && (
                <p className={styles.note}>
                  {power.unavailable + power.unresolved} bonus indisponible
                  {power.unavailable + power.unresolved > 1 ? 's' : ''} ou non reconnu
                  {power.unavailable + power.unresolved > 1 ? 's' : ''}.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
