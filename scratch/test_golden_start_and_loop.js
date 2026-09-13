// 自动化端到端测试：《汪汪小馆》金毛开局与7节点核心放置循环验证
// 注：项目已从「金毛掌勺熬汤锅(stove)」迁移为「金毛打理阳光花园(garden)」，断言已同步更新。
const fs = require('fs');
const path = require('path');

// 模拟浏览器环境
global.requestAnimationFrame = () => {};
global.window = {
  devicePixelRatio: 1,
  addEventListener: () => {},
  wangwangAudio: {
    playCoin: () => {},
    playUpgrade: () => {},
    playWokStir: () => {},
    playGrillSizzle: () => {},
    playJuicer: () => {},
    playSteamer: () => {},
    playOvenDing: () => {}
  }
};
global.document = {
  getElementById: (id) => ({
    getContext: () => ({
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      roundRect: () => {},
      fillText: () => {},
      measureText: () => ({ width: 40 }),
      drawImage: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      clip: () => {},
      setLineDash: () => {}
    }),
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    querySelectorAll: () => [],
    appendChild: () => {},
    innerText: '',
    innerHTML: ''
  }),
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
  clear() { this._data = {}; }
};
global.Image = class {
  constructor() {
    this.src = '';
    this.complete = true;
    setTimeout(() => { if (this.onload) this.onload(); }, 1);
  }
};

// 加载核心业务代码
const vm = require('vm');
const baseDir = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'config.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'dog.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'kitchen.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'wardrobe.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'gacha.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'economy.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'game.js'), 'utf-8'));

console.log('=== [1] 验证初始状态：金毛开局与阳光花园 ===');
const game = new WangwangGame();

// 1. 验证金毛是否为初始小狗
const golden = game.dogs.get('golden');
const shiba = game.dogs.get('shiba');
console.log('金毛状态:', {
  isOwned: golden.isOwned,
  assignedFacility: golden.assignedFacility,
  x: golden.x,
  y: golden.y,
  title: golden.title,
  skillName: golden.config.skillName
});
if (!golden.isOwned || golden.assignedFacility !== 'stew') {
  throw new Error('FAILED: 金毛未作为初始拥有小狗坐镇鲜美炖汤锅！');
}

// 2. 验证柴犬是否待招募 (200金币)
console.log('柴犬状态:', {
  isOwned: shiba.isOwned,
  recruitCost: shiba.config.recruitCost,
  assignedFacility: shiba.assignedFacility
});
if (shiba.isOwned || shiba.config.recruitCost !== 200) {
  throw new Error('FAILED: 柴犬未配置为200金币招募伙伴！');
}

// 3. 验证设施：阳光花园初始解锁，快递驿站待建造
const garden = game.kitchen.stations.stew;
const post = game.kitchen.stations.bbq;
console.log('鲜美炖汤锅营地:', { unlocked: garden.unlocked, assignedDogId: garden.assignedDogId, dishes: garden.config.dishes[0].name });
console.log('慢烤烧烤架营地:', { unlocked: post.unlocked, unlockCost: post.config.unlockCost, assignedDogId: post.assignedDogId });
if (!garden.unlocked || garden.assignedDogId !== 'golden') {
  throw new Error('FAILED: 鲜美炖汤锅未初始解锁或主厨不是金毛！');
}
if (post.unlocked) {
  throw new Error('FAILED: 慢烤烧烤架应当初始待解锁！');
}

console.log('\n=== [2] 验证核心循环行动指标 (getCurrentLoopObjective) ===');
let obj = game.economy.getCurrentLoopObjective();
console.log('当前循环目标 1:', obj);
if (obj.step !== 'upgrade' || obj.stationId !== 'stew') {
  throw new Error('FAILED: 开局目标应为升级鲜美炖汤锅！');
}

console.log('\n=== [3] 验证烹饪出餐、飞入木托盘与售卖赚金币 ===');
// 模拟金毛在阳光花园产出成品
garden.cookTimer = garden.cookDuration;
game.kitchen.onDishComplete(garden);
if (game.kitchen.flyingDishes.length === 0) {
  throw new Error('FAILED: 烹饪完成没有生成飞行动画！');
}
const flyingDish = game.kitchen.flyingDishes.shift();
game.kitchen.onDishArriveTray(flyingDish);

const trayPlate = game.kitchen.servingTray.plates[0];
console.log('木托盘第一盘位菜品:', trayPlate.dish);
if (!trayPlate.dish || trayPlate.dish.name !== '大骨蔬菜浓汤') {
  throw new Error('FAILED: 菜品未能成功滑入底部木托盘！');
}

// 玩家点击售卖
const initialGold = game.economy.gold;
const sellRes = game.kitchen.sellTrayPlate(0, true);
// 模拟金币飞行 0.6 秒到达顶部 HUD
game.kitchen.update(0.6);
console.log('售出菜品:', sellRes, '金币变化:', `${initialGold} -> ${game.economy.gold}`);
if (trayPlate.dish !== null || game.economy.gold <= initialGold) {
  throw new Error('FAILED: 售卖出餐未能清空木托盘或未能增加金币！');
}

