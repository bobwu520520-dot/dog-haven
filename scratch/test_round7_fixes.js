/**
 * 《汪汪小馆》第 7 轮缺陷修复与安全性闭环验证
 * 验证目标：
 * 1. 散步伴手礼奖励配置不可变性 (防止比格犬嗅觉天赋导致数值几何膨胀)
 * 2. 音效引擎零崩溃防护 (Web Audio 未初始化/被拦截时全 13 种 SFX 安全静默)
 * 3. 投喂肉干唤醒阈值 (>= 50 体力即刻解除小憩复工)
 * 4. 画布点击直接抚摸并记入每日任务 (pet_dog)
 * 5. 厨房系统对 economy 实例为 null 时的防御性容错
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

const mockCanvas = {
  getContext: () => ({
    save: () => {}, restore: () => {}, beginPath: () => {}, closePath: () => {},
    arc: () => {}, ellipse: () => {}, moveTo: () => {}, lineTo: () => {},
    stroke: () => {}, fill: () => {}, fillRect: () => {}, clearRect: () => {},
    strokeRect: () => {}, strokeText: () => {}, setTransform: () => {}, resetTransform: () => {},
    fillText: () => {}, roundRect: () => {}, setLineDash: () => {}, rect: () => {},
    quadraticCurveTo: () => {}, bezierCurveTo: () => {}, translate: () => {},
    rotate: () => {}, scale: () => {}, clip: () => {}, drawImage: () => {},
    createPattern: () => null, getLineDash: () => [], arcTo: () => {}, lineWidth: 1,
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 50 }),
    getTransform: () => ({})
  }),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  addEventListener: () => {}
};

const domElements = {};
function getOrCreateElem(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id, innerText: '', innerHTML: '', className: '', value: '',
      dataset: {}, style: {}, disabled: false, title: '',
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      addEventListener: () => {}, appendChild: () => {},
      querySelectorAll: () => [], closest: () => ({ classList: { add: () => {} } }),
      querySelector: () => null
    };
  }
  return domElements[id];
}

const sandbox = {
  window: {
    addEventListener: () => {}, devicePixelRatio: 1,
    AudioContext: class {
      constructor() { this.state = 'running'; }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
      createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
      createBiquadFilter() { return { connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { value: 1, setValueAtTime: () => {} } }; }
      createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
      createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
    }
  },
  document: {
    getElementById: (id) => (id === 'game-canvas' ? mockCanvas : getOrCreateElem(id)),
    querySelectorAll: () => [],
    createElement: () => getOrCreateElem('elem_' + Math.random()),
    body: { appendChild: () => {} },
    addEventListener: () => {}
  },
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = v; },
    removeItem(k) { delete this.data[k]; }
  },
  Image: class { constructor() { this.onload = null; } },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1,
  setTimeout, setInterval, Math, Date, Set, Map, Array, Object, console, Float32Array
};

vm.createContext(sandbox);

['config.js', 'audio.js', 'dog.js', 'kitchen.js', 'wardrobe.js', 'gacha.js', 'economy.js', 'game.js'].forEach(file => {
  const code = fs.readFileSync(path.join(rootDir, 'js', file), 'utf8');
  vm.runInContext(code, sandbox);
});

let passCount = 0;
let failCount = 0;
function assert(cond, label, extra = '') {
  if (cond) { passCount++; console.log(`   ✅ ${label}${extra ? ' — ' + extra : ''}`); }
  else { failCount++; console.log(`   ❌ FAIL: ${label}${extra ? ' — ' + extra : ''}`); }
}

console.log('========================================================================');
console.log('=== 第 7 轮 Bug 修复与稳定性闭环验证 ===\n');

const WangwangEconomy = vm.runInContext('WangwangEconomy', sandbox);
const RestaurantKitchen = vm.runInContext('RestaurantKitchen', sandbox);
const DogChef = vm.runInContext('DogChef', sandbox);
const WangwangAudio = vm.runInContext('WangwangAudio', sandbox);
const WangwangGame = vm.runInContext('WangwangGame', sandbox);
const PARK_ACTIVITIES_CONFIG = vm.runInContext('PARK_ACTIVITIES_CONFIG', sandbox);
const DOG_BREEDS_CONFIG = vm.runInContext('DOG_BREEDS_CONFIG', sandbox);

// ------------------------------------------------------------------------
// [1. 散步伴手礼配置不可变性验证]
// ------------------------------------------------------------------------
console.log('[1. 散步伴手礼配置不可变性验证]');
{
  const eco = new WangwangEconomy();
  const dogs = new Map();
  const beagleDog = new DogChef('beagle', DOG_BREEDS_CONFIG.beagle, true);
  dogs.set('beagle', beagleDog);
  eco.dogs = dogs;

  const kitchen = new RestaurantKitchen(eco, dogs);

  // 记录原始配置中的基础数值
  const originalAmounts = PARK_ACTIVITIES_CONFIG.parkWalk.rewards.map(r => r.amount);

  // 连续多次调用 grantParkWalkReward
  for (let i = 0; i < 15; i++) {
    kitchen.grantParkWalkReward(beagleDog);
  }

  // 验证配置中的基础数值未被修改
  let isUnmutated = true;
  PARK_ACTIVITIES_CONFIG.parkWalk.rewards.forEach((r, idx) => {
    if (r.amount !== originalAmounts[idx]) {
      isUnmutated = false;
    }
  });

  assert(isUnmutated, '连续触发 15 次散步结算，PARK_ACTIVITIES_CONFIG 基础数值未被原地篡改膨胀');
  assert(eco.dailyTaskProgress['park_walk'] >= 15, '每日任务进度中的 park_walk 累加正常', `实际: ${eco.dailyTaskProgress['park_walk']}`);
}

// ------------------------------------------------------------------------
// [2. 音效引擎零崩溃防护]
// ------------------------------------------------------------------------
console.log('\n[2. 音效引擎 AudioContext 缺失防护]');
{
  const audio = new WangwangAudio();
  audio.init = () => {}; // 模拟 AudioContext 无法初始化的纯净状态（如安全策略拦截或环境缺失）
  audio.ctx = null;

  let noCrash = true;
  try {
    audio.playGrillSizzle();
    audio.playWokStir();
    audio.playJuicer();
    audio.playSteamer();
    audio.playOvenDing();
    audio.playCoin();
    audio.playUpgrade();
    audio.playPetHeart();
    audio.playFrisbeeWhoosh();
    audio.playDigging();
    audio.playRainDrop();
    audio.playGateWelcome();
    audio.playBark('golden');
  } catch (e) {
    noCrash = false;
    console.error(e);
  }

  assert(noCrash, '当 AudioContext 为 null 时，调用全 13 种音效方法安全静默无异常抛出');
}

// ------------------------------------------------------------------------
// [3. 投喂肉干即刻唤醒疲惫大厨]
// ------------------------------------------------------------------------
console.log('\n[3. 投喂肉干即刻唤醒疲惫大厨]');
{
  const dog = new DogChef('golden', DOG_BREEDS_CONFIG.golden, true);
  dog.stamina = 0;
  dog.isTired = true;
  dog.restingFromFacility = 'stew';

  // 喂食一次肉干 (+50 体力)
  dog.feedSnack();

  assert(dog.stamina === 50, '体力增加 50 点', `实际体力: ${dog.stamina}`);
  assert(dog.isTired === false, '单次喂食后疲惫状态即刻解除 (唤醒阈值 >= 50 体力)');
  assert(dog.restingFromFacility === null, '已清空休息来源工位标记准备重回岗位');
}

// ------------------------------------------------------------------------
// [4. 画布点击直接抚摸并记入每日任务]
// ------------------------------------------------------------------------
console.log('\n[4. 画布点击抚摸狗狗记入每日任务]');
{
  const game = new WangwangGame();

  const initialPetCount = game.economy.dailyTaskProgress['pet_dog'] || 0;
  const golden = game.dogs.get('golden');
  const initialAffection = golden.affectionExp;

  // 模拟点击金毛所在坐标
  golden.x = 300;
  golden.y = 300;
  golden.radius = 40;

  // 触发点击
  game.handleCanvasClick(300, 300);

  const newPetCount = game.economy.dailyTaskProgress['pet_dog'] || 0;
  const newAffection = golden.affectionExp;

  assert(newPetCount === initialPetCount + 1, '画布单击狗狗直接记入每日任务 pet_dog +1', `实际进度: ${newPetCount}`);
  assert(newAffection > initialAffection, '好感度经验值成功增加', `经验: ${initialAffection} → ${newAffection}`);
}

// ------------------------------------------------------------------------
// [5. 厨房管理器的经济系统防御性容错]
// ------------------------------------------------------------------------
console.log('\n[5. 厨房管理器的经济系统防御性容错]');
{
  const dogs = new Map();
  const golden = new DogChef('golden', DOG_BREEDS_CONFIG.golden, true);
  dogs.set('golden', golden);

  // 构造无 economy 的独立 kitchen 实例
  const nullEcoKitchen = new RestaurantKitchen(null, dogs);
  const station = nullEcoKitchen.stations['stew'];

  let cookTimeOk = false;
  let dishPriceOk = false;
  let currentDishOk = false;
  let fountainOk = false;
  let upgradeOk = false;

  try {
    const cookTime = nullEcoKitchen.calcActualCookTime(station);
    cookTimeOk = typeof cookTime === 'number' && cookTime > 0;

    const dishPrice = nullEcoKitchen.calcActualDishPrice(station);
    dishPriceOk = typeof dishPrice === 'number' && dishPrice > 0;

    const dish = nullEcoKitchen.getCurrentDish(station);
    currentDishOk = !!dish;

    nullEcoKitchen.triggerFountainClick(200, 200);
    fountainOk = true;

    const upgraded = nullEcoKitchen.upgradeStation('stew');
    upgradeOk = (upgraded === false); // 优雅拒绝，不抛异常
  } catch (e) {
    console.error(e);
  }

  assert(cookTimeOk, 'economy 为 null 时 calcActualCookTime 正常计算出制作时长');
  assert(dishPriceOk, 'economy 为 null 时 calcActualDishPrice 正常计算出菜品单价');
  assert(currentDishOk, 'economy 为 null 时 getCurrentDish 正常返回菜品对象');
  assert(fountainOk, 'economy 为 null 时 triggerFountainClick 安全触发喷泉水花动画');
  assert(upgradeOk, 'economy 为 null 时 upgradeStation 优雅返回 false 而非崩溃');
}

console.log('\n========================================================================');
console.log(`=== 结果：${passCount} 通过 / ${failCount} 失败 ===`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
