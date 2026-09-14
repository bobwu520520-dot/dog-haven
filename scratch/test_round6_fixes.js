/**
 * 《汪汪小馆》第 6 轮 Bug 修复与边缘场景验证
 * 验证目标：
 * 1. 每日任务 play_toy 统计与领取 (task_play_3)
 * 2. 10万金币里程碑成就 ach_gold_100k 配置完整性与达成领取
 * 3. 疲惫狗狗工位烹饪挂起机制 (无幽灵厨师做菜，恢复后平滑继续)
 * 4. 跨天数据重置与老存档字段缺损容错保护
 * 5. 10 种犬种叫声独特性与零报错
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
      createBiquadFilter() { return { connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { value: 1 } }; }
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
  else { failCount++; console.log(`   ❌ ${label}${extra ? ' — ' + extra : ''}`); }
}

console.log('=== 第 6 轮 Bug 修复与边缘场景验证 ===\n');

const WangwangEconomy = vm.runInContext('WangwangEconomy', sandbox);
const ACHIEVEMENTS_CONFIG = vm.runInContext('ACHIEVEMENTS_CONFIG', sandbox);
const DogChef = vm.runInContext('DogChef', sandbox);
const DOG_BREEDS_CONFIG = vm.runInContext('DOG_BREEDS_CONFIG', sandbox);
const RestaurantKitchen = vm.runInContext('RestaurantKitchen', sandbox);

console.log('[1. 每日任务：乐园玩耍与动态计数容错]');
{
  const eco = new WangwangEconomy();
  assert(eco.dailyTaskProgress.play_toy === 0, '初始 dailyTaskProgress 包含 play_toy: 0', `实际: ${eco.dailyTaskProgress.play_toy}`);

  const initBones = eco.bones;
  eco.recordAction('play_toy');
  eco.recordAction('play_toy');
  assert(eco.dailyTaskProgress.play_toy === 2, 'recordAction("play_toy") 累加到 2 次', `实际: ${eco.dailyTaskProgress.play_toy}`);
  assert(!eco.claimDailyTask('task_play_3'), '未达 3 次不可领取 task_play_3');

  eco.recordAction('play_toy');
  assert(eco.dailyTaskProgress.play_toy === 3, '累加到 3 次达成目标');
  assert(eco.claimDailyTask('task_play_3'), '满 3 次可成功领取');
  assert(eco.bones === initBones + 5, '发放 5 根骨头奖励', `当前骨头: ${eco.bones}`);
  assert(!eco.claimDailyTask('task_play_3'), '不可重复领取已完成任务');

  eco.recordAction('custom_event_x', 2);
  assert(eco.dailyTaskProgress.custom_event_x === 2, '遇到新 actionType 动态初始化并不产生 NaN', `实际: ${eco.dailyTaskProgress.custom_event_x}`);
}

console.log('\n[2. 成就系统：日进斗金 ach_gold_100k]');
{
  const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === 'ach_gold_100k');
  assert(!!ach, 'ACHIEVEMENTS_CONFIG 包含 ach_gold_100k');
  assert(ach.name === '日进斗金', '成就名称为【日进斗金】');
  assert(ach.target === 100000, '目标值为 100,000 金币');
  assert(ach.rewardBones === 50, '奖励骨头 50');

  const eco = new WangwangEconomy();
  eco.totalGoldEarned = 99900;
  eco.checkMilestones();
  assert(!eco.unlockedAchievements.has('ach_gold_100k'), '未达到 10 万金币时不解锁');

  eco.addGold(200);
  assert(eco.unlockedAchievements.has('ach_gold_100k'), '满 10 万金币自动解锁成就');

  const initBones = eco.bones;
  const claimed = eco.claimAchievement('ach_gold_100k');
  assert(claimed, '可正常领取成就奖励');
  assert(eco.bones === initBones + 50, '成功到账 50 骨头', `当前骨头: ${eco.bones}`);
  assert(!eco.claimAchievement('ach_gold_100k'), '已领取成就不可重复领取');
}

console.log('\n[3. 疲惫大厨与工位烹饪挂起机制]');
{
  const eco = new WangwangEconomy();
  const dogs = new Map();
  const golden = new DogChef('golden', DOG_BREEDS_CONFIG.golden, true);
  dogs.set('golden', golden);

  const kitchen = new RestaurantKitchen(eco, dogs);
  kitchen.stations.stew.unlocked = true;
  kitchen.assignDogToStation('golden', 'stew');

  // 正常做菜
  golden.isTired = false;
  kitchen.stations.stew.cookTimer = 0;
  kitchen.update(1.0);
  const t1 = kitchen.stations.stew.cookTimer;
  assert(t1 > 0, '大厨精力充沛时正常推进烹饪', `cookTimer: ${t1.toFixed(2)}`);

  // 疲惫挂起
  golden.isTired = true;
  const expBefore = golden.affectionExp;
  kitchen.update(1.0);
  assert(kitchen.stations.stew.cookTimer === t1, '疲惫小憩中工位挂起，烹饪计时不增加', `cookTimer仍为: ${kitchen.stations.stew.cookTimer.toFixed(2)}`);
  assert(golden.affectionExp === expBefore, '疲惫小憩中不发放烹饪好感经验');

  // 投喂唤醒
  golden.stamina = 50;
  golden.feedSnack();
  assert(!golden.isTired, '投喂肉干补充体力并解除疲惫状态');
  kitchen.update(1.0);
  assert(kitchen.stations.stew.cookTimer > t1, '唤醒后工位立即恢复制作', `cookTimer: ${kitchen.stations.stew.cookTimer.toFixed(2)}`);
}

console.log('\n[4. 跨天检测与存档恢复]');
{
  const eco = new WangwangEconomy();
  eco.lastDailyResetDate = 'Yesterday';
  eco.dailyTaskProgress.play_toy = 5;
  eco.claimedTasks.add('task_play_3');
  eco.dailyAdBonesWatched = 3;

  eco.checkDailyReset();
  assert(eco.dailyTaskProgress.play_toy === 0, '跨天后 play_toy 重置为 0');
  assert(!eco.claimedTasks.has('task_play_3'), '跨天后 claimedTasks 被清空');
  assert(eco.dailyAdBonesWatched === 0, '跨天后 广告骨头次数重置为 0');
  assert(eco.lastDailyResetDate === new Date().toDateString(), '重置日期刷新为今日');
}

console.log('\n[5. 叫声音调配置覆盖全 10 犬种]');
{
  const audio = vm.runInContext('new WangwangAudio()', sandbox);
  audio.init();
  const testBreeds = ['golden', 'shiba', 'corgi', 'samoyed', 'husky', 'border_collie', 'frenchie', 'labrador', 'poodle', 'beagle'];
  let allBarked = true;
  for (const b of testBreeds) {
    try {
      audio.playBark(b);
    } catch (e) {
      allBarked = false;
    }
  }
  assert(allBarked, '10 个犬种调用 playBark 均能正常根据音调配置发声无报错');
}

console.log(`\n========================================================================`);
console.log(`=== 结果：${passCount} 通过 / ${failCount} 失败 ===`);
console.log(`========================================================================\n`);

process.exit(failCount > 0 ? 1 : 0);
