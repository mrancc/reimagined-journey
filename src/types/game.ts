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

// Brawl mode powerup types
export const BRAWL_POWERUP_TYPES = [
  'doubleshot', 'tripleshot', 'pierce', 'shield',
  'speedboost', 'mine', 'airstrike', 'bomb'
] as const
export type BrawlPowerupType = typeof BRAWL_POWERUP_TYPES[number]

export type PowerupType = typeof POWERUP_TYPES[number] | BrawlPowerupType

// 游戏模式
export type GameMode = 'classic' | 'survival' | 'brawl'

// Brawl mode map constants
export const BRAWL_COLS = 17
export const BRAWL_ROWS = 17

// 波次配置（生存模式）
export interface WaveConfig {
  enemyCount: number
  enemyTypes: number[]  // 敌人类型数组
  speedMultiplier: number
  hpMultiplier: number
  hasBoss: boolean
}

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
  return 6 + level * 2;
}

export function enemySpeed(type: number): number {
  return [1.2, 1.8, 1.2, 2.2, 0, 1.0][type] || 1.2;
}

export function enemyFireRate(type: number): number {
  return [60, 80, 40, 60, 25, 20][type] || 60;
}

export function enemyHp(type: number): number {
  return [1, 1, 1, 3, 4, 10][type] || 1;
}

export function enemyColor(type: number): string {
  return ['#c8a020', '#d04020', '#20a060', '#8820c0', '#ff4444', '#ff00ff'][type];
}

export function getEnemyType(level: number): number {
  const r = Math.random();
  // 1-3关：主要类型0和1（轻型）
  if (level >= 1 && level <= 3) {
    return r < 0.6 ? 0 : 1;
  }
  // 4-6关：类型0,1,2混合
  if (level >= 4 && level <= 6) {
    return r < 0.3 ? 0 : r < 0.6 ? 1 : 2;
  }
  // 7-9关：类型1,2,3混合
  if (level >= 7 && level <= 9) {
    return r < 0.3 ? 1 : r < 0.6 ? 2 : 3;
  }
  // 10-12关：类型2,3,4混合（加入炮台）
  if (level >= 10 && level <= 12) {
    return r < 0.3 ? 2 : r < 0.6 ? 3 : 4;
  }
  // 13-15关：类型3,4混合
  return r < 0.5 ? 3 : 4;
}

// BOSS关卡相关函数
export function isBossLevel(level: number): boolean {
  return level === 5 || level === 10 || level === 15
}

export function bossHp(level: number): number {
  if (level === 5) return 8
  if (level === 10) return 10
  return 12
}

// 生存模式波次配置
export function getWaveConfig(wave: number): WaveConfig {
  const enemyCount = Math.min(6 + wave, 20)
  const speedMultiplier = 1 + wave * 0.05
  const hpMultiplier = 1 + Math.floor(wave / 3) * 0.5
  const hasBoss = wave % 5 === 0

  // 根据波次选择敌人类型
  let enemyTypes: number[]
  if (wave <= 3) enemyTypes = [0, 1]
  else if (wave <= 6) enemyTypes = [0, 1, 2]
  else if (wave <= 10) enemyTypes = [1, 2, 3]
  else if (wave <= 15) enemyTypes = [2, 3, 4]
  else enemyTypes = [3, 4]

  return { enemyCount, enemyTypes, speedMultiplier, hpMultiplier, hasBoss }
}

