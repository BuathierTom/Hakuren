import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import { useLayoutEffect, useRef } from 'react';
import type { TechniqueDetail, TechniqueSummary } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { catalogueDetailHref, intercept } from '@/app/navigation';
import { useRequest } from '../../hooks/use-catalogue-request';
import { previewPosition } from '../../lib/preview-position';
import { TechniqueVideo } from '../technique-video/technique-video';
import styles from './player-technique-preview.module.scss';

export interface TechniquePreviewSelection {
  technique: TechniqueSummary;
  anchor: HTMLAnchorElement;
  keyboard: boolean;
  revision: number;
}

export function PlayerTechniquePreview({
  id,
  selection,
  onClose,
}: {
  id: string;
  selection: TechniquePreviewSelection | null;
  onClose: () => void;
}) {
  const popover = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const technique = selection?.technique;
  const request = useRequest<TechniqueDetail>(technique ? `/api/techniques/${technique.id}` : null);
  const target = technique ? catalogueDetailHref('techniques', technique.id, false) : null;

  useLayoutEffect(() => {
    const node = popover.current!;
    if (!selection) {
      if (node.matches(':popover-open')) node.hidePopover();
      return;
    }
    const update = () => {
      if (!node.matches(':popover-open')) return;
      const anchor = selection.anchor.getBoundingClientRect();
      const dialog = selection.anchor.closest('dialog')?.getBoundingClientRect();
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      if (
        !selection.anchor.isConnected ||
        anchor.bottom <= Math.max(0, dialog?.top ?? 0) ||
        anchor.top >= Math.min(viewport.height, dialog?.bottom ?? viewport.height)
      ) {
        onClose();
        return;
      }
      const position = previewPosition(anchor, node.getBoundingClientRect(), viewport);
      node.style.left = `${position.left}px`;
      node.style.top = `${position.top}px`;
      node.dataset.side = position.side;
      node.style.setProperty('--arrow-offset', `${position.arrowOffset}px`);
    };
    if (!node.matches(':popover-open')) node.showPopover();
    update();
    if (selection.keyboard) closeButton.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observer.observe(selection.anchor);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (node.matches(':popover-open')) node.hidePopover();
    };
  }, [selection, onClose]);

  return (
    <div
      ref={popover}
      id={id}
      popover="auto"
      role="dialog"
      aria-modal={false}
      aria-label={
        technique ? t('Prévisualisation de {0}', catalogueName(technique)) : t('Prévisualisation')
      }
      className={styles.popover}
      onToggle={(event) => {
        if (
          event.newState === 'closed' &&
          event.currentTarget.isConnected &&
          !event.currentTarget.matches(':popover-open')
        )
          onClose();
      }}
    >
      {technique && (
        <div className={styles.surface}>
          <div className={styles.heading}>
            <strong>{catalogueName(technique)}</strong>
            <div className={styles.actions}>
              {target && (
                <a
                  className={styles.action}
                  href={target}
                  aria-label={t('Ouvrir la fiche technique')}
                  title={t('Ouvrir la fiche technique')}
                  onClick={(event) => intercept(event, target, { overlay: true })}
                >
                  <Icon name="external" size={15} />
                </a>
              )}
              <button
                ref={closeButton}
                className={styles.action}
                type="button"
                aria-label={t('Fermer la prévisualisation')}
                title={t('Fermer la prévisualisation')}
                onClick={() => {
                  selection?.anchor.focus({ preventScroll: true });
                  onClose();
                }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>
          <div className={styles.content} aria-live="polite" aria-busy={request.loading}>
            {request.loading ? (
              <p className={styles.message} role="status">
                {t('Chargement de la prévisualisation…')}
              </p>
            ) : request.error ? (
              <div className={styles.error} role="alert">
                <p>{request.error.message}</p>
                <button type="button" onClick={request.retry}>
                  {t('Réessayer')}
                </button>
              </div>
            ) : request.data?.preview ? (
              <TechniqueVideo
                key={`${selection.revision}/${technique.id}/${request.data.preview.url}`}
                preview={request.data.preview}
                name={catalogueName(technique)}
                autoPlay
              />
            ) : (
              <p className={styles.message}>
                {t('Aucune prévisualisation disponible pour cette technique.')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
