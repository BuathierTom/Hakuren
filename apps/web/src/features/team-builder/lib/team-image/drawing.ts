export interface ImageTheme {
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  background: string;
  surface: string;
  font: string;
}

export function imageTheme(): ImageTheme {
  const styles = getComputedStyle(document.documentElement);
  const color = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();
  return {
    text: color('text'),
    muted: color('muted'),
    accent: color('accent'),
    accentSoft: color('accent-soft'),
    border: color('border'),
    background: color('background'),
    surface: color('surface'),
    font: styles.getPropertyValue('--font-family-base').trim(),
  };
}

export function rectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  border?: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }
}

export function font(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  size: number,
  bold = false,
  italic = false,
) {
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 800 : 400} ${size}px ${theme.font}`;
}

export function fitText(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(chars.join('') + '…').width > width) chars.pop();
  return chars.join('') + '…';
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of Array.from(word)) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function heading(
  ctx: CanvasRenderingContext2D,
  theme: ImageTheme,
  title: string,
  x: number,
  y: number,
  width: number,
) {
  rectangle(ctx, x, y, width, 36, theme.accent);
  font(ctx, theme, 15, true, true);
  ctx.fillStyle = '#fff';
  ctx.fillText(fitText(ctx, title.toUpperCase(), width - 28), x + 14, y + 24);
}

export function warning(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#fff3bc';
  ctx.strokeStyle = '#806000';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x + 7, y);
  ctx.lineTo(x + 14, y + 13);
  ctx.lineTo(x, y + 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 4);
  ctx.lineTo(x + 7, y + 8);
  ctx.stroke();
  ctx.fillStyle = '#806000';
  ctx.fillRect(x + 6.3, y + 10, 1.4, 1.4);
  ctx.restore();
}

export function drawStyleIcon(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const tint = canvas.getContext('2d');
  if (!tint) return;
  tint.drawImage(image, 0, 0);
  tint.globalCompositeOperation = 'source-in';
  tint.fillStyle = '#111827';
  tint.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvas, x, y, size, size);
}
