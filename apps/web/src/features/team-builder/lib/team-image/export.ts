import type { Formation } from '@shared/formations';
import type { LoadoutOptions } from '@shared/catalogue';
import type { Team } from '../team';
import { loadTactics } from '@/features/catalogue/lib/tactics';
import { hasTeamLoadout } from '../loadouts';
import { teamImageAssets } from './assets';
import { analysisHeight, drawAnalysis } from './analysis';
import { compositionHeight, drawComposition } from './composition';
import { fitText, font, imageTheme, rectangle } from './drawing';
import { IMAGE_LAYOUT, teamImageFilename, teamImageModel } from './model';

async function loadoutOptions(team: Team): Promise<LoadoutOptions | undefined> {
  if (!hasTeamLoadout(team)) return undefined;
  const response = await fetch('/api/catalogue/loadouts', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error('Impossible de charger les équipements et les passifs pour l’export.');
  return response.json();
}

export async function downloadTeamImage(
  team: Team,
  formation: Formation,
): Promise<{ missingPortraits: number }> {
  const [catalogue, tactics] = await Promise.all([
    loadoutOptions(team),
    team.tactics?.some(Boolean) ? loadTactics() : Promise.resolve([]),
    document.fonts.ready,
  ]);
  const assets = await teamImageAssets(team, tactics);
  const model = teamImageModel(team, formation, catalogue, tactics);
  const theme = imageTheme();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('La création d’image est indisponible sur ce navigateur.');
  const { width, padding, gap, analysisWidth, contentY } = IMAGE_LAYOUT;
  const pitchWidth = width - padding * 2 - gap - analysisWidth;
  const height =
    contentY +
    Math.max(
      compositionHeight(pitchWidth, model),
      analysisHeight(ctx, theme, model, analysisWidth),
    ) +
    54;
  canvas.width = width * 2;
  canvas.height = Math.ceil(height) * 2;
  ctx.scale(2, 2);
  ctx.imageSmoothingQuality = 'high';
  rectangle(ctx, 0, 0, width, height, theme.background);
  const background = assets.icons.get('background');
  if (background)
    ctx.drawImage(
      background,
      0,
      0,
      width,
      Math.max(height, (width * background.naturalHeight) / background.naturalWidth),
    );
  const logo = assets.icons.get('logo');
  if (logo) ctx.drawImage(logo, padding, 24, 44, 44);
  const titleX = padding + (logo ? 58 : 0);
  font(ctx, theme, 11, true, true);
  ctx.fillStyle = theme.accent;
  ctx.fillText('HAKUREN', titleX, 35);
  font(ctx, theme, 26, true, true);
  ctx.fillStyle = theme.text;
  ctx.fillText(
    fitText(ctx, team.name.trim() || 'Mon équipe', width - titleX - padding),
    titleX,
    65,
  );
  drawComposition(ctx, theme, assets, model, padding, contentY, pitchWidth);
  drawAnalysis(ctx, theme, assets, model, padding + pitchWidth + gap, contentY, analysisWidth);
  font(ctx, theme, 11);
  ctx.fillStyle = theme.muted;
  ctx.fillText('INAZUMA ELEVEN: VICTORY ROAD', padding, height - 19);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('La création du PNG a échoué.'))),
      'image/png',
    ),
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = teamImageFilename(team.name);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { missingPortraits: assets.missing };
}
