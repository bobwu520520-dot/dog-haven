/**
 * 8 犬种立绘总览图 (Breed Sheet) —— 真实浏览器 CDP 导出
 * ------------------------------------------------------------------
 * 场景里狗狗会走动、有呼吸起伏，靠截图逐个找狗既慢又不可靠。
 * 这里直接把 DogSpriteLoader 里缓存好的 8 张立绘并排画到一张大图上导出，
 * 用来一次性核对：
 *   - 画风 / 视角 / 比例 / 光照是否统一
 *   - 抠底是否干净（无白边、无方形残留）
 *   - 边牧、萨摩耶等后补素材是否与既有 6 张一致
 *
 * 用法: node scratch/cdp_breed_sheet.js
 * 输出: scratch/shots/breed_sheet.png
 */
const http = require('http');
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
const PORT = 8098;
const DEBUG_PORT = 9336;
const OUT_DIR = path.resolve(__dirname, '..', 'scratch', 'shots');
const TARGET_URL = `http://127.0.0.1:${PORT}/`;

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
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1280,900',
    TARGET_URL
  ]);

  await sleep(3000);
  const list = await httpJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const page = list.find((p) => p.type === 'page');
  if (!page) throw new Error('未找到可调试页面');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const callbacks = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result, msg.error);
      callbacks.delete(msg.id);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, (res, err) => (err ? reject(err) : resolve(res)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(4000); // 等 8 张立绘解码 + 抠底

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result ? r.result.value : undefined;
  };

  // 把 8 张立绘按包围盒裁切后等宽等高并排，便于横向对比画风
  const dataUrl = await evalJs(`(() => {
    const BREEDS = window.DOG_BREEDS_CONFIG;
    const ids = Object.keys(BREEDS);
    const CELL = 260, PAD = 12, COLS = 4;
    const rows = Math.ceil(ids.length / COLS);
    const labelH = 30;
    const cw = COLS * CELL, ch = rows * (CELL + labelH);

    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cw, ch);

    ids.forEach((id, i) => {
      const cfg = BREEDS[id];
      const e = window.DogSpriteLoader.get(cfg.image);
      const col = i % COLS, row = Math.floor(i / COLS);
      const ox = col * CELL, oy = row * (CELL + labelH);

      // 单元格描边，方便看清抠底边界
      ctx.strokeStyle = '#E8E8E8';
      ctx.strokeRect(ox + 0.5, oy + 0.5, CELL - 1, CELL - 1);

      if (!e) {
        ctx.fillStyle = '#C0392B';
        ctx.font = '14px sans-serif';
        ctx.fillText('未加载', ox + PAD, oy + CELL / 2);
      } else {
        const b = e.bounds;
        const avail = CELL - PAD * 2;
        const s = Math.min(avail / b.w, avail / b.h);
        const dw = b.w * s, dh = b.h * s;
        ctx.drawImage(e.canvas, b.x, b.y, b.w, b.h,
          ox + (CELL - dw) / 2, oy + (CELL - dh) / 2, dw, dh);
      }

      ctx.fillStyle = '#2C3E50';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.name + '  (' + id + ')', ox + CELL / 2, oy + CELL + 20);
      ctx.textAlign = 'left';
    });
    return out.toDataURL('image/png');
  })()`);

  if (!dataUrl || dataUrl.indexOf('data:image/png') !== 0) {
    throw new Error('生成总览图失败');
  }
  const outPath = path.join(OUT_DIR, 'breed_sheet.png');
  fs.writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('总览图已输出:', outPath);

  // 头像特写总览：把 8 只狗的头像按真实显示尺寸放大若干倍排开，
  // 用来核对「头部裁切」是否真的对准了脸（而不是把尾巴或身子裁进来）。
  const avatarUrl = await evalJs(`(async () => {
    const BREEDS = window.DOG_BREEDS_CONFIG;
    const ids = Object.keys(BREEDS);

    // 头像走立绘分支要求 isOwned 为真（useSpriteRenderer 会检查），先全部招募
    for (const id of ids) {
      const d = window.game.dogs.get(id);
      if (d) d.isOwned = true;
    }

    const CELL = 132, PAD = 10, COLS = 4;
    const rows = Math.ceil(ids.length / COLS);
    const labelH = 28;
    const cw = COLS * CELL, ch = rows * (CELL + labelH);
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cw, ch);

    // 先把 8 张头像 dataURL 全部解码好，避免 drawImage 时图还没就绪画出空白
    const urls = ids.map((id) => {
      const dog = window.game.dogs.get(id);
      return dog ? dog.createPortraitDataURL(112, 1) : null;
    });
    const imgs = await Promise.all(urls.map((u) => new Promise((resolve) => {
      if (!u) { resolve(null); return; }
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = u;
    })));

    ids.forEach((id, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const ox = col * CELL, oy = row * (CELL + labelH);
      ctx.strokeStyle = '#DDDDDD';
      ctx.strokeRect(ox + 0.5, oy + 0.5, CELL - 1, CELL - 1);
      if (imgs[i]) ctx.drawImage(imgs[i], ox + PAD, oy + PAD, CELL - PAD * 2, CELL - PAD * 2);
      ctx.fillStyle = '#2C3E50';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(BREEDS[id].name + ' ' + id, ox + CELL / 2, oy + CELL + 19);
      ctx.textAlign = 'left';
    });
    return out.toDataURL('image/png');
  })()`);

  if (avatarUrl && avatarUrl.indexOf('data:image/png') === 0) {
    const ap = path.join(OUT_DIR, 'avatar_sheet.png');
    fs.writeFileSync(ap, Buffer.from(avatarUrl.split(',')[1], 'base64'));
    console.log('头像总览图已输出:', ap);
  } else {
    console.log('⚠️ 头像总览图生成失败');
  }

  // 逐只报告头部裁切框，便于发现「没裁到脸」的犬种
  const headInfo = await evalJs(`(() => {
    const BREEDS = window.DOG_BREEDS_CONFIG;
    const out = {};
    for (const id of Object.keys(BREEDS)) {
      const d = window.game.dogs.get(id);
      const hb = d && d._spriteHeadBounds ? d._spriteHeadBounds() : null;
      const fb = d && d._spritePortraitBounds ? d._spritePortraitBounds() : null;
      out[id] = hb && fb
        ? { headW: +hb.w.toFixed(1), headH: +hb.h.toFixed(1),
            fullW: +fb.w.toFixed(1), fullH: +fb.h.toFixed(1),
            ratio: +(hb.w / fb.w).toFixed(2) }
        : null;
    }
    return out;
  })()`);
  console.log('\n头部裁切框（局部坐标）:');
  Object.entries(headInfo || {}).forEach(([id, v]) => {
    if (!v) { console.log(`  ${id.padEnd(14)} 未测得`); return; }
    console.log(`  ${id.padEnd(14)} 头 ${v.headW}x${v.headH}  全身 ${v.fullW}x${v.fullH}  占宽 ${(v.ratio * 100).toFixed(0)}%`);
  });

  ws.close();
  chrome.kill();
  server.close();
}

main().catch((e) => { console.error('失败:', e); process.exit(1); });
