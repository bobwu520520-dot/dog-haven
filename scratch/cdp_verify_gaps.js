/**
 * 第 1 章缺口补齐 —— 真实浏览器 (Chrome Headless CDP) 端到端验证
 * 覆盖：切食材 / 食谱升级 / 毛色收集 / 公园散步 / 水里捡球 / 控制台无报错
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
const chromePath = CHROME_CANDIDATES.find(p => fs.existsSync(p));
// 本脚本自带静态服务器（与 cdp_verify_sprite_render.js 同一套做法）。
// 早期版本依赖「外部先跑起 serve.js」，但默认端口写的是 8099，而 serve.js 实际监听
// 8089 —— 两者对不上，于是脚本永远连不上页面，报出的却是一堆「功能不存在」的假失败。
// 现在改为自己起服务，杜绝这个坑；如需指向别的地址仍可用 TARGET_URL 覆盖。
const SERVE_PORT = Number(process.env.SERVE_PORT || 8099);
const TARGET_URL = process.env.TARGET_URL || `http://127.0.0.1:${SERVE_PORT}/`;
const OUT_DIR = path.resolve(__dirname, '..', 'scratch', 'shots');
const PORT = 9333;

// 极简静态文件服务器：立绘/字体等本地资源必须走 http 才能读取像素
function startServer() {
  const root = path.resolve(__dirname, '..');
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf'
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
  return new Promise((resolve) => server.listen(SERVE_PORT, '127.0.0.1', () => resolve(server)));
}

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
  if (!chromePath) throw new Error('未找到 Chrome / Edge 可执行文件');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await startServer();
  console.log(`静态服务器已启动: ${TARGET_URL}`);

  // 每次用独立的临时 profile：否则若上一轮 Chrome 还没退干净，新一轮会因
  // profile 被占用而「启动成功但没真正加载页面」，表现为 window.game 莫名其妙是
  // undefined、一堆功能断言假失败（这个坑真的踩到过）。
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doghaven-cdp-'));

  console.log(`启动浏览器: ${chromePath}`);
  // 先开 about:blank，连上 CDP 之后再导航 —— 这样页面加载期的异常也能被捕获，
  // 而不是像早期那样「带着 URL 启动、几秒后才连」，把加载期报错全漏掉。
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1280,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const list = await httpJson(`http://127.0.0.1:${PORT}/json`);
  const page = list.find(p => p.type === 'page');
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
      consoleErrors.push(msg.params.args.map(a => a.value || a.description || '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXCEPTION: ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || 'unknown'));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      // 浏览器层面的错误（脚本 404、解码失败等）只走 Log 域，不会出现在 console 里。
      // 漏掉它就会误以为「加载过程无报错」，而实际上某个 js 根本没加载成功。
      // 带上 url，否则只看到一句「404」根本不知道该补哪个文件。
      const e = msg.params.entry;
      consoleErrors.push('LOG: ' + e.text + (e.url ? ' <' + e.url + '>' : ''));
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, (res, err) => err ? reject(err) : resolve(res));
    ws.send(JSON.stringify({ id, method, params }));
  });

  // 把「应用自身的问题」和「外部依赖/环境噪声」分开。
  // 游戏页面会去 fonts.googleapis.com 拉字体，在离线或国内网络下必然失败 ——
  // 那属于部署层面的隐患（值得单独提醒），不该让功能回归测试跟着一起红。
  const EXTERNAL_NOISE = [
    'fonts.googleapis.com', 'fonts.gstatic.com', 'favicon.ico',
    'ERR_NAME_NOT_RESOLVED', 'ERR_INTERNET_DISCONNECTED'
  ];
  const isExternal = (line) => EXTERNAL_NOISE.some((n) => line.includes(n));
  const externalNoise = () => consoleErrors.filter(isExternal);
  const appErrors = () => consoleErrors.filter((e) => !isExternal(e));

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  // 连上之后再导航，确保加载期异常也能被上面的监听器捕获
  await send('Page.navigate', { url: TARGET_URL });
  await new Promise(r => setTimeout(r, 4000));

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
  const booted = await evalJs('typeof window.game === "object" && !!window.game');
  check(booted, '游戏主控制器已启动');
  if (!booted) {
    // 失败时把现场信息打出来，避免只看到一句「未启动」而无从下手
    console.log('      诊断:');
    console.log('        readyState  =', await evalJs('document.readyState'));
    console.log('        已加载脚本  =', await evalJs('Array.from(document.scripts).map(s=>s.src.split("/").pop()).join(",")'));
    console.log('        WangwangGame=', await evalJs('typeof WangwangGame'));
    console.log('        手动构造    =', await evalJs(`(() => {
      try { window.game = new WangwangGame(); return 'OK'; }
      catch (e) { return 'THREW: ' + (e && e.stack ? e.stack.split('\\n').slice(0,3).join(' | ') : e); }
    })()`));
    console.log('        页面事件    =', consoleErrors.slice(0, 5).join(' | ') || '(无)');
  }
  check(appErrors().length === 0, '加载过程无 JS 报错', appErrors().slice(0, 3).join(' | '));
  if (externalNoise().length) {
    console.log('      ℹ️ 外部资源噪声（不计入失败）:', externalNoise().slice(0, 2).join(' | '));
  }

  console.log('\n[2] 新增 HUD 入口');
  check(await evalJs('!!document.getElementById("btn-park-walk")'), '公园散步按钮存在');
  check(await evalJs('!!document.getElementById("btn-water-fetch")'), '水里捡球按钮存在');

  console.log('\n[3] 公园散步 端到端');
  await evalJs('document.getElementById("btn-park-walk").click()');
  await new Promise(r => setTimeout(r, 700));
  const walkState = await evalJs(`(() => {
    const d = Array.from(window.game.dogs.values()).find(x => x.routineState === 'park_walk' || x.routineState === 'park_walk_return');
    return d ? { name: d.name, state: d.routineState, walking: d.isParkWalking } : null;
  })()`);
  check(!!walkState, '点击后狗狗进入公园散步状态', walkState ? `${walkState.name} / ${walkState.state}` : '');
  check(await evalJs('window.game.kitchen.parkWalkCooldown > 0'), '散步冷却已生效');

  console.log('\n[4] 水里捡球 端到端');
  await evalJs(`(() => {
    window.game.kitchen.waterFetchCooldown = 0;
    // 结束上一步散步，避免狗狗仍在散步状态
    const g = window.game.dogs.get('golden');
    g.routineState = null; g.isParkWalking = false;
  })()`);
  await evalJs('document.getElementById("btn-water-fetch").click()');
  await new Promise(r => setTimeout(r, 700));
  const waterState = await evalJs(`(() => {
    const d = Array.from(window.game.dogs.values()).find(x => x.routineState === 'water_dive' || x.routineState === 'water_return');
    return { dog: d ? d.name : null, state: d ? d.routineState : null,
             balls: window.game.kitchen.activeWaterBalls.length,
             splashes: window.game.kitchen.waterSplashes.length };
  })()`);
  check(!!waterState.dog, '点击后狗狗纵身入水', `${waterState.dog} / ${waterState.state}`);
  check(waterState.balls >= 1, '弹力球已入水', `balls=${waterState.balls}`);
  check(waterState.splashes > 0, '水花粒子已生成', `splashes=${waterState.splashes}`);
  const shotWater = await shot('gaps_water_fetch.png');

  console.log('\n[5] 切食材环节');
  const chopInfo = await evalJs(`(() => {
    const g = window.game.dogs.get('golden');
    // 注意：这里必须用当前有效的工位 key。早期写的是旧 6 工坊时代的 'garden'，
    // 迁移到 5 大料理工位后该 key 已不存在 —— 会让狗狗挂在一个无效岗位上，
    // 进而在渲染名册时踩到 kitchen.stations['garden'] === undefined 而报错。
    g.assignedFacility = 'stew'; g.routineState = null; g.routineCooldown = 0;
    for (let i = 0; i < 80 && g.routineState !== 'chop_ingredients'; i++) {
      g.routineCooldown = 0; g.startNextBehaviorRoutine();
    }
    const state = g.routineState;
    g.chopTimer = 0;
    for (let i = 0; i < 12; i++) g.update(0.1, {minX:80,maxX:920,minY:90,maxY:480});
    return { state, particles: g.chopParticles.length, chopped: g.totalChopped };
  })()`);
  check(chopInfo.state === 'chop_ingredients', '在岗狗狗进入切食材状态');
  check(chopInfo.particles > 0, '切食材碎块粒子已生成', `particles=${chopInfo.particles}`);
  const shotChop = await shot('gaps_chop_ingredients.png');
  await evalJs('window.game.dogs.get("golden").routineState = null');

  console.log('\n[6] 食谱升级 UI 端到端');
  await evalJs('window.game.economy.gold = 5000000; window.game.openTabModal("dogpedia")');
  await new Promise(r => setTimeout(r, 500));
  await evalJs('document.getElementById("btn-tab-dogpedia-cuisines").click()');
  await new Promise(r => setTimeout(r, 500));
  const recipeBtns = await evalJs('document.querySelectorAll(".btn-upgrade-recipe").length');
  check(recipeBtns > 0, '食谱升级按钮已渲染', `${recipeBtns} 个可升级菜系`);
  const before = await evalJs('window.game.economy.getRecipeLevel("stew")');
  await evalJs('document.querySelector(".btn-upgrade-recipe").click()');
  await new Promise(r => setTimeout(r, 600));
  const after = await evalJs('window.game.economy.getRecipeLevel("stew")');
  check(after === before + 1, '点击后食谱等级提升', `Lv.${before} → Lv.${after}`);
  const shotRecipe = await shot('gaps_recipe_upgrade.png');
  await evalJs('document.querySelector("#dogpedia-modal .modal-close").click()');

  console.log('\n[7] 毛色收集 UI 端到端');
  await evalJs('window.game.economy.bones = 500; window.game.openTabModal("wardrobe")');
  await new Promise(r => setTimeout(r, 500));
  const coatTab = await evalJs('!!document.querySelector(\'#wardrobe-tabs .sub-tab[data-cat="coat"]\')');
  check(coatTab, '衣橱新增「毛色」页签');
  await evalJs('document.querySelector(\'#wardrobe-tabs .sub-tab[data-cat="coat"]\').click()');
  await new Promise(r => setTimeout(r, 500));
  const coatCards = await evalJs('document.querySelectorAll("#wardrobe-items-container .outfit-card").length');
  check(coatCards > 0, '毛色卡片已渲染', `${coatCards} 张`);
  const colorBefore = await evalJs('window.game.dogs.get(window.game.selectedDogId).getRenderColors().body');
  await evalJs('(() => { const b = document.querySelector(".btn-buy-coat") || document.querySelector(".btn-equip-coat"); if (b) b.click(); })()');
  await new Promise(r => setTimeout(r, 700));
  const colorAfter = await evalJs('window.game.dogs.get(window.game.selectedDogId).getRenderColors().body');
  check(colorBefore !== colorAfter, '染色后渲染配色实时变化', `${colorBefore} → ${colorAfter}`);
  const shotCoat = await shot('gaps_coat_color.png');
  await evalJs('document.querySelector("#wardrobe-modal .modal-close").click()');

  console.log('\n[8] 阳光公园公共设施 (GDD 1.2 公园主题)');
  check(await evalJs('typeof window.game.kitchen.drawParkFurnishings === "function"'), 'drawParkFurnishings() 已挂载');
  // 关闭所有弹窗后回到纯场景截图
  await evalJs(`document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'))`);
  await new Promise(r => setTimeout(r, 900));
  const shotPark = await shot('gaps_park_scene.png');

  // ==================== GDD 第 2 章 ====================
  console.log('\n[9] GDD 2.3 钻石货币 HUD');
  check(await evalJs('typeof window.game.economy.diamonds === "number"'), '经济系统已持有钻石字段');
  const diamondHud = await evalJs(`(() => {
    const el = document.getElementById('hud-diamonds');
    return { exists: !!el, text: el ? el.innerText : '' };
  })()`);
  check(diamondHud && diamondHud.exists, 'HUD 显示钻石货币', diamondHud ? `当前 💎${diamondHud.text}` : '');
  const hudSync = await evalJs(`(() => {
    window.game.economy.diamonds = 888;
    window.game.updateHUD();
    return document.getElementById('hud-diamonds').innerText;
  })()`);
  check(hudSync === '888', '钻石变动后 HUD 实时同步', `显示 ${hudSync}`);

  console.log('\n[10] GDD 2.1 犬种收集与稀有度');
  const breedInfo = await evalJs(`(() => {
    const ids = Object.keys(window.DOG_BREEDS_CONFIG);
    const cards = window.DOG_CARDS_CONFIG;
    const byRarity = {};
    ids.forEach(id => {
      const r = cards[id] ? cards[id].rarity : 'none';
      byRarity[r] = (byRarity[r] || 0) + 1;
    });
    return { count: ids.length, byRarity, hasPassive: ids.every(id => cards[id] && cards[id].passive) };
  })()`);
  check(breedInfo && breedInfo.count === 10, '浏览器内加载 10 个犬种', `实际 ${breedInfo && breedInfo.count}`);
  check(breedInfo && breedInfo.hasPassive, '10 犬种均带天赋被动');
  check(breedInfo && breedInfo.byRarity.common === 4 && breedInfo.byRarity.rare === 4 && breedInfo.byRarity.epic === 2,
    '稀有度分布符合 GDD 2.1（4 普通 / 4 稀有 / 2 史诗）',
    breedInfo ? JSON.stringify(breedInfo.byRarity) : '');

  console.log('\n[11] GDD 2.1 犬种召唤 UI 端到端');
  // 走真实打开路径：renderMarketUI() 负责绑定按钮事件，再显示弹窗。
  // （直接 classList.remove('hidden') 只会显示弹窗、不会绑定事件，按钮点了没反应。）
  await evalJs(`(() => {
    window.game.renderMarketUI();
    document.getElementById('market-modal').classList.remove('hidden');
  })()`);
  await new Promise(r => setTimeout(r, 300));
  const gachaBtns = await evalJs(`(() => {
    const s = document.getElementById('btn-dog-gacha-single');
    const t = document.getElementById('btn-dog-gacha-ten');
    return { single: !!s, ten: !!t, singleText: s ? s.innerText : '', tenText: t ? t.innerText : '' };
  })()`);
  check(gachaBtns && gachaBtns.single && gachaBtns.ten, '犬种召唤单抽/十连按钮已渲染',
    gachaBtns ? `${gachaBtns.singleText} | ${gachaBtns.tenText}` : '');

  const pityUi = await evalJs(`(() => {
    const l = document.getElementById('gacha-pity-legendary');
    const e = document.getElementById('gacha-pity-epic');
    const r = document.getElementById('gacha-pity-rare');
    return { l: l ? l.innerText : '', e: e ? e.innerText : '', r: r ? r.innerText : '' };
  })()`);
  check(pityUi && pityUi.l === '80' && pityUi.e === '30' && pityUi.r === '10',
    '保底进度文案正确渲染', pityUi ? `传说${pityUi.l} / 史诗${pityUi.e} / 稀有${pityUi.r}` : '');

  // 点击单抽：钻石应减少 60，结果弹窗应出现
  const beforeDraw = await evalJs('window.game.economy.diamonds');
  await evalJs(`(() => {
    window.game.economy.diamonds = 600;
    window.game.updateHUD();
    document.getElementById('btn-dog-gacha-single').click();
  })()`);
  await new Promise(r => setTimeout(r, 600));
  const afterDraw = await evalJs(`(() => ({
    diamonds: window.game.economy.diamonds,
    resultShown: !document.getElementById('gacha-result-modal').classList.contains('hidden'),
    cards: document.querySelectorAll('#gacha-cards-container .gacha-result-card').length,
    totalDraws: window.game.economy.gachaStats.totalDraws
  }))()`);
  check(afterDraw && afterDraw.diamonds === 540, '单抽扣除 60 钻石', `💎600 → 💎${afterDraw && afterDraw.diamonds}`);
  check(afterDraw && afterDraw.resultShown && afterDraw.cards === 1, '抽取结果弹窗展示 1 张卡', `cards=${afterDraw && afterDraw.cards}`);
  check(afterDraw && afterDraw.totalDraws >= 1, '抽卡统计已累计', `累计 ${afterDraw && afterDraw.totalDraws} 抽`);
  const shotGacha = await shot('gaps_dog_gacha.png');

  // 十连
  // 注意：抽到重复卡会**返还钻石**，所以不能直接断言余额恰好等于 2000-540。
  // 改为断言「实际扣费（diamondSpent 增量）恰好 540」——这才是真正的定价不变量。
  const spentBefore = await evalJs('window.game.economy.gachaStats.diamondSpent');
  await evalJs(`(() => {
    window.game.economy.diamonds = 2000;
    window.game.updateHUD();
    document.getElementById('btn-dog-gacha-ten').click();
  })()`);
  await new Promise(r => setTimeout(r, 600));
  const tenRes = await evalJs(`(() => ({
    diamonds: window.game.economy.diamonds,
    spent: window.game.economy.gachaStats.diamondSpent,
    cards: document.querySelectorAll('#gacha-cards-container .gacha-result-card').length
  }))()`);
  check(tenRes && (tenRes.spent - spentBefore) === 540, '十连扣费恰好 540 钻石（9 折）',
    `扣费 💎${tenRes ? tenRes.spent - spentBefore : '?'}（重复返还后余额 💎${tenRes && tenRes.diamonds}）`);
  check(tenRes && tenRes.cards === 10, '十连结果弹窗展示 10 张卡', `cards=${tenRes && tenRes.cards}`);
  const shotTen = await shot('gaps_dog_gacha_ten.png');

  console.log('\n[12] GDD 2.1 传说变体与专属毛色');
  const variantCheck = await evalJs(`(() => {
    // 直接把保底推到临界，逼出一次传说
    window.game.economy.gachaPity.sinceLegendary = window.DOG_GACHA_CONFIG.pityLegendary - 1;
    window.game.economy.diamonds = 600;
    const res = window.game.gacha.draw(1);
    const r = res.results[0];
    const d = window.game.gacha.describe(r.entry);
    return {
      rarity: r.entry.rarity, kind: r.entry.kind, isNew: r.isNew,
      name: d.name, coatOwned: d.kind === 'variant'
        ? window.game.wardrobe.isCoatOwned(window.DOG_VARIANTS_CONFIG.find(v => v.id === r.entry.id).coat.id)
        : null,
      ownedVariants: Array.from(window.game.economy.ownedVariantIds)
    };
  })()`);
  check(variantCheck && variantCheck.rarity === 'legendary', '保底触发传说变体', variantCheck ? variantCheck.name : '');
  check(variantCheck && variantCheck.ownedVariants.length > 0, '变体已记录为拥有',
    variantCheck ? variantCheck.ownedVariants.join(',') : '');
  if (variantCheck && variantCheck.kind === 'variant' && variantCheck.isNew) {
    check(variantCheck.coatOwned === true, '传说变体同时解锁专属发光毛色');
  }

  console.log('\n[13] 最终控制台检查');
  check(appErrors().length === 0, '全流程无 JS 报错', appErrors().slice(0, 3).join(' | '));

  ws.close();
  chrome.kill();
  server.close();

  console.log(`\n截图输出: ${OUT_DIR}`);
  [shotWater, shotChop, shotRecipe, shotCoat, shotPark, shotGacha, shotTen]
    .filter(Boolean).forEach(p => console.log('  - ' + path.basename(p)));
  console.log(`\n=== 浏览器验证结果：${pass} 通过 / ${fail} 失败 ===`);
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error('验证异常:', err);
  process.exit(1);
});
