import { useId } from 'react';
import type { PlayerStats as Stats, StatKey } from '@shared/catalogue';
import { PlayerDetailBlock } from '../player-detail-block/player-detail-block';
import styles from './player-stats.module.scss';

const STATS: [StatKey, string, string][] = [
  ['power', 'Frappe', 'FRP'],
  ['control', 'Contrôle', 'CTR'],
  ['technique', 'Technique', 'TEC'],
  ['pressure', 'Pression', 'PRS'],
  ['physical', 'Physique', 'PHY'],
  ['agility', 'Agilité', 'AGI'],
  ['intelligence', 'Intelligence', 'INT'],
];

function point(index: number, scale: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / STATS.length;
  return [160 + Math.cos(angle) * 78 * scale, 110 + Math.sin(angle) * 78 * scale];
}

export function PlayerStats({ stats, ceiling }: { stats: Stats | null; ceiling: number }) {
  const titleId = useId();
  const complete = !!stats && STATS.every(([key]) => stats.values[key] !== null);
  const total = complete ? STATS.reduce((sum, [key]) => sum + stats!.values[key]!, 0) : null;
  return (
    <PlayerDetailBlock title="Stats de base">
      {stats ? (
        <>
          {complete && (
            <svg
              className={styles.radar}
              viewBox="0 0 320 228"
              role="img"
              aria-labelledby={titleId}
            >
              <title id={titleId}>
                {STATS.map(([key, name]) => `${name} : ${stats.values[key]}`).join(', ')}
              </title>
              {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
                <polygon
                  className={styles.grid}
                  key={scale}
                  points={STATS.map((_, index) => point(index, scale).join(',')).join(' ')}
                />
              ))}
              {STATS.map(([key, , short], index) => {
                const [x, y] = point(index, 1);
                const [labelX, labelY] = point(index, 1.26);
                return (
                  <g key={key}>
                    <line className={styles.grid} x1="160" y1="110" x2={x} y2={y} />
                    <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle">
                      {short}
                    </text>
                  </g>
                );
              })}
              <polygon
                className={styles.values}
                points={STATS.map(([key], index) =>
                  point(index, stats.values[key]! / ceiling).join(','),
                ).join(' ')}
              />
              {STATS.map(([key], index) => {
                const [cx, cy] = point(index, stats.values[key]! / ceiling);
                return <circle className={styles.dot} key={key} cx={cx} cy={cy} r="2.5" />;
              })}
            </svg>
          )}
          <table className={styles.table} aria-label="Statistiques de base">
            <tbody>
              {STATS.map(([key, name]) => (
                <tr key={key}>
                  <th scope="row">{name}</th>
                  <td>{stats.values[key] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>{total ?? '—'}</td>
              </tr>
            </tfoot>
          </table>
        </>
      ) : (
        <p className={styles.empty}>Statistiques non renseignées pour cette rareté.</p>
      )}
    </PlayerDetailBlock>
  );
}
