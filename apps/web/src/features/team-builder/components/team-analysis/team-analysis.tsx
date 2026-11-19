import type { Formation } from '@shared/formations';
import { POWER_LABELS, teamCounts, teamPower, type Team } from '../../lib/team';
import { teamAlerts } from '../../lib/team-alerts';
import { Icon } from '@/components/ui/icon/icon';
import styles from './team-analysis.module.scss';
export function TeamAnalysis({ team, formation }: { team: Team; formation: Formation }) {
  const counts = teamCounts(team);
  const alerts = teamAlerts(team, formation);
  const offPosition = alerts.find((alert) => alert.code === 'off-position')?.slots ?? [];
  const power = teamPower(team);
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
        <section className={styles.power}>
          <h3>Puissance cumulée</h3>
          <dl>
            {Object.entries(POWER_LABELS).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{power.totals[key as keyof typeof power.totals].toLocaleString('fr-FR')}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </aside>
  );
}
