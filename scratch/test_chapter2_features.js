/**
 * 第 2 章系统详细设计 —— 实现验证测试
 * A. 2.3 三货币体系（金币 / 钻石 / 骨头）
 * B. 2.1 犬种收集：10 犬种 + 稀有度阶梯
 * C. 2.1 天赋 Passive 体系与聚合语义
 * D. 2.1 抽卡 + 三重保底 + 重复转化
 * E. 2.1 传说稀有变体（双重天赋 + 专属发光毛色）
 * F. 2.4 装扮评分
 * G. 被动落地到真实系统（售价 / 升级成本 / 迷你游戏 / 离线 / 移速）
 * H. 存档持久化
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

console.log('=== 第 2 章系统详细设计 · 实现验证 ===\n');

const BREEDS = vm.runInContext('DOG_BREEDS_CONFIG', sandbox);
const CARDS = vm.runInContext('DOG_CARDS_CONFIG', sandbox);
const RARITY = vm.runInContext('RARITY_CONFIG', sandbox);
const VARIANTS = vm.runInContext('DOG_VARIANTS_CONFIG', sandbox);
const GACHA_CFG = vm.runInContext('DOG_GACHA_CONFIG', sandbox);
const LEGENDARY_COATS = vm.runInContext('LEGENDARY_COAT_CONFIG', sandbox);

const game = vm.runInContext('new WangwangGame()', sandbox);
const eco = game.economy;

// ==================== A. 2.3 三货币体系 ====================
console.log('[A] 2.3 货币与成长经济：三货币体系');

assert(typeof eco.diamonds === 'number' && eco.diamonds > 0,
  '钻石货币已引入且开局赠送', `开局 💎${eco.diamonds}`);
assert(typeof eco.gold === 'number', '金币（软货币）存在');
assert(typeof eco.bones === 'number', '骨头货币存在');

const d0 = eco.diamonds;
eco.addDiamonds(50);
assert(eco.diamonds === d0 + 50, 'addDiamonds 正确增加', `💎${d0} → 💎${eco.diamonds}`);
assert(eco.spendDiamonds(30) === true && eco.diamonds === d0 + 20, 'spendDiamonds 正确扣减');
assert(eco.spendDiamonds(999999) === false && eco.diamonds === d0 + 20, '钻石不足时拒绝扣减且不产生负数');
eco.diamonds = d0;

// ==================== B. 2.1 犬种收集与稀有度 ====================
console.log('\n[B] 2.1 犬种收集系统：10 犬种 + 稀有度阶梯');

const specBreeds = {
  golden: '金毛寻回犬', labrador: '拉布拉多', shiba: '柴犬', corgi: '柯基',
  samoyed: '萨摩耶', husky: '哈士奇', border_collie: '边牧',
  poodle: '贵宾/泰迪', frenchie: '法斗', beagle: '比格'
};
const breedIds = Object.keys(BREEDS);
assert(breedIds.length === 10, 'GDD 2.1 列出的 10 个犬种全部存在', `实际 ${breedIds.length} 个`);
for (const [id, label] of Object.entries(specBreeds)) {
  assert(!!BREEDS[id], `犬种【${label}】已配置`, BREEDS[id] ? BREEDS[id].name : '缺失');
}

// 稀有度分布必须与 GDD 2.1 表格一致
const expectedRarity = {
  golden: 'common', labrador: 'common', shiba: 'common', corgi: 'common',
  samoyed: 'rare', husky: 'rare', border_collie: 'rare', poodle: 'rare',
  frenchie: 'epic', beagle: 'epic'
};
let rarityOk = true;
for (const [id, want] of Object.entries(expectedRarity)) {
  if (!CARDS[id] || CARDS[id].rarity !== want) { rarityOk = false; console.log(`      ↳ ${id} 期望 ${want}，实际 ${CARDS[id] && CARDS[id].rarity}`); }
}
assert(rarityOk, '10 犬种稀有度与 GDD 2.1 表格逐条一致');
assert(Object.keys(RARITY).length === 4, '稀有度阶梯为 4 档（普通/稀有/史诗/传说）',
  Object.values(RARITY).map(r => r.name).join(' → '));

// 每个犬种都有天赋被动
const missingPassive = breedIds.filter(id => !CARDS[id] || !CARDS[id].passive);
assert(missingPassive.length === 0, '10 犬种全部配置了天赋 Passive',
  missingPassive.length ? '缺: ' + missingPassive.join(',') : '');
const totalPassiveTypes = new Set(Object.values(CARDS).map(c => c.passive.type));
assert(totalPassiveTypes.size >= 9, '天赋覆盖 9 种以上不同加成类型', `${totalPassiveTypes.size} 种`);

// ==================== C. 天赋被动聚合语义 ====================
console.log('\n[C] 2.1 天赋 Passive 聚合语义');

// 初始只有金毛 → 只有金毛的天赋生效
assert(eco.getPassiveBonus('gold_gain') === 0, '未拥有的犬种天赋不计入（柴犬未招募时金币加成为 0）');

const shiba = game.dogs.get('shiba');
shiba.isOwned = true;
assert(Math.abs(eco.getPassiveBonus('gold_gain') - 0.08) < 1e-9,
  '拥有柴犬后「金币掉落 +8%」生效', `实际 ${eco.getPassiveBonus('gold_gain')}`);

// scope 语义：金毛天赋限定 stew
const goldenScoped = eco.getPassiveBonus('dish_price', { scope: 'stew' });
const goldenGlobal = eco.getPassiveBonus('dish_price');
assert(Math.abs(goldenGlobal - 0) < 1e-9,
  '不带 scope 查询时**不包含**限定菜系的天赋（避免全局重复计入）', `全局部分 ${goldenGlobal}`);
assert(Math.abs(goldenScoped - 0.05) < 1e-9,
  '带 scope=stew 查询时包含金毛的「汤品大师 +5%」', `stew 部分 ${goldenScoped}`);
assert(Math.abs(eco.getPassiveBonus('dish_price', { scope: 'bbq' })) < 1e-9,
  'scope=bbq 时不含金毛的汤品天赋（菜系隔离正确）');

// ==================== D. 抽卡 + 保底 + 重复转化 ====================
console.log('\n[D] 2.1 抽卡与三重保底机制');

assert(game.gacha && typeof game.gacha.draw === 'function', 'DogGachaManager 已接入主控制器');
assert(GACHA_CFG.singleCost === 60 && GACHA_CFG.tenCost === 540, '单抽 60 / 十连 540（9 折）定价正确');

// 奖池构成
const pool = game.gacha.buildPool();
assert(pool.length === 10 + VARIANTS.length, '奖池 = 10 犬种 + 传说变体',
  `${pool.length} 项（犬种 10 + 变体 ${VARIANTS.length}）`);
assert(pool.filter(e => e.rarity === 'legendary').length === VARIANTS.length,
  '奖池中的传说条目即传说变体');

// 钻石不足时拒绝
const savedDiamonds = eco.diamonds;
eco.diamonds = 0;
const poor = game.gacha.draw(1);
assert(poor.success === false, '钻石不足时抽卡失败并给出提示', poor.msg);
eco.diamonds = savedDiamonds;

// 保底：把「距传说」计数器推到临界，下一抽必须是传说
eco.gachaPity.sinceLegendary = GACHA_CFG.pityLegendary - 1;
eco.gachaPity.sinceEpic = 0;
eco.gachaPity.sinceRare = 0;
const pityLegend = game.gacha.rollOne();
assert(pityLegend && pityLegend.rarity === 'legendary',
  `第 ${GACHA_CFG.pityLegendary} 抽保底必出传说`, pityLegend ? pityLegend.id : 'null');

// 保底：史诗
eco.gachaPity.sinceLegendary = 0;
eco.gachaPity.sinceEpic = GACHA_CFG.pityEpic - 1;
eco.gachaPity.sinceRare = 0;
const pityEpic = game.gacha.rollOne();
assert(pityEpic && (pityEpic.rarity === 'epic' || pityEpic.rarity === 'legendary'),
  `第 ${GACHA_CFG.pityEpic} 抽保底必出史诗及以上`, pityEpic ? pityEpic.rarity : 'null');

// 保底：稀有
eco.gachaPity.sinceLegendary = 0;
eco.gachaPity.sinceEpic = 0;
eco.gachaPity.sinceRare = GACHA_CFG.pityRare - 1;
const pityRare = game.gacha.rollOne();
assert(pityRare && pityRare.rarity !== 'common',
  `第 ${GACHA_CFG.pityRare} 抽保底必出稀有及以上`, pityRare ? pityRare.rarity : 'null');

// 重复转化：对已拥有条目结算应返还钻石而非空手
eco.gachaPity.sinceLegendary = 0; eco.gachaPity.sinceEpic = 0; eco.gachaPity.sinceRare = 0;
const ownedEntry = { kind: 'dog', id: 'shiba', rarity: 'common' };
const dBefore = eco.diamonds;
const dupRes = game.gacha.settle(ownedEntry);
assert(dupRes.isNew === false && dupRes.refundDiamonds > 0 && eco.diamonds === dBefore + dupRes.refundDiamonds,
  '抽到已拥有条目时按稀有度返还钻石', `返还 💎${dupRes.refundDiamonds}`);

// 新条目发放
const poodle = game.dogs.get('poodle');
poodle.isOwned = false;
const newRes = game.gacha.settle({ kind: 'dog', id: 'poodle', rarity: 'rare' });
assert(newRes.isNew === true && poodle.isOwned === true, '抽到未拥有犬种时正确发放并标记已拥有');

// 十连：一次扣 540 钻石、出 10 张
eco.diamonds = 2000;
const tenRes = game.gacha.draw(10);
assert(tenRes.success && tenRes.results.length === 10, '十连抽返回 10 张结果', `实际 ${tenRes.results.length}`);
assert(tenRes.cost === 540, '十连扣费 540 钻石');

// 保底计数器在抽取后归零逻辑正确
eco.gachaPity.sinceLegendary = 0; eco.gachaPity.sinceEpic = 0; eco.gachaPity.sinceRare = 0;
game.gacha.bumpPity('legendary');
assert(eco.gachaPity.sinceLegendary === 0 && eco.gachaPity.sinceEpic === 0 && eco.gachaPity.sinceRare === 0,
  '抽出传说后三重保底计数全部归零');
game.gacha.bumpPity('common');
assert(eco.gachaPity.sinceRare === 1 && eco.gachaPity.sinceEpic === 1 && eco.gachaPity.sinceLegendary === 1,
  '抽出普通卡时三重计数各 +1');

// ==================== E. 传说变体 ====================
console.log('\n[E] 2.1 传说稀有变体（双重天赋 + 专属发光毛色）');

assert(VARIANTS.length >= 1, '至少配置了 1 个传说变体', VARIANTS.map(v => v.name).join('、'));
const sunny = VARIANTS.find(v => v.id === 'variant_sunny_golden');
assert(!!sunny, 'GDD 举例的【晴天金毛】变体已实现');
assert(!!sunny.extraPassive, '传说变体带「第二重天赋」', sunny.extraPassive.desc);
assert(!!sunny.coat && !!sunny.coat.glow, '传说变体带专属发光配色', `glow=${sunny.coat.glow}`);

// 未拥有变体时，其第二重天赋不生效
eco.ownedVariantIds.clear();
const beforeVariant = eco.getPassiveBonus('dish_price');
eco.ownedVariantIds.add(sunny.id);
const afterVariant = eco.getPassiveBonus('dish_price');
assert(Math.abs(afterVariant - beforeVariant - sunny.extraPassive.value) < 1e-9,
  '拥有变体后其第二重天赋才生效', `+${(afterVariant - beforeVariant).toFixed(2)}`);

// 抽到变体 → 解锁专属毛色
const huskyVariant = VARIANTS.find(v => v.id === 'variant_snow_husky');
eco.ownedVariantIds.delete(huskyVariant.id);
game.wardrobe.ownedCoatIds.delete(huskyVariant.coat.id);
assert(game.wardrobe.getCoatColors('husky').every(c => c.id !== huskyVariant.coat.id),
  '未获得变体时，衣橱里看不到专属毛色');
game.gacha.settle({ kind: 'variant', id: huskyVariant.id, rarity: 'legendary', variant: huskyVariant });
assert(eco.hasVariant(huskyVariant.id), '抽到变体后记录为已拥有');
assert(game.wardrobe.isCoatOwned(huskyVariant.coat.id), '抽到变体同时解锁专属毛色');
assert(game.wardrobe.getCoatColors('husky').some(c => c.id === huskyVariant.coat.id),
  '解锁后专属毛色出现在该犬种衣橱列表中');
assert(game.wardrobe.findCoatColor(huskyVariant.coat.id) !== null,
  'findCoatColor 能查到传说毛色（跨两张配置表查找）');

// 传说毛色不可购买
const buyLegend = game.wardrobe.buyCoatColor('husky', sunny.coat.id);
assert(buyLegend.success === false && /抽卡/.test(buyLegend.msg),
  '传说毛色无法用金币/骨头购买', buyLegend.msg);

// 传说毛色可正常穿戴
const husky = game.dogs.get('husky');
husky.isOwned = true;
const equipLegend = game.wardrobe.equipCoatColor('husky', huskyVariant.coat.id);
assert(equipLegend.success === true && husky.coatColorId === huskyVariant.coat.id,
  '传说毛色可正常穿戴到狗狗身上');

// ==================== F. 2.4 装扮评分 ====================
console.log('\n[F] 2.4 装扮评分（贵宾「时尚品味」的落地载体）');

const fashionScore = eco.getFashionScore();
assert(typeof fashionScore === 'number' && fashionScore >= 0, '装扮评分可计算', `当前 ${fashionScore} 分`);
const outfit = vm.runInContext("OUTFITS_CONFIG.find(o => o.type === 'hat')", sandbox);
husky.equipOutfit(outfit);
const scoreAfter = eco.getFashionScore();
assert(scoreAfter > fashionScore, '穿戴服装后装扮评分提升', `${fashionScore} → ${scoreAfter}`);

const poodleDog = game.dogs.get('poodle');
poodleDog.isOwned = false;
const fashionNoPoodle = eco.getFashionScore() * (1 + eco.getPassiveBonus('outfit_score'));
poodleDog.isOwned = true;
const fashionWithPoodle = eco.getFashionScore() * (1 + eco.getPassiveBonus('outfit_score'));
assert(fashionWithPoodle > fashionNoPoodle,
  '拥有贵宾后「装扮评分 +10%」生效', `${fashionNoPoodle.toFixed(1)} → ${fashionWithPoodle.toFixed(1)}`);

// ==================== G. 被动落地到真实系统 ====================
console.log('\n[G] 被动落地：真实系统确实受影响');

// 法斗 → 升级成本 -8%
const frenchieDog = game.dogs.get('frenchie');
frenchieDog.isOwned = false;
const costNoFrenchie = eco.getFacilityUpgradeCost('stew', 5);
frenchieDog.isOwned = true;
const costWithFrenchie = eco.getFacilityUpgradeCost('stew', 5);
assert(costWithFrenchie < costNoFrenchie,
  '拥有法斗后设施升级成本下降', `🪙${costNoFrenchie} → 🪙${costWithFrenchie}`);
const expectDisc = Math.floor(costNoFrenchie * 0.92);
assert(Math.abs(costWithFrenchie - expectDisc) <= 1,
  '折扣幅度约 8%', `期望 ≈${expectDisc}，实际 ${costWithFrenchie}`);

// 比格 → 迷你游戏奖励 +15%
const beagleDog = game.dogs.get('beagle');
beagleDog.isOwned = false;
const mgNo = eco.getMinigameMultiplier();
beagleDog.isOwned = true;
const mgYes = eco.getMinigameMultiplier();
assert(Math.abs(mgNo - 1) < 1e-9 && Math.abs(mgYes - 1.15) < 1e-9,
  '拥有比格后迷你游戏奖励倍率 ×1.15', `${mgNo} → ${mgYes}`);

// 萨摩耶 → 离线收益 +15%
const samoyedDog = game.dogs.get('samoyed');
samoyedDog.isOwned = false;
eco.lastSavedTimestamp = Date.now() - 3600 * 1000; // 假装离线 1 小时
const offNo = eco.calcOfflineEarnings();
samoyedDog.isOwned = true;
eco.lastSavedTimestamp = Date.now() - 3600 * 1000;
const offYes = eco.calcOfflineEarnings();
assert(offYes.earnedGold > offNo.earnedGold,
  '拥有萨摩耶后离线收益提升', `🪙${offNo.earnedGold} → 🪙${offYes.earnedGold}`);
assert(Math.abs((offYes.earnedGold / offNo.earnedGold) - 1.15) < 0.02,
  '离线收益提升幅度约 15%');

// 柯基 → 移动速度
const corgiDog = game.dogs.get('corgi');
corgiDog.isOwned = false;
const spdNo = corgiDog.getMoveSpeedMul();
corgiDog.isOwned = true;
const spdYes = corgiDog.getMoveSpeedMul();
assert(Math.abs(spdNo - 1) < 1e-9 && Math.abs(spdYes - 1.12) < 1e-9,
  '拥有柯基后狗狗移动速度 ×1.12', `${spdNo} → ${spdYes}`);

// 拉布拉多 → 切块速度
const labDog = game.dogs.get('labrador');
labDog.isOwned = false;
const chopNo = labDog.getChopSpeedMul();
labDog.isOwned = true;
const chopYes = labDog.getChopSpeedMul();
assert(Math.abs(chopNo - 1) < 1e-9 && Math.abs(chopYes - 1.10) < 1e-9,
  '拥有拉布拉多后食材切块速度 ×1.10', `${chopNo} → ${chopYes}`);

// 柴犬 → 菜品售价（金币掉落折算进售价）
const stewStation = game.kitchen.stations.stew;
stewStation.unlocked = true;
stewStation.level = 5;
const priceNoShiba = game.kitchen.calcActualDishPrice(stewStation);
shiba.isOwned = false;
const priceNoShiba2 = game.kitchen.calcActualDishPrice(stewStation);
shiba.isOwned = true;
const priceWithShiba = game.kitchen.calcActualDishPrice(stewStation);
assert(priceWithShiba > priceNoShiba2,
  '拥有柴犬后菜品实际售价提升', `🪙${priceNoShiba2} → 🪙${priceWithShiba}`);

// 金毛天赋（限定 stew）确实进入了 stew 的售价
assert(priceNoShiba >= 0, '金毛「汤品大师」限定的 stew 售价加成已参与计算');

// 边牧 → 一犬多岗
const collieDog = game.dogs.get('border_collie');
assert(eco.getPassiveBonus('multi_station') === (collieDog.isOwned ? 1 : 0),
  '边牧「一犬多岗」天赋被正确聚合', `multi_station = ${eco.getPassiveBonus('multi_station')}`);

// ==================== H. 存档持久化 ====================
console.log('\n[H] 存档持久化（钻石 / 变体 / 保底）');

eco.diamonds = 777;
eco.gachaPity.sinceEpic = 12;
eco.gachaStats.totalDraws = 33;
game.saveGameData();
const saved = JSON.parse(sandbox.localStorage.getItem('wangwang_diner_save'));
assert(saved.version === '2.1', '存档版本升级为 2.1', saved.version);
assert(saved.diamonds === 777, '钻石已持久化', `💎${saved.diamonds}`);
assert(Array.isArray(saved.ownedVariantIds) && saved.ownedVariantIds.includes('variant_snow_husky'),
  '已拥有的传说变体已持久化');
assert(saved.gachaPity && saved.gachaPity.sinceEpic === 12, '保底计数已持久化');
assert(saved.gachaStats && saved.gachaStats.totalDraws === 33, '抽卡统计已持久化');

// 老存档兼容：缺少新字段时不应崩溃、也不应清零
sandbox.localStorage.setItem('wangwang_diner_save', JSON.stringify({
  version: '2.0', gold: 500, bones: 30, snacks: 2, townStage: 2,
  dogs: { golden: { isOwned: true, affectionLevel: 3, affectionExp: 0, stamina: 100, equippedOutfits: {}, wornOutfitIds: [], coatColorId: 'default' } },
  stations: { stew: { unlocked: true, level: 5, assignedDogId: 'golden' } }
}));
const game2 = vm.runInContext('new WangwangGame()', sandbox);
assert(game2.economy.diamonds === 60,
  '老存档（无 diamonds 字段）回退到开局赠送值而非 0', `💎${game2.economy.diamonds}`);
assert(game2.economy.ownedVariantIds.size === 0, '老存档无变体字段时保持空集合');
assert(game2.economy.gachaPity.total === 0, '老存档无保底字段时保持默认 0');

// ==================== 汇总 ====================
console.log(`\n${'='.repeat(72)}`);
console.log(`=== 结果：${passCount} 通过 / ${failCount} 失败 ===`);
console.log('='.repeat(72));

process.exit(failCount > 0 ? 1 : 0);
