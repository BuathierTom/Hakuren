import type { FormationPosition } from '@shared/formations';
export const pitchCardWidth = (width: number) =>
  width < 300 ? 52 : width < 500 ? 56 : Math.min(126, width * 0.14);
export function pitchLayout(positions: FormationPosition[], width: number) {
  const cardWidth = pitchCardWidth(width);
  const playable = Math.max(1, width - cardWidth - 28);
  const gap = ((cardWidth + (width < 500 ? 10 : 14)) / playable) * 100;
  const rows: number[][] = [];
  for (const y of [...new Set(positions.map((p) => p.y))].sort((a, b) => a - b)) {
    const row = rows.at(-1);
    if (row && y - row[0]! <= 6) row.push(y);
    else rows.push([y]);
  }
  return positions.map((position) => {
    const rowIndex = rows.findIndex((row) => row.includes(position.y));
    const siblings = positions
      .filter((p) => rows[rowIndex]!.includes(p.y))
      .sort((a, b) => a.x - b.x);
    const index = siblings.findIndex((p) => p.slot === position.slot);
    const crowded = siblings.some((p, i) => i > 0 && p.x - siblings[i - 1]!.x < gap);
    let x = position.x;
    if (crowded && siblings.length > 1) {
      const first = siblings[0]!.x;
      const last = siblings.at(-1)!.x;
      const span = Math.min(100, Math.max(last - first, gap * (siblings.length - 1)));
      const start = Math.max(0, Math.min(100 - span, (first + last - span) / 2));
      x = start + (index * span) / (siblings.length - 1);
    }
    return { ...position, x, y: (rowIndex / Math.max(1, rows.length - 1)) * 100 };
  });
}
