import type { Position } from '@shared/catalogue';
import { playerSurname } from '../player-name';
import { assignmentAppearance } from '../rarity-appearance';
import { RARITIES, type Assignment } from '../team';
import { fitText, font, warning, type ImageTheme } from './drawing';
import type { TeamImageAssets } from './assets';

function tile(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const skew = (Math.tan(Math.PI / 20) * height) / 2;
  ctx.beginPath();
  ctx.moveTo(x + skew, y);
  ctx.lineTo(x + width + skew, y);
  ctx.lineTo(x + width - skew, y + height);
  ctx.lineTo(x - skew, y + height);
  ctx.closePath();
}

export function drawPlayerCard(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  assets: TeamImageAssets,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  assignment?: Assignment,
  position?: Position,
  hasWarning = false,
) {
  const appearance = assignment ? assignmentAppearance(assignment) : null;
  ctx.save();
  tile(ctx, x + 5, y + 6, width, height);
  ctx.fillStyle = appearance?.shadow ?? '#253b4b20';
  ctx.fill();
  tile(ctx, x, y, width, height);
  ctx.fillStyle = assignment?.rarity === 'basara' ? '#f4feff' : assignment ? '#f8fafc' : '#f5f8fc';
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (assignment) {
    const portrait = assets.portraits.get(assignment.player.id);
    if (portrait) {
      const scale = Math.min((height - 3) / portrait.naturalHeight, 62 / portrait.naturalWidth);
      const w = portrait.naturalWidth * scale,
        h = portrait.naturalHeight * scale;
      ctx.drawImage(portrait, x + width - w - 4, y + height - h - 1, w, h);
    }
    const element = assignment.player.element
      ? assets.icons.get(assignment.player.element)
      : undefined;
    if (element) ctx.drawImage(element, x + 8, y + 5, 13, 13);
    const badge = assignment.player.position
      ? assets.icons.get(assignment.player.position)
      : undefined;
    const badgeWidth = badge ? (badge.naturalWidth * 13) / badge.naturalHeight : 0;
    if (badge) ctx.drawImage(badge, x + 8, y + 20, badgeWidth, 13);
    const style = assignment.playStyle ?? assignment.player.playStyle;
    const styleIcon = style ? assets.icons.get(style) : undefined;
    if (styleIcon) {
      const tinted = document.createElement('canvas');
      tinted.width = styleIcon.naturalWidth;
      tinted.height = styleIcon.naturalHeight;
      const tint = tinted.getContext('2d');
      if (tint) {
        tint.drawImage(styleIcon, 0, 0);
        tint.globalCompositeOperation = 'source-in';
        tint.fillStyle = '#111827';
        tint.fillRect(0, 0, tinted.width, tinted.height);
        ctx.drawImage(tinted, x + 8 + (badge ? badgeWidth + 4 : 0), y + 20, 13, 13);
      }
    }
    font(ctx, theme, 9);
    ctx.fillStyle = theme.muted;
    ctx.fillText(RARITIES[assignment.rarity].name, x + 8, y + 42);
    font(ctx, theme, 11, true, true);
    ctx.fillStyle = theme.text;
    ctx.fillText(
      fitText(ctx, playerSurname(assignment.player.name).toUpperCase(), width - 42),
      x + 8,
      y + height - 6,
    );
    if (hasWarning) warning(ctx, x + width - 20, y + 4);
  } else {
    const icon = assets.icons.get(
      position ?? (label === 'Entraîneur' ? 'coach' : label.startsWith('Manager') ? 'manager' : ''),
    );
    ctx.globalAlpha = 0.7;
    if (icon) {
      const h = position ? 20 : 23,
        w = (icon.naturalWidth * h) / icon.naturalHeight;
      ctx.drawImage(icon, x + (width - w) / 2, y + (position ? (height - h) / 2 : 8), w, h);
    }
    if (!position) {
      font(ctx, theme, 10, true, true);
      ctx.fillStyle = theme.muted;
      ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), x + width / 2, y + height - 10);
    }
  }
  ctx.restore();
  tile(ctx, x, y, width, height);
  ctx.strokeStyle = appearance?.color ?? '#c5d1df';
  ctx.lineWidth = 2;
  ctx.setLineDash(assignment ? [] : [5, 4]);
  ctx.stroke();
  ctx.restore();
}
