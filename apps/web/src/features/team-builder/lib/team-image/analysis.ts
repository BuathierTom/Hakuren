import { POWER_KEYS, POWER_LABELS } from '../power-stats';
import type { TeamImageModel } from './model';
import { font, rectangle, warning, wrapText, type ImageTheme } from './drawing';

function layout(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  model: TeamImageModel,
  width: number,
) {
  font(ctx, theme, 12);
  const alerts = model.alerts.map((alert) => wrapText(ctx, alert.message, width - 66));
  const notes = model.notes.map((note) => wrapText(ctx, note, width - 50));
  const rows = Array.from({ length: Math.ceil(POWER_KEYS.length / 2) }, (_, row) => {
    const keys = POWER_KEYS.slice(row * 2, row * 2 + 2);
    return {
      keys,
      height: 66,
    };
  });
  const alertsHeight = alerts.reduce((total, lines) => total + lines.length * 18 + 26, 0);
  const notesHeight = notes.reduce((total, lines) => total + lines.length * 18 + 18, 0);
  return {
    alerts,
    notes,
    rows,
    height:
      218 +
      alertsHeight +
      32 +
      rows.reduce((total, row) => total + row.height, 0) +
      notesHeight +
      16,
  };
}

export function analysisHeight(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  model: TeamImageModel,
  width: number,
) {
  return layout(ctx, theme, model, width).height;
}

export function drawAnalysis(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  model: TeamImageModel,
  x: number,
  y: number,
  width: number,
) {
  const measured = layout(ctx, theme, model, width);
  rectangle(ctx, x, y, width, measured.height, theme.surface, theme.border);
  rectangle(ctx, x, y, width, 36, theme.accentSoft, theme.border);
  font(ctx, theme, 15, true, true);
  ctx.fillStyle = theme.accent;
  ctx.fillText('ANALYSE', x + 14, y + 24);
  font(ctx, theme, 13, true, true);
  ctx.fillStyle = theme.text;
  ctx.fillText('COMPOSITION', x + 14, y + 65);
  const metricWidth = (width - 40) / 3;
  for (const [index, metric] of [
    { value: `${model.counts.starters}/11`, label: 'Titulaires', warning: false },
    { value: String(model.offPosition), label: 'Hors poste', warning: model.offPosition > 0 },
    { value: String(model.alerts.length), label: 'Alertes', warning: model.alerts.length > 0 },
  ].entries()) {
    const left = x + 14 + index * (metricWidth + 6);
    rectangle(
      ctx,
      left,
      y + 82,
      metricWidth,
      70,
      '#fafcfe',
      metric.warning ? '#ecc4bd' : theme.border,
    );
    ctx.textAlign = 'center';
    font(ctx, theme, 23, true);
    ctx.fillStyle = metric.warning ? '#a74135' : theme.text;
    ctx.fillText(metric.value, left + metricWidth / 2, y + 111);
    font(ctx, theme, 10);
    ctx.fillStyle = theme.muted;
    ctx.fillText(metric.label.toUpperCase(), left + metricWidth / 2, y + 136);
  }
  ctx.textAlign = 'left';
  let limitX = x + 14;
  font(ctx, theme, 12, true, true);
  for (const limit of [
    { text: `HÉRO ${model.counts.heroes}/2`, full: model.counts.heroes === 2 },
    { text: `BASARA ${model.counts.basaras}/1`, full: model.counts.basaras === 1 },
  ]) {
    const size = ctx.measureText(limit.text).width + 16;
    rectangle(
      ctx,
      limitX,
      y + 166,
      size,
      28,
      limit.full ? theme.accentSoft : theme.surface,
      limit.full ? theme.accent : theme.border,
    );
    ctx.fillStyle = theme.text;
    ctx.fillText(limit.text, limitX + 8, y + 185);
    limitX += size + 6;
  }
  let current = y + 218;
  for (const lines of measured.alerts) {
    const height = lines.length * 18 + 18;
    rectangle(ctx, x + 14, current, width - 28, height, '#fcf8e9');
    rectangle(ctx, x + 14, current, 3, height, '#8b6b00');
    warning(ctx, x + 24, current + 11);
    font(ctx, theme, 12);
    ctx.fillStyle = '#765b00';
    lines.forEach((line, index) => ctx.fillText(line, x + 44, current + 21 + index * 18));
    current += height + 8;
  }
  rectangle(ctx, x + 14, current, width - 28, 32, theme.surface, theme.border);
  font(ctx, theme, 13, true, true);
  ctx.fillStyle = theme.muted;
  ctx.fillText('PUISSANCE CUMULÉE', x + 24, current + 22);
  current += 32;
  const cellWidth = (width - 28) / 2;
  for (const row of measured.rows) {
    rectangle(ctx, x + 14, current, width - 28, row.height, theme.border);
    for (const [column, key] of row.keys.entries()) {
      const left = x + 14 + column * cellWidth;
      rectangle(ctx, left + 1, current + 1, cellWidth - 1, row.height - 1, theme.surface);
      font(ctx, theme, 11);
      ctx.fillStyle = theme.muted;
      ctx.fillText(POWER_LABELS[key].toUpperCase(), left + 10, current + 21);
      font(ctx, theme, 22, true);
      ctx.fillStyle = theme.text;
      ctx.fillText(model.power.totals[key].toLocaleString('fr-FR'), left + 10, current + 47);
    }
    current += row.height;
  }
  for (const lines of measured.notes) {
    const height = lines.length * 18 + 18;
    rectangle(ctx, x + 14, current, width - 28, height, theme.surface, theme.border);
    font(ctx, theme, 12);
    ctx.fillStyle = theme.muted;
    lines.forEach((line, index) => ctx.fillText(line, x + 24, current + 21 + index * 18));
    current += height;
  }
}
