import { ref, reactive, onMounted, onUnmounted } from 'vue';
import type { PowerupType, GameMode, BrawlPowerupType } from '../types/game';
import {
  TILE, COLS, ROWS,
  DIR, DX, DY,
  TILE_EMPTY, TILE_BRICK, TILE_STEEL, TILE_WATER, TILE_FOREST, TILE_BASE,
  POWERUP_TYPES, BRAWL_POWERUP_TYPES, BRAWL_COLS, BRAWL_ROWS,
  levelEnemyCount, enemySpeed, enemyFireRate, enemyHp,
  enemyColor, getEnemyType, rectsOverlap,
  getLevelMap, getSurvivalMap, getWaveConfig, isBossLevel, bossHp
} from '../types/game';

// ============================================================
// CLASSES
// ============================================================

class Tank {
  x: number;
  y: number;
  dir: number;
  isPlayer: boolean;
  speed: number;
  fireRate: number;
  color: string;
  hp: number;
  maxHp: number;
  fireCooldown: number;
  alive: boolean;
  moving: boolean;
  aiTimer: number;
  aiDir: number;
  aiShootTimer: number;
  animFrame: number;
  animTimer: number;
  type: number;

  constructor(x: number, y: number, dir: number, isPlayer: boolean, speed: number, fireRate: number, color: string, hp: number) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.isPlayer = isPlayer;
    this.speed = speed;
    this.fireRate = fireRate;
    this.color = color;
    this.hp = hp || 1;
    this.maxHp = hp || 1;
    this.fireCooldown = 0;
    this.alive = true;
    this.moving = false;
    this.aiTimer = 0;
    this.aiDir = dir;
    this.aiShootTimer = 0;
    this.animFrame = 0;
    this.animTimer = 0;
    this.type = 0;
  }

  get col() { return Math.floor((this.x + TILE / 2) / TILE); }
  get row() { return Math.floor((this.y + TILE / 2) / TILE); }

  getRect() {
    const pad = 3;
    return { x: this.x + pad, y: this.y + pad, w: TILE - pad * 2, h: TILE - pad * 2 };
  }

  canMoveTo(nx: number, ny: number, map: number[][], mapCols?: number, mapRows?: number): boolean {
    const mCols = mapCols ?? COLS;
    const mRows = mapRows ?? ROWS;
    const pad = 4;
    const corners = [
      { x: nx + pad, y: ny + pad },
      { x: nx + TILE - pad, y: ny + pad },
      { x: nx + pad, y: ny + TILE - pad },
      { x: nx + TILE - pad, y: ny + TILE - pad },
    ];
    for (const c of corners) {
      const col = Math.floor(c.x / TILE);
      const row = Math.floor(c.y / TILE);
      if (col < 0 || row < 0 || col >= mCols || row >= mRows) return false;
      const t = map[row][col];
      if (t === TILE_BRICK || t === TILE_STEEL || t === TILE_WATER || t === TILE_BASE) return false;
    }
    return true;
  }

  tryMove(dx: number, dy: number, map: number[][], mapCols?: number, mapRows?: number): boolean {
    const nx = this.x + dx;
    const ny = this.y + dy;
    const snap = 4;
    let snx = nx, sny = ny;
    
    // 当水平移动时，尝试吸附Y坐标到网格（如果接近网格线）
    if (dx !== 0) {
      const roundedY = Math.round(ny / TILE) * TILE;
      if (Math.abs(roundedY - ny) < snap) {
        sny = roundedY;
      }
    }
    // 当垂直移动时，尝试吸附X坐标到网格（如果接近网格线）
    if (dy !== 0) {
      const roundedX = Math.round(nx / TILE) * TILE;
      if (Math.abs(roundedX - nx) < snap) {
        snx = roundedX;
      }
    }

    if (this.canMoveTo(snx, sny, map, mapCols, mapRows)) {
      this.x = snx;
      this.y = sny;
      return true;
    }
    return false;
  }

  shoot(): Bullet | null {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = this.fireRate;
    const cx = this.x + TILE / 2;
    const cy = this.y + TILE / 2;
    const speed = this.isPlayer ? 7 : 5;
    const bx = cx + DX[this.dir] * (TILE / 2 + 2) - 3;
    const by = cy + DY[this.dir] * (TILE / 2 + 2) - 3;
    return new Bullet(bx, by, this.dir, speed, this.isPlayer, this.isPlayer ? '#00ff88' : '#ff6644');
  }

  darken(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - 60);
    const g = Math.max(0, ((n >> 8) & 0xff) - 60);
    const b = Math.max(0, (n & 0xff) - 60);
    return `rgb(${r},${g},${b})`;
  }

  lighten(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 40);
    const g = Math.min(255, ((n >> 8) & 0xff) + 40);
    const b = Math.min(255, (n & 0xff) + 40);
    return `rgb(${r},${g},${b})`;
  }
}

class Bullet {
  x: number;
  y: number;
  dir: number;
  speed: number;
  friendly: boolean;
  color: string;
  alive: boolean;
  w: number;
  h: number;
  piercing: boolean;
  hitEnemies: Set<Tank>;

  constructor(x: number, y: number, dir: number, speed: number, friendly: boolean, color: string, piercing = false) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.friendly = friendly;
    this.color = color;
    this.alive = true;
    this.w = 6;
    this.h = 6;
    this.piercing = piercing;
    this.hitEnemies = new Set<Tank>();
  }

  update(canvasW: number, canvasH: number) {
    this.x += DX[this.dir] * this.speed;
    this.y += DY[this.dir] * this.speed;
    if (this.x < 0 || this.y < 0 || this.x > canvasW || this.y > canvasH) {
      this.alive = false;
    }
  }

  getRect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

class Explosion {
  x: number;
  y: number;
  size: number;
  frame: number;
  maxFrames: number;
  alive: boolean;

  constructor(x: number, y: number, size: 'big' | 'medium' | 'small') {
    this.x = x;
    this.y = y;
    this.size = size === 'big' ? 48 : size === 'medium' ? 32 : 16;
    this.frame = 0;
    this.maxFrames = size === 'big' ? 18 : size === 'medium' ? 14 : 10;
    this.alive = true;
  }

  update() {
    this.frame++;
    if (this.frame >= this.maxFrames) this.alive = false;
  }
}

class Powerup {
  col: number;
  row: number;
  x: number;
  y: number;
  type: PowerupType;
  alive: boolean;
  timer: number;
  pulse: number;

  constructor(col: number, row: number, type: PowerupType) {
    this.col = col;
    this.row = row;
    this.x = col * TILE;
    this.y = row * TILE;
    this.type = type;
    this.alive = true;
    this.timer = 0;
    this.pulse = 0;
  }

  update() {
    this.timer++;
    this.pulse = Math.sin(this.timer * 0.1) * 0.3 + 0.7;
    if (this.timer > 600) this.alive = false;
  }
}

class Mine {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  alive: boolean;
  timer: number;
  pulse: number;

  constructor(gridX: number, gridY: number) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * TILE + TILE / 2;
    this.y = gridY * TILE + TILE / 2;
    this.alive = true;
    this.timer = 900;
    this.pulse = 1;
  }

  update() {
    this.timer--;
    this.pulse = 0.6 + Math.sin(this.timer * 0.1) * 0.4;
    if (this.timer <= 0) this.alive = false;
  }
}

// ============================================================
// GAME STATE
// ============================================================

