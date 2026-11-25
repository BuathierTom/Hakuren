interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface Size {
  width: number;
  height: number;
}

export function popoverPosition(
  anchor: Bounds,
  size: Size,
  viewport: Size,
  placement: 'side' | 'bottom' = 'side',
) {
  const margin = 12;
  const gap = 12;
  const maxLeft = Math.max(margin, viewport.width - size.width - margin);
  const maxTop = Math.max(margin, viewport.height - size.height - margin);
  const clamp = (value: number, max: number) => Math.max(margin, Math.min(value, max));
  const place = (left: number, top: number, side: 'left' | 'right' | 'top' | 'bottom') => {
    const vertical = side === 'left' || side === 'right';
    const length = vertical ? size.height : size.width;
    const center = vertical
      ? (anchor.top + anchor.bottom) / 2 - top
      : (anchor.left + anchor.right) / 2 - left;
    const inset = Math.min(18, length / 2);
    return { left, top, side, arrowOffset: Math.max(inset, Math.min(length - inset, center)) };
  };
  const centerTop = clamp((anchor.top + anchor.bottom - size.height) / 2, maxTop);
  if (placement === 'side' && anchor.left - size.width - gap >= margin)
    return place(anchor.left - size.width - gap, centerTop, 'left');
  if (placement === 'side' && anchor.right + size.width + gap <= viewport.width - margin)
    return place(anchor.right + gap, centerTop, 'right');
  const left = clamp(anchor.left, maxLeft);
  if (anchor.bottom + gap <= maxTop) return place(left, anchor.bottom + gap, 'bottom');
  if (anchor.top - size.height - gap >= margin)
    return place(left, anchor.top - size.height - gap, 'top');
  return place(left, clamp(anchor.bottom + gap, maxTop), 'bottom');
}
