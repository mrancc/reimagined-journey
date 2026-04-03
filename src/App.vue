<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useGame } from './composables/useGame';

const { game, startGame, initCanvas } = useGame();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const levelBanner = ref('');
const powerupNotice = ref('');
const showOverlay = ref(true);
const overlayTitle = ref('');
const overlayMessage = ref('');
const overlayScore = ref('');
const overlayKills = ref('');

function handleStart() {
  showOverlay.value = false;
  startGame();
  if (canvasRef.value) {
    canvasRef.value.focus();
  }
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
    overlayTitle.value = game.win ? '胜利！' : '游戏结束';
    overlayMessage.value = game.win ? '所有敌人已消灭！' : '坦克已被摧毁';
    overlayScore.value = `得分: ${game.score}`;
    overlayKills.value = `击杀: ${game.kills} 辆 | 关卡: ${game.level}`;
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
    <!-- Overlay -->
    <div v-if="showOverlay" 
         class="fixed inset-0 bg-black/85 flex flex-col items-center justify-center z-100">
      <h1 class="text-5xl text-[#00ff88] mb-2 tracking-widest" 
          :class="{ 'text-[#ff4444]': overlayTitle === '游戏结束' }">
        {{ overlayTitle || '坦克大战' }}
      </h1>
      <div class="text-[#8899aa] text-base mb-10">
        {{ overlayMessage || 'BATTLE CITY — Classic Edition' }}
      </div>
      
      <div v-if="overlayScore" class="text-2xl text-[#ffd700] my-3">
        {{ overlayScore }}
      </div>
      <div v-if="overlayKills" class="text-sm text-[#8899aa] mb-8">
        {{ overlayKills }}
      </div>

      <button @click="handleStart" 
              class="big-btn">
        {{ overlayTitle ? '再来一次' : '开始游戏' }}
      </button>

      <div v-if="!overlayTitle" class="mt-6 text-xs text-[#556] leading-relaxed">
        <span class="ctrl-key">W A S D</span> 或方向键 移动 &nbsp;|&nbsp;
        <span class="ctrl-key">Space</span> 射击
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
          width="624" 
          height="624"
          tabindex="0"
          class="game-canvas"
        />
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <div class="panel">
          <div class="panel-title">战况</div>
          <div class="stat-row">
            <span class="stat-label">得分</span>
            <span class="stat-value score-value">{{ game.score }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">关卡</span>
            <span class="stat-value level-value">{{ game.level }}</span>
          </div>
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

        <div class="panel">
          <div class="panel-title">剩余敌人</div>
          <div class="text-center py-1.5">
            <span class="enemy-count">{{ Math.max(0, game.totalEnemies - game.kills) }}</span>
          </div>
          <div class="flex flex-wrap gap-0.5 mt-1.5">
            <div v-for="i in Math.min(Math.max(0, game.totalEnemies - game.kills), 20)" 
                 :key="i" 
                 class="enemy-icon">
            </div>
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