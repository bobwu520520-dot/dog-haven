/**
 * 第 1 章实现核对 —— 缺口补齐验证测试
 * A. 核心循环首环节：狗狗切食材 (1.3)
 * B. 升级食谱系统 (1.3)
 * C. 收集亮点：犬种 × 毛色 × 饰品 (1.2)
 * D. 迷你游戏：公园散步 / 水里捡球 (1.2)
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
      querySelectorAll: () => [], closest: () => ({ classList: { add: () => {} } })
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

console.log('=== 第 1 章实现核对 · 缺口补齐验证 ===\n');

const game = vm.runInContext('new WangwangGame()', sandbox);

// ---------- A. 切食材 (1.3 核心循环首环节) ----------
console.log('[A] 核心循环首环节：狗狗切食材');
const golden = game.dogs.get('golden');
assert(typeof golden.spawnChopParticles === 'function', 'DogChef.spawnChopParticles() 已实现');
assert(Array.isArray(golden.chopParticles), 'chopParticles 粒子容器已初始化');

golden.assignedFacility = 'garden';
golden.routineState = null;
let chopTriggered = false;
for (let i = 0; i < 60; i++) {
  golden.routineCooldown = 0;
  golden.startNextBehaviorRoutine();
  if (golden.routineState === 'chop_ingredients') { chopTriggered = true; break; }
}
assert(chopTriggered, '在岗狗狗可进入 chop_ingredients 状态', `routineState=${golden.routineState}`);

golden.routineState = 'chop_ingredients';
golden.routineTimer = 1.0;
golden.chopTimer = 0;
for (let i = 0; i < 10; i++) golden.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
assert(golden.chopParticles.length > 0, '切食材产生飞溅碎块粒子', `粒子数=${golden.chopParticles.length}`);
assert(golden.totalChopped >= 1, '累计切食材次数已统计', `totalChopped=${golden.totalChopped}`);
for (let i = 0; i < 40; i++) golden.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
assert(golden.routineState === null, '切食材动作结束后回归正常工作');

// ---------- B. 食谱升级 (1.3) ----------
console.log('\n[B] 升级食谱系统');
assert(typeof game.economy.upgradeRecipe === 'function', 'Economy.upgradeRecipe() 已实现');
assert(typeof game.economy.getRecipePriceBonusForFacility === 'function', 'getRecipePriceBonusForFacility() 已实现');
assert(Object.keys(game.economy.recipeLevels).length === 5, '5 大菜系食谱等级已初始化',
  Object.entries(game.economy.recipeLevels).map(([k, v]) => `${k}:Lv.${v}`).join(' '));

const gardenStation = game.kitchen.stations.stew;
const priceBefore = game.kitchen.calcActualDishPrice(gardenStation);
game.economy.gold = 99999999;
const upRes = game.economy.upgradeRecipe('stew');
assert(upRes.success, '炖汤食谱可升级', upRes.msg);
const priceAfter = game.kitchen.calcActualDishPrice(gardenStation);
assert(priceAfter > priceBefore, '食谱升级后所属设施菜品售价提升', `${priceBefore} → ${priceAfter}`);

const bonus = game.economy.getRecipePriceBonusForFacility('stew');
assert(Math.abs(bonus - 0.08) < 1e-9, 'Lv.2 食谱提供 +8% 售价加成', `bonus=${(bonus * 100).toFixed(1)}%`);

// 未解锁菜系不可升级
const locked = game.economy.upgradeRecipe('jerky');
assert(!locked.success, '未达小镇等级的高阶菜系食谱不可升级', locked.msg);

// 设施 → 菜系映射完整
const mapped = ['stew', 'bbq', 'bake', 'hotpot', 'jerky']
  .map(id => `${id}→${game.kitchen.getFacilityCuisineId(id)}`).join(' ');
assert(['stew', 'bbq', 'bake', 'hotpot', 'jerky']
  .every(id => !!game.kitchen.getFacilityCuisineId(id)), '5 大料理工位均已映射到料理菜系', mapped);

// ---------- C. 毛色收集 (1.2 收集亮点) ----------
console.log('\n[C] 收集亮点：犬种 × 毛色 × 饰品');
const coatCfg = vm.runInContext('COAT_COLORS_CONFIG', sandbox);
const breedsCfg = vm.runInContext('DOG_BREEDS_CONFIG', sandbox);
const totalCoats = Object.values(coatCfg).reduce((s, l) => s + l.length, 0);
// 断言改为「每个犬种都有毛色库」而不是硬编码 8 —— 这样新增犬种时不会误报失败，
// 同时仍然能抓到「加了犬种却忘了配毛色」的真实遗漏。
const breedIds = Object.keys(breedsCfg);
const missingCoat = breedIds.filter(id => !coatCfg[id] || coatCfg[id].length === 0);
assert(missingCoat.length === 0,
  `全部 ${breedIds.length} 个犬种均有毛色库`, `共 ${totalCoats} 款毛色${missingCoat.length ? '；缺: ' + missingCoat.join(',') : ''}`);

const coats = game.wardrobe.getCoatColors('shiba');
assert(coats.length === 3, '柴犬拥有 3 款毛色', coats.map(c => c.name).join('/'));
assert(game.wardrobe.isCoatOwned(coats[0].id), '原生毛色默认已解锁');

const nativeColors = Object.assign({}, golden.config.colors);
const darkCoat = coatCfg.golden.find(c => c.costType === 'bone');
game.economy.bones = 999;
const buyRes = game.wardrobe.buyCoatColor('golden', darkCoat.id);
assert(buyRes.success, '可用骨头解锁稀有毛色', buyRes.msg);
const eqRes = game.wardrobe.equipCoatColor('golden', darkCoat.id);
assert(eqRes.success, '毛色可穿戴', eqRes.msg);
assert(golden.coatColorId === darkCoat.id, 'coatingId 已更新', golden.coatColorId);
const renderColors = golden.getRenderColors();
assert(renderColors.body === darkCoat.colors.body, '渲染配色已被毛色覆盖',
  `${nativeColors.body} → ${renderColors.body}`);
assert(golden.config.colors.body === nativeColors.body, '犬种原生配置未被污染');

game.wardrobe.equipCoatColor('golden', 'default');
assert(golden.coatColorId === 'default' && golden.getRenderColors().body === nativeColors.body, '可恢复原生毛色');

// 三要素齐备：犬种 × 毛色 × 饰品
assert(game.wardrobe.getOutfitsByCategory('hat').length === 10 &&
       game.wardrobe.getOutfitsByCategory('cloth').length === 10 &&
       game.wardrobe.getOutfitsByCategory('acc').length === 10,
  '饰品侧 30 套外观齐备（帽子/衣服/配饰各 10）');
assert(game.wardrobe.allOutfits.some(o => o.render === 'red_scarf') &&
       game.wardrobe.allOutfits.some(o => o.render === 'red_bowtie'),
  '规格点名的「围巾 / 领结」饰品均已存在');

// ---------- D. 迷你游戏补齐 ----------
console.log('\n[D] 迷你游戏：公园散步 / 水里捡球');
const parkCfg = vm.runInContext('PARK_ACTIVITIES_CONFIG', sandbox);
assert(!!parkCfg.parkWalk && !!parkCfg.waterFetch, 'PARK_ACTIVITIES_CONFIG 新增两项玩法配置');

// 公园散步
golden.assignedFacility = null;
golden.routineState = null;
game.kitchen.parkWalkCooldown = 0;
const walkRes = game.kitchen.startParkWalk();
assert(walkRes.success, '公园散步可发起', walkRes.success ? walkRes.dog.name : walkRes.msg);
assert(walkRes.dog.routineState === 'park_walk', '狗狗进入 park_walk 状态');
const goldBeforeWalk = game.economy.gold;
const bonesBeforeWalk = game.economy.bones;
const snacksBeforeWalk = game.economy.snacks;
for (let i = 0; i < 120; i++) {
  walkRes.dog.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
  game.kitchen.update(0.1);
}
assert(walkRes.dog.routineState === null, '散步结束回归空闲');
const walkGained = (game.economy.gold > goldBeforeWalk) || (game.economy.bones > bonesBeforeWalk) || (game.economy.snacks > snacksBeforeWalk);
assert(walkGained, '散步带回伴手礼收益', );
assert(game.kitchen.parkWalkCooldown > 0, '散步冷却已启动');

// 水里捡球
game.kitchen.waterFetchCooldown = 0;
const lab = game.dogs.get('labrador');
lab.isOwned = true;
lab.assignedFacility = null;
lab.routineState = null;
golden.routineState = null;
const waterRes = game.kitchen.startWaterFetch();
assert(waterRes.success, '水里捡球可发起', waterRes.success ? waterRes.dog.name : waterRes.msg);
assert(waterRes.dog.routineState === 'water_dive', '狗狗进入 water_dive 状态');
assert(game.kitchen.activeWaterBalls.length >= 1, '弹力球已入水');
const splashes = game.kitchen.waterSplashes.length;
assert(splashes > 0, '入水瞬间产生水花粒子', `粒子数=${splashes}`);
const goldBeforeWater = game.economy.gold;
for (let i = 0; i < 100; i++) {
  waterRes.dog.update(0.1, { minX: 80, maxX: 920, minY: 90, maxY: 480 });
  game.kitchen.update(0.1);
}
assert(game.economy.gold > goldBeforeWater, '水中捡球结算金币奖励', `${goldBeforeWater} → ${game.economy.gold}`);

// 水性犬加成倍率
const bonusMap = parkCfg.waterFetch.waterLoverBonus;
assert(bonusMap.labrador > bonusMap.default && bonusMap.golden > bonusMap.default,
  '水性犬种享有额外加成', `拉布拉多 ×${bonusMap.labrador} / 金毛 ×${bonusMap.golden}`);

// ---------- E. 存档往返 ----------
console.log('\n[E] 存档往返（毛色 + 食谱等级）');
game.economy.recipeLevels.stew = 4;
const shibaDog = game.dogs.get('shiba');
shibaDog.isOwned = true;
game.wardrobe.buyCoatColor('shiba', coatCfg.shiba[1].id);
game.wardrobe.equipCoatColor('shiba', coatCfg.shiba[1].id);
game.saveGameData();
const rawSave = JSON.parse(sandbox.localStorage.getItem('wangwang_diner_save'));
assert(rawSave.recipeLevels.stew === 4, '食谱等级已写入存档', `stew=Lv.${rawSave.recipeLevels.stew}`);
assert(rawSave.dogs.shiba.coatColorId === coatCfg.shiba[1].id, '毛色已写入存档', rawSave.dogs.shiba.coatColorId);
assert(Array.isArray(rawSave.ownedCoatIds), '毛色解锁集合已写入存档', `${rawSave.ownedCoatIds.length} 款`);

// ---------- F. 渲染烟雾测试 ----------
console.log('\n[F] 渲染烟雾测试（新增绘制路径不抛异常）');
const smokeCtx = mockCanvas.getContext('2d');
let drawOk = true, drawErr = '';
try {
  game.kitchen.draw(smokeCtx);
} catch (e) { drawOk = false; drawErr = e.message; }
assert(drawOk, 'Kitchen.draw() 全流程渲染无异常', drawErr);

// 各特殊状态下的狗狗绘制
const states = [
  { label: '切食材', setup: (d) => { d.routineState = 'chop_ingredients'; d.chopTimer = 0; d.spawnChopParticles(); } },
  { label: '公园散步', setup: (d) => { d.routineState = 'park_walk'; d.isParkWalking = true; } },
  { label: '水里捡球', setup: (d) => { d.routineState = 'water_dive'; d.isWaterFetching = true; d.waterBall = { x: d.x + 20, y: d.y }; } },
  { label: '稀有毛色', setup: (d) => { d.setCoatColor('coat_golden_3', coatCfg.golden[2]); } },
  { label: '木门守候', setup: (d) => { d.waitAtGate(); } }
];
let dogDrawOk = true, dogDrawErr = '';
for (const st of states) {
  try {
    st.setup(golden);
    golden.draw(smokeCtx);
  } catch (e) { dogDrawOk = false; dogDrawErr = `[${st.label}] ${e.message}`; break; }
}
assert(dogDrawOk, '狗狗全部新增状态绘制无异常', dogDrawErr);
golden.routineState = null;
golden.setCoatColor('default', null);

// 新增 UI 渲染
let uiOk = true, uiErr = '';
try {
  game.renderCoatColorItems(getOrCreateElem('probe'), golden);
  game.renderDogpediaModal();
  game.renderWardrobeItems('coat');
} catch (e) { uiOk = false; uiErr = e.message; }
assert(uiOk, '毛色页签与图鉴(含食谱升级)UI 渲染无异常', uiErr);

console.log(`\n=== 结果：${passCount} 通过 / ${failCount} 失败 ===`);
if (failCount > 0) process.exit(1);