export interface GameState {
  running: boolean;
  paused: boolean;
  over: boolean;
  win: boolean;
  score: number;
  kills: number;
  level: number;
  playerLives: number;
  enemiesLeft: number;
  enemiesSpawned: number;
  totalEnemies: number;
  map: number[][];
  player: Tank | null;
  enemies: Tank[];
  bullets: Bullet[];
  explosions: Explosion[];
  powerups: Powerup[];
  spawnCooldown: number;
  maxEnemiesOnScreen: number;
  shieldTimer: number;
  rapidFireTimer: number;
  frame: number;
  // 新增字段
  mode: GameMode;          // 当前游戏模式 'classic' | 'survival'
  wave: number;            // 生存模式当前波次
  highScore: number;       // 生存模式最高分（从 localStorage 读取）
  waveTimer: number;       // 波次间隔计时（帧数）
  waveEnemiesLeft: number; // 本波剩余敌人数
  waveTransition: boolean; // 是否在波次过渡中
  waveTransitionTimer: number; // 波次过渡显示时间
  bossActive: boolean;     // 当前是否有BOSS
  bossTank: Tank | null;   // BOSS坦克引用（用于UI血条显示）
  // 乱斗模式专属
  doubleShotTimer: number;
  tripleShotTimer: number;
  pierceTimer: number;
  speedBoostTimer: number;
  mineCount: number;
  mines: Mine[];
  airstrikeActive: boolean;
  airstrikeY: number;
  airstrikeTargets: { x: number; y: number }[];
  brawlHighScore: number;
  playerBaseSpeed: number; // 用于速度加成恢复
}