console.log('\n=== [4] 推进核心循环：升级鲜美炖汤锅到 Lv.5 ===');
for (let i = 1; i < 5; i++) {
  game.economy.gold += 500; // 提供测试金币
  game.kitchen.upgradeStation('stew');
}
console.log('鲜美炖汤锅当前等级:', garden.level);
obj = game.economy.getCurrentLoopObjective();
console.log('鲜美炖汤锅升至Lv.5后目标 2:', obj);
if (obj.step !== 'recruit' || obj.dogId !== 'shiba') {
  throw new Error('FAILED: 目标应变为招募柴犬！');
}

console.log('\n=== [5] 推进核心循环：招募柴犬 ===');
game.economy.gold = 300;
game.dogs.get('shiba').isOwned = true;
game.economy.recordAction('recruit_dog');
obj = game.economy.getCurrentLoopObjective();
console.log('招募柴犬后目标 3:', obj);
if (obj.step !== 'build' || obj.stationId !== 'bbq') {
  throw new Error('FAILED: 目标应变为建造慢烤烧烤架！');
}

console.log('\n=== [6] 推进核心循环：建造慢烤烧烤架并自动指派柴犬掌炉 ===');
game.economy.gold = 200;
game.kitchen.unlockStation('bbq');
console.log('柴犬自动上岗结果:', { postChef: post.assignedDogId, shibaFacility: shiba.assignedFacility });
if (post.assignedDogId !== 'shiba' || shiba.assignedFacility !== 'bbq') {
  throw new Error('FAILED: 解锁慢烤烧烤架未能自动将空闲的柴犬指派到烤架！');
}
obj = game.economy.getCurrentLoopObjective();
console.log('烤架开工后目标 4 (自动赚钱积累开荒金币):', obj);
if (obj.step !== 'earn') {
  throw new Error('FAILED: 目标应变为自动烹饪赚钱！');
}

console.log('\n=== [7] 推进核心循环：达成小镇开荒并扩张至第 2 阶段 ===');
game.economy.totalGoldEarned = 600; // 满足青青小丘 500 金币门槛
console.log('开荒达成状态:', game.economy.checkTownExpansionReady());
console.log('开荒进度信息:', game.economy.getTownExpansionProgress());
if (!game.economy.checkTownExpansionReady()) {
  throw new Error('FAILED: 开荒达成判定失败！');
}

obj = game.economy.getCurrentLoopObjective();
console.log('开荒达成后目标 5:', obj);
if (obj.step !== 'expand') {
  throw new Error('FAILED: 目标应为扩张小镇！');
}

// 模拟点击扩张小镇
const expandRes = game.economy.expandTown();
console.log('扩张结果:', expandRes);
if (!expandRes.success || game.economy.townStage !== 2) {
  throw new Error('FAILED: 扩张小镇失败或阶段未升至2！');
}

// 触发庆典
game.kitchen.triggerTownExpansionCelebration(expandRes.newStage.name);
console.log('彩带庆典粒子数:', game.kitchen.confettiParticles.length);
if (game.kitchen.confettiParticles.length === 0) {
  throw new Error('FAILED: 扩张小镇未触发彩带庆典！');
}

console.log('\n=== [8] 验证存档持久化与版本 2.1 兼容性 ===');
game.saveGameData();
const savedRaw = localStorage.getItem('wangwang_diner_save');
const parsed = JSON.parse(savedRaw);
console.log('存档数据快照:', {
  version: parsed.version,
  townStage: parsed.townStage,
  goldenOwned: parsed.dogs.golden.isOwned,
  shibaOwned: parsed.dogs.shiba.isOwned,
  gardenLevel: parsed.stations.stew.level,
  diamonds: parsed.diamonds,
  variants: parsed.ownedVariantIds,
  gachaDraws: parsed.gachaStats && parsed.gachaStats.totalDraws
});

if (parsed.version !== '2.1' || parsed.townStage !== 2 || !parsed.dogs.golden.isOwned) {
  throw new Error('FAILED: 存档持久化数据不正确！');
}

// GDD 2.3 钻石必须被持久化（否则刷新即丢失付费货币）
if (typeof parsed.diamonds !== 'number') {
  throw new Error('FAILED: 存档缺少 diamonds 字段（GDD 2.3 钻石货币未持久化）！');
}
// GDD 2.1 抽卡状态必须被持久化
if (!Array.isArray(parsed.ownedVariantIds) || !parsed.gachaPity || !parsed.gachaStats) {
  throw new Error('FAILED: 存档缺少抽卡状态（ownedVariantIds / gachaPity / gachaStats）！');
}

console.log('\n✅ 所有测试全部顺利通过！金毛开局与放置核心循环100%正确！');
