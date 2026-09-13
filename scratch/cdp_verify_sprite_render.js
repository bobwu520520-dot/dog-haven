/**
 * 写实立绘渲染管线 —— 真实浏览器 (Chrome Headless CDP) 端到端验证
 * ------------------------------------------------------------------
 * 静态逻辑测试（test_sprite_portrait.js）用的是 mock canvas，抓不到真实渲染问题。
 * 本脚本在真 Chrome 里跑，重点验证：
 *   1. 8 张立绘全部被真实解码 + 抠底，且包围盒是「像狗的形状」而非整张方图；
 *   2. 场景里狗狗确实走了立绘分支（spriteEntry 就绪、useSpriteRenderer 为真）；
 *   3. 立绘落到画布上真的有像素（不是空绘制/全透明）；
 *   4. 立绘的透明底没有把草地糊成方块（抠底在真图上有效）；
 *   5. 图鉴头像用的是立绘而非矢量；
 *   6. 全流程控制台零报错。
 *
 * 用法: node scratch/cdp_verify_sprite_render.js
 */
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
const PORT = 8099;
const DEBUG_PORT = 9335;
const OUT_DIR = path.resolve(__dirname, '..', 'scratch', 'shots');
const TARGET_URL = `http://127.0.0.1:${PORT}/`;

