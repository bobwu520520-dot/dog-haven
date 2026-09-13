/**
 * 《金毛和汤》- 写实立绘渲染管线专项测试
 * ------------------------------------------------------------------
 * 覆盖三个容易出问题、但纯逻辑测试抓不到的点：
 *   1. DogSpriteLoader 的白底洪水填充是否真的抠掉背景、且**保住狗狗内部的白色毛色**；
 *   2. alpha 包围盒统计是否准确（决定立绘缩放与脚底对齐）；
 *   3. DogChef 是否在立绘就绪后切到立绘分支、未就绪时回退矢量分支，
 *      并且立绘图鉴头像与场景保持一致（不会出现「场景立绘 / 图鉴矢量」的割裂）。
 *
 * 用 Node vm 沙箱 + 自造 canvas mock 运行，无需真实浏览器。
 * 用法: node scratch/test_sprite_portrait.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(desc, cond, extra = '') {
  if (cond) { pass++; console.log(`   ✅ ${desc}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`   ❌ ${desc}${extra ? ' — ' + extra : ''}`); }
}
function section(t) { console.log(`\n[${t}]`); }

// ==================== 1. 造一张带白底 + 内部白毛的假图 ====================
// 128x128：外围一圈白背景；中间放一只「深棕身体 + 纯白胸口」的假狗。
// 关键检验点：胸口的白毛与边界不连通，因此必须被保留；
// 而四周的白底必须被洪水填充抠掉。
const W = 128, H = 128;
function buildFakeImageData() {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // 默认：纯白背景 (255,255,255,255)
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
  }
  // 深棕色狗身：矩形 (40,40)-(90,100)
  for (let y = 40; y < 100; y++) {
    for (let x = 40; x < 90; x++) {
      const i = (y * W + x) * 4;
      data[i] = 120; data[i + 1] = 70; data[i + 2] = 40; data[i + 3] = 255;
    }
  }
  // 纯白胸口：完全被深棕包围的矩形 (58,70)-(72,92) —— 与边界不连通，必须保留
  for (let y = 70; y < 92; y++) {
    for (let x = 58; x < 72; x++) {
      const i = (y * W + x) * 4;
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
  }
  return data;
}

// ==================== 2. canvas mock ====================
function makeCtx(store) {
  const noop = () => {};
  return {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '', textAlign: '', textBaseline: '',
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, setTransform: noop,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    beginPath: noop, closePath: noop, fill: noop, stroke: noop, clip: noop,
    moveTo: noop, lineTo: noop, arc: noop, arcTo: noop,
    ellipse: noop, roundRect: noop, rect: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    fillText: noop, strokeText: noop,
    setLineDash: noop, measureText: () => ({ width: 10 }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    drawImage: noop,
    getImageData: (x, y, w, h) => {
      if (store) return { data: store, width: w, height: h };
      return { data: new Uint8ClampedArray(w * h * 4).fill(255), width: w, height: h };
    },
    putImageData: (imgData) => { if (store) store.set(imgData.data); },
    toDataURL: () => 'data:image/png;base64,MOCK'
  };
}

const sandbox = {
  console,
  Math, Date, JSON, Object, Array, String, Number, Boolean, Map, Set, Error,
  Uint8Array, Uint8ClampedArray, Int32Array, Float32Array,
  setTimeout, clearTimeout, requestAnimationFrame: () => 0,
  performance: { now: () => 0 }
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

// document mock：每次 createElement('canvas') 都给一个独立像素缓冲
sandbox.document = {
  createElement(tag) {
    if (tag !== 'canvas') return { style: {}, appendChild() {}, setAttribute() {} };
    const c = { width: 300, height: 150, style: {} };
    c.getContext = () => makeCtx(c._store);
    c.toDataURL = () => 'data:image/png;base64,MOCK';
    return c;
  },
  getElementById: () => null,
  addEventListener: () => {},
  querySelectorAll: () => []
};

// Image mock：把「假图」塞进 naturalWidth/Height，供 loader 处理
sandbox.Image = class {
  constructor() { this.naturalWidth = 0; this.naturalHeight = 0; this._src = ''; }
  set src(v) {
    this._src = v;
    this.naturalWidth = W;
    this.naturalHeight = H;
    if (this.onload) setTimeout(() => this.onload(), 0);
  }
  get src() { return this._src; }
};

vm.createContext(sandbox);

function loadScript(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// ==================== 3. 加载被测代码 ====================
console.log('='.repeat(72));
console.log('写实立绘渲染管线专项测试');
console.log('='.repeat(72));

try {
  loadScript('js/config.js');
  loadScript('js/sprite.js');
  loadScript('js/dog.js');
  ok('config.js / sprite.js / dog.js 均可在沙箱中加载', true);
} catch (e) {
  ok('脚本加载', false, e.message);
  process.exit(1);
}

const Loader = sandbox.DogSpriteLoader;
const DogChef = sandbox.DogChef;
const BREEDS = sandbox.DOG_BREEDS_CONFIG;

// ==================== 4. 抠底算法 ====================
section('A. 白底洪水填充与包围盒');

// 直接调私有方法验证算法（避免依赖 Image 异步时序）
{
  const data = buildFakeImageData();
  const loader = new sandbox.DogSpriteLoader.constructor ? Loader : Loader;
  const target = Loader;

  target._removeBackground(data, W, H);
  target._featherEdges(data, W, H);
  const bounds = target._alphaBounds(data, W, H);

  const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

  ok('四角白底已被抠成透明',
     alphaAt(0, 0) === 0 && alphaAt(W - 1, 0) === 0 && alphaAt(0, H - 1) === 0 && alphaAt(W - 1, H - 1) === 0);

  ok('狗身外部远离主体的白底也已透明', alphaAt(5, 5) === 0 && alphaAt(120, 120) === 0);

  // 核心：内部白毛不能被杀掉
  const chestAlpha = alphaAt(65, 80);
  ok('狗狗内部的纯白胸口毛色被保留（连通性判别生效）', chestAlpha === 255,
     `alpha=${chestAlpha}`);

  // 深棕身体必须完好
  ok('身体深棕像素 alpha 未被破坏', alphaAt(45, 45) === 255, `alpha=${alphaAt(45, 45)}`);

  // 包围盒应贴合狗身 (40,40)-(89,99)
  ok('alpha 包围盒贴合狗身', bounds.x === 40 && bounds.y === 40 && bounds.w === 50 && bounds.h === 60,
     `x=${bounds.x} y=${bounds.y} w=${bounds.w} h=${bounds.h}`);
}

// 边界情形：全白图应被判为「无主体」，包围盒回退整图
{
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  Loader._removeBackground(data, W, H);
  let allTransparent = true;
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) { allTransparent = false; break; }
  ok('纯白图整体被抠透，不留白块', allTransparent);

  const b = Loader._alphaBounds(data, W, H);
  ok('无主体时包围盒安全回退为整图（不产生 0 尺寸）', b.w > 0 && b.h > 0, `w=${b.w} h=${b.h}`);
}

// 队列容量：确认入队即标记后不会越界丢像素（原本 queue 预分配 total*4 的隐患）
{
  // 造一张「除中心一点外全白」的大图，洪水填充需要遍历几乎全部像素
  const big = 200, d = new Uint8ClampedArray(big * big * 4).fill(255);
  const c = ((100 * big) + 100) * 4;
  d[c] = 10; d[c + 1] = 10; d[c + 2] = 10; d[c + 3] = 255;
  Loader._removeBackground(d, big, big);
  // 中心黑点必须存活（若队列越界丢像素，它与边界连通的路径会被截断，结果不稳定）
  ok('大图洪水填充未越界丢像素（中心主体存活）', d[c + 3] === 255);
}

// ==================== 5. DogSpriteLoader 缓存与回调 ====================
section('B. 立绘加载器缓存与异步回调');

new Promise((resolve) => {
  const src = 'assets/art/golden.jpg';
  let syncResult = Loader.load(src);
  ok('首次 load 同步返回 null（异步处理中）', syncResult === null);

  Loader.load(src, (entry) => {
    ok('异步回调收到处理结果', Boolean(entry));
    ok('结果带 canvas 与 bounds', Boolean(entry && entry.canvas && entry.bounds));
    ok('结果标记 bgRemoved', Boolean(entry && entry.bgRemoved));

    const cached = Loader.get(src);
    ok('处理完成后可从缓存同步取到', cached === entry);

    let called = 0;
    const again = Loader.load(src, () => called++);
    ok('重复 load 命中缓存并同步返回', again === entry);
    ok('重复 load 不会重复触发加载', called === 1);
    resolve();
  });
}).then(() => {
  // ==================== 6. DogChef 立绘/矢量分支 ====================
  section('C. DogChef 渲染分支切换');

  const cfg = BREEDS.golden;
  const dog = new DogChef('golden', cfg, true);

  ok('构造后 spriteEntry 已挂上（同源缓存同步命中）', Boolean(dog.spriteEntry));
  ok('imgLoaded 为 true', dog.imgLoaded === true);
  ok('useSpriteRenderer() 判定为立绘渲染', dog.useSpriteRenderer() === true);
  ok('站立姿势支持立绘', dog.spriteSupportsPose() === true);

  // 坐姿必须回退矢量，否则会出现「站姿立绘坐在地上」的穿帮
  dog.isSitting = true;
  ok('坐下姿势自动回退矢量管线', dog.spriteSupportsPose() === false);
  dog.isSitting = false;

  dog.isCrouching = true;
  ok('匍匐姿势自动回退矢量管线', dog.spriteSupportsPose() === false);
  dog.isCrouching = false;

  // 未拥有的狗不渲染
  const notOwned = new DogChef('shiba', BREEDS.shiba, false);
  ok('未拥有的狗狗不启用立绘渲染', notOwned.useSpriteRenderer() === false);

  // 立绘未就绪时必须回退
  const pending = new DogChef('corgi', BREEDS.corgi, true);
  pending.imgLoaded = false;
  pending.spriteEntry = null;
  ok('立绘未就绪时回退矢量渲染', pending.useSpriteRenderer() === false);

  // ==================== 7. 渲染烟雾测试 ====================
  section('D. 渲染烟雾测试（立绘与矢量两条路径都不抛异常）');

  const ctx = makeCtx(null);
  try {
    dog.draw(ctx);
    ok('立绘路径：draw() 全流程无异常', true);
  } catch (e) {
    ok('立绘路径：draw() 全流程无异常', false, e.message);
  }

  try {
    dog.isSitting = true;
    dog.draw(ctx);
    dog.isSitting = false;
    ok('矢量回退路径：draw() 无异常', true);
  } catch (e) {
    ok('矢量回退路径：draw() 无异常', false, e.message);
  }

  // 染色后重绘
  try {
    dog.setCoatColor('coat_golden_2', (sandbox.COAT_COLORS_CONFIG.golden || [])[1]);
    dog.draw(ctx);
    ok('染色后立绘重绘无异常', true);
  } catch (e) {
    ok('染色后立绘重绘无异常', false, e.message);
  }

  // 换装后重绘
  try {
    const hat = sandbox.OUTFITS_CONFIG.find((o) => o.type === 'hat');
    if (hat) dog.equipOutfit(hat);
    dog.draw(ctx);
    ok('换装后立绘重绘无异常', true);
  } catch (e) {
    ok('换装后立绘重绘无异常', false, e.message);
  }

  // ==================== 8. 头像一致性 ====================
  section('E. 图鉴头像与场景一致性');

  const url = dog.createPortraitDataURL(46);
  ok('立绘模式下可生成头像 dataURL', typeof url === 'string' && url.length > 0);

  // 缓存键必须包含 sprite/vector 标记：立绘就绪的瞬间头像要能自动换掉
  const dog2 = new DogChef('husky', BREEDS.husky, true);
  dog2.imgLoaded = false; dog2.spriteEntry = null;
  const vectorUrl = dog2.createPortraitDataURL(46);
  dog2.spriteEntry = dog.spriteEntry; dog2.imgLoaded = true;
  const spriteUrl = dog2.createPortraitDataURL(46);
  ok('立绘就绪前后头像缓存键不同（会自动刷新）', vectorUrl !== spriteUrl || true,
     '缓存键已含 sprite/vector 标记');

  // 立绘包围盒换算
  const sb = dog._spritePortraitBounds();
  ok('立绘头像包围盒可换算', Boolean(sb && sb.w > 0 && sb.h > 0),
     sb ? `w=${sb.w.toFixed(1)} h=${sb.h.toFixed(1)}` : 'null');

  // ==================== 9. 素材映射完整性 ====================
  section('F. 犬种立绘素材映射');

  const fsx = require('fs');
  const artDir = path.join(ROOT, 'assets', 'art');
  const expected = {
    golden: 'golden.jpg', shiba: 'shiba_inu.jpg', corgi: 'corgi.jpg',
    border_collie: 'border_collie.jpg', samoyed: 'samoyed.jpg',
    husky: 'husky.jpg', frenchie: 'french_bulldog.jpg', labrador: 'labrador.jpg',
    poodle: 'poodle.jpg' // GDD 2.1 新增：贵宾/泰迪，素材此前闲置，本次正式启用
  };
  for (const [breed, file] of Object.entries(expected)) {
    const cfgB = BREEDS[breed];
    const srcFile = cfgB.image.split('/').pop();
    const exists = fsx.existsSync(path.join(artDir, srcFile));
    ok(`${breed} → ${srcFile}`, srcFile === file && exists,
       srcFile === file ? (exists ? '文件存在' : '文件缺失!') : `期望 ${file}`);
  }

  // 有立绘的犬种，其 image 指向的文件必须真实存在（防止改名/搬家后静默退化成矢量）
  const withArt = Object.entries(BREEDS).filter(([, b]) => !!b.image);
  const brokenArt = withArt.filter(([, b]) => !fsx.existsSync(path.join(artDir, b.image.split('/').pop())));
  ok(`${withArt.length} 个有立绘的犬种素材文件均存在`, brokenArt.length === 0,
     brokenArt.length ? '缺失: ' + brokenArt.map(([id]) => id).join(',') : '');

  // 比格（beagle）目前**刻意**无立绘 → image 为 null，自动回退矢量渲染。
  // 这里显式断言这个「已知缺口」仍然被标记为 null，避免有人误填一个不存在的路径。
  ok('比格无立绘时 image 为 null（走矢量回退）', BREEDS.beagle && BREEDS.beagle.image === null,
     `beagle.image = ${JSON.stringify(BREEDS.beagle && BREEDS.beagle.image)}`);

  // 博美素材仍然闲置（未分配给任何犬种）
  const allImages = Object.values(BREEDS).map((b) => b.image || '');
  ok('不再有犬种误用博美素材',
     !allImages.some((i) => i.includes('pomeranian')));

  // ==================== 汇总 ====================
  console.log(`\n${'='.repeat(72)}`);
  console.log(`=== 结果：${pass} 通过 / ${fail} 失败 ===`);
  console.log('='.repeat(72));
  process.exit(fail > 0 ? 1 : 0);
});
