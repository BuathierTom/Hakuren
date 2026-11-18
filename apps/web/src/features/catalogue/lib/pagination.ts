export type PaginationEntry = number | 'start-gap' | 'end-gap';

export function paginationEntries(page: number, pages: number): PaginationEntry[] {
  if (pages <= 0) return [];
  if (pages <= 5) return Array.from({ length: pages }, (_, index) => index + 1);
  const current = Math.max(1, Math.min(page, pages));
  if (current <= 2 || current >= pages - 1) return [1, 2, 'end-gap', pages - 1, pages];
  if (current === 3) return [1, 2, 3, 'end-gap', pages];
  if (current === pages - 2) return [1, 'start-gap', pages - 2, pages - 1, pages];
  return [1, 'start-gap', current, 'end-gap', pages];
}
