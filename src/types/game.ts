// Game Constants
export const TILE = 48;
export const COLS = 13;
export const ROWS = 13;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export const TILE_EMPTY = 0;
export const TILE_BRICK = 1;
export const TILE_STEEL = 2;
export const TILE_WATER = 3;
export const TILE_FOREST = 4;
export const TILE_BASE = 5;

// Powerup types
export const POWERUP_TYPES = ['shield', 'rapidfire', 'life', 'bomb'] as const;
export type PowerupType = typeof POWERUP_TYPES[number];

// Level maps (13x13 grid)
export const LEVELS: number[][][] = [
  // Level 1
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,0,1,0,1,0,0,1,1,0],
    [0,1,0,0,0,1,0,1,0,0,0,1,0],
    [0,0,0,1,0,0,0,0,0,1,0,0,0],
    [0,0,1,1,0,2,0,2,0,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,2,0,0,0,0,0,2,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,1,0],
    [0,0,0,1,0,0,0,0,0,1,0,0,0],
    [0,0,1,1,0,0,0,0,0,1,1,0,0],
    [0,0,0,0,0,1,0,1,0,0,0,0,0],
    [0,1,0,0,1,0,0,0,1,0,0,1,0],
    [0,0,0,0,0,1,5,1,0,0,0,0,0],
  ],
  // Level 2
  [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,0,1,0,1,0,1,0,1,0,2,0],
    [0,0,0,1,0,1,0,1,0,1,0,0,0],
    [1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,1,1,0,1,1,0,2,0,1],
    [0,0,0,0,1,0,0,0,1,0,0,0,0],
    [0,3,3,0,1,0,0,0,1,0,3,3,0],
    [0,0,0,0,1,0,0,0,1,0,0,0,0],
    [1,0,2,0,0,0,0,0,0,0,2,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],
    [0,0,0,1,0,1,0,1,0,1,0,0,0],
    [0,2,0,1,0,0,0,0,0,1,0,2,0],
    [0,0,0,0,0,1,5,1,0,0,0,0,0],
  ],
  // Level 3
  [
    [2,0,0,0,2,0,0,0,2,0,0,0,2],
    [0,1,1,0,0,1,0,1,0,0,1,1,0],
    [0,1,1,0,0,1,0,1,0,0,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [2,0,1,1,2,0,0,0,2,1,1,0,2],
    [0,0,1,1,0,3,3,3,0,1,1,0,0],
    [0,0,0,0,0,3,0,3,0,0,0,0,0],
    [0,0,1,1,0,3,3,3,0,1,1,0,0],
    [2,0,1,1,2,0,0,0,2,1,1,0,2],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,0,2,0,2,0,0,1,1,0],
    [0,1,1,0,0,0,0,0,0,0,1,1,0],
    [0,0,0,0,0,1,5,1,0,0,0,0,0],
  ],
];

// Helper functions
export function levelEnemyCount(level: number): number {
  return 8 + level * 4;
}

export function enemySpeed(type: number): number {
  return [1.2, 1.8, 1.2, 2.2][type] || 1.2;
}

export function enemyFireRate(type: number): number {
  return [60, 80, 40, 60][type] || 60;
}

export function enemyHp(type: number): number {
  return [1, 1, 1, 3][type] || 1;
}

export function enemyColor(type: number): string {
  return ['#c8a020', '#d04020', '#20a060', '#8820c0'][type];
}

export function getEnemyType(level: number): number {
  const r = Math.random();
  if (level === 1) return r < 0.7 ? 0 : 1;
  if (level === 2) return r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.85 ? 2 : 3;
  return r < 0.2 ? 0 : r < 0.4 ? 1 : r < 0.7 ? 2 : 3;
}

export function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}