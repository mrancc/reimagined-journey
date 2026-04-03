<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8920599655980690"
     crossorigin="anonymous"></script>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useGame } from './composables/useGame';
import type { GameMode } from './types/game';

const { game, startGame, initCanvas } = useGame();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const levelBanner = ref('');
const powerupNotice = ref('');
const showOverlay = ref(true);
const overlayTitle = ref('');
const overlayMessage = ref('');
const overlayScore = ref('');
const overlayKills = ref('');
const overlayLevel = ref('');
const overlayWave = ref('');
const isNewRecord = ref(false);

function handleStart(mode: GameMode) {
  showOverlay.value = false;
  isNewRecord.value = false;
  startGame(mode);
  if (canvasRef.value) {
    canvasRef.value.focus();
  }
}

function returnToMenu() {
  // 重置游戏状态回到模式选择界面
  game.running = false;
  game.over = false;
  game.win = false;
  showOverlay.value = true;
  overlayTitle.value = '';
  overlayMessage.value = '';
  overlayScore.value = '';
  overlayKills.value = '';
  overlayLevel.value = '';
  overlayWave.value = '';
}

function restartSurvival() {
  handleStart('survival');
}

onMounted(() => {
  if (canvasRef.value) {
    initCanvas(canvasRef.value);
  }
});

