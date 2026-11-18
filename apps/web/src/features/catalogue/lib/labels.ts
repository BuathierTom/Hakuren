import type { Category, Element, Position } from '@shared/catalogue';

export const ELEMENTS: Record<Element, string> = {
  wind: 'Vent',
  forest: 'Forêt',
  fire: 'Feu',
  mountain: 'Montagne',
  void: 'Néant',
};
export const POSITIONS: Record<Position, string> = {
  GK: 'Gardien',
  DF: 'Défenseur',
  MF: 'Milieu',
  FW: 'Attaquant',
};
export const CATEGORIES: Record<Category, string> = {
  shoot: 'Tir',
  dribble: 'Dribble',
  block: 'Défense',
  catch: 'Arrêt',
  keshin: 'Esprit guerrier',
  keshin_armed: 'Armure d’esprit',
  miximax: 'Mixi Max',
  totem: 'Totem',
  tactic: 'Tactique',
  passive: 'Talent passif',
  bond_transform: 'Transcendance',
  awakening_power: 'Pouvoir d’éveil',
  mode_change: 'Changement de mode',
  awakening_change: 'Changement d’éveil',
  other: 'Autre',
};
export const WORK_LABELS: Record<string, string> = {
  IE: 'IE1',
  IE2: 'IE2',
  IE3: 'IE3',
  GO: 'GO',
  CS: 'Chrono Stones',
  GX: 'Galaxy',
  ARES: 'Ares',
  ORION: 'Orion',
  VR: 'Victory Road',
};
const AGES: Record<string, string> = {
  'Middle School': 'Collège',
  Adult: 'Adulte',
  Elder: 'Senior',
  Elementary: 'Primaire',
  Child: 'Enfant',
  College: 'Université',
  'High School': 'Lycée',
  Exobeing: 'Extra-terrestre',
};
const ROLES: Record<string, string> = {
  Player: 'Joueur',
  Coach: 'Entraîneur',
  Manager: 'Manager',
  Coordinator: 'Coordinateur',
  'Player Manager': 'Joueur / manager',
  'Player Coordinator': 'Joueur / coordinateur',
};
export const label = (labels: Record<string, string>, value: string) =>
  Object.hasOwn(labels, value) ? labels[value]! : value;
export const age = (value: string | null) => (value ? label(AGES, value) : 'Âge non renseigné');
export const role = (value: string | null) => (value ? label(ROLES, value) : 'Rôle non renseigné');
export const workLabel = (code: string) => label(WORK_LABELS, code);
export const count = (value: number) => value.toLocaleString('fr-FR');

export const VIEWS = {
  players: 'Joueurs',
  techniques: 'Techniques',
  equipment: 'Équipements',
  tactics: 'Tactiques',
  catalogue: 'Catalogue',
};
export const EQUIPMENT_SLOTS = {
  boots: 'Chaussures',
  bracelet: 'Bracelets',
  pendant: 'Pendentifs',
  accessory: 'Accessoires',
};
export const TECHNIQUE_CATEGORIES = Object.entries(CATEGORIES).filter(
  ([code]) => !['other', 'passive', 'tactic'].includes(code),
);
export const STAT_NAMES = {
  power: 'Frappe',
  control: 'Contrôle',
  technique: 'Technique',
  pressure: 'Pression',
  physical: 'Physique',
  agility: 'Agilité',
  intelligence: 'Intelligence',
};

export const tensionLabel = (value: number) => `${value === 99999 ? '∞' : count(value)} TP`;
