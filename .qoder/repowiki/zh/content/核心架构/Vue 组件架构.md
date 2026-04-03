# Vue 组件架构

<cite>
**本文档引用的文件**
- [App.vue](file://src/App.vue)
- [main.ts](file://src/main.ts)
- [HelloWorld.vue](file://src/components/HelloWorld.vue)
- [useGame.ts](file://src/composables/useGame.ts)
- [game.ts](file://src/types/game.ts)
- [style.css](file://src/style.css)
- [README.md](file://README.md)
- [package.json](file://package.json)
</cite>

## 更新摘要
**变更内容**
- App.vue 组件进行了重大 UI 重构，包括全新的模式选择界面、波次过渡界面、胜利条件显示等
- 新增覆盖层系统，支持模式选择和结束界面的动态切换
- 增强的样式系统，使用 Tailwind CSS 和自定义样式类
- 新增波次过渡动画和 BOSS 关卡标识
- 扩展的游戏状态字段，支持生存模式的波次管理和最高分记录

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考量](#性能考量)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本项目是一个基于 Vue 3 Composition API 的坦克对战游戏，采用单页应用架构，根组件负责游戏全局状态与 UI 布局，通过可组合函数集中管理游戏逻辑与 Canvas 渲染。经过重大 UI 重构后，App.vue 组件现在提供了完整的用户界面体验，包括模式选择、波次过渡、胜利条件显示等功能。本文档系统性解析组件设计模式、根组件职责、组件通信、props 与事件处理、生命周期管理、响应式数据绑定在游戏场景中的应用，并总结组件复用、插槽与组合的最佳实践。

## 项目结构
项目采用典型的 Vue 3 单文件组件（SFC）与组合式 API 结构，经过重构后具有更完善的 UI 层：
- 入口：main.ts 创建应用实例并挂载根组件 App.vue
- 根组件：App.vue 负责完整的 UI 布局，包括模式选择、覆盖层、波次过渡、侧边栏统计面板与 Canvas 容器
- 可组合函数：useGame.ts 提供游戏状态、AI、碰撞检测、渲染与生命周期钩子
- 类型定义：game.ts 定义常量、类型与地图生成算法
- 样式系统：style.css 提供 Tailwind CSS 基础和自定义样式类
- 示例组件：HelloWorld.vue 展示基础 Composition API 使用方式

```mermaid
graph TB
A["main.ts<br/>创建应用实例"] --> B["App.vue<br/>根组件"]
B --> C["useGame.ts<br/>游戏状态与逻辑"]
C --> D["game.ts<br/>常量与类型"]
B --> E["Canvas<br/>游戏画布"]
B --> F["侧边栏面板<br/>统计与控制"]
B --> G["覆盖层系统<br/>模式选择/结束界面"]
B --> H["波次过渡界面<br/>生存模式特有"]
B --> I["样式系统<br/>Tailwind CSS + 自定义"]
```

**图表来源**
- [main.ts:1-6](file://src/main.ts#L1-L6)
- [App.vue:1-305](file://src/App.vue#L1-L305)
- [useGame.ts:264-1282](file://src/composables/useGame.ts#L264-L1282)
- [game.ts:1-300](file://src/types/game.ts#L1-L300)
- [style.css:1-439](file://src/style.css#L1-L439)

**章节来源**
- [main.ts:1-6](file://src/main.ts#L1-L6)
- [README.md:1-6](file://README.md#L1-L6)
- [package.json:1-26](file://package.json#L1-L26)

## 核心组件
- **根组件 App.vue**
  - **职责**：管理完整的用户界面，包括模式选择界面、覆盖层系统、波次过渡界面、侧边栏统计面板、Canvas 容器与焦点管理
  - **数据**：响应式状态包括 game（来自 useGame）、showOverlay、overlayTitle/Message/Score/Kills/Level/Wave、isNewRecord、levelBanner、powerupNotice 等
  - **方法**：handleStart、returnToMenu、restartSurvival；调用 useGame 的 startGame、initCanvas
  - **模板**：条件渲染模式选择与结束界面，v-if 控制覆盖层与波次过渡，v-for 渲染生命图标与剩余敌人图标，v-show 控制暂停与波次提示
- **可组合函数 useGame.ts**
  - **职责**：封装游戏状态（reactive）、更新循环（update）、渲染（render）、键盘输入处理、AI 行为、碰撞检测、波次与关卡推进、暂停与结束控制、Canvas 初始化与动画循环
  - **状态**：扩展的 GameState 包含运行/暂停/结束/胜利、分数、击杀、关卡/波次、玩家生命、敌人数量、地图、子弹、爆炸、道具、冷却计时、模式与 BOSS 标识等
  - **生命周期**：onMounted/onUnmounted 注册/移除键盘监听与取消动画帧
  - **返回值**：暴露 game、canvasRef、ctx、startGame、endGame、togglePause、initCanvas、spawnExplosion 等
- **类型定义 game.ts**
  - **职责**：定义地图尺寸、方向、地形类型、敌人属性、波次配置、地图生成算法、BOSS 关卡判定与生存模式地图生成
- **样式系统 style.css**
  - **职责**：提供 Tailwind CSS 基础样式和自定义样式类，包括模式选择界面、波次过渡界面、BOSS 关卡标识、新纪录动画等
- **示例组件 HelloWorld.vue**
  - **职责**：演示 Composition API 基础用法（ref、模板引用、事件处理），作为学习参考

**章节来源**
- [App.vue:1-305](file://src/App.vue#L1-L305)
- [useGame.ts:264-1282](file://src/composables/useGame.ts#L264-L1282)
- [game.ts:1-300](file://src/types/game.ts#L1-L300)
- [style.css:1-439](file://src/style.css#L1-L439)
- [HelloWorld.vue:1-94](file://src/components/HelloWorld.vue#L1-L94)

## 架构总览
整体架构围绕"根组件 + 可组合函数 + 完整 UI 层"的模式展开：
- 根组件负责完整的视图层与用户交互（模式选择、覆盖层、波次过渡、侧边栏、Canvas）
- useGame 负责业务逻辑与渲染，内部维护游戏状态与动画循环
- game.ts 提供类型与地图/波次规则
- style.css 提供完整的样式系统
- main.ts 仅负责应用挂载

```mermaid
graph TB
subgraph "视图层"
Root["App.vue<br/>完整UI架构"]
Sidebar["侧边栏面板<br/>统计与控制"]
Overlay["覆盖层系统<br/>模式选择/结束界面"]
WaveOverlay["波次过渡界面<br/>生存模式特有"]
Canvas["Canvas<br/>游戏画布"]
EndPanel["结束界面<br/>经典/生存模式"]
ModeSelect["模式选择界面<br/>经典/生存模式"]
end
subgraph "逻辑层"
Composable["useGame.ts<br/>游戏状态与逻辑"]
Types["game.ts<br/>常量与类型"]
end
subgraph "样式层"
Style["style.css<br/>Tailwind + 自定义"]
end
Root --> Sidebar
Root --> Overlay
Root --> WaveOverlay
Root --> Canvas
Root --> Style
Root --> Composable
Composable --> Types
Overlay --> ModeSelect
Overlay --> EndPanel
```

**图表来源**
- [App.vue:86-305](file://src/App.vue#L86-L305)
- [useGame.ts:264-1282](file://src/composables/useGame.ts#L264-L1282)
- [game.ts:1-300](file://src/types/game.ts#L1-L300)
- [style.css:1-439](file://src/style.css#L1-L439)

## 详细组件分析

### 根组件 App.vue 设计与职责
**更新** 经过重大 UI 重构，App.vue 现在提供了完整的用户界面体验：

- **视图组织**
  - **模式选择界面**：点击卡片触发 handleStart，支持 classic 与 survival 两种模式，包含最高分显示
  - **结束界面**：根据 game.mode 与 game.over 动态渲染标题/消息/统计/按钮，支持新纪录动画
  - **波次过渡**：当 game.waveTransition 为真时显示"第 X 波"提示，包含动画效果
  - **侧边栏**：显示分数、关卡/波次、最高分、击杀、玩家生命、剩余敌人/本波剩余、操作说明
  - **Canvas**：容器内放置 canvas 并绑定 ref，onMounted 初始化
- **响应式与生命周期**
  - onMounted：initCanvas(canvasRef.value)，确保 Canvas 上下文可用
  - watch(game.over)：自动弹出结束覆盖层，按模式填充统计信息，生存模式检查新纪录
  - 事件处理：handleStart、returnToMenu、restartSurvival
- **数据绑定与状态**
  - showOverlay、overlayTitle/Message/Score/Kills/Level/Wave、isNewRecord、levelBanner、powerupNotice
  - 与 useGame 返回的 game 同步，实现 UI 与游戏状态的双向联动

```mermaid
sequenceDiagram
participant U as "用户"
participant R as "App.vue"
participant G as "useGame.ts"
participant C as "Canvas"
U->>R : 点击模式卡片
R->>R : handleStart(mode)
R->>G : startGame(mode)
G->>G : 初始化状态/加载地图
G->>C : 初始化 Canvas 上下文
G->>G : gameLoop()
G-->>R : 更新 game 状态
R-->>U : 渲染侧边栏/覆盖层/Canvas
```

**图表来源**
- [App.vue:19-50](file://src/App.vue#L19-L50)
- [useGame.ts:1155-1176](file://src/composables/useGame.ts#L1155-L1176)

**章节来源**
- [App.vue:1-305](file://src/App.vue#L1-L305)

### 可组合函数 useGame.ts：游戏状态与渲染
**更新** 扩展了游戏状态字段以支持新的 UI 功能：

- **状态模型**
  - GameState：包含运行/暂停/结束/胜利、分数、击杀、关卡/波次、玩家生命、敌人数量、地图、子弹、爆炸、道具、冷却计时、模式与 BOSS 标识等
  - keys：键盘输入状态映射
  - **新增字段**：mode、wave、highScore、waveTimer、waveEnemiesLeft、waveTransition、waveTransitionTimer、bossActive、bossTank
- **更新循环**
  - update：处理波次过渡、冷却、生成敌人、玩家与 AI 更新、子弹与爆炸清理、碰撞检测、道具拾取、波次/关卡推进
  - gameLoop：requestAnimationFrame 驱动的主循环
- **渲染管线**
  - render：清屏、绘制网格、地图、道具、敌人、玩家、森林遮罩、子弹、爆炸、BOSS 血条、波次过渡与暂停提示
  - draw*：独立绘制函数（地图块、坦克、子弹、爆炸、道具、森林遮罩）
- **事件与生命周期**
  - 键盘事件：onKeyDown/onKeyUp 注册/移除，P 键切换暂停
  - onMounted/onUnmounted：注册/移除事件与取消动画帧
- **导出接口**
  - startGame、endGame、togglePause、initCanvas、spawnExplosion 等

```mermaid
flowchart TD
Start(["进入 update"]) --> CheckTransition{"是否波次过渡？"}
CheckTransition --> |是| Transition["更新过渡计时器<br/>跳过游戏逻辑"]
CheckTransition --> |否| FrameInc["递增帧计数"]
FrameInc --> Cooldown["更新冷却与道具计时"]
Cooldown --> Spawn["按冷却生成敌人"]
Spawn --> Player["更新玩家状态"]
Player --> Enemies["遍历敌人并更新AI"]
Enemies --> Bullets["更新子弹位置"]
Bullets --> Collisions["碰撞检测与处理"]
Collisions --> Powerups["检查道具拾取"]
Powerups --> Cleanup["清理死亡对象"]
Cleanup --> SurvCheck{"生存模式？"}
SurvCheck --> |是| WaveDone{"本波结束？"}
SurvCheck --> |否| ClassicDone{"经典模式？"}
WaveDone --> |是| NextWave["开始下一波"]
ClassicDone --> |是| LevelDone{"关卡结束？"}
NextWave --> End(["结束 update"])
LevelDone --> |是| NextLevel["进入下一关"]
NextLevel --> End
WaveDone --> |否| End
LevelDone --> |否| End
```

**图表来源**
- [useGame.ts:731-792](file://src/composables/useGame.ts#L731-L792)
- [useGame.ts:1189-1228](file://src/composables/useGame.ts#L1189-L1228)

**章节来源**
- [useGame.ts:264-1282](file://src/composables/useGame.ts#L264-L1282)

### 类型定义 game.ts：常量与规则
- **地图与渲染**
  - TILE、COLS、ROWS、W、H、DIR、DX/DY、地形类型常量
  - 地图生成算法：generateLevel、getLevelMap、getSurvivalMap
- **敌人与波次**
  - enemySpeed/fireRate/hp/color、getEnemyType、isBossLevel、bossHp
  - getWaveConfig：生存模式波次配置（敌人数量、类型、倍率、是否 BOSS）
- **工具函数**
  - rectsOverlap：矩形相交判断
- **用途**
  - 为 useGame 提供规则与地图数据，保证游戏行为一致性

**章节来源**
- [game.ts:1-300](file://src/types/game.ts#L1-L300)

### 样式系统 style.css：完整的视觉设计
**更新** 新增了完整的样式系统，支持重构后的 UI 组件：

- **基础样式**
  - Tailwind CSS 基础类导入
  - 全局样式设置，包括背景色、字体、布局等
- **模式选择界面样式**
  - .mode-select：模式卡片容器
  - .mode-card：通用卡片样式
  - .mode-classic/.mode-survival：经典模式绿色主题和生存模式红色主题
  - .high-score：最高分显示样式
- **波次过渡界面样式**
  - .wave-transition-overlay：波次过渡覆盖层
  - .wave-info：波次信息容器
  - .wave-number/.wave-hint：波次数字和提示文本
  - @keyframes wave-pulse：波次动画效果
- **BOSS 关卡标识样式**
  - .boss-indicator：BOSS关卡标识
  - @keyframes boss-blink：BOSS闪烁动画
- **新纪录标识样式**
  - .new-record：新纪录动画效果
  - @keyframes record-blink：新纪录闪烁动画
- **游戏结束界面增强**
  - .game-over-survival：生存模式结束界面样式
  - .btn-secondary：次要按钮样式

**章节来源**
- [style.css:1-439](file://src/style.css#L1-L439)

### 示例组件 HelloWorld.vue：Composition API 基础
- 展示了 ref、模板引用与事件绑定的基础用法，适合理解 Vue 3 SFC 与脚本设置语法
- 与主游戏无直接耦合，仅作学习参考

**章节来源**
- [HelloWorld.vue:1-94](file://src/components/HelloWorld.vue#L1-L94)

## 依赖关系分析
**更新** 重构后的依赖关系更加清晰：

- **应用入口依赖**
  - main.ts 依赖 App.vue 与样式
- **根组件依赖**
  - App.vue 依赖 useGame.ts（状态与方法）、game.ts（类型与规则）、style.css（样式）
- **可组合函数依赖**
  - useGame.ts 依赖 game.ts（常量与规则）、Vue 响应式 API（ref、reactive、onMounted、onUnmounted）
- **样式依赖**
  - style.css 为所有组件提供统一的视觉风格
- **类型依赖**
  - game.ts 为 useGame 与 App 提供类型与规则支撑

```mermaid
graph LR
M["main.ts"] --> A["App.vue"]
A --> U["useGame.ts"]
A --> S["style.css"]
U --> T["game.ts"]
A --> T
S --> A
```

**图表来源**
- [main.ts:1-6](file://src/main.ts#L1-L6)
- [App.vue:1-10](file://src/App.vue#L1-L10)
- [useGame.ts:1-10](file://src/composables/useGame.ts#L1-L10)
- [game.ts:1-300](file://src/types/game.ts#L1-L300)
- [style.css:1-439](file://src/style.css#L1-L439)

**章节来源**
- [package.json:1-26](file://package.json#L1-L26)

## 性能考量
**更新** 新的 UI 架构在性能方面有以下考虑：

- **动画循环**
  - 使用 requestAnimationFrame 驱动 gameLoop，避免阻塞主线程
  - 在波次过渡期间跳过游戏逻辑，降低 CPU 占用
- **清理与过滤**
  - update 结尾对死亡对象进行过滤，减少渲染与碰撞检测开销
- **渲染优化**
  - render 中仅绘制可见元素，避免重复绘制
  - draw* 函数按需绘制，减少不必要的计算
- **输入处理**
  - 键盘事件使用捕获阶段，避免默认行为干扰（如方向键滚动页面）
- **UI 渲染优化**
  - 条件渲染覆盖层和波次界面，避免不必要的 DOM 操作
  - 使用 CSS 动画而非 JavaScript 动画，提高性能

## 故障排查指南
**更新** 针对新 UI 架构的故障排查：

- **Canvas 未初始化**
  - 症状：游戏无法渲染或报错
  - 排查：确认 onMounted 中 initCanvas 已执行，canvasRef 不为空
  - 参考路径：[App.vue:46-50](file://src/App.vue#L46-L50)、[useGame.ts:1267-1270](file://src/composables/useGame.ts#L1267-L1270)
- **模式选择界面不显示**
  - 症状：游戏启动后直接进入游戏画面
  - 排查：确认 game.running 和 game.over 状态正确初始化，showOverlay 为 true
  - 参考路径：[App.vue:92-119](file://src/App.vue#L92-L119)
- **波次过渡界面不显示**
  - 症状：生存模式波次切换无提示
  - 排查：确认 game.waveTransition 与 game.waveTransitionTimer 的更新逻辑
  - 参考路径：[useGame.ts:1189-1213](file://src/composables/useGame.ts#L1189-L1213)、[useGame.ts:1130-1142](file://src/composables/useGame.ts#L1130-L1142)
- **新纪录动画不显示**
  - 症状：生存模式最高分更新但无动画效果
  - 排查：确认 isNewRecord 状态更新和 CSS 动画类应用
  - 参考路径：[App.vue:152-155](file://src/App.vue#L152-L155)、[style.css:402-422](file://src/style.css#L402-L422)
- **样式问题**
  - 症状：UI 样式异常或组件样式丢失
  - 排查：确认 Tailwind CSS 正确导入，CSS 类名与模板匹配
  - 参考路径：[style.css:1-439](file://src/style.css#L1-L439)

**章节来源**
- [App.vue:46-155](file://src/App.vue#L46-L155)
- [useGame.ts:1130-1265](file://src/composables/useGame.ts#L1130-L1265)
- [style.css:1-439](file://src/style.css#L1-L439)

## 结论
**更新** 经过重大 UI 重构后，本项目通过"根组件 + 可组合函数 + 完整 UI 层"的架构实现了更加完善的用户体验：根组件专注完整的 UI 与交互，useGame 负责复杂的游戏逻辑与渲染，game.ts 提供规则与类型保障，style.css 提供统一的视觉设计。该模式具备良好的可扩展性与可维护性，适合在大型游戏中推广。建议后续引入插槽与组件组合以进一步提升复用性，并完善错误边界与日志监控以增强稳定性。

## 附录
- **项目启动与构建**
  - 开发：npm run dev
  - 构建：npm run build
  - 预览：npm run preview
- **技术栈**
  - Vue 3 + TypeScript + Vite + TailwindCSS + CSS 动画
- **新增功能特性**
  - 完整的模式选择界面
  - 波次过渡动画系统
  - BOSS 关卡视觉标识
  - 新纪录动画效果
  - 响应式布局设计

**章节来源**
- [package.json:6-10](file://package.json#L6-L10)
- [README.md:1-6](file://README.md#L1-L6)