let pass = 0, fail = 0;
const check = (cond, label, extra = '') => {
  if (cond) { pass++; console.log(`   ✅ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`   ❌ ${label}${extra ? ' — ' + extra : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

// 简易静态文件服务器（立绘是本地 jpg，必须走 http 才能读像素）
function startServer() {
  const root = path.resolve(__dirname, '..');
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.json': 'application/json'
  };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  if (!chromePath) throw new Error('未找到 Chrome / Edge 可执行文件');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await startServer();
  console.log(`静态服务器已启动: ${TARGET_URL}`);

  // 独立临时 profile：避免上一轮 Chrome 未退干净导致 profile 占用，
  // 出现「浏览器起来了但页面没真正加载」→ window.game undefined 的假失败。
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doghaven-cdp-'));

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1280,900',
    'about:blank'
  ]);

  await sleep(3000);
  const list = await httpJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const page = list.find((p) => p.type === 'page');
  if (!page) throw new Error('未找到可调试页面');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const callbacks = new Map();
  const consoleErrors = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result, msg.error);
      callbacks.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push('EXCEPTION: ' + ((d && d.exception && d.exception.description) || (d && d.text) || 'unknown'));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      const e = msg.params.entry;
      consoleErrors.push('LOG: ' + e.text + (e.url ? ' <' + e.url + '>' : ''));
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, (res, err) => (err ? reject(err) : resolve(res)));
    ws.send(JSON.stringify({ id, method, params }));
  });

  // 外部依赖/环境噪声与应用自身的问题分开统计（详见 cdp_verify_gaps.js 的说明）
  const EXTERNAL_NOISE = [
    'fonts.googleapis.com', 'fonts.gstatic.com', 'favicon.ico',
    'ERR_NAME_NOT_RESOLVED', 'ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION_CLOSED'
  ];
  const isExternal = (line) => EXTERNAL_NOISE.some((n) => line.includes(n));
  const appErrors = () => consoleErrors.filter((e) => !isExternal(e));

  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  // 连上之后再导航，页面加载期的异常也能被捕获
  await send('Page.navigate', { url: TARGET_URL });
  await sleep(4500); // 等立绘解码 + 抠底完成

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result ? r.result.value : undefined;
  };
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join(OUT_DIR, name);
    fs.writeFileSync(p, Buffer.from(s.data, 'base64'));
    return p;
  };

  console.log('\n[1] 页面加载与控制台');
  check(await evalJs('typeof window.game === "object" && !!window.game'), '游戏主控制器已启动');
  check(await evalJs('typeof window.DogSpriteLoader === "object"'), 'DogSpriteLoader 已挂载');
  check(await evalJs('typeof window.DogChef === "function"'), 'DogChef 已挂载');
  check(appErrors().length === 0, '加载过程无 JS 报错', appErrors().slice(0, 3).join(' | '));

  // 立绘断言只针对**有立绘素材**的犬种。新增犬种时无需改动本脚本：
  // 有 image 的自动纳入校验；没有 image 的（如比格）自动归入「矢量回退」组单独断言。
  const artSplit = await evalJs(`(() => {
    const B = window.DOG_BREEDS_CONFIG;
    const withArt = [], noArt = [];
    for (const id of Object.keys(B)) (B[id].image ? withArt : noArt).push(id);
    return { withArt, noArt };
  })()`);
  const SPRITE_IDS = (artSplit && artSplit.withArt) || [];
  const NO_ART_IDS = (artSplit && artSplit.noArt) || [];
  const N = SPRITE_IDS.length;
  console.log(`  （有立绘 ${N} 个：${SPRITE_IDS.join(', ')}；无立绘 ${NO_ART_IDS.length} 个：${NO_ART_IDS.join(', ') || '无'}）`);

  console.log(`\n[2] ${N} 个有立绘犬种：真实解码 + 抠底`);
  const spriteStats = await evalJs(`(() => {
    const BREEDS = window.DOG_BREEDS_CONFIG;
    const out = {};
    for (const id of Object.keys(BREEDS)) {
      const cfg = BREEDS[id];
      if (!cfg.image) continue; // 无立绘的犬种（如比格）跳过立绘加载断言，走矢量回退
      const e = window.DogSpriteLoader.get(cfg.image);
      if (!e) { out[id] = { ok: false, reason: 'not loaded' }; continue; }
      const b = e.bounds;
      const cw = e.canvas.width, ch = e.canvas.height;
      const fillsFrame = b.x === 0 && b.y === 0 && b.w === cw && b.h === ch;
      out[id] = {
        ok: true,
        bgRemoved: !!e.bgRemoved,
        canvas: cw + 'x' + ch,
        bounds: b.w + 'x' + b.h,
        fillsFrame: fillsFrame
      };
    }
    return out;
  })()`);

  for (const [id, s] of Object.entries(spriteStats)) {
    check(s.ok && s.bgRemoved, `${id} 立绘已解码并抠底`,
      s.ok ? `${s.canvas} → 主体 ${s.bounds}` : s.reason);
  }

  const loadedCount = Object.values(spriteStats).filter((s) => s.ok).length;
  check(loadedCount === N, `${N} 个犬种立绘全部加载成功`, `${loadedCount}/${N}`);

  const anyFullFrame = Object.entries(spriteStats).filter(([, s]) => s.ok && s.fillsFrame);
  check(anyFullFrame.length === 0, '所有立绘都抠掉了白边（主体包围盒小于画布）',
    anyFullFrame.length ? `异常的: ${anyFullFrame.map(([k]) => k).join(',')}` : `${N}/${N} 正常`);

  const bgCheck = await evalJs(`(() => {
    const e = window.DogSpriteLoader.get(window.DOG_BREEDS_CONFIG.golden.image);
    if (!e) return null;
    const c = document.createElement('canvas');
    c.width = e.canvas.width; c.height = e.canvas.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(e.canvas, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let cornerOpaque = 0, cornerTotal = 0;
    const zones = [[0,0],[c.width-12,0],[0,c.height-12],[c.width-12,c.height-12]];
    for (const z of zones) {
      for (let y = z[1]; y < z[1] + 12; y++) {
        for (let x = z[0]; x < z[0] + 12; x++) {
          cornerTotal++;
          if (d[(y * c.width + x) * 4 + 3] > 40) cornerOpaque++;
        }
      }
    }
    return { cornerOpaque: cornerOpaque, cornerTotal: cornerTotal };
  })()`);
  check(bgCheck && bgCheck.cornerOpaque === 0,
    '金毛立绘四角已完全透明（白底真的被抠掉）',
    bgCheck ? `${bgCheck.cornerOpaque}/${bgCheck.cornerTotal} 残留` : 'null');

  console.log('\n[3] 场景狗狗走立绘分支');
  const sceneInfo = await evalJs(`(() => {
    const dogs = Array.from(window.game.dogs.values()).filter(d => d.isOwned);
    return dogs.map(d => ({
      id: d.id,
      imgLoaded: d.imgLoaded,
      hasEntry: !!d.spriteEntry,
      useSprite: d.useSpriteRenderer ? d.useSpriteRenderer() : null,
      drawHeight: d.drawHeight,
      supportsPose: d.spriteSupportsPose ? d.spriteSupportsPose() : null
    }));
  })()`);
  const ownedDogs = sceneInfo || [];
  check(ownedDogs.length > 0, '存在已拥有的狗狗', `${ownedDogs.length} 只`);
  check(ownedDogs.every((d) => d.imgLoaded), '全部已拥有狗狗立绘就绪',
    ownedDogs.map((d) => `${d.id}:${d.imgLoaded}`).join(' '));
  check(ownedDogs.every((d) => d.useSprite), '全部已拥有狗狗启用立绘渲染',
    ownedDogs.map((d) => `${d.id}:${d.useSprite}`).join(' '));
  check(ownedDogs.every((d) => d.drawHeight > 0), '立绘目标高度已配置',
    ownedDogs.map((d) => d.drawHeight).join('/'));

  console.log('\n[4] 立绘真的画到画布上了');
  const pixelInfo = await evalJs(`(() => {
    const cvs = document.getElementById('game-canvas');
    if (!cvs) return null;
    const ctx = cvs.getContext('2d');
    const d = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
    let nonEmpty = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) nonEmpty++;
    return { total: cvs.width * cvs.height, nonEmpty: nonEmpty };
  })()`);
  check(pixelInfo && pixelInfo.nonEmpty > 0, '画布存在已绘制像素',
    pixelInfo ? `${pixelInfo.nonEmpty}/${pixelInfo.total}` : 'null');

  await evalJs(`document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'))`);
  await sleep(1200);
  const shotScene = await shot('sprite_scene.png');
  check(fs.existsSync(shotScene), '场景截图已输出', path.basename(shotScene));

  console.log('\n[5] 立绘染色 + 换装后重绘');
  // --- 回归：染色绝不能溢出到狗狗剪影之外 ---
  // 历史 bug：早期实现直接在主画布上 fillRect + source-atop 染色。source-atop 是按
  // 「目标 alpha」生效的，而主画布此刻已被草地/工位/其他狗狗铺满像素，于是整块
  // fillRect 矩形都被染上色 —— 草地上出现一个突兀的色块，工位美术也被糊掉。
  //
  // 修复方式：把染色搬到离屏画布（离屏上只有狗狗有 alpha），并把结果缓存下来。
  // 这里直接断言该不变量：染膏版立绘在**原画透明处必须同样透明**。
  // 不去采样场景画布，因为狗狗有呼吸起伏与微动作，跨帧采样会引入噪声、误报。
  const applyCoat = await evalJs(`(() => {
    const g = window.game.dogs.get('golden');
    const coats = window.COAT_COLORS_CONFIG.golden || [];
    const target = coats.find(c => c.costType !== 'free');
    if (!target) return { applied: false };
    g.setCoatColor(target.id, target);
    g._tintCache = null; // 强制重算，确保测的是真实生成路径
    return { applied: true, coat: target.id };
  })()`);
  check(applyCoat && applyCoat.applied, '可对狗狗应用毛色', applyCoat ? applyCoat.coat : '');

  const tintCheck = await evalJs(`(() => {
    const g = window.game.dogs.get('golden');
    const tinted = g._getTintedSprite();
    const orig = g.spriteEntry && g.spriteEntry.canvas;
    if (!tinted || !orig) return { ok: false, reason: 'tinted=' + !!tinted + ' orig=' + !!orig };

    const w = orig.width, h = orig.height;
    if (tinted.width !== w || tinted.height !== h) {
      return { ok: false, reason: 'size mismatch ' + tinted.width + 'x' + tinted.height };
    }

    const read = (cv) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      cx.drawImage(cv, 0, 0);
      return cx.getImageData(0, 0, w, h).data;
    };
    const A = read(orig), B = read(tinted);

    let bleed = 0;        // 原画透明、染膏版却不透明的像素数（= 溢出）
    let changed = 0;      // 原画不透明且颜色被改变的像素数（= 染色确实生效）
    let opaqueTotal = 0;  // 原画不透明像素总数
    let cornerOpaque = 0; // 染膏版四角是否有残留（整块矩形的典型症状）

    for (let i = 0; i < A.length; i += 4) {
      const aA = A[i + 3], aB = B[i + 3];
      if (aA === 0) { if (aB > 0) bleed++; }
      else {
        opaqueTotal++;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i+1] - B[i+1]) + Math.abs(A[i+2] - B[i+2]) > 6) changed++;
      }
    }

    const corner = (x, y) => B[(y * w + x) * 4 + 3];
    [[2,2],[w-3,2],[2,h-3],[w-3,h-3]].forEach(([x, y]) => { if (corner(x, y) > 0) cornerOpaque++; });

    return {
      ok: true, bleed: bleed, changed: changed,
      opaqueTotal: opaqueTotal, cornerOpaque: cornerOpaque,
      size: w + 'x' + h
    };
  })()`);

  check(tintCheck && tintCheck.ok, '可取出染膏版立绘并逐像素比对',
    tintCheck && tintCheck.reason ? tintCheck.reason : (tintCheck && tintCheck.size));
  check(tintCheck && tintCheck.bleed === 0,
    '染色未溢出狗狗剪影（原画透明处染膏版同样透明）',
    tintCheck ? `溢出像素 ${tintCheck.bleed}` : 'null');
  check(tintCheck && tintCheck.cornerOpaque === 0,
    '染膏版立绘四角透明（没有整块矩形被填色）',
    tintCheck ? `四角残留 ${tintCheck.cornerOpaque}/4` : 'null');
  check(tintCheck && tintCheck.changed > 0,
    '染色确实生效（剪影内部像素颜色被改变）',
    tintCheck ? `变色像素 ${tintCheck.changed}/${tintCheck.opaqueTotal}` : 'null');

  const hatId = await evalJs(`(() => {
    const hat = window.OUTFITS_CONFIG.find(o => o.type === 'hat');
    if (!hat) return null;
    const g = window.game.dogs.get('golden');
    g.equipOutfit(hat);
    return hat.id;
  })()`);
  check(!!hatId, '可给狗狗戴上帽子', hatId || '');

  await sleep(800);
  const shotDressed = await shot('sprite_dressed.png');
  check(fs.existsSync(shotDressed), '换装+染色截图已输出', path.basename(shotDressed));

  console.log('\n[6] 图鉴头像 = 立绘头部特写');
  const portraitInfo = await evalJs(`(() => {
    const g = window.game.dogs.get('golden');
    const url = g.createPortraitDataURL(46);
    return { ok: typeof url === 'string' && url.indexOf('data:image/png') === 0, len: url ? url.length : 0 };
  })()`);
  check(portraitInfo && portraitInfo.ok, '立绘模式下头像可生成', `数据长度 ${portraitInfo && portraitInfo.len}`);

  // 头像只有 40~50px，必须裁到头部，否则整只狗缩进去五官全糊。
  // 断言：头部框明显小于全身框，且所有有立绘犬种都测得出（含朝左与朝右两种素材）。
  const headCrop = await evalJs(`(() => {
    const BREEDS = window.DOG_BREEDS_CONFIG;
    const out = {};
    for (const id of Object.keys(BREEDS)) {
      const d = window.game.dogs.get(id);
      if (!d || !BREEDS[id].image) continue;
      d.isOwned = true;
      const hb = d._spriteHeadBounds ? d._spriteHeadBounds() : null;
      const fb = d._spritePortraitBounds ? d._spritePortraitBounds() : null;
      out[id] = hb && fb
        ? { head: +hb.w.toFixed(1), full: +fb.w.toFixed(1), ratio: +(hb.w / fb.w).toFixed(2) }
        : null;
    }
    return out;
  })()`);
  const hcKeys = Object.keys(headCrop || {});
  const hcMissing = hcKeys.filter((id) => !headCrop[id]);
  check(hcKeys.length === N && hcMissing.length === 0, `${N} 个立绘犬种都测得出头部裁切框`,
    hcMissing.length ? `缺失: ${hcMissing.join(',')}` : `${N}/${N}`);
  const hcTooBig = hcKeys.filter((id) => headCrop[id] && headCrop[id].ratio > 0.75);
  check(hcTooBig.length === 0, '头部框明显小于全身框（确实裁到了头，而不是整只狗）',
    hcTooBig.length ? `偏大: ${hcTooBig.map((i) => i + ':' + headCrop[i].ratio).join(',')}`
                    : hcKeys.map((i) => `${i}:${headCrop[i] ? Math.round(headCrop[i].ratio * 100) + '%' : '-'}`).join(' '));

  await evalJs('window.game.openTabModal("dogpedia")');
  await sleep(900);
  const avatarIsImg = await evalJs(`(() => {
    const el = document.querySelector('#dogpedia-list-container img');
    if (!el) return null;
    const src = el.getAttribute('src') || '';
    return { src: src.slice(0, 22), isData: src.indexOf('data:') === 0 };
  })()`);
  check(avatarIsImg && avatarIsImg.isData, '图鉴头像使用画布生成的立绘',
    avatarIsImg ? avatarIsImg.src : '未找到 img');
  const shotPedia = await shot('sprite_dogpedia.png');
  await evalJs(`document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'))`);

  console.log(`\n[7] 全部门犬种全部上场渲染（${N} 立绘 + ${NO_ART_IDS.length} 矢量回退）`);
  // 开局只拥有金毛，因此前几步实际只验证了 1 只狗。这里把所有犬种全部招募并安排到
  // 各自工位，确保每张立绘都真的进过渲染管线。
  const allOwned = await evalJs(`(() => {
    const BREEDS = window.DOG_BREEDS_CONFIG;
    const layout = { golden:'stew', shiba:'bbq', samoyed:'bake', husky:'jerky', border_collie:'hotpot', frenchie:'stew', labrador:'bbq', poodle:'bake', beagle:'hotpot' };
    for (const [key, st] of Object.entries(window.game.kitchen.stations)) st.unlocked = true;
    for (const id of Object.keys(BREEDS)) {
      const d = window.game.dogs.get(id);
      if (!d) continue;
      d.isOwned = true;
      const st = layout[id];
      if (st) { d.assignedFacility = st; window.game.kitchen.assignDogToStation(d, st); }
    }
    return Object.keys(BREEDS).map(id => {
      const d = window.game.dogs.get(id);
      return {
        id: id, owned: !!d.isOwned,
        imgLoaded: !!d.imgLoaded,
        hasImage: !!BREEDS[id].image,
        useSprite: d.useSpriteRenderer ? d.useSpriteRenderer() : null,
        station: d.assignedFacility
      };
    });
  })()`);
  const totalBreeds = Object.keys(artSplit.withArt).length + Object.keys(artSplit.noArt).length;
  check((allOwned || []).length === totalBreeds, `${totalBreeds} 个犬种均已招募`, `${(allOwned || []).length}/${totalBreeds}`);
  const withArtOwned = (allOwned || []).filter(d => d.hasImage);
  check(withArtOwned.every(d => d.imgLoaded), `${N} 只立绘狗狗立绘全部就绪`,
    withArtOwned.filter(d => !d.imgLoaded).map(d => d.id).join(',') || '全部就绪');
  check(withArtOwned.every(d => d.useSprite), `${N} 只立绘狗狗全部启用立绘渲染`,
    withArtOwned.filter(d => !d.useSprite).map(d => d.id).join(',') || '全部启用');
  const noArtOwned = (allOwned || []).filter(d => !d.hasImage);
  if (noArtOwned.length > 0) {
    check(noArtOwned.every(d => !d.useSprite), '无立绘素材犬种平稳回退矢量渲染',
      noArtOwned.map(d => `${d.id}:vector`).join(' '));
  }

  await sleep(1500); // 让所有狗都进入绘制循环
  const shotAll = await shot('sprite_all_breeds.png');
  check(fs.existsSync(shotAll), `${totalBreeds} 犬种同场截图已输出`, path.basename(shotAll));

  // 逐只在画布上量一次「这只狗的位置附近确实有渲染像素」，避免「配置对了但没画出来」
  const perDogPixels = await evalJs(`(() => {
    const cvs = document.getElementById('game-canvas');
    const ctx = cvs.getContext('2d');
    const dpr = cvs.width / 1000;
    const out = {};
    for (const [id, d] of window.game.dogs.entries()) {
      if (!d.isOwned) continue;
      const w = Math.round(70 * dpr), h = Math.round(70 * dpr);
      const cx = Math.round(d.x * dpr) - Math.round(w / 2);
      const cy = Math.round(d.y * dpr) - Math.round(h * 0.85);
      const x = Math.max(0, Math.min(cvs.width - w, cx));
      const y = Math.max(0, Math.min(cvs.height - h, cy));
      const data = ctx.getImageData(x, y, w, h).data;
      // 统计「明显不是草地绿」的像素，作为「这里有只狗」的粗略信号
      let nonGrass = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const isGrass = g > r && g > b && g > 150;
        if (!isGrass) nonGrass++;
      }
      out[id] = { nonGrass: nonGrass, total: (w * h) };
    }
    return out;
  })()`);
  const weakDogs = Object.entries(perDogPixels || {})
    .filter(([, v]) => v.nonGrass < 120)
    .map(([k, v]) => `${k}:${v.nonGrass}`);
  check(Object.keys(perDogPixels || {}).length === totalBreeds, `${totalBreeds} 只狗狗都在画布上定位到`,
    `${Object.keys(perDogPixels || {}).length}/${totalBreeds}`);
  check(weakDogs.length === 0, '每只狗狗附近都渲染出了实体像素',
    weakDogs.length ? `疑似空白: ${weakDogs.join(', ')}` : `${totalBreeds}/${totalBreeds} 正常`);

  console.log('\n[8] 立绘朝向与 facing 一致（不许倒着走）');
  // 素材本身的朝向**并不统一**：金毛/边牧/萨摩耶/拉布拉多朝左，柴犬/柯基/哈士奇/法斗朝右。
  // 而 facing=1 在全局约定里表示「向右移动」。若 artFacing 标错，狗狗就会倒着走。
  //
  // 这里不看 SPRITE_TUNING 的自述，而是直接从**素材本身的 alpha 分布**判断它朝哪边：
  // 取包围盒上部 45% 一条横带，比较左右两半的前景像素数 —— 头比尾巴厚实，
  // 像素更多的那一侧就是头所在的一侧，也就是狗脸朝向的一侧。
  // 然后断言：facing=1 渲染出来时，头部必须落在右半（即真的朝右）。
  const orient = await evalJs(`(() => {
    const headSideOf = (data, w, bbox) => {
      const bandH = Math.max(1, Math.round(bbox.h * 0.45));
      const mid = bbox.x + bbox.w / 2;
      let left = 0, right = 0;
      for (let y = bbox.y; y < bbox.y + bandH; y++) {
        for (let x = bbox.x; x < bbox.x + bbox.w; x++) {
          if (data[(y * w + x) * 4 + 3] > 40) {
            if (x < mid) left++; else right++;
          }
        }
      }
      return { left: left, right: right, side: right > left ? 'right' : 'left' };
    };

    const alphaBBox = (data, w, h) => {
      let minX = w, maxX = -1, minY = h, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 40) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return null;
      return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    };

    const BREEDS = window.DOG_BREEDS_CONFIG;
    const out = {};
    for (const id of Object.keys(BREEDS)) {
      if (!BREEDS[id].image) continue; // 跳过无立绘犬种
      const g = window.game.dogs.get(id);
      const entry = g && g.spriteEntry;
      if (!entry) { out[id] = { ok: false, reason: 'no sprite' }; continue; }

      // 1) 素材本身朝哪边
      const artC = document.createElement('canvas');
      artC.width = entry.canvas.width; artC.height = entry.canvas.height;
      const artCtx = artC.getContext('2d');
      artCtx.drawImage(entry.canvas, 0, 0);
      const artData = artCtx.getImageData(0, 0, artC.width, artC.height).data;
      const artSide = headSideOf(artData, artC.width, entry.bounds);

      // 2) facing=1 单独渲染一次，看头落在哪边
      const b = entry.bounds;
      const scale = g.drawHeight / b.h;
      const PAD = 14;
      const W = Math.ceil(b.w * scale + PAD * 2), H = Math.ceil(b.h * scale + PAD * 2);
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const cx = c.getContext('2d');
      cx.save();
      cx.translate(W / 2, PAD + 26); // 立绘本体的局部 y 范围是 [-26, 22]
      cx.scale(1, 1);                // facing = 1（向右）
      g.drawSpriteFigure(cx);
      cx.restore();
      const d = cx.getImageData(0, 0, W, H).data;
      const rb = alphaBBox(d, W, H);
      const renderSide = rb ? headSideOf(d, W, rb) : null;

      out[id] = {
        ok: !!renderSide,
        artFacing: g.spriteArtFacing,
        artHeadSide: artSide.side,
        renderedHeadSide: renderSide ? renderSide.side : null,
        detail: '素材 左' + artSide.left + '/右' + artSide.right +
                (renderSide ? '  → 渲染 左' + renderSide.left + '/右' + renderSide.right : '')
      };
    }
    return out;
  })()`);

  const oKeys = Object.keys(orient || {});
  check(oKeys.length === N, `${N} 个立绘犬种都完成了朝向检测`, `${oKeys.length}/${N}`);

  // 每个犬种的 artFacing 必须与「素材实际朝向」相符
  const facingMismatch = oKeys.filter((id) => {
    const o = orient[id];
    if (!o.ok) return true;
    return o.artFacing === -1 ? o.artHeadSide !== 'left' : o.artHeadSide !== 'right';
  });
  check(facingMismatch.length === 0,
    'artFacing 标注与素材实际朝向一致',
    facingMismatch.length
      ? facingMismatch.map((id) => `${id}(素材朝${orient[id].artHeadSide}但标了${orient[id].artFacing})`).join(', ')
      : `${N}/${N} 一致`);

  // 关键断言：facing=1 时，所有犬种的头都必须落在右半
  const wrongWay = oKeys.filter((id) => orient[id].ok && orient[id].renderedHeadSide !== 'right');
  check(wrongWay.length === 0,
    `facing=1 时 ${N} 只立绘狗狗全部朝右（没有倒着走）`,
    wrongWay.length
      ? wrongWay.map((id) => `${id}:朝${orient[id].renderedHeadSide}`).join(', ')
      : oKeys.map((id) => `${id}✓`).join(' '));

  if (oKeys.length) {
    console.log('      逐只朝向明细：');
    oKeys.forEach((id) => console.log(`        ${id.padEnd(14)} ${orient[id].detail}`));
  }

  console.log('\n[9] 最终控制台检查');
  check(appErrors().length === 0, '全流程无 JS 报错', appErrors().slice(0, 5).join(' | '));

  ws.close();
  chrome.kill();
  server.close();

  console.log(`\n截图输出: ${OUT_DIR}`);
  [shotScene, shotDressed, shotPedia, shotAll].forEach((p) => console.log('  - ' + path.basename(p)));
  console.log(`\n=== 浏览器验证结果：${pass} 通过 / ${fail} 失败 ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('验证失败:', e); process.exit(1); });
