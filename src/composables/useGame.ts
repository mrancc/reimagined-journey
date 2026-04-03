import { ref, reactive, onMounted, onUnmounted } from 'vue';
import type { PowerupType } from '../types/game';
import {
  TILE, COLS, ROWS, W, H,
  DIR, DX, DY,
  TILE_EMPTY, TILE_BRICK, TILE_STEEL, TILE_WATER, TILE_FOREST, TILE_BASE,
  POWERUP_TYPES, LEVELS, levelEnemyCount, enemySpeed, enemyFireRate, enemyHp,
  enemyColor, getEnemyType, rectsOverlap
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

  canMoveTo(nx: number, ny: number, map: number[][]): boolean {
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
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
      const t = map[row][col];
      if (t === TILE_BRICK || t === TILE_STEEL || t === TILE_WATER || t === TILE_BASE) return false;
    }
    return true;
  }

  tryMove(dx: number, dy: number, map: number[][]): boolean {
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

    if (this.canMoveTo(snx, sny, map)) {
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

  constructor(x: number, y: number, dir: number, speed: number, friendly: boolean, color: string) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.friendly = friendly;
    this.color = color;
    this.alive = true;
    this.w = 6;
    this.h = 6;
  }

  update() {
    this.x += DX[this.dir] * this.speed;
    this.y += DY[this.dir] * this.speed;
    if (this.x < 0 || this.y < 0 || this.x > W || this.y > H) {
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
    };
  }

  function spawnExplosion(x: number, y: number, size: 'big' | 'medium' | 'small') {
    game.explosions.push(new Explosion(x, y, size));
  }

  function spawnEnemy() {
    if (game.enemiesSpawned >= game.totalEnemies) return;
    if (game.enemies.filter(e => e.alive).length >= game.maxEnemiesOnScreen) return;

    const spawns = [[0, 0], [6, 0], [12, 0]] as [number, number][];
    const sp = spawns[game.enemiesSpawned % 3];
    const type = getEnemyType(game.level);
    const e = new Tank(
      sp[0] * TILE, sp[1] * TILE,
      DIR.DOWN, false,
      enemySpeed(type), enemyFireRate(type),
      enemyColor(type), enemyHp(type)
    );
    e.type = type;
    spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'medium');
    game.enemies.push(e);
    game.enemiesSpawned++;
  }

  function spawnPlayer() {
    game.player = new Tank(4 * TILE, 12 * TILE, DIR.UP, true, 2.5, 30, '#44cc88', 1);
    game.shieldTimer = 180;
  }

  function loadLevel(level: number) {
    const lvl = LEVELS[(level - 1) % LEVELS.length];
    game.map = lvl.map(row => [...row]);
    game.totalEnemies = levelEnemyCount(level);
    game.enemiesSpawned = 0;
    game.enemies = [];
    game.bullets = [];
    game.explosions = [];
    game.powerups = [];
    game.spawnCooldown = 120;
    game.enemiesLeft = game.totalEnemies;
    game.maxEnemiesOnScreen = Math.min(4 + Math.floor(level / 2), 7);

    spawnPlayer();
  }

  function updateAI(enemy: Tank) {
    if (!enemy.alive) return;

    enemy.fireCooldown = Math.max(0, enemy.fireCooldown - 1);
    enemy.aiTimer++;
    enemy.moving = false;

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
    const moved = enemy.tryMove(DX[enemy.dir] * enemy.speed, DY[enemy.dir] * enemy.speed, game.map);
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
        const b = enemy.shoot();
        if (b) game.bullets.push(b);
      }
    }
  }

  function checkBulletCollisions() {
    for (const b of game.bullets) {
      if (!b.alive) continue;

      const br = b.getRect();
      const col = Math.floor((b.x + 3) / TILE);
      const row = Math.floor((b.y + 3) / TILE);

      if (col >= 0 && row >= 0 && col < COLS && row < ROWS) {
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
          if (rectsOverlap(br, e.getRect())) {
            b.alive = false;
            e.hp--;
            if (e.hp <= 0) {
              e.alive = false;
              spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'big');
              game.score += [100, 200, 300, 400][e.type] || 100;
              game.kills++;
              game.enemiesLeft--;
              if (Math.random() < 0.25) spawnPowerup(e.col, e.row);
              if (game.enemiesLeft <= 0 && game.enemiesSpawned >= game.totalEnemies) {
                setTimeout(() => nextLevel(), 1500);
              }
            } else {
              spawnExplosion(e.x + TILE / 2, e.y + TILE / 2, 'small');
            }
            break;
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
    let tries = 0;
    while (tries < 20) {
      const c = Math.max(0, Math.min(COLS - 1, col + Math.floor(Math.random() * 5) - 2));
      const r = Math.max(0, Math.min(ROWS - 1, row + Math.floor(Math.random() * 5) - 2));
      if (game.map[r][c] === TILE_EMPTY) {
        const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        game.powerups.push(new Powerup(c, r, type));
        return;
      }
      tries++;
    }
  }

  function checkPowerups() {
    if (!game.player || !game.player.alive) return;
    const pr = game.player.getRect();
    for (const p of game.powerups) {
      if (!p.alive) continue;
      const pr2 = { x: p.x, y: p.y, w: TILE, h: TILE };
      if (rectsOverlap(pr, pr2)) {
        p.alive = false;
        applyPowerup(p.type);
      }
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
      moved = p.tryMove(0, -p.speed, game.map);
    } else if (keys['KeyS'] || keys['ArrowDown']) {
      p.dir = DIR.DOWN;
      moved = p.tryMove(0, p.speed, game.map);
    } else if (keys['KeyA'] || keys['ArrowLeft']) {
      p.dir = DIR.LEFT;
      moved = p.tryMove(-p.speed, 0, game.map);
    } else if (keys['KeyD'] || keys['ArrowRight']) {
      p.dir = DIR.RIGHT;
      moved = p.tryMove(p.speed, 0, game.map);
    }
    p.moving = moved;

    if (keys['Space']) {
      const b = p.shoot();
      if (b) game.bullets.push(b);
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
    game.frame++;

    if (game.shieldTimer > 0) game.shieldTimer--;
    if (game.rapidFireTimer > 0) {
      game.rapidFireTimer--;
      if (game.rapidFireTimer === 0 && game.player) game.player.fireRate = 30;
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

    for (const b of game.bullets) {
      if (!b.alive) continue;
      b.update();
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
  }

  // Drawing functions
  function drawMap() {
    if (!ctx.value) return;
    const c = ctx.value;

    for (let r = 0; r < ROWS; r++) {
      for (let c2 = 0; c2 < COLS; c2++) {
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

  function drawForestOverlay(c: CanvasRenderingContext2D) {
    for (let r = 0; r < ROWS; r++) {
      for (let c2 = 0; c2 < COLS; c2++) {
        if (game.map[r][c2] === TILE_FOREST) {
          drawForest(c, c2 * TILE, r * TILE);
        }
      }
    }
  }

  function render() {
    if (!ctx.value) return;
    const c = ctx.value;

    c.clearRect(0, 0, W, H);
    c.fillStyle = '#0d2840';
    c.fillRect(0, 0, W, H);

    // Grid
    c.strokeStyle = 'rgba(0,80,140,0.3)';
    c.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) {
      c.beginPath(); c.moveTo(i * TILE, 0); c.lineTo(i * TILE, H); c.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      c.beginPath(); c.moveTo(0, i * TILE); c.lineTo(W, i * TILE); c.stroke();
    }

    drawMap();

    for (const p of game.powerups) {
      if (p.alive) drawPowerup(c, p);
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

    if (game.paused) {
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff';
      c.font = 'bold 36px Courier New';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('⏸ 暂停', W / 2, H / 2);
    }
  }

  function gameLoop() {
    if (!game.running) return;
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    const s = initState();
    Object.assign(game, s);
    game.running = true;
    loadLevel(1);
    canvasRef.value?.focus();
    gameLoop();
  }

  function nextLevel() {
    game.level++;
    loadLevel(game.level);
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