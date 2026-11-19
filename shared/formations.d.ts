import type { Position } from './catalogue.js';
export interface FormationPosition {
  slot: number;
  position: Position;
  x: number;
  y: number;
}
export interface Formation {
  id: number;
  code: string;
  name: string;
  positions: FormationPosition[];
}
