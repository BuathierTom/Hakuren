import {
  elementIcons,
  playStyleIcons,
  positionIcons,
  tacticIconSource,
} from '@/features/catalogue/lib/game-icon-assets';
import coach from '../../../../../assets/icons/positions/icon_position_coach.png';
import manager from '../../../../../assets/icons/positions/icon_position_manager.png';
import background from '../../../../../assets/backgrounds/composition.svg';
import type { CatalogueItem } from '@shared/catalogue';
import type { Team } from '../team';

const cache = new Map<string, Promise<HTMLImageElement | null>>();
async function loadImage(source: string): Promise<HTMLImageElement | null> {
  const cached = cache.get(source);
  if (cached) return cached;
  const task = (async () => {
    let url: string | undefined;
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return null;
      url = URL.createObjectURL(await response.blob());
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } catch {
      return null;
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  })();
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(source, task);
  const result = await task;
  if (!result) cache.delete(source);
  return result;
}

export async function teamImageAssets(team: Team, tactics: CatalogueItem[] = []) {
  const sources = {
    ...elementIcons,
    ...positionIcons(),
    ...playStyleIcons,
    coach,
    manager,
    background,
    logo: '/icon.webp',
    ...Object.fromEntries(
      (team.tactics ?? []).flatMap((id) => {
        const item = tactics.find((item) => item.id === id);
        const source = item ? tacticIconSource(item.stringId) : null;
        return source ? [[`tactic:${id}`, source]] : [];
      }),
    ),
  };
  const icons = new Map<string, HTMLImageElement>();
  const portraits = new Map<number, HTMLImageElement>();
  const players = [
    ...new Map(
      Object.values(team.slots).map((assignment) => [assignment.player.id, assignment.player]),
    ).values(),
  ].filter((player) => player.portraitUrl);
  const queue = [...players];
  let missing = 0;
  const worker = async () => {
    while (queue.length) {
      const player = queue.shift()!;
      const image = await loadImage(`/api/players/${player.id}/portrait`);
      if (image) portraits.set(player.id, image);
      else missing++;
    }
  };
  await Promise.all([
    ...Object.entries(sources).map(async ([key, source]) => {
      const image = await loadImage(source);
      if (image) icons.set(key, image);
    }),
    ...Array.from({ length: Math.min(4, players.length) }, worker),
  ]);
  return { icons, portraits, missing };
}

export type TeamImageAssets = Awaited<ReturnType<typeof teamImageAssets>>;