// 地图生成算法
export function generateLevel(level: number): number[][] {
  const map: number[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY))

  // 基地位置 (6, 12)
  const baseX = 6
  const baseY = 12
  map[baseY][baseX] = TILE_BASE

  // 基地周围必须有砖墙保护
  map[baseY - 1][baseX - 1] = TILE_BRICK
  map[baseY - 1][baseX] = TILE_BRICK
  map[baseY - 1][baseX + 1] = TILE_BRICK

  // 玩家出生点(4,12)附近保持空地 - 确保(4,11)和(4,12)是空的
  const playerSpawnX = 4
  const playerSpawnY = 12

  // 敌人出生点附近保持空地 [0,0], [6,0], [12,0]
  const enemySpawns = [[0, 0], [6, 0], [12, 0]]

  // 根据关卡计算各类地形的比例
  const steelRatio = Math.min(0.05 + level * 0.01, 0.15)  // 5%-15%
  const waterRatio = Math.min(0.05 + level * 0.005, 0.10)  // 5%-10%
  const forestRatio = 0.10 + Math.random() * 0.05  // 10%-15%
  const brickRatio = 0.30 + Math.random() * 0.10   // 30%-40%

  // 中间几行留出通道（确保通路）
  const passageRows = [5, 6, 7]

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      // 跳过已设置的位置（基地和保护墙）
      if (map[y][x] !== TILE_EMPTY) continue

      // 玩家出生点附近保持空地
      if (Math.abs(x - playerSpawnX) <= 1 && Math.abs(y - playerSpawnY) <= 2) continue

      // 敌人出生点附近保持空地
      let nearEnemySpawn = false
      for (const [ex, ey] of enemySpawns) {
        if (Math.abs(x - ex) <= 1 && Math.abs(y - ey) <= 2) {
          nearEnemySpawn = true
          break
        }
      }
      if (nearEnemySpawn) continue

      // 中间通道保持通畅（减少障碍物）
      if (passageRows.includes(y) && x >= 2 && x <= 10) {
        if (Math.random() < 0.1) {
          map[y][x] = TILE_BRICK
        }
        continue
      }

      // 随机放置地形
      const rand = Math.random()
      if (rand < steelRatio) {
        map[y][x] = TILE_STEEL
      } else if (rand < steelRatio + waterRatio) {
        map[y][x] = TILE_WATER
      } else if (rand < steelRatio + waterRatio + forestRatio) {
        map[y][x] = TILE_FOREST
      } else if (rand < steelRatio + waterRatio + forestRatio + brickRatio) {
        map[y][x] = TILE_BRICK
      }
    }
  }

  return map
}

// 获取关卡地图的统一入口
export function getLevelMap(level: number): number[][] {
  if (level <= LEVELS.length) {
    return LEVELS[level - 1].map(row => [...row])  // 深拷贝
  }
  return generateLevel(level)
}

// 生存模式专用地图
export function getSurvivalMap(): number[][] {
  // 对称地图，中心区域开阔，四周有掩体
  const map: number[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY))

  // 基地位置
  const baseX = 6
  const baseY = 12
  map[baseY][baseX] = TILE_BASE

  // 基地保护墙
  map[baseY - 1][baseX - 1] = TILE_BRICK
  map[baseY - 1][baseX] = TILE_BRICK
  map[baseY - 1][baseX + 1] = TILE_BRICK

  // 四角设置掩体（对称）
  const corners = [
    [[0, 1], [1, 0], [1, 1]],
    [[11, 0], [12, 1], [11, 1]],
    [[0, 11], [1, 12], [1, 11]],
    [[11, 12], [12, 11], [11, 11]]
  ]

  for (const corner of corners) {
    for (const [cx, cy] of corner) {
      map[cy][cx] = Math.random() < 0.5 ? TILE_BRICK : TILE_STEEL
    }
  }

  // 中间区域设置一些掩体
  const midObstacles = [
    [3, 3], [9, 3], [3, 9], [9, 9],
    [5, 5], [7, 5], [5, 7], [7, 7],
    [6, 4], [4, 6], [8, 6], [6, 8]
  ]

  for (const [mx, my] of midObstacles) {
    const rand = Math.random()
    if (rand < 0.4) {
      map[my][mx] = TILE_BRICK
    } else if (rand < 0.6) {
      map[my][mx] = TILE_STEEL
    } else if (rand < 0.8) {
      map[my][mx] = TILE_FOREST
    }
  }

  // 边缘水域
  const waterSpots = [[2, 2], [10, 2], [2, 10], [10, 10]]
  for (const [wx, wy] of waterSpots) {
    if (Math.random() < 0.7) {
      map[wy][wx] = TILE_WATER
    }
  }

  return map
}

export function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}