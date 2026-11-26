import { useCallback, useId, useState } from 'react';
import type { PlayerLearnset } from '@shared/catalogue';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import {
  PlayerTechniquePreview,
  type TechniquePreviewSelection,
} from '../player-technique-preview/player-technique-preview';
import { PlayerDetailBlock } from '../player-detail-block/player-detail-block';
import { catalogueDetailHref, intercept } from '@/app/navigation';
import { CATEGORIES } from '../../lib/labels';
import styles from './player-techniques.module.scss';

interface TechniqueRowsProps {
  moves: PlayerLearnset[];
  selectedId: number | null;
  previewId: string;
  onSelect: (move: PlayerLearnset, anchor: HTMLAnchorElement, keyboard: boolean) => void;
}

function TechniqueRows({ moves, selectedId, previewId, onSelect }: TechniqueRowsProps) {
  return (
    <ul className={styles.moves}>
      {moves.map((move) => {
        const target = catalogueDetailHref('techniques', move.technique.id, false);
        return (
          <li key={move.id}>
            <a
              href={target}
              onClick={(event) => {
                if (
                  event.button ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.altKey ||
                  event.shiftKey
                )
                  return;
                event.preventDefault();
                onSelect(move, event.currentTarget, event.detail === 0);
              }}
              onDoubleClick={(event) => intercept(event, target, { overlay: true })}
              aria-controls={previewId}
              aria-haspopup="dialog"
              aria-expanded={selectedId === move.id}
              data-selected={selectedId === move.id}
              title="Un clic pour prévisualiser, double-clic pour ouvrir la fiche"
              className={styles.move}
            >
              <span className={styles.level}>Niv. {move.level ?? '—'}</span>
              <span
                className={styles.icon}
                title={move.technique.category ? CATEGORIES[move.technique.category] : undefined}
              >
                <TechniqueTypeIcon category={move.technique.category} />
              </span>
              <span className={styles.name}>{move.technique.name}</span>
              <span
                className={styles.tension}
                aria-label={
                  move.technique.tension == null
                    ? 'Tension non renseignée'
                    : `${move.technique.tension} points de tension`
                }
              >
                {move.technique.tension == null ? '—' : `${move.technique.tension} TP`}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function PlayerTechniques({ moves }: { moves: PlayerLearnset[] }) {
  const [selected, setSelected] = useState<
    (TechniquePreviewSelection & { learnsetId: number }) | null
  >(null);
  const previewId = useId();
  const closePreview = useCallback(() => setSelected(null), []);
  const selection = {
    selectedId: selected?.learnsetId ?? null,
    previewId,
    onSelect: (move: PlayerLearnset, anchor: HTMLAnchorElement, keyboard: boolean) =>
      setSelected((previous) => ({
        technique: move.technique,
        anchor,
        keyboard,
        learnsetId: move.id,
        revision: (previous?.revision ?? 0) + 1,
      })),
  };
  const main = moves.filter((move) => !move.alternatePath);
  const alternative = moves.filter((move) => move.alternatePath);
  return (
    <>
      <PlayerDetailBlock title="Techniques & pouvoirs">
        {moves.length ? (
          <>
            <TechniqueRows moves={main} {...selection} />
            {alternative.length > 0 && (
              <>
                <h4 className={styles.branch}>Branche alternative</h4>
                <TechniqueRows moves={alternative} {...selection} />
              </>
            )}
          </>
        ) : (
          <p className={styles.empty}>Techniques non renseignées pour cette rareté.</p>
        )}
      </PlayerDetailBlock>
      <PlayerTechniquePreview id={previewId} selection={selected} onClose={closePreview} />
    </>
  );
}
