// ============================================================================
// ⚠️ 已废弃 · 断言已过时，运行必然失败（保留仅供查阅）
// ----------------------------------------------------------------------------
// 本脚本验证的是「头像由 DogChef **矢量**管线生成」。但 2026-09-13 起，图鉴头像
// 已改为「写实立绘的头部特写」（见 DogChef._spriteHeadBounds / createPortraitDataURL），
// 因此本脚本中「头像是矢量绘制」这一核心断言不再成立。
// 另外它同样硬编码了 http://127.0.0.1:8099/，与项目 serve.js 的 8089 不符。
// 现行验证请改用 scratch/cdp_verify_sprite_render.js（含「图鉴头像 = 立绘头部特写」断言）。
// ============================================================================

/**
 * 狗狗头像改造验证：把图鉴 / 名册 / 档案里的照片头像换成场景同款矢量小狗
 * 验证点：① 头像确实由 DogChef 矢量管线生成（data:image/png）
 *         ② 生成过程不破坏狗狗的场景状态（姿态/位置/动作全部还原）
 *         ③ 换装/染色后头像自动重绘
 *         ④ 控制台零报错
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
const chromePath = CHROME_CANDIDATES.find(p => fs.existsSync(p));
const TARGET_URL = process.env.TARGET_URL || 'http://127.0.0.1:8099/';
const OUT_DIR = path.resolve(__dirname, 'shots');
const PORT = 9334;

let pass = 0, fail = 0;
const check = (cond, label, extra = '') => {
  if (cond) { pass++; console.log(`   ✅ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`   ❌ ${label}${extra ? ' — ' + extra : ''}`); }
};

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function main() {
  if (!chromePath) throw new Error('未找到 Chrome / Edge');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
    '--no-first-run', '--window-size=1280,900', TARGET_URL
  ]);
  await new Promise(r => setTimeout(r, 2500));

  const list = await httpJson(`http://127.0.0.1:${PORT}/json`);
  const page = list.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const callbacks = new Map();
  const consoleErrors = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && callbacks.has(msg.id)) { callbacks.get(msg.id)(msg.result, msg.error); callbacks.delete(msg.id); }
    else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value || a.description || '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXCEPTION: ' + (msg.params.exceptionDetails?.exception?.description || '').split('\n')[0]);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, (res, err) => err ? reject(err) : resolve(res));
    ws.send(JSON.stringify({ id, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 2200));

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result ? r.result.value : undefined;
  };
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(s.data, 'base64'));
    return name;
  };

  console.log('\n[1] 头像生成能力');
  check(await evalJs('typeof window.game.dogs.get("golden").createPortraitDataURL === "function"'),
    'DogChef.createPortraitDataURL() 已挂载');
  const url = await evalJs('window.game.dogs.get("golden").createPortraitDataURL(46)');
  check(typeof url === 'string' && url.startsWith('data:image/png'),
    '金毛头像已由矢量管线生成为 PNG dataURL', url ? `${Math.round(url.length / 1024)} KB` : 'null');

  console.log('\n[2] 生成头像不破坏场景状态');
  const stateCheck = await evalJs(`(() => {
    const d = window.game.dogs.get('golden');
    d.assignedFacility = 'stew'; d.routineState = null; d.state = 'cooking';
    d.facing = -1; d.bobOffset = 3.5; d.squashY = 1.12; d.eyeExpression = 'sparkle';
    d.animTime = 42.5; d.tailAngle = 0.77; d.pawAngle = 0.33;
    const before = { af: d.assignedFacility, st: d.state, facing: d.facing, bob: d.bobOffset,
                     sy: d.squashY, eye: d.eyeExpression, anim: d.animTime, tail: d.tailAngle, paw: d.pawAngle };
    d.createPortraitDataURL(46);
    const after = { af: d.assignedFacility, st: d.state, facing: d.facing, bob: d.bobOffset,
                    sy: d.squashY, eye: d.eyeExpression, anim: d.animTime, tail: d.tailAngle, paw: d.pawAngle };
    return { same: JSON.stringify(before) === JSON.stringify(after), before, after };
  })()`);
  check(stateCheck.same, '生成头像后场景状态 100% 还原',
    stateCheck.same ? '' : JSON.stringify(stateCheck.after));

  console.log('\n[3] 缓存与换装/染色联动');
  const cacheCheck = await evalJs(`(() => {
    const d = window.game.dogs.get('golden');
    d.setCoatColor('default', null);
    const u1 = d.createPortraitDataURL(46);
    const u2 = d.createPortraitDataURL(46);
    const cached = u1 === u2;
    // 染色后应重绘
    const coat = COAT_COLORS_CONFIG.golden[1];
    d.setCoatColor(coat.id, coat);
    const u3 = d.createPortraitDataURL(46);
    d.setCoatColor('default', null);
    const u4 = d.createPortraitDataURL(46);
    return { cached, coatChanged: u3 !== u2, restored: u4 === u1 };
  })()`);
  check(cacheCheck.cached, '同参数重复调用命中缓存');
  check(cacheCheck.coatChanged, '染色后头像自动重绘');
  check(cacheCheck.restored, '恢复原生毛色后头像回到原样');

  console.log('\n[4] 图鉴弹窗已换成矢量头像');
  await evalJs('window.game.openTabModal("dogpedia")');
  await new Promise(r => setTimeout(r, 800));
  const pediaCheck = await evalJs(`(() => {
    const imgs = document.querySelectorAll('#dogpedia-list-container .dogpedia-avatar img');
    const total = document.querySelectorAll('#dogpedia-list-container .dogpedia-item').length;
    const allVector = Array.from(imgs).every(i => i.src.startsWith('data:image/png'));
    const noPhoto = !document.querySelector('#dogpedia-list-container img[src*="assets/art"]');
    return { total, imgs: imgs.length, allVector, noPhoto };
  })()`);
  check(pediaCheck.total === 8, '图鉴 8 张卡片全部渲染', `共 ${pediaCheck.total} 张`);
  check(pediaCheck.imgs === 8 && pediaCheck.allVector, '8 个头像全部为矢量小狗 PNG', `${pediaCheck.imgs} 个`);
  check(pediaCheck.noPhoto, '图鉴内已无照片资源 (assets/art) 残留');
  await shot('dogpedia_vector_avatars.png');

  console.log('\n[5] 员工名册与档案弹窗');
  await evalJs('document.querySelector("#dogpedia-modal .modal-close").click()');
  await evalJs('window.game.openTabModal("dogs")');
  await new Promise(r => setTimeout(r, 700));
  const rosterCheck = await evalJs(`(() => {
    const imgs = document.querySelectorAll('#dogs-roster-container img');
    return { n: imgs.length, allVector: Array.from(imgs).every(i => i.src.startsWith('data:image/png')),
             noPhoto: !document.querySelector('#dogs-roster-container img[src*="assets/art"]') };
  })()`);
  check(rosterCheck.n === 8 && rosterCheck.allVector, '员工名册 8 个头像全部为矢量小狗', `${rosterCheck.n} 个`);
  check(rosterCheck.noPhoto, '名册内已无照片资源残留');
  await shot('roster_vector_avatars.png');

  await evalJs('document.querySelector("#dogs-modal .modal-close").click()');
  await evalJs('window.game.openDogProfileModal("golden")');
  await new Promise(r => setTimeout(r, 700));
  const profileCheck = await evalJs(`(() => {
    const img = document.querySelector('#dog-modal-avatar img');
    return { has: !!img, vector: !!img && img.src.startsWith('data:image/png') };
  })()`);
  check(profileCheck.vector, '狗狗档案大头像已换成矢量小狗');
  await shot('profile_vector_avatar.png');

  console.log('\n[6] 控制台检查');
  check(consoleErrors.length === 0, '全流程无 JS 报错', consoleErrors.slice(0, 3).join(' | '));

  ws.close();
  chrome.kill();
  console.log(`\n=== 头像改造验证：${pass} 通过 / ${fail} 失败 ===`);
  if (fail > 0) process.exit(1);
}

main().catch(err => { console.error('验证异常:', err); process.exit(1); });
