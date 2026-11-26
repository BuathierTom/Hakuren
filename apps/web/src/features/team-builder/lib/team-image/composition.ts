import { t } from '../../../preferences/lib/i18n';
import type { TeamImageModel } from './model';
import type { TeamImageAssets } from './assets';
import { IMAGE_LAYOUT } from './model';
import { heading, rectangle, font, type ImageTheme } from './drawing';
import { drawPlayerCard } from './player-card';
import { pitchGeometry } from '../pitch-layout';
import { playerWarning } from '../team-alerts';
import { BENCH_SLOTS, STAFF_SLOTS, slotLabel } from '../team';

export function compositionHeight(width: number, model: TeamImageModel) {
  return (
    IMAGE_LAYOUT.sectionHeader +
    pitchGeometry(model.formation.positions, width - 2).boardHeight +
    IMAGE_LAYOUT.rosterGap +
    IMAGE_LAYOUT.rosterHeight
  );
}

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  assets: TeamImageAssets,
  model: TeamImageModel,
  x: number,
  y: number,
  width: number,
) {
  const header = IMAGE_LAYOUT.sectionHeader;
  const geometry = pitchGeometry(model.formation.positions, width - 2);
  rectangle(ctx, x, y, width, geometry.boardHeight + header, theme.surface, theme.border);
  heading(ctx, theme, t(model.formation.name), x, y, width);
  for (const position of geometry.positions) {
    const slot = `field-${position.slot}`;
    const px = x + 14 + (position.x / 100) * (width - geometry.cardWidth - 28);
    const py =
      y +
      header +
      15 +
      ((100 - position.y) / 100) * (geometry.boardHeight - geometry.cardHeight - 30);
    drawPlayerCard(
      ctx,
      theme,
      assets,
      px,
      py,
      geometry.cardWidth,
      geometry.cardHeight,
      slotLabel(slot, model.formation),
      model.team.slots[slot],
      position.position,
      !!playerWarning(model.alerts, slot),
    );
  }
  const rosterY = y + geometry.boardHeight + header + IMAGE_LAYOUT.rosterGap;
  rectangle(ctx, x, rosterY, width, IMAGE_LAYOUT.rosterHeight, theme.surface, theme.border);
  heading(ctx, theme, t('Effectif'), x, rosterY, width);
  const groups = [
    { title: 'Remplaçants', slots: BENCH_SLOTS },
    { title: 'Staff', slots: STAFF_SLOTS },
  ];
  for (const [index, { title, slots }] of groups.entries()) {
    const rowY = rosterY + header + 19 + index * 81;
    font(ctx, theme, 12, true, true);
    ctx.fillStyle = theme.muted;
    ctx.fillText(t(title).toUpperCase(), x + 16, rowY + 34);
    for (const [column, slot] of slots.entries()) {
      drawPlayerCard(
        ctx,
        theme,
        assets,
        x + 132 + column * (geometry.cardWidth + 14),
        rowY,
        geometry.cardWidth,
        geometry.cardHeight,
        slotLabel(slot, model.formation),
        model.team.slots[slot],
        undefined,
        !!playerWarning(model.alerts, slot),
      );
    }
  }
}
