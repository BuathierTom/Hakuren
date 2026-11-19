import { useRef, useState, type PointerEvent, type MouseEvent, type DragEvent } from 'react';
import type { Team } from '../lib/team';
interface DragOrigin {
  slot: string;
  pointer: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  active: boolean;
}
export interface DragPreview {
  slot: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function usePlayerDrag(team: Team, onMove: (from: string, to: string) => void) {
  const origin = useRef<DragOrigin | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const hit = (event: PointerEvent) =>
    document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-slot]')
      ?.dataset.slot ?? null;
  const clear = () => {
    origin.current = null;
    setPreview(null);
    setOver(null);
  };
  const handlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.button !== 0 || !event.isPrimary) return;
      const node = (event.target as HTMLElement).closest<HTMLElement>('[data-slot]');
      const slot = node?.dataset.slot;
      if (!node || !slot || !team.slots[slot]) return;
      const rect = node.getBoundingClientRect();
      origin.current = {
        slot,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offsetX: event.clientX - rect.left - rect.width / 2,
        offsetY: event.clientY - rect.top - rect.height / 2,
        width: node.offsetWidth,
        height: node.offsetHeight,
        active: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const current = origin.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) {
        current.active = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      if (!current.active) return;
      event.preventDefault();
      setPreview({
        slot: current.slot,
        x: event.clientX - current.offsetX,
        y: event.clientY - current.offsetY,
        width: current.width,
        height: current.height,
      });
      setOver(hit(event));
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const current = origin.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (current.active) {
        const target = hit(event);
        if (target) onMove(current.slot, target);
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      clear();
    },
    onPointerCancel: clear,
    onLostPointerCapture: clear,
    onDragStartCapture(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
    },
    onClickCapture(event: MouseEvent<HTMLDivElement>) {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  return { preview, over, dragging: preview?.slot ?? null, handlers };
}
