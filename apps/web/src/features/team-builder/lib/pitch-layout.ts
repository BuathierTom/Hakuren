import type { FormationPosition } from '@shared/formations';
export const pitchCardWidth = (width: number) =>
  width < 500 ? Math.max(64, Math.min(82, Math.round(width * 0.19))) : Math.min(126, width * 0.14);
export function pitchGeometry(positions: FormationPosition[], width: number) {
  const mobile = width < 500;
  const cardWidth = pitchCardWidth(width);
  const cardHeight = mobile ? 52 : 60;
  const mobileGap = 12;
  const playable = Math.max(1, width - cardWidth - 28);
  const clearance = mobile ? Math.ceil(cardHeight * Math.tan(Math.PI / 20)) + mobileGap : 14;
  const gap = ((cardWidth + clearance) / playable) * 100;
  const depths: number[][] = [];
  for (const y of [...new Set(positions.map((position) => position.y))].sort((a, b) => a - b)) {
    const row = depths.at(-1);
    if (row && y - row[0]! <= 6) row.push(y);
    else depths.push([y]);
  }
  const capacity = mobile ? Math.max(1, Math.floor(playable / (cardWidth + clearance)) + 1) : 11;
  const rows: FormationPosition[][] = [];
  for (const depth of depths) {
    const members = positions
      .filter((position) => depth.includes(position.y))
      .map((position) => ({
        ...position,
        x: mobile
          ? Math.max(0, Math.min(100, 50 + ((position.x - 50) * width) / playable))
          : position.x,
      }))
      .sort((a, b) => a.x - b.x);
    const size = Math.ceil(members.length / Math.ceil(members.length / capacity));
    for (let start = 0; start < members.length; start += size)
      rows.push(members.slice(start, start + size));
  }
  const placed = new Map<number, FormationPosition>();
  for (const [rowIndex, row] of rows.entries()) {
    const crowded = row.some(
      (position, index) => index > 0 && position.x - row[index - 1]!.x < gap,
    );
    const first = row[0]!.x;
    const last = row.at(-1)!.x;
    const span = Math.min(100, Math.max(last - first, gap * (row.length - 1)));
    const start = Math.max(0, Math.min(100 - span, (first + last - span) / 2));
    for (const [index, position] of row.entries())
      placed.set(position.slot, {
        ...position,
        x: row.length > 1 && crowded ? start + (index * span) / (row.length - 1) : position.x,
        y: (rowIndex / Math.max(1, rows.length - 1)) * 100,
      });
  }
  return {
    positions: positions.map((position) => placed.get(position.slot) ?? position),
    cardWidth,
    cardHeight,
    boardHeight: mobile
      ? Math.max(1, rows.length) * cardHeight + Math.max(0, rows.length - 1) * mobileGap + 30
      : 490,
  };
}
export function pitchLayout(positions: FormationPosition[], width: number) {
  return pitchGeometry(positions, width).positions;
}
