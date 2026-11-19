import type { Formation } from '@shared/formations';
import {
  FIELD_SLOTS,
  POWER_LABELS,
  teamCounts,
  teamPower,
  ruleError,
  type Team,
} from '../../lib/team';
import styles from './team-analysis.module.scss';
export function TeamAnalysis({ team, formation }: { team: Team; formation: Formation }) {
  const counts = teamCounts(team);
  const offPosition = FIELD_SLOTS.filter((slot) => {
    const player = team.slots[slot]?.player;
    return (
      player?.position &&
      formation.positions.find((p) => `field-${p.slot}` === slot)?.position !== player.position
    );
  });
  const power = teamPower(team);
  const alerts = [
    ruleError(team),
    power.missing
      ? `${power.missing} joueur${power.missing > 1 ? 's' : ''} sans statistiques complètes.`
      : null,
  ].filter(Boolean);
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
          <div>
            <strong>{offPosition.length}</strong>
            <span>Hors poste</span>
          </div>
          <div data-warning={alerts.length > 0}>
            <strong>{alerts.length}</strong>
            <span>Alertes</span>
          </div>
        </div>
        <div className={styles.limits} aria-label="Limites sur le terrain">
          <span data-full={counts.heroes === 2}>HERO {counts.heroes}/2</span>
          <span data-full={counts.basaras === 1}>BASARA {counts.basaras}/1</span>
        </div>
        {alerts.length > 0 && (
          <ul className={styles.alerts}>
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
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
