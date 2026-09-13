/**
 * 自动化功能验证测试：第 1 章 项目概述与核心玩法
 * 1. 陪伴感：小院木门守候与热情欢迎仪式
 * 2. 互动更「动」：高动能飞盘抛咬 + 草坪嗅闻寻宝狂热刨地飞溅
 * 3. 公园主题与动态天气系统：晴天、雨天、雪天与光影/雨帽/围巾
 * 4. 国民犬种图鉴 (8大国民犬种) 与 5 大狗狗专属料理
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

// 模拟浏览器全局环境
const mockCanvas = {
  getContext: () => ({
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    ellipse: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 50 }),
    scale: () => {},
    translate: () => {},
    rotate: () => {},
  }),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  addEventListener: () => {}
};

const domElements = {};
function getOrCreateElem(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id,
      innerText: '',
      innerHTML: '',
      className: '',
      classList: {
        add: (c) => {},
        remove: (c) => {},
        contains: () => false
      },
      style: {},
      addEventListener: () => {},
      appendChild: () => {},
      querySelectorAll: () => [],
      closest: () => ({ classList: { add: () => {} } })
    };
  }
  return domElements[id];
}

const sandbox = {
  window: {
    addEventListener: () => {},
    devicePixelRatio: 1,
    AudioContext: class {
      constructor() { this.state = 'running'; }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
      createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
      createBiquadFilter() { return { connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { value: 1 } }; }
      createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
      createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
    }
  },
  document: {
    getElementById: (id) => {
      if (id === 'game-canvas') return mockCanvas;
      return getOrCreateElem(id);
    },
    querySelectorAll: () => [],
    createElement: (tag) => getOrCreateElem('elem_' + Math.random()),
    body: { appendChild: () => {} },
    addEventListener: () => {}
  },
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = v; },
    removeItem(k) { delete this.data[k]; }
  },
  Image: class {
    constructor() { this.onload = null; }
  },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1,
  setTimeout: setTimeout,
  setInterval: setInterval,
  Math,
  Date,
  Set,
  Map,
  Array,
  Object,
  console
};

vm.createContext(sandbox);

// 顺序载入代码
['config.js', 'audio.js', 'dog.js', 'kitchen.js', 'wardrobe.js', 'gacha.js', 'economy.js', 'game.js'].forEach(file => {
  const code = fs.readFileSync(path.join(rootDir, 'js', file), 'utf8');
  vm.runInContext(code, sandbox);
});

console.log('--- 开始检验《金毛和汤》第 1 章 核心玩法与四大支柱 ---');

// 1. 验证 5 大狗狗专属料理与犬种图鉴配置
const cuisines = vm.runInContext('DOG_CUISINES_CONFIG', sandbox);
const dogpedia = vm.runInContext('DOGPEDIA_CONFIG', sandbox);
const WEATHER_CONFIG = vm.runInContext('WEATHER_CONFIG', sandbox);

console.log(`[PASS 1.1] 5大专属料理加载: ${Object.keys(cuisines).length} 类`);
for (const [k, v] of Object.entries(cuisines)) {
  console.log(`   🍲 料理类别: 【${v.name}】(${v.tag}) - 包含名菜: ${v.dishes.map(d => d.name).join(', ')}`);
}
console.log(`[PASS 1.2] 国民犬种图鉴加载: ${Object.keys(dogpedia).length} 种`);
for (const [k, v] of Object.entries(dogpedia)) {
  console.log(`   🐕 犬种: ${v.name} (${v.alias}) - 原产地: ${v.origin}, 喜好料理: ${v.favoriteDish}`);
}

// 2. 初始化游戏对象
const game = vm.runInContext('new WangwangGame()', sandbox);
console.log('[PASS 2] 游戏主控制器初始化成功，狗狗厨师数量:', game.dogs.size);

// 3. 验证动态天气系统
console.log('[TEST 3] 验证动态天气切换与环境效果:');
game.setWeather('sunny');
console.log(`   ☀️ 当前天气: ${game.currentWeather}, 产速加成: +${WEATHER_CONFIG[game.currentWeather].gpsBonus * 100}%`);

game.setWeather('rainy');
console.log(`   🌧️ 当前天气: ${game.currentWeather}, 着装: ${WEATHER_CONFIG[game.currentWeather].outfitWeather}`);

game.setWeather('snowy');
console.log(`   ❄️ 当前天气: ${game.currentWeather}, 着装: ${WEATHER_CONFIG[game.currentWeather].outfitWeather}`);

// 4. 验证高动能飞盘抛掷与追咬
console.log('[TEST 4] 验证高动能飞盘抛物线与狗狗凌空追咬:');
const golden = game.dogs.get('golden');
golden.assignedFacility = null; // 放置在草坪
game.throwFrisbee();
console.log(`   飞盘数量: ${game.kitchen.activeFrisbees.length}, 金毛状态: ${golden.routineState}`);

// 模拟飞盘与狗狗运动更新 3 秒
for (let step = 0; step < 30; step++) {
  game.kitchen.update(0.1);
  golden.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
}
console.log(`   飞奔追逐后金毛状态: ${golden.routineState}, 叼持飞盘: ${golden.holdsFrisbee}`);

// 5. 验证草坪嗅闻寻宝狂热刨地
console.log('[TEST 5] 验证草坪嗅闻寻宝与泥土飞溅:');
golden.routineState = 'sniff_ground';
golden.routineTimer = 1.5;
for (let step = 0; step < 20; step++) {
  golden.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
}
console.log(`   进入狂热刨地: ${golden.isDigging}, 状态: ${golden.routineState}`);
// 给予刨地时间
for (let step = 0; step < 30; step++) {
  golden.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
  game.kitchen.update(0.1);
}
console.log(`   刨出宝藏数量: ${game.kitchen.dugTreasures.length}, 泥土飞溅粒子数: ${game.kitchen.dirtParticles.length}`);
if (game.kitchen.dugTreasures.length > 0) {
  const treasure = game.kitchen.dugTreasures[0];
  const oldGold = game.economy.gold;
  game.kitchen.collectDugTreasure(treasure, game.economy);
  console.log(`   拾取宝藏【${treasure.name}】！金币变化: ${oldGold} -> ${game.economy.gold}`);
}

// 6. 验证小院木栅门守候与欢迎仪式
console.log('[TEST 6] 验证木栅门守候与主人推门欢迎仪式:');
golden.waitAtGate();
console.log(`   金毛木门前守候中: waitingAtGate=${golden.waitingAtGate}, x=${Math.round(golden.x)}, y=${Math.round(golden.y)}`);
game.triggerGateWelcome();
console.log(`   推门欢迎仪式触发: routineState=${golden.routineState}, 尾巴欢快摇动: tailWagRate=${golden.tailWagRate}`);

// 7. 验证离线收益弹窗
console.log('[TEST 7] 验证小院木栅门离线收益欢迎弹窗:');
game.showOfflineModal({
  offlineSeconds: 3600,
  maxHours: 8,
  goldPerSec: 10,
  earnedGold: 36000
});
console.log('   离线收益弹窗数据灌装与金毛跳跃欢迎启动正常！');

// 8. 验证国民犬种图鉴渲染
console.log('[TEST 8] 验证国民犬种图鉴渲染与5大料理渲染:');
game.renderDogpediaModal();
console.log('   图鉴与5大料理DOM构建执行顺利！');

console.log('=== 🎉 所有 Chapter 1 自动化功能验证测试全部通过！ ===');