// Watch for game over
watch(() => game.over, (over) => {
  if (over) {
    showOverlay.value = true;
    if (game.mode === 'classic') {
      // 经典模式结束界面
      if (game.win) {
        overlayTitle.value = '恭喜通关！';
        overlayMessage.value = '你已成功击败所有BOSS！';
      } else {
        overlayTitle.value = '游戏结束';
        overlayMessage.value = '坦克已被摧毁';
      }
      overlayScore.value = `最终得分: ${game.score}`;
      overlayKills.value = `总击杀: ${game.kills} 辆`;
      overlayLevel.value = `到达关卡: 第 ${game.level} / 15 关`;
      overlayWave.value = '';
    } else if (game.mode === 'survival') {
      // 生存模式结束界面
      overlayTitle.value = '生存结束';
      overlayMessage.value = '你的坦克已阵亡';
      overlayScore.value = `最终得分: ${game.score}`;
      overlayKills.value = `总击杀: ${game.kills} 辆`;
      overlayLevel.value = '';
      overlayWave.value = `存活波数: 第 ${game.wave} 波`;
      // 检查是否打破纪录
      if (game.score > 0 && game.score >= game.highScore) {
        isNewRecord.value = true;
      }
    } else if (game.mode === 'brawl') {
      // 乱斗模式结束界面
      overlayTitle.value = '乱斗结束';
      overlayMessage.value = '你的坦克已阵亡';
      overlayScore.value = `最终得分: ${game.score}`;
      overlayKills.value = `总击杀: ${game.kills} 辆`;
      overlayLevel.value = '';
      overlayWave.value = `存活波数: 第 ${game.wave} 波`;
      // 检查是否打破纪录
      if (game.score > 0 && game.score >= game.brawlHighScore) {
        isNewRecord.value = true;
      }
    }
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
    <!-- Overlay -->
    <div v-if="showOverlay" 
         class="fixed inset-0 bg-black/85 flex flex-col items-center justify-center z-100">
      
      <!-- 模式选择界面 -->
      <template v-if="!game.running && !game.over && !overlayTitle">
        <h1 class="text-5xl text-[#00ff88] mb-2 tracking-widest">
          坦克大战
        </h1>
        <div class="text-[#8899aa] text-base mb-10">
          BATTLE CITY — Classic Edition
        </div>
        
        <div class="mode-select">
          <div class="mode-card mode-classic" @click="handleStart('classic')">
            <h3>经典闯关</h3>
            <p>15关逐步挑战，击败BOSS通关</p>
          </div>
          <div class="mode-card mode-survival" @click="handleStart('survival')">
            <h3>无尽生存</h3>
            <p>无限波次挑战，争夺最高分</p>
            <div v-if="game.highScore > 0" class="high-score">
              最高分: {{ game.highScore }}
            </div>
          </div>
          <div class="mode-card mode-brawl" @click="handleStart('brawl')">
            <h3>技能乱斗</h3>
            <p>随机技能掉落，火力全开！</p>
            <div v-if="game.brawlHighScore > 0" class="high-score">
              最高分: {{ game.brawlHighScore }}
            </div>
          </div>
        </div>

        <div class="mt-6 text-xs text-[#556] leading-relaxed">
          <span class="ctrl-key">W A S D</span> 或方向键 移动 &nbsp;|&nbsp;
          <span class="ctrl-key">Space</span> 射击
        </div>
      </template>

      <!-- 游戏结束界面 -->
      <template v-else>
        <h1 class="text-5xl mb-2 tracking-widest" 
            :class="{ 
              'text-[#00ff88]': overlayTitle === '恭喜通关！',
              'text-[#ff4444]': overlayTitle === '游戏结束' || overlayTitle === '生存结束'
            }">
          {{ overlayTitle }}
        </h1>
        <div class="text-[#8899aa] text-base mb-6">
          {{ overlayMessage }}
        </div>
        
        <div v-if="overlayScore" class="text-2xl text-[#ffd700] my-2">
          {{ overlayScore }}
        </div>
        <div v-if="overlayKills" class="text-lg text-[#8899aa] my-1">
          {{ overlayKills }}
        </div>
        <div v-if="overlayLevel" class="text-lg text-[#00ff88] my-1">
          {{ overlayLevel }}
        </div>
        <div v-if="overlayWave" class="text-lg text-[#ff8844] my-1">
          {{ overlayWave }}
        </div>
        
        <!-- 生存模式最高分显示 -->
        <div v-if="game.mode === 'survival'" class="mt-4 text-center">
          <div class="text-xl text-[#ffd700]">
            最高分: {{ game.highScore }}
          </div>
          <div v-if="isNewRecord" class="new-record">
            新纪录！
          </div>
        </div>

        <!-- 乱斗模式最高分显示 -->
        <div v-if="game.mode === 'brawl'" class="mt-4 text-center">
          <div class="text-xl text-[#ffd700]">
            最高分: {{ game.brawlHighScore }}
          </div>
          <div v-if="isNewRecord" class="new-record">
            新纪录！
          </div>
        </div>

        <!-- 经典模式结束按钮 -->
        <div v-if="game.mode === 'classic'" class="mt-8">
          <button @click="returnToMenu" class="big-btn">
            返回主菜单
          </button>
        </div>

        <!-- 生存模式结束按钮 -->
        <div v-else-if="game.mode === 'survival'" class="mt-8 flex gap-4">
          <button @click="restartSurvival" class="big-btn">
            再来一次
          </button>
          <button @click="returnToMenu" class="big-btn btn-secondary">
            返回主菜单
          </button>
        </div>

        <!-- 乱斗模式结束按钮 -->
        <div v-else-if="game.mode === 'brawl'" class="mt-8 flex gap-4">
          <button @click="handleStart('brawl')" class="big-btn">
            再来一次
          </button>
          <button @click="returnToMenu" class="big-btn btn-secondary">
            返回主菜单
          </button>
        </div>
      </template>
    </div>

    <!-- Wave Transition Overlay -->
    <div v-if="game.waveTransition && game.running" class="wave-transition-overlay">
      <div class="wave-info">
        <div class="wave-number">第 {{ game.wave }} 波</div>
        <div class="wave-hint">准备迎战!</div>
      </div>
    </div>

    <!-- Level Banner -->
    <div v-if="levelBanner" class="level-banner">
      {{ levelBanner }}
    </div>

    <!-- Powerup Notice -->
    <div v-if="powerupNotice" class="powerup-notice">
      {{ powerupNotice }}
    </div>

    <!-- Game Container -->
    <div id="app" class="flex gap-5 items-start">
      <!-- Canvas -->
      <div @click="canvasRef?.focus()">
        <canvas 
          ref="canvasRef"
          :width="game.mode === 'brawl' ? 816 : 624" 
          :height="game.mode === 'brawl' ? 816 : 624"
          tabindex="0"
          class="game-canvas"
        />
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <!-- 战况面板 -->
        <div class="panel">
          <div class="panel-title">战况</div>
          <div class="stat-row">
            <span class="stat-label">得分</span>
            <span class="stat-value score-value">{{ game.score }}</span>
          </div>
          
          <!-- 经典模式：关卡进度 -->
          <template v-if="game.mode === 'classic'">
            <div class="stat-row">
              <span class="stat-label">关卡</span>
              <span class="stat-value level-value">第 {{ game.level }} / 15 关</span>
            </div>
            <!-- BOSS关卡标识 -->
            <div v-if="game.bossActive" class="boss-indicator">
              BOSS关卡
            </div>
          </template>
          
          <!-- 生存模式：波次 -->
          <template v-else-if="game.mode === 'survival'">
            <div class="stat-row">
              <span class="stat-label">波次</span>
              <span class="stat-value wave-value">第 {{ game.wave }} 波</span>
            </div>
            <!-- 生存模式最高分 -->
            <div class="stat-row">
              <span class="stat-label">最高分</span>
              <span class="stat-value high-score-value">{{ game.highScore }}</span>
            </div>
          </template>
          
          <!-- 乱斗模式：波次和最高分 -->
          <template v-else-if="game.mode === 'brawl'">
            <div class="stat-row">
              <span class="stat-label">波次</span>
              <span class="stat-value wave-value">第 {{ game.wave }} 波</span>
            </div>
            <!-- 乱斗模式最高分 -->
            <div class="stat-row">
              <span class="stat-label">最高分</span>
              <span class="stat-value high-score-value">{{ game.brawlHighScore }}</span>
            </div>
            <!-- BOSS关卡标识 -->
            <div v-if="game.bossActive" class="boss-indicator">
              BOSS关卡
            </div>
          </template>
          
          <div class="stat-row">
            <span class="stat-label">击杀</span>
            <span class="stat-value">{{ game.kills }}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">生命</div>
          <div class="life-icons">
            <div v-for="i in 5" :key="i" 
                 class="life-icon"
                 :class="{ 'lost': i > game.playerLives }">
            </div>
          </div>
        </div>

        <!-- 经典模式：剩余敌人 -->
        <div v-if="game.mode === 'classic'" class="panel">
          <div class="panel-title">剩余敌人</div>
          <div class="text-center py-1.5">
            <span class="enemy-count">{{ Math.max(0, game.totalEnemies - game.enemiesSpawned + game.enemies.filter(e => e.alive).length) }}</span>
          </div>
          <div class="flex flex-wrap gap-0.5 mt-1.5">
            <div v-for="i in Math.min(Math.max(0, game.totalEnemies - game.enemiesSpawned + game.enemies.filter(e => e.alive).length), 20)" 
                 :key="i" 
                 class="enemy-icon">
            </div>
          </div>
        </div>

        <!-- 生存模式：本波剩余 -->
        <div v-else-if="game.mode === 'survival'" class="panel">
          <div class="panel-title">本波剩余</div>
          <div class="text-center py-1.5">
            <span class="enemy-count">{{ Math.max(0, game.waveEnemiesLeft) }}</span>
          </div>
          <div class="flex flex-wrap gap-0.5 mt-1.5">
            <div v-for="i in Math.min(Math.max(0, game.waveEnemiesLeft), 20)" 
                 :key="i" 
                 class="enemy-icon">
            </div>
          </div>
        </div>

        <!-- 乱斗模式：本波剩余 + 当前技能 -->
        <div v-else-if="game.mode === 'brawl'" class="panel">
          <div class="panel-title">本波剩余</div>
          <div class="text-center py-1.5">
            <span class="enemy-count">{{ Math.max(0, game.waveEnemiesLeft) }}</span>
          </div>
          <div class="flex flex-wrap gap-0.5 mt-1.5">
            <div v-for="i in Math.min(Math.max(0, game.waveEnemiesLeft), 20)" 
                 :key="i" 
                 class="enemy-icon">
            </div>
          </div>
        </div>

        <!-- 乱斗模式：当前技能 -->
        <div v-if="game.mode === 'brawl' && game.running" class="panel brawl-skills-panel">
          <div class="panel-title">当前技能</div>
          <div class="skills-list">
            <div v-if="game.tripleShotTimer > 0" class="skill-item">
              <span class="skill-icon">💥</span>
              <span class="skill-name">三向散射</span>
              <div class="skill-bar">
                <div class="skill-progress" :style="{ width: (game.tripleShotTimer / 400 * 100) + '%' }"></div>
              </div>
            </div>
            <div v-if="game.doubleShotTimer > 0" class="skill-item">
              <span class="skill-icon">🔫</span>
              <span class="skill-name">双发</span>
              <div class="skill-bar">
                <div class="skill-progress" :style="{ width: (game.doubleShotTimer / 400 * 100) + '%' }"></div>
              </div>
            </div>
            <div v-if="game.pierceTimer > 0" class="skill-item">
              <span class="skill-icon">🎯</span>
              <span class="skill-name">穿透</span>
              <div class="skill-bar">
                <div class="skill-progress" :style="{ width: (game.pierceTimer / 400 * 100) + '%' }"></div>
              </div>
            </div>
            <div v-if="game.shieldTimer > 0" class="skill-item">
              <span class="skill-icon">🛡</span>
              <span class="skill-name">护盾</span>
              <div class="skill-bar">
                <div class="skill-progress shield" :style="{ width: (game.shieldTimer / 500 * 100) + '%' }"></div>
              </div>
            </div>
            <div v-if="game.speedBoostTimer > 0" class="skill-item">
              <span class="skill-icon">🏃</span>
              <span class="skill-name">速度爆发</span>
              <div class="skill-bar">
                <div class="skill-progress speed" :style="{ width: (game.speedBoostTimer / 400 * 100) + '%' }"></div>
              </div>
            </div>
          </div>
          <!-- 地雷持有数量 -->
          <div v-if="game.mineCount > 0" class="mine-count">
            <span class="mine-icon">💣</span>
            <span class="mine-text">× {{ game.mineCount }}</span>
          </div>
          <!-- 地雷按键提示 -->
          <div v-if="game.mineCount > 0" class="mine-hint">
            按 <span class="ctrl-key">E</span> 放置地雷
          </div>
        </div>

        <div class="panel controls-panel">
          <div class="panel-title">操作</div>
          <div>
            <span class="ctrl-key">W</span>
            <span class="ctrl-key">A</span>
            <span class="ctrl-key">S</span>
            <span class="ctrl-key">D</span> 
            移动
          </div>
          <div class="mt-1">
            <span class="ctrl-key">Space</span> 射击
          </div>
          <div class="mt-1">
            <span class="ctrl-key">P</span> 暂停
          </div>
        </div>
      </div>
    </div>
  </div>
</template>