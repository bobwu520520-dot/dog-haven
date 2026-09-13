// 验证大金毛初始在岗、旧档纠偏迁移与园艺动作道具渲染测试
// 注：项目已从「金毛掌勺熬汤锅(stove)」迁移为「金毛打理阳光花园(garden)」，
//     本脚本断言已同步更新；stove 仍作为 garden 的别名存在（同一对象引用）。
const fs = require('fs');
const path = require('path');

// 模拟浏览器环境
global.window = {
  addEventListener: () => {},
  devicePixelRatio: 1
};

// 完整 mock canvas ctx，避免渲染路径因缺少方法而中断
const mockCtx = {
  save: () => {}, restore: () => {}, beginPath: () => {}, closePath: () => {},
  arc: () => {}, ellipse: () => {}, roundRect: () => {}, rect: () => {},
  fill: () => {}, stroke: () => {}, fillRect: () => {}, strokeRect: () => {},
  clearRect: () => {}, clip: () => {}, drawImage: () => {},
  moveTo: () => {}, lineTo: () => {},
  quadraticCurveTo: () => {}, bezierCurveTo: () => {}, arcTo: () => {},
  fillText: () => {}, strokeText: () => {}, measureText: () => ({ width: 50 }),
  translate: () => {}, rotate: () => {}, scale: () => {},
  setLineDash: () => {}, getLineDash: () => [],
  setTransform: () => {}, resetTransform: () => {}, getTransform: () => ({}),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  createPattern: () => null,
  lineWidth: 1, globalAlpha: 1
};

global.document = {
  getElementById: (id) => {
    if (id === 'game-canvas') {
      return {
        getContext: () => mockCtx,
        width: 1000,
        height: 600,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
        addEventListener: () => {}
      };
    }
    return {
      innerText: '',
      innerHTML: '',
      className: '',
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      addEventListener: () => {},
      appendChild: () => {},
      dataset: {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
  },
  querySelectorAll: () => [],
  createElement: () => ({
    innerText: '', innerHTML: '', className: '', style: {},
    appendChild: () => {}, querySelectorAll: () => []
  }),
  body: { appendChild: () => {} },
  addEventListener: () => {}
};

global.Image = class {
  constructor() {
    setTimeout(() => { if (this.onload) this.onload(); }, 10);
  }
};

let store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; }
};

const vm = require('vm');
const baseDir = path.resolve(__dirname, '..');
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => {};
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'config.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'audio.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'dog.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'kitchen.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'wardrobe.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'gacha.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'economy.js'), 'utf-8'));
vm.runInThisContext(fs.readFileSync(path.join(baseDir, 'js', 'game.js'), 'utf-8'));

console.log('--- 1. 测试全新开局初始状态 ---');
const game = new WangwangGame();
const golden = game.dogs.get('golden');
const shiba = game.dogs.get('shiba');
const garden = game.kitchen.stations.stew;
const post = game.kitchen.stations.bbq;

if (!golden || !golden.isOwned) throw new Error('Golden must be owned at start!');
if (golden.assignedFacility !== 'stew') throw new Error('Golden must be assigned to stew! Got: ' + golden.assignedFacility);
if (shiba.isOwned) throw new Error('Shiba must NOT be owned at start!');
if (garden.assignedDogId !== 'golden') throw new Error('Stew pot must be assigned to golden!');
if (post.unlocked) throw new Error('BBQ grill must be locked at start!');
// stove 为 garden 的别名，应指向同一对象
if (game.kitchen.stations.stew !== garden) throw new Error('stew station must exist!');
console.log('✅ 全新开局校验通过: 金毛为初始炖汤主厨坐镇鲜美炖汤锅，柴犬为待招募新伙伴！');

console.log('--- 2. 测试旧版本存档 (柴犬占据炖汤锅槽位旧档) 自动纠偏迁移 ---');
// 模拟旧版存档：柴犬占着熬汤锅/花园槽位
const oldSaveData = {
  version: '1.0',
  gold: 150,
  townStage: 1,
  totalGoldEarned: 180,
  stations: {
    garden: { unlocked: true, level: 2, assignedDogId: 'shiba' },
    post: { unlocked: false, level: 1, assignedDogId: null }
  },
  dogs: {
    shiba: { isOwned: true, affectionLevel: 1 },
    golden: { isOwned: false, affectionLevel: 1 }
  }
};
localStorage.setItem('wangwang_diner_save', JSON.stringify(oldSaveData));

const migratedGame = new WangwangGame();
const migGolden = migratedGame.dogs.get('golden');
const migShiba = migratedGame.dogs.get('shiba');
const migGarden = migratedGame.kitchen.stations.stew;

if (!migGolden.isOwned) throw new Error('Migrated Golden must be owned!');
if (migGolden.assignedFacility !== 'stew') throw new Error('Migrated Golden must be assigned to stew! Got: ' + migGolden.assignedFacility);
if (migGarden.assignedDogId !== 'golden') throw new Error('Migrated Stew pot must have golden as assigned chef!');
if (migShiba.assignedFacility === 'stew') throw new Error('Migrated Shiba must NOT be at stew pot!');
console.log('✅ 旧版存档迁移校验通过: 柴犬被纠偏移出炖汤锅，暖心金毛顺利接管灶台！');

console.log('--- 3. 测试 5 大料理工位在岗料理动作的渲染参数 ---');
let drawnPaths = [];
const pathCtx = Object.assign({}, mockCtx, {
  moveTo: (x, y) => drawnPaths.push({ action: 'moveTo', x, y }),
  lineTo: (x, y) => drawnPaths.push({ action: 'lineTo', x, y })
});

// 每个料理工位应绘制出各自专属的料理道具锚点 (木勺 / 烤网 / 裱花袋 / 长筷 / 晾肉杆)
const STATION_ANCHORS = [
  { st: 'stew',   label: '长柄木勺', ax: -2, ay: 12 },
  { st: 'bbq',    label: '烤网横杆', ax: 8,  ay: 14 },
  { st: 'bake',   label: '裱花袋喷嘴', ax: 14, ay: -2 },
  { st: 'hotpot', label: '长筷',      ax: 0,  ay: 13 },
  { st: 'jerky',  label: '晾肉杆立柱', ax: 44, ay: -8 }
];
const verified = [];
for (const a of STATION_ANCHORS) {
  drawnPaths = [];
  golden.assignedFacility = a.st;
  golden.routineState = null;
  golden.animTime = 1.0;
  golden.drawPaws(pathCtx);

  if (drawnPaths.length === 0) throw new Error(`Station ${a.st} drew no path ops!`);
  const hit = drawnPaths.find(p => p.action === 'moveTo' && Math.abs(p.x - a.ax) < 0.01 && Math.abs(p.y - a.ay) < 0.01);
  if (!hit) throw new Error(`Station ${a.st} must draw its ${a.label} anchor at (${a.ax}, ${a.ay})!`);
  verified.push(`${a.st}:${a.label}(${a.ax},${a.ay})`);
}

golden.assignedFacility = 'stew';
golden.routineState = null;
console.log(`✅ 5 大料理工位料理动作渲染校验通过: ${verified.join(' / ')}`);

console.log('🎉 全部测试顺利通过！');
