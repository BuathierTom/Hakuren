import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { popoverPosition } from './popover-position';
import styles from './popover.module.scss';

interface Props {
  id: string;
  anchor: HTMLElement | null;
  label: string;
  onClose: () => void;
  children: ReactNode;
  placement?: 'side' | 'bottom';
  role?: 'dialog' | 'tooltip';
  className?: string;
}
export function Popover({
  id,
  anchor,
  label,
  onClose,
  children,
  placement = 'side',
  role = 'dialog',
  className = '',
}: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const node = panel.current!;
    if (!anchor) {
      if (node.matches(':popover-open')) node.hidePopover();
      return;
    }
    const place = () => {
      if (!node.matches(':popover-open')) return;
      const rect = anchor.getBoundingClientRect();
      const dialog = anchor.closest('dialog')?.getBoundingClientRect();
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      if (
        !anchor.isConnected ||
        rect.bottom <= Math.max(0, dialog?.top ?? 0) ||
        rect.top >= Math.min(viewport.height, dialog?.bottom ?? viewport.height)
      ) {
        close.current();
        return;
      }
      node.style.setProperty(
        '--popover-max-height',
        `${placement === 'bottom' ? Math.max(80, viewport.height - rect.bottom - 24) : viewport.height - 24}px`,
      );
      const position = popoverPosition(rect, node.getBoundingClientRect(), viewport, placement);
      node.style.left = `${position.left}px`;
      node.style.top = `${position.top}px`;
      node.dataset.side = position.side;
      node.style.setProperty('--arrow-offset', `${position.arrowOffset}px`);
    };
    if (!node.matches(':popover-open')) node.showPopover({ source: anchor });
    place();
    if (role === 'dialog' && anchor.matches(':focus-visible'))
      node
        .querySelector<HTMLElement>('button:not(:disabled), [href], input:not(:disabled)')
        ?.focus({ preventScroll: true });
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !node.matches(':popover-open')) return;
      event.preventDefault();
      event.stopPropagation();
      anchor.focus({ preventScroll: true });
      close.current();
    };
    const observer = new ResizeObserver(place);
    observer.observe(node);
    observer.observe(anchor);
    document.addEventListener('keydown', onEscape, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onEscape, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      if (node.matches(':popover-open')) node.hidePopover();
    };
  }, [anchor, placement, role]);
  return (
    <div
      ref={panel}
      id={id}
      popover="auto"
      role={role}
      aria-modal={role === 'dialog' ? false : undefined}
      aria-label={label}
      className={`${styles.popover} ${className}`}
      onToggle={(event) => {
        if (
          event.newState === 'closed' &&
          event.currentTarget.isConnected &&
          !event.currentTarget.matches(':popover-open')
        )
          close.current();
      }}
    >
      <div className={styles.surface}>{children}</div>
    </div>
  );
}