export function useGame() {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const ctx = ref<CanvasRenderingContext2D | null>(null);

  const game = reactive<GameState>({
    running: false,
    paused: false,
    over: false,
    win: false,
    score: 0,
    kills: 0,
    level: 1,
    playerLives: 3,
    enemiesLeft: 0,
    enemiesSpawned: 0,
    totalEnemies: 0,
    map: [],
    player: null,
    enemies: [],
    bullets: [],
    explosions: [],
    powerups: [],
    spawnCooldown: 0,
    maxEnemiesOnScreen: 4,
    shieldTimer: 0,
    rapidFireTimer: 0,
    frame: 0,
    // 新增字段初始化
    mode: 'classic',
    wave: 0,
    highScore: 0,
    waveTimer: 0,
    waveEnemiesLeft: 0,
    waveTransition: false,
    waveTransitionTimer: 0,
    bossActive: false,
    bossTank: null,
    // 乱斗模式字段
    doubleShotTimer: 0,
    tripleShotTimer: 0,
    pierceTimer: 0,
    speedBoostTimer: 0,
    mineCount: 0,
    mines: [],
    airstrikeActive: false,
    airstrikeY: -TILE,
    airstrikeTargets: [],
    brawlHighScore: 0,
    playerBaseSpeed: 2.5,
  });

  const keys = reactive<{ [key: string]: boolean }>({});
  let animationId: number | null = null;

  // Key handlers
  function onKeyDown(e: KeyboardEvent) {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  // Initialize state
  function initState(): GameState {
    return {
      running: false,
      paused: false,
      over: false,
      win: false,
      score: 0,
      kills: 0,
      level: 1,
      playerLives: 3,
      enemiesLeft: 0,
      enemiesSpawned: 0,
      totalEnemies: 0,
      map: [],
      player: null,
      enemies: [],
      bullets: [],
      explosions: [],
      powerups: [],
      spawnCooldown: 0,
      maxEnemiesOnScreen: 4,
      shieldTimer: 0,
      rapidFireTimer: 0,
      frame: 0,
      // 新增字段初始化
      mode: 'classic',
      wave: 0,
      highScore: parseInt(localStorage.getItem('tankHighScore') || '0'),
      waveTimer: 0,
      waveEnemiesLeft: 0,
      waveTransition: false,
      waveTransitionTimer: 0,
      bossActive: false,
      bossTank: null,
      // 乱斗模式字段
      doubleShotTimer: 0,
      tripleShotTimer: 0,
      pierceTimer: 0,
      speedBoostTimer: 0,
      mineCount: 0,
      mines: [],
      airstrikeActive: false,
      airstrikeY: -TILE,
      airstrikeTargets: [],
      brawlHighScore: parseInt(localStorage.getItem('brawlHighScore') || '0'),
      playerBaseSpeed: 2.5,
    };
  }

  function spawnExplosion(x: number, y: number, size: 'big' | 'medium' | 'small') {
    game.explosions.push(new Explosion(x, y, size));
  }

  // 辅助函数：根据当前模式返回地图尺寸
  function getCols(): number {
    return game.mode === 'brawl' ? BRAWL_COLS : COLS;
  }

  function getRows(): number {
    return game.mode === 'brawl' ? BRAWL_ROWS : ROWS;
  }

  // 生成乱斗模式地图 (17x17)
  function generateBrawlMap(): number[][] {
    const map: number[][] = Array(BRAWL_ROWS).fill(null).map(() => Array(BRAWL_COLS).fill(TILE_EMPTY));
    const cx = Math.floor(BRAWL_COLS / 2);
    const cy = Math.floor(BRAWL_ROWS / 2);

    // 玩家出生点（底部中央）
    const playerSpawnX = cx;
    const playerSpawnY = BRAWL_ROWS - 1;

    // 敌人出生点（顶部三个位置）
    const enemySpawns = [[2, 0], [cx, 0], [BRAWL_COLS - 3, 0]];

    // 对称障碍物：左右对称放置
    const halfCols = Math.floor(BRAWL_COLS / 2);

    for (let y = 1; y < BRAWL_ROWS - 1; y++) {
      for (let x = 0; x < halfCols; x++) {
        // 跳过玩家出生点附近
        if (Math.abs(x - playerSpawnX) <= 2 && Math.abs(y - playerSpawnY) <= 2) continue;
        // 跳过敌人出生点附近
        let near = false;
        for (const [ex, ey] of enemySpawns) {
          if (Math.abs(x - ex) <= 1 && Math.abs(y - ey) <= 2) { near = true; break; }
        }
        if (near) continue;
        // 中间区域减少障碍（技能发挥空间）
        if (Math.abs(y - cy) <= 2 && Math.abs(x - cx) <= 4) continue;

        const rand = Math.random();
        let tile = TILE_EMPTY;
        if (rand < 0.06) tile = TILE_STEEL;
        else if (rand < 0.10) tile = TILE_WATER;
        else if (rand < 0.15) tile = TILE_FOREST;
        else if (rand < 0.35) tile = TILE_BRICK;

        if (tile !== TILE_EMPTY) {
          map[y][x] = tile;
          // 左右镜像
          map[y][BRAWL_COLS - 1 - x] = tile;
        }
      }
    }
    // 确保中间列清空通道
    for (let y = 0; y < BRAWL_ROWS; y++) {
      map[y][cx] = TILE_EMPTY;
    }
    // 确保玩家出生点及周围空旷
    for (let dy = -1; dy <= 0; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = playerSpawnX + dx;
        const py = playerSpawnY + dy;
        if (py >= 0 && py < BRAWL_ROWS && px >= 0 && px < BRAWL_COLS) {
          map[py][px] = TILE_EMPTY;
        }
      }
    }
    return map;
  }

  function spawnEnemy() {
    if (game.mode === 'classic') {
      if (game.enemiesSpawned >= game.totalEnemies) return;
    }
    if (game.mode === 'survival' || game.mode === 'brawl') {
      if (game.enemiesSpawned >= game.totalEnemies) return;
    }
    if (game.enemies.filter(e => e.alive).length >= game.maxEnemiesOnScreen) return;

    const cols = getCols();
    const cx = Math.floor(cols / 2);
    const spawns: [number, number][] = game.mode === 'brawl'
      ? [[2, 0], [cx, 0], [cols - 3, 0]]
      : [[0, 0], [6, 0], [12, 0]];
    const sp = spawns[game.enemiesSpawned % 3];
    
    let type: number;
    let speed: number;
    let fireRate: number;
    let hp: number;
    let color: string;
    
    if (game.mode === 'survival') {
      // 生存模式
      const config = getWaveConfig(game.wave);
      type = config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)];
      speed = enemySpeed(type) * config.speedMultiplier;
      fireRate = Math.max(10, enemyFireRate(type) - game.wave * 2);
      hp = Math.floor(enemyHp(type) * config.hpMultiplier);
      color = enemyColor(type);
      
      // BOSS波最后一个敌人是BOSS
      if (config.hasBoss && game.enemiesSpawned >= game.totalEnemies - 1 && !game.bossTank) {
        type = 5;
        speed = enemySpeed(type);
        fireRate = enemyFireRate(type);
        hp = bossHp(5); // mini-BOSS血量
        color = enemyColor(type);
      }
    } else if (game.mode === 'brawl') {
      // 乱斗模式：使用波次配置，但适配乱斗
      const enemyCount = Math.min(8 + game.wave * 2, 25);
      const speedMult = 1 + game.wave * 0.05;
      const hpMult = 1 + Math.floor(game.wave / 3) * 0.5;
      let enemyTypes: number[];
      if (game.wave <= 3) enemyTypes = [0, 1];
      else if (game.wave <= 6) enemyTypes = [0, 1, 2];
      else if (game.wave <= 10) enemyTypes = [1, 2, 3];
      else enemyTypes = [2, 3, 4];
      type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      speed = enemySpeed(type) * speedMult;
      fireRate = Math.max(10, enemyFireRate(type) - game.wave * 2);
      hp = Math.floor(enemyHp(type) * hpMult);
      color = enemyColor(type);
      // 每5波出BOSS
      const hasBoss = game.wave % 5 === 0;
      if (hasBoss && game.enemiesSpawned >= game.totalEnemies - 1 && !game.bossTank) {
        type = 5;
        speed = enemySpeed(type);
        fireRate = enemyFireRate(type);
        hp = bossHp(5);
        color = enemyColor(type);
      }
      void enemyCount; // suppress unused warning
    } else {
      // 经典模式
      // 检查是否是BOSS关卡且BOSS尚未生成
      if (game.bossActive && !game.bossTank && game.enemiesSpawned >= game.totalEnemies - 1) {
        type = 5;
        speed = enemySpeed(type);
        fireRate = enemyFireRate(type);
        hp = bossHp(game.level);
        color = enemyColor(type);
      } else {
        type = getEnemyType(game.level);
        speed = enemySpeed(type);
        fireRate = enemyFireRate(type);
        hp = enemyHp(type);
        color = enemyColor(type);
      }
    }
    
    const e = new Tank(
      sp[0] * TILE, sp[1] * TILE,
      DIR.DOWN, false,
      speed, fireRate,
      color, hp
    );
    e.type = type;
    
    // 如果是BOSS，保存引用
    if (type === 5) {
      game.bossTank = e;
    }
    
    spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'medium');
    game.enemies.push(e);
    game.enemiesSpawned++;
  }

  function spawnPlayer() {
    game.player = new Tank(4 * TILE, 12 * TILE, DIR.UP, true, 2.5, 30, '#44cc88', 1);
    game.shieldTimer = 180;
  }

  function loadLevel(level: number) {
    game.map = getLevelMap(level);
    game.totalEnemies = levelEnemyCount(level);
    game.enemiesSpawned = 0;
    game.enemies = [];
    game.bullets = [];
    game.explosions = [];
    game.powerups = [];
    game.spawnCooldown = 120;
    game.enemiesLeft = game.totalEnemies;
    game.maxEnemiesOnScreen = Math.min(4 + Math.floor(level / 2), 7);
    
    // BOSS关卡处理
    game.bossActive = isBossLevel(level);
    game.bossTank = null;

    spawnPlayer();
  }

  function updateAI(enemy: Tank) {
    if (!enemy.alive) return;

    enemy.fireCooldown = Math.max(0, enemy.fireCooldown - 1);
    enemy.aiTimer++;
    enemy.moving = false;

    // 炮台(type===4)不移动，只射击
    if (enemy.type === 4) {
      enemy.aiShootTimer++;
      const shootInterval = 30 + Math.floor(Math.random() * 40);
      if (enemy.aiShootTimer >= shootInterval) {
        enemy.aiShootTimer = 0;
        if (Math.random() < 0.7) {
          const b = enemy.shoot();
          if (b) game.bullets.push(b);
        }
      }
      return;
    }

    const changeDirInterval = 80 + Math.floor(Math.random() * 60);
    if (enemy.aiTimer % changeDirInterval === 0) {
      const p = game.player;
      if (p && p.alive && Math.random() < 0.5) {
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          enemy.aiDir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
        } else {
          enemy.aiDir = dy > 0 ? DIR.DOWN : DIR.UP;
        }
      } else {
        enemy.aiDir = Math.floor(Math.random() * 4);
      }
    }

    enemy.dir = enemy.aiDir;
    const moved = enemy.tryMove(DX[enemy.dir] * enemy.speed, DY[enemy.dir] * enemy.speed, game.map, getCols(), getRows());
    if (moved) {
      enemy.moving = true;
    } else {
      enemy.aiDir = (enemy.aiDir + 1 + Math.floor(Math.random() * 3)) % 4;
    }

    enemy.aiShootTimer++;
    const shootInterval = 40 + Math.floor(Math.random() * 80);
    if (enemy.aiShootTimer >= shootInterval) {
      enemy.aiShootTimer = 0;
      if (Math.random() < 0.6) {
        // BOSS射击模式：散射3颗子弹
        if (enemy.type === 5) {
          shootBossBullets(enemy);
        } else {
          const b = enemy.shoot();
          if (b) game.bullets.push(b);
        }
      }
    }
  }
  
  function shootBossBullets(enemy: Tank) {
    // BOSS散射3颗子弹：正前方 + 左偏15度 + 右偏15度
    const baseDir = enemy.dir;
    const directions = [
      baseDir,
      (baseDir + 3) % 4, // 左偏（逆时针）
      (baseDir + 1) % 4  // 右偏（顺时针）
    ];
    
    for (const dir of directions) {
      const cx = enemy.x + TILE / 2;
      const cy = enemy.y + TILE / 2;
      const speed = 5;
      const bx = cx + DX[dir] * (TILE / 2 + 2) - 3;
      const by = cy + DY[dir] * (TILE / 2 + 2) - 3;
      const b = new Bullet(bx, by, dir, speed, false, '#ff6644');
      game.bullets.push(b);
    }
  }

  function shootBrawl(player: Tank) {
    const piercing = game.pierceTimer > 0;
    // 优先级：三向 > 双发 > 普通
    if (game.tripleShotTimer > 0) {
      // 三向散射
      const dirs = [player.dir, (player.dir + 3) % 4, (player.dir + 1) % 4];
      for (const dir of dirs) {
        const cx = player.x + TILE / 2;
        const cy = player.y + TILE / 2;
        const bx = cx + DX[dir] * (TILE / 2 + 2) - 3;
        const by = cy + DY[dir] * (TILE / 2 + 2) - 3;
        if (player.fireCooldown <= 0) {
          const b = new Bullet(bx, by, dir, 7, true, '#ff44ff', piercing);
          game.bullets.push(b);
        }
      }
      if (player.fireCooldown <= 0) player.fireCooldown = player.fireRate;
    } else if (game.doubleShotTimer > 0) {
      // 双发：正前方 + 垂直偏移8px的第二颗
      if (player.fireCooldown <= 0) {
        const cx = player.x + TILE / 2;
        const cy = player.y + TILE / 2;
        const bx1 = cx + DX[player.dir] * (TILE / 2 + 2) - 3;
        const by1 = cy + DY[player.dir] * (TILE / 2 + 2) - 3;
        const b1 = new Bullet(bx1, by1, player.dir, 7, true, '#ff8800', piercing);
        game.bullets.push(b1);
        // 第二颗：垂直偏移
        const perpX = player.dir === DIR.UP || player.dir === DIR.DOWN ? 8 : 0;
        const perpY = player.dir === DIR.LEFT || player.dir === DIR.RIGHT ? 8 : 0;
        const b2 = new Bullet(bx1 + perpX, by1 + perpY, player.dir, 7, true, '#ff8800', piercing);
        game.bullets.push(b2);
        player.fireCooldown = player.fireRate;
      }
    } else {
      // 普通射击（可能带穿透）
      if (player.fireCooldown <= 0) {
        const cx = player.x + TILE / 2;
        const cy = player.y + TILE / 2;
        const bx = cx + DX[player.dir] * (TILE / 2 + 2) - 3;
        const by = cy + DY[player.dir] * (TILE / 2 + 2) - 3;
        const b = new Bullet(bx, by, player.dir, 7, true, piercing ? '#00ffcc' : '#00ff88', piercing);
        game.bullets.push(b);
        player.fireCooldown = player.fireRate;
      }
    }
  }

  function checkBulletCollisions() {
    const curCols = getCols();
    const curRows = getRows();
    for (const b of game.bullets) {
      if (!b.alive) continue;

      const br = b.getRect();
      const col = Math.floor((b.x + 3) / TILE);
      const row = Math.floor((b.y + 3) / TILE);

      if (col >= 0 && row >= 0 && col < curCols && row < curRows) {
        const t = game.map[row][col];
        if (t === TILE_BRICK) {
          game.map[row][col] = TILE_EMPTY;
          b.alive = false;
          spawnExplosion(b.x, b.y, 'small');
          continue;
        } else if (t === TILE_STEEL) {
          b.alive = false;
          spawnExplosion(b.x, b.y, 'small');
          continue;
        } else if (t === TILE_BASE) {
          game.map[row][col] = TILE_EMPTY;
          b.alive = false;
          spawnExplosion(col * TILE + TILE / 2, row * TILE + TILE / 2, 'big');
          setTimeout(() => endGame(false), 800);
          continue;
        }
      }

      if (b.friendly) {
        for (const e of game.enemies) {
          if (!e.alive) continue;
          if (b.piercing && b.hitEnemies.has(e)) continue;
          if (rectsOverlap(br, e.getRect())) {
            if (!b.piercing) b.alive = false;
            else b.hitEnemies.add(e);
            e.hp--;
            if (e.hp <= 0) {
              e.alive = false;
              spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'big');
              
              // BOSS击杀处理
              if (e.type === 5) {
                game.score += 1000; // BOSS额外得分
                game.bossActive = false;
                game.bossTank = null;
                // 大爆炸效果
                spawnExplosion(e.x + TILE / 2 - 20, e.y + TILE / 2 - 20, 'big');
                spawnExplosion(e.x + TILE / 2 + 20, e.y + TILE / 2 + 20, 'big');
              }
              
              game.score += [100, 200, 300, 400][e.type] || 100;
              game.kills++;
              game.enemiesLeft--;
              
              // 道具掉落：乱斗模式60%，普通25%
              const dropRate = game.mode === 'brawl' ? 0.6 : 0.25;
              if (Math.random() < dropRate) spawnPowerup(e.col, e.row);
              
              // 检查关卡/波次完成
              if (game.mode === 'classic') {
                if (game.enemiesLeft <= 0 && game.enemiesSpawned >= game.totalEnemies) {
                  setTimeout(() => nextLevel(), 1500);
                }
              }
            } else {
              spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'small');
            }
            if (!b.piercing) break;
          }
        }
      }

      if (!b.friendly && game.player && game.player.alive) {
        if (rectsOverlap(br, game.player.getRect())) {
          b.alive = false;
          if (game.shieldTimer > 0) {
            spawnExplosion(b.x, b.y, 'small');
          } else {
            game.playerLives--;
            spawnExplosion(game.player.x + TILE / 2, game.player.y + TILE / 2, 'big');
            game.player.alive = false;
            
            // 生存/乱斗模式：记录最高分
            if (game.mode === 'survival') {
              if (game.score > game.highScore) {
                localStorage.setItem('tankHighScore', game.score.toString());
                game.highScore = game.score;
              }
            }
            if (game.mode === 'brawl') {
              if (game.score > game.brawlHighScore) {
                localStorage.setItem('brawlHighScore', game.score.toString());
                game.brawlHighScore = game.score;
              }
            }
            
            if (game.playerLives <= 0) {
              setTimeout(() => endGame(false), 800);
            } else {
              setTimeout(() => spawnPlayer(), 1000);
            }
          }
        }
      }

      for (const b2 of game.bullets) {
        if (b2 === b || !b2.alive) continue;
        if (b.friendly !== b2.friendly && rectsOverlap(br, b2.getRect())) {
          b.alive = false;
          b2.alive = false;
          spawnExplosion((b.x + b2.x) / 2, (b.y + b2.y) / 2, 'small');
        }
      }
    }
  }

  function spawnPowerup(col: number, row: number) {
    const curCols = getCols();
    const curRows = getRows();
    let tries = 0;
    while (tries < 20) {
      const c = Math.max(0, Math.min(curCols - 1, col + Math.floor(Math.random() * 5) - 2));
      const r = Math.max(0, Math.min(curRows - 1, row + Math.floor(Math.random() * 5) - 2));
      if (game.map[r][c] === TILE_EMPTY) {
        const type: PowerupType = game.mode === 'brawl'
          ? BRAWL_POWERUP_TYPES[Math.floor(Math.random() * BRAWL_POWERUP_TYPES.length)]
          : POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        game.powerups.push(new Powerup(c, r, type));
        return;
      }
      tries++;
    }
  }

  function spawnRandomBrawlPowerups() {
    const curCols = getCols();
    const curRows = getRows();
    const count = 2 + Math.floor(Math.random() * 2); // 2-3个
    let spawned = 0;
    let tries = 0;
    while (spawned < count && tries < 60) {
      const c = Math.floor(Math.random() * curCols);
      const r = Math.floor(Math.random() * curRows);
      if (game.map[r][c] === TILE_EMPTY) {
        const type: BrawlPowerupType = BRAWL_POWERUP_TYPES[Math.floor(Math.random() * BRAWL_POWERUP_TYPES.length)];
        game.powerups.push(new Powerup(c, r, type));
        spawned++;
      }
      tries++;
    }
  }

  function checkMines() {
    for (const mine of game.mines) {
      if (!mine.alive) continue;
      for (const e of game.enemies) {
        if (!e.alive) continue;
        const ex = e.x + TILE / 2;
        const ey = e.y + TILE / 2;
        const dist = Math.sqrt((ex - mine.x) ** 2 + (ey - mine.y) ** 2);
        if (dist < TILE) {
          // 触发爆炸
          mine.alive = false;
          spawnExplosion(mine.x, mine.y, 'big');
          // 1.5 TILE 半径内所有敌人受伤
          for (const e2 of game.enemies) {
            if (!e2.alive) continue;
            const ex2 = e2.x + TILE / 2;
            const ey2 = e2.y + TILE / 2;
            const d2 = Math.sqrt((ex2 - mine.x) ** 2 + (ey2 - mine.y) ** 2);
            if (d2 < TILE * 1.5) {
              if (e2.type === 5) {
                e2.hp -= 3;
                if (e2.hp <= 0) {
                  e2.alive = false;
                  spawnExplosion(e2.x + TILE / 2, e2.y + TILE / 2, 'big');
                  game.score += 1000;
                  game.bossActive = false;
                  game.bossTank = null;
                  game.kills++;
                  game.enemiesLeft--;
                }
              } else {
                e2.alive = false;
                spawnExplosion(e2.x + TILE / 2, e2.y + TILE / 2, 'big');
                game.score += [100, 200, 300, 400][e2.type] || 100;
                game.kills++;
                game.enemiesLeft--;
              }
            }
          }
          break;
        }
      }
    }
    game.mines = game.mines.filter(m => m.alive);
  }

  function checkPowerups() {
    if (!game.player || !game.player.alive) return;
    const pr = game.player.getRect();
    for (const p of game.powerups) {
      if (!p.alive) continue;
      const pr2 = { x: p.x, y: p.y, w: TILE, h: TILE };
      if (rectsOverlap(pr, pr2)) {
        p.alive = false;
        if (game.mode === 'brawl') {
          applyBrawlPowerup(p.type as BrawlPowerupType);
        } else {
          applyPowerup(p.type);
        }
      }
    }
  }

  function applyBrawlPowerup(type: BrawlPowerupType) {
    switch (type) {
      case 'doubleshot':
        game.doubleShotTimer = 400;
        break;
      case 'tripleshot':
        game.tripleShotTimer = 400;
        break;
      case 'pierce':
        game.pierceTimer = 400;
        break;
      case 'shield':
        game.shieldTimer = 500;
        break;
      case 'speedboost':
        game.speedBoostTimer = 400;
        if (game.player) {
          game.playerBaseSpeed = game.player.speed;
          game.player.speed = game.player.speed * 1.8;
        }
        break;
      case 'mine':
        game.mineCount += 3;
        break;
      case 'airstrike': {
        // 随机选3-5个存活敌人为目标
        const alive = game.enemies.filter(e => e.alive);
        const count = Math.min(alive.length, 3 + Math.floor(Math.random() * 3));
        const shuffled = alive.sort(() => Math.random() - 0.5).slice(0, count);
        game.airstrikeTargets = shuffled.map(e => ({ x: e.x + TILE / 2, y: e.y + TILE / 2 }));
        game.airstrikeActive = true;
        game.airstrikeY = -TILE;
        break;
      }
      case 'bomb':
        // 复用bomb逻辑
        for (const e of game.enemies) {
          if (!e.alive) continue;
          e.alive = false;
          spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'big');
          game.score += [100, 200, 300, 400][e.type] || 100;
          game.kills++;
          game.enemiesLeft--;
        }
        game.enemies = [];
        break;
    }
  }

  function applyPowerup(type: PowerupType) {
    switch (type) {
      case 'shield':
        game.shieldTimer = 300;
        break;
      case 'rapidfire':
        game.rapidFireTimer = 300;
        if (game.player) game.player.fireRate = 12;
        break;
      case 'life':
        game.playerLives = Math.min(game.playerLives + 1, 5);
        break;
      case 'bomb':
        for (const e of game.enemies) {
          if (!e.alive) continue;
          e.alive = false;
          spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'big');
          game.score += [100, 200, 300, 400][e.type] || 100;
          game.kills++;
          game.enemiesLeft--;
        }
        game.enemies = [];
        if (game.enemiesLeft <= 0 && game.enemiesSpawned >= game.totalEnemies) {
          setTimeout(() => nextLevel(), 1500);
        }
        break;
    }
  }

  function updatePlayer() {
    const p = game.player;
    if (!p || !p.alive) return;

    p.moving = false;
    p.fireCooldown = Math.max(0, p.fireCooldown - 1);

    let moved = false;
    if (keys['KeyW'] || keys['ArrowUp']) {
      p.dir = DIR.UP;
      moved = p.tryMove(0, -p.speed, game.map, getCols(), getRows());
    } else if (keys['KeyS'] || keys['ArrowDown']) {
      p.dir = DIR.DOWN;
      moved = p.tryMove(0, p.speed, game.map, getCols(), getRows());
    } else if (keys['KeyA'] || keys['ArrowLeft']) {
      p.dir = DIR.LEFT;
      moved = p.tryMove(-p.speed, 0, game.map, getCols(), getRows());
    } else if (keys['KeyD'] || keys['ArrowRight']) {
      p.dir = DIR.RIGHT;
      moved = p.tryMove(p.speed, 0, game.map, getCols(), getRows());
    }
    p.moving = moved;

    if (keys['Space']) {
      if (game.mode === 'brawl') {
        shootBrawl(p);
      } else {
        const b = p.shoot();
        if (b) game.bullets.push(b);
      }
    }

    // E键放置地雷
    if (keys['KeyE'] && game.mode === 'brawl' && game.mineCount > 0) {
      const gridX = p.col;
      const gridY = p.row;
      // 避免在同一格重复放置
      const alreadyMine = game.mines.some(m => m.alive && m.gridX === gridX && m.gridY === gridY);
      if (!alreadyMine) {
        game.mines.push(new Mine(gridX, gridY));
        game.mineCount--;
        keys['KeyE'] = false; // 防止连续触发
      }
    }

    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (rectsOverlap(p.getRect(), e.getRect())) {
        p.x -= DX[p.dir] * p.speed;
        p.y -= DY[p.dir] * p.speed;
      }
    }
  }

  function update() {
    if (!game.running || game.paused || game.over) return;
    
    // 处理波次过渡
    if ((game.mode === 'survival' || game.mode === 'brawl') && game.waveTransition) {
      game.waveTransitionTimer--;
      if (game.waveTransitionTimer <= 0) {
        game.waveTransition = false;
      }
      game.frame++;
      return; // 过渡期间暂停游戏逻辑
    }
    
    game.frame++;

    if (game.shieldTimer > 0) game.shieldTimer--;
    if (game.rapidFireTimer > 0) {
      game.rapidFireTimer--;
      if (game.rapidFireTimer === 0 && game.player) game.player.fireRate = 30;
    }

    // 乱斗模式计时器
    if (game.mode === 'brawl') {
      if (game.doubleShotTimer > 0) game.doubleShotTimer--;
      if (game.tripleShotTimer > 0) game.tripleShotTimer--;
      if (game.pierceTimer > 0) game.pierceTimer--;
      if (game.speedBoostTimer > 0) {
        game.speedBoostTimer--;
        if (game.speedBoostTimer === 0 && game.player) {
          game.player.speed = game.playerBaseSpeed;
        }
      }
      // 地雷更新
      for (const mine of game.mines) {
        if (mine.alive) mine.update();
      }
      // 地雷碰撞检测
      checkMines();
      // 飞机动画更新
      if (game.airstrikeActive) {
        const canvasH = getRows() * TILE;
        const canvasW = getCols() * TILE;
        game.airstrikeY += 4;
        // 检查是否到达目标位置（击杀目标）
        for (const target of game.airstrikeTargets) {
          if (Math.abs(game.airstrikeY - target.y) < 8) {
            spawnExplosion(target.x, target.y, 'big');
            spawnExplosion(target.x - 15, target.y + 10, 'medium');
            // 击杀该目标坐标附近的敌人
            for (const e of game.enemies) {
              if (!e.alive) continue;
              const ex = e.x + TILE / 2;
              const ey = e.y + TILE / 2;
              if (Math.abs(ex - target.x) < TILE && Math.abs(ey - target.y) < TILE) {
                e.alive = false;
                game.score += [100, 200, 300, 400][e.type] || 100;
                game.kills++;
                game.enemiesLeft--;
                if (e.type === 5) {
                  game.bossActive = false;
                  game.bossTank = null;
                  game.score += 1000;
                }
              }
            }
          }
        }
        if (game.airstrikeY > canvasH + TILE) {
          game.airstrikeActive = false;
          game.airstrikeTargets = [];
        }
        void canvasW;
      }
    }

    game.spawnCooldown--;
    if (game.spawnCooldown <= 0) {
      game.spawnCooldown = 120;
      spawnEnemy();
    }

    updatePlayer();

    for (const e of game.enemies) {
      if (!e.alive) continue;
      e.fireCooldown = Math.max(0, e.fireCooldown - 1);
      updateAI(e);
    }

    const cw = getCols() * TILE;
    const ch = getRows() * TILE;
    for (const b of game.bullets) {
      if (!b.alive) continue;
      b.update(cw, ch);
    }

    checkBulletCollisions();
    checkPowerups();

    for (const p of game.powerups) {
      if (!p.alive) continue;
      p.update();
    }

    for (const ex of game.explosions) {
      if (!ex.alive) continue;
      ex.update();
    }

    game.bullets = game.bullets.filter(b => b.alive);
    game.explosions = game.explosions.filter(e => e.alive);
    game.powerups = game.powerups.filter(p => p.alive);
    
    // 生存模式：检查波次完成
    if (game.mode === 'survival' && game.enemiesLeft <= 0 && game.enemies.filter(e => e.alive).length === 0) {
      startNextWave();
    }
    
    // 乱斗模式：检查波次完成
    if (game.mode === 'brawl' && game.enemiesLeft <= 0 && game.enemies.filter(e => e.alive).length === 0) {
      startNextBrawlWave();
    }
  }

  // Drawing functions
  function drawMap() {
    if (!ctx.value) return;
    const c = ctx.value;
    const curRows = getRows();
    const curCols = getCols();

    for (let r = 0; r < curRows; r++) {
      for (let c2 = 0; c2 < curCols; c2++) {
        const t = game.map[r][c2];
        const x = c2 * TILE, y = r * TILE;

        c.fillStyle = '#0d2840';
        c.fillRect(x, y, TILE, TILE);

        switch (t) {
          case TILE_BRICK:
            drawBrick(c, x, y);
            break;
          case TILE_STEEL:
            drawSteel(c, x, y);
            break;
          case TILE_WATER:
            drawWater(c, x, y);
            break;
          case TILE_FOREST:
            drawForest(c, x, y);
            break;
          case TILE_BASE:
            drawBase(c, x, y);
            break;
        }
      }
    }
  }

  function drawBrick(c: CanvasRenderingContext2D, x: number, y: number) {
    const s = TILE;
    c.fillStyle = '#b04020';
    c.fillRect(x + 1, y + 1, s - 2, s - 2);
    c.fillStyle = '#803010';
    for (let row = 0; row < 3; row++) {
      const offset = row % 2 === 0 ? 0 : s / 4;
      for (let col = 0; col < 3; col++) {
        c.fillRect(x + offset + col * (s / 2) + 1, y + row * (s / 3) + 1, s / 2 - 3, s / 3 - 2);
      }
    }
  }

  function drawSteel(c: CanvasRenderingContext2D, x: number, y: number) {
    const s = TILE;
    const grad = c.createLinearGradient(x, y, x + s, y + s);
    grad.addColorStop(0, '#aabbcc');
    grad.addColorStop(0.5, '#778899');
    grad.addColorStop(1, '#556677');
    c.fillStyle = grad;
    c.fillRect(x + 1, y + 1, s - 2, s - 2);
    c.strokeStyle = '#99aabb';
    c.lineWidth = 1;
    c.strokeRect(x + 2, y + 2, s - 4, s - 4);
    c.fillStyle = '#556677';
    c.beginPath(); c.arc(x + 8, y + 8, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + s - 8, y + 8, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + 8, y + s - 8, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + s - 8, y + s - 8, 3, 0, Math.PI * 2); c.fill();
  }

  function drawWater(c: CanvasRenderingContext2D, x: number, y: number) {
    const s = TILE;
    const t = game.frame * 0.02;
    const grad = c.createLinearGradient(x, y, x, y + s);
    grad.addColorStop(0, '#1060a0');
    grad.addColorStop(1, '#082040');
    c.fillStyle = grad;
    c.fillRect(x, y, s, s);
    c.strokeStyle = 'rgba(100,180,255,0.4)';
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      const wy = y + 10 + i * 14 + Math.sin(t + i) * 4;
      c.moveTo(x + 4, wy);
      c.bezierCurveTo(x + s / 3, wy - 4, x + 2 * s / 3, wy + 4, x + s - 4, wy);
      c.stroke();
    }
  }

  function drawForest(c: CanvasRenderingContext2D, x: number, y: number) {
    const s = TILE;
    c.fillStyle = '#1a4010';
    c.fillRect(x, y, s, s);
    c.fillStyle = '#2a6015';
    for (let i = 0; i < 5; i++) {
      const fx = x + 4 + (i * 9) % (s - 8);
      const fy = y + 4 + Math.floor(i * 7) % (s - 8);
      c.beginPath();
      c.arc(fx, fy, 8, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#3a8020';
    c.beginPath();
    c.arc(x + s / 2, y + s / 2, 10, 0, Math.PI * 2);
    c.fill();
  }

  function drawBase(c: CanvasRenderingContext2D, x: number, y: number) {
    const s = TILE;
    // Check if base is destroyed (tile changed from BASE to EMPTY)
    const hasBase = game.map.some(row => row.includes(TILE_BASE));
    if (!hasBase) {
      c.fillStyle = '#331100';
      c.fillRect(x + 1, y + 1, s - 2, s - 2);
      c.font = `${s / 2}px serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('💀', x + s / 2, y + s / 2);
      return;
    }
    c.fillStyle = '#334';
    c.fillRect(x + 1, y + 1, s - 2, s - 2);
    c.fillStyle = '#ffd700';
    c.font = `bold ${s * 0.6}px serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('★', x + s / 2, y + s / 2);
    c.strokeStyle = '#ffd700';
    c.lineWidth = 2;
    c.strokeRect(x + 2, y + 2, s - 4, s - 4);
  }

  function drawTank(c: CanvasRenderingContext2D, tank: Tank) {
    c.save();
    c.translate(tank.x + TILE / 2, tank.y + TILE / 2);
    c.rotate(tank.dir * Math.PI / 2);

    const s = TILE;
    const color = tank.color;

    // Body
    c.fillStyle = color;
    c.fillRect(-s / 2 + 4, -s / 2 + 4, s - 8, s - 8);

    // Tracks
    c.fillStyle = tank.darken(color);
    c.fillRect(-s / 2, -s / 2 + 4, 7, s - 8);
    c.fillRect(s / 2 - 7, -s / 2 + 4, 7, s - 8);

    // Track detail
    tank.animTimer++;
    if (tank.moving && tank.animTimer % 6 === 0) tank.animFrame = (tank.animFrame + 1) % 4;
    c.fillStyle = '#000';
    for (let i = 0; i < 4; i++) {
      const ty = -s / 2 + 6 + ((i * 10 + tank.animFrame * 3) % (s - 10));
      c.fillRect(-s / 2 + 1, ty, 5, 4);
      c.fillRect(s / 2 - 6, ty, 5, 4);
    }

    // Turret base
    c.fillStyle = tank.lighten(color);
    c.beginPath();
    c.arc(0, 0, 10, 0, Math.PI * 2);
    c.fill();

    // Barrel
    c.fillStyle = tank.lighten(color);
    c.fillRect(-3, -s / 2 + 4, 6, s / 2 - 2);

    // HP indicator
    if (!tank.isPlayer && tank.maxHp > 1) {
      c.rotate(-tank.dir * Math.PI / 2);
      for (let i = 0; i < tank.maxHp; i++) {
        c.fillStyle = i < tank.hp ? '#ff0' : '#333';
        c.fillRect(-10 + i * 8, s / 2 - 10, 6, 4);
      }
    }

    // Shield
    if (tank.isPlayer && game.shieldTimer > 0) {
      c.restore();
      c.save();
      c.translate(tank.x + TILE / 2, tank.y + TILE / 2);
      c.strokeStyle = `rgba(0,200,255,${0.5 + 0.3 * Math.sin(game.frame * 0.2)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, TILE / 2 + 4, 0, Math.PI * 2);
      c.stroke();
    }

    c.restore();
  }

  function drawBullet(c: CanvasRenderingContext2D, b: Bullet) {
    c.save();
    c.fillStyle = b.color;
    c.shadowColor = b.color;
    c.shadowBlur = 8;
    c.beginPath();
    c.arc(b.x + 3, b.y + 3, 4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawExplosion(c: CanvasRenderingContext2D, ex: Explosion) {
    const progress = ex.frame / ex.maxFrames;
    const r = ex.size * (1 - progress * 0.3);
    const alpha = 1 - progress;

    c.save();
    c.globalAlpha = alpha;

    const grad = c.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#ffdd00');
    grad.addColorStop(0.6, '#ff6600');
    grad.addColorStop(1, 'transparent');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(ex.x, ex.y, r, 0, Math.PI * 2);
    c.fill();

    if (ex.frame < ex.maxFrames * 0.6) {
      c.fillStyle = '#ffff00';
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + ex.frame * 0.3;
        const dist = r * 0.8 * progress;
        c.beginPath();
        c.arc(ex.x + Math.cos(angle) * dist, ex.y + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    c.restore();
  }

  function drawPowerup(c: CanvasRenderingContext2D, p: Powerup) {
    c.save();
    c.globalAlpha = p.pulse;
    const x = p.x + TILE / 2, y = p.y + TILE / 2;

    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.beginPath();
    c.arc(x, y, 18, 0, Math.PI * 2);
    c.fill();

    let icon: string, color: string;
    switch (p.type) {
      case 'shield': icon = '🛡'; color = '#00aaff'; break;
      case 'rapidfire': icon = '⚡'; color = '#ffdd00'; break;
      case 'life': icon = '❤'; color = '#ff4466'; break;
      case 'bomb': icon = '💣'; color = '#ff8800'; break;
      case 'doubleshot': icon = '🔫'; color = '#ff6600'; break;
      case 'tripleshot': icon = '💥'; color = '#ff00ff'; break;
      case 'pierce': icon = '🎯'; color = '#00ffcc'; break;
      case 'speedboost': icon = '🏃'; color = '#00ff88'; break;
      case 'mine': icon = '💣'; color = '#ff4444'; break;
      case 'airstrike': icon = '✈️'; color = '#4488ff'; break;
      default: icon = '?'; color = '#ffffff'; break;
    }

    c.strokeStyle = color;
    c.lineWidth = 2;
    c.shadowColor = color;
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(x, y, 18, 0, Math.PI * 2);
    c.stroke();

    c.font = '18px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowBlur = 0;
    c.globalAlpha = p.pulse;
    c.fillText(icon, x, y);

    c.restore();
  }

  function drawMines(c: CanvasRenderingContext2D) {
    for (const mine of game.mines) {
      if (!mine.alive) continue;
      c.save();
      c.globalAlpha = mine.pulse;
      c.fillStyle = `rgba(255, 60, 60, ${mine.pulse * 0.7})`;
      c.beginPath();
      c.arc(mine.x, mine.y, 12, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ff2222';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(mine.x, mine.y, 12, 0, Math.PI * 2);
      c.stroke();
      c.font = '14px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffffff';
      c.shadowBlur = 0;
      c.globalAlpha = 1;
      c.fillText('⚠', mine.x, mine.y);
      c.restore();
    }
  }

  function drawBrawlHUD(c: CanvasRenderingContext2D) {
    const cw = getCols() * TILE;
    const hudY = 4;
    const skills = [
      { timer: game.tripleShotTimer, icon: '💥', color: '#ff00ff', max: 400 },
      { timer: game.doubleShotTimer, icon: '🔫', color: '#ff6600', max: 400 },
      { timer: game.pierceTimer, icon: '🎯', color: '#00ffcc', max: 400 },
      { timer: game.speedBoostTimer, icon: '🏃', color: '#00ff88', max: 400 },
      { timer: game.shieldTimer, icon: '🛡', color: '#00aaff', max: 500 },
    ];

    let xOffset = 8;
    for (const skill of skills) {
      if (skill.timer > 0) {
        c.save();
        // 背景
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(xOffset, hudY, 48, 20);
        // 技能图标
        c.font = '14px serif';
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText(skill.icon, xOffset + 2, hudY + 10);
        // 时间条
        const ratio = skill.timer / skill.max;
        c.fillStyle = skill.color;
        c.fillRect(xOffset + 18, hudY + 4, 28 * ratio, 12);
        c.strokeStyle = skill.color;
        c.lineWidth = 1;
        c.strokeRect(xOffset + 18, hudY + 4, 28, 12);
        c.restore();
        xOffset += 56;
      }
    }

    // 地雷数量
    if (game.mineCount > 0) {
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillRect(cw - 60, hudY, 52, 20);
      c.font = '14px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#ffffff';
      c.fillText(`💣x${game.mineCount}`, cw - 34, hudY + 10);
      c.restore();
    }
  }

  function drawAirstrike(c: CanvasRenderingContext2D) {
    if (!game.airstrikeActive) return;
    const cw = getCols() * TILE;
    // 绘制飞机
    c.save();
    c.font = '32px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('✈️', cw / 2, game.airstrikeY);
    // 绘制目标标记
    for (const target of game.airstrikeTargets) {
      c.strokeStyle = '#ff4444';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(target.x, target.y, 16, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(target.x - 20, target.y);
      c.lineTo(target.x + 20, target.y);
      c.stroke();
      c.beginPath();
      c.moveTo(target.x, target.y - 20);
      c.lineTo(target.x, target.y + 20);
      c.stroke();
    }
    c.restore();
  }

  function drawForestOverlay(c: CanvasRenderingContext2D) {
    const curRows = getRows();
    const curCols = getCols();
    for (let r = 0; r < curRows; r++) {
      for (let c2 = 0; c2 < curCols; c2++) {
        if (game.map[r][c2] === TILE_FOREST) {
          drawForest(c, c2 * TILE, r * TILE);
        }
      }
    }
  }

  function render() {
    if (!ctx.value) return;
    const c = ctx.value;
    const cw = getCols() * TILE;
    const ch = getRows() * TILE;

    c.clearRect(0, 0, cw, ch);
    c.fillStyle = '#0d2840';
    c.fillRect(0, 0, cw, ch);

    // Grid
    c.strokeStyle = 'rgba(0,80,140,0.3)';
    c.lineWidth = 0.5;
    for (let i = 0; i <= getCols(); i++) {
      c.beginPath(); c.moveTo(i * TILE, 0); c.lineTo(i * TILE, ch); c.stroke();
    }
    for (let i = 0; i <= getRows(); i++) {
      c.beginPath(); c.moveTo(0, i * TILE); c.lineTo(cw, i * TILE); c.stroke();
    }

    drawMap();

    for (const p of game.powerups) {
      if (p.alive) drawPowerup(c, p);
    }

    // 地雷（乱斗模式）
    if (game.mode === 'brawl') {
      drawMines(c);
    }

    for (const e of game.enemies) {
      if (e.alive) drawTank(c, e);
    }

    if (game.player && game.player.alive) drawTank(c, game.player);

    drawForestOverlay(c);

    for (const b of game.bullets) {
      if (b.alive) drawBullet(c, b);
    }

    for (const ex of game.explosions) {
      if (ex.alive) drawExplosion(c, ex);
    }

    // 飞机动画（乱斗模式）
    if (game.mode === 'brawl') {
      drawAirstrike(c);
    }

    // BOSS血条
    if (game.bossActive && game.bossTank && game.bossTank.alive) {
      const bx = 50, by = 10, bw = cw - 100, bh = 20;
      const maxHp = game.bossTank.maxHp || bossHp(game.level);
      const ratio = game.bossTank.hp / maxHp;
      c.fillStyle = '#333';
      c.fillRect(bx, by, bw, bh);
      c.fillStyle = ratio > 0.5 ? '#00ff00' : ratio > 0.25 ? '#ffaa00' : '#ff0000';
      c.fillRect(bx, by, bw * ratio, bh);
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.strokeRect(bx, by, bw, bh);
      c.fillStyle = '#fff';
      c.font = 'bold 14px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('BOSS', cw / 2, by + 10);
    }
    
    // 波次过渡文字（生存/乱斗模式）
    if ((game.mode === 'survival' || game.mode === 'brawl') && game.waveTransition) {
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#ffd700';
      c.font = 'bold 48px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`第 ${game.wave} 波`, cw / 2, ch / 2);
      c.font = '20px monospace';
      c.fillStyle = '#ffffff';
      const modeHint = game.mode === 'brawl' ? '技能乱斗!' : '准备迎战!';
      c.fillText(modeHint, cw / 2, ch / 2 + 40);
    }

    // 乱斗模式 HUD（技能状态条）
    if (game.mode === 'brawl' && !game.waveTransition) {
      drawBrawlHUD(c);
    }

    if (game.paused) {
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#fff';
      c.font = 'bold 36px Courier New';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('⏸ 暂停', cw / 2, ch / 2);
    }
  }

  function gameLoop() {
    if (!game.running) return;
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  function startGame(mode: GameMode = 'classic') {
    const s = initState();
    Object.assign(game, s);
    game.mode = mode;
    game.running = true;
    
    if (mode === 'survival') {
      startSurvival();
    } else if (mode === 'brawl') {
      startBrawl();
    } else {
      // 重置画布尺寸（经典/生存模式）
      if (canvasRef.value) {
        canvasRef.value.width = COLS * TILE;
        canvasRef.value.height = ROWS * TILE;
        ctx.value = canvasRef.value.getContext('2d');
      }
      loadLevel(1);
    }
    
    canvasRef.value?.focus();
    gameLoop();
  }
  
  function startSurvival() {
    // 初始化生存模式状态
    game.mode = 'survival';
    game.wave = 0;
    game.highScore = parseInt(localStorage.getItem('tankHighScore') || '0');
    game.map = getSurvivalMap();
    // 重置玩家、敌人等
    spawnPlayer();
    startNextWave();
  }

  function startBrawl() {
    game.mode = 'brawl';
    game.wave = 0;
    game.brawlHighScore = parseInt(localStorage.getItem('brawlHighScore') || '0');
    game.map = generateBrawlMap();
    game.mines = [];
    game.mineCount = 0;
    game.doubleShotTimer = 0;
    game.tripleShotTimer = 0;
    game.pierceTimer = 0;
    game.speedBoostTimer = 0;
    game.airstrikeActive = false;
    game.airstrikeY = -TILE;
    game.airstrikeTargets = [];
    // 适配画布尺寸
    if (canvasRef.value) {
      canvasRef.value.width = BRAWL_COLS * TILE;
      canvasRef.value.height = BRAWL_ROWS * TILE;
      ctx.value = canvasRef.value.getContext('2d');
    }
    spawnBrawlPlayer();
    startNextBrawlWave();
  }

  function spawnBrawlPlayer() {
    const cx = Math.floor(BRAWL_COLS / 2);
    const py = BRAWL_ROWS - 1;
    game.player = new Tank(cx * TILE, py * TILE, DIR.UP, true, 2.5, 30, '#44cc88', 1);
    game.playerBaseSpeed = 2.5;
    game.shieldTimer = 180;
  }

  function startNextBrawlWave() {
    game.wave++;
    const enemyCount = Math.min(8 + game.wave * 2, 25);
    game.waveEnemiesLeft = enemyCount;
    game.totalEnemies = enemyCount;
    game.enemiesSpawned = 0;
    game.enemiesLeft = enemyCount;
    game.bossTank = null;
    game.bossActive = game.wave % 5 === 0;
    // 波次过渡
    game.waveTransition = true;
    game.waveTransitionTimer = 120;
    // 每5波刷新地图
    if (game.wave % 5 === 1 && game.wave > 1) {
      game.map = generateBrawlMap();
    }
    // 刷新乱斗道具
    spawnRandomBrawlPowerups();
  }
  
  function startNextWave() {
    game.wave++;
    const config = getWaveConfig(game.wave);
    game.waveEnemiesLeft = config.enemyCount;
    game.totalEnemies = config.enemyCount;
    game.enemiesSpawned = 0;
    game.enemiesLeft = config.enemyCount;
    game.bossTank = null;
    
    // 如果是BOSS波（每5波），标记 bossActive
    if (config.hasBoss) {
      game.bossActive = true;
    } else {
      game.bossActive = false;
    }
    
    // 波次过渡动画
    game.waveTransition = true;
    game.waveTransitionTimer = 120; // 2秒显示 "第 X 波"
    
    // 每5波重新生成地图（修复被破坏的砖墙）
    if (game.wave % 5 === 1 && game.wave > 1) {
      game.map = getSurvivalMap();
    }
  }

  function nextLevel() {
    if (game.mode === 'classic') {
      // 经典模式：15关通关
      if (game.level >= 15) {
        game.win = true;
        game.over = true;
        game.running = false;
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
      game.level++;
      loadLevel(game.level);
    }
  }

  function endGame(win: boolean) {
    game.running = false;
    game.over = true;
    game.win = win;
    if (animationId) cancelAnimationFrame(animationId);
  }

  function togglePause() {
    if (game.running && !game.over) {
      game.paused = !game.paused;
    }
  }

  // Setup keyboard listeners
  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);

    // P key for pause
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' && game.running && !game.over) {
        game.paused = !game.paused;
        e.preventDefault();
      }
    }, true);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
    if (animationId) cancelAnimationFrame(animationId);
  });

  function initCanvas(el: HTMLCanvasElement) {
    canvasRef.value = el;
    ctx.value = el.getContext('2d');
  }

  return {
    game,
    canvasRef,
    ctx,
    startGame,
    endGame,
    togglePause,
    initCanvas,
    spawnExplosion,
  };
}