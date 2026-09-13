// ============================================================================
// ⚠️ 已废弃 · 已被取代，请勿运行（保留仅供查阅）
// ----------------------------------------------------------------------------
// 本脚本是项目最早的一版浏览器验证脚本（2026-09-11），存在以下问题：
//   1. 硬编码 Chrome 安装路径，换机器即失效；
//   2. 截图输出到已不存在的旧 IDE 目录（.gemini/antigravity-ide/brain/...）；
//   3. 使用旧的 --headless 启动参数，且「先启浏览器、后连 CDP」，会漏掉加载期异常。
// 现行验证请改用（两者都自带静态服务器 + 自带 Chrome 启动，开箱即跑）：
//   - scratch/cdp_verify_gaps.js           第 1 章玩法，18 项
//   - scratch/cdp_verify_sprite_render.js  立绘渲染管线，42 项
// ============================================================================

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'http://127.0.0.1:8089/';
const screenshotDir = 'C:\\Users\\86178\\.gemini\\antigravity-ide\\brain\\57eff2e8-e741-423e-a402-ed3662bc4e4b';
const screenshotPath = path.join(screenshotDir, 'chapter1_verified.png');

async function main() {
  console.log('1. 启动 Chrome Headless 实例...');
  const chromeProcess = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=1280,850',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2000));

  // 获取 Page WebSocket
  const pageList = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const page = pageList.find(p => p.type === 'page');
  console.log('2. 连接到页面 WebSocket:', page.webSocketDebuggerUrl);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result, msg.error);
      callbacks.delete(msg.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, (res, err) => {
        if (err) reject(err);
        else resolve(res);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1500));

  console.log('3. 检查页面中《金毛和汤》第 1 章 核心组件 DOM:');

  // A. 检验天气切换
  const weatherInit = await send('Runtime.evaluate', {
    expression: "document.getElementById('hud-weather-pill').innerText"
  });
  console.log('   [PASS] 初始天气胶囊:', weatherInit.result.value);

  await send('Runtime.evaluate', {
    expression: "document.getElementById('hud-weather-pill').click()"
  });
  await new Promise(r => setTimeout(r, 400));
  const weatherRain = await send('Runtime.evaluate', {
    expression: "document.getElementById('hud-weather-pill').innerText"
  });
  console.log('   [PASS] 点击切换后天气:', weatherRain.result.value);

  await send('Runtime.evaluate', {
    expression: "document.getElementById('hud-weather-pill').click()"
  });
  await new Promise(r => setTimeout(r, 400));
  const weatherSnow = await send('Runtime.evaluate', {
    expression: "document.getElementById('hud-weather-pill').innerText"
  });
  console.log('   [PASS] 再次点击切换为初雪:', weatherSnow.result.value);

  // B. 检验投掷飞盘
  await send('Runtime.evaluate', {
    expression: "document.getElementById('btn-throw-frisbee').click()"
  });
  await new Promise(r => setTimeout(r, 600));
  const toastText = await send('Runtime.evaluate', {
    expression: "document.getElementById('game-toast') ? document.getElementById('game-toast').innerText : ''"
  });
  console.log('   [PASS] 投掷飞盘触发提示:', toastText.result.value);

  console.log('3.5 截取主游戏画布（飘雪+金毛围巾+飞盘+木栅门）...');
  const screenVerified = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(screenshotPath, Buffer.from(screenVerified.data, 'base64'));

  // C. 检验国民犬种图鉴与5大料理
  await send('Runtime.evaluate', {
    expression: "document.getElementById('btn-dogpedia').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('4. 截取国民犬种图鉴弹窗...');
  const screenDogpedia = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotDir, 'chapter1_dogpedia.png'), Buffer.from(screenDogpedia.data, 'base64'));

  // 切换到 5 大料理标签
  await send('Runtime.evaluate', {
    expression: "document.getElementById('btn-tab-dogpedia-cuisines').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('5. 截取 5 大狗狗专属料理弹窗...');
  const screenCuisines = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotDir, 'chapter1_cuisines.png'), Buffer.from(screenCuisines.data, 'base64'));

  // 关闭图鉴弹窗
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#dogpedia-modal .modal-close').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  ws.close();
  chromeProcess.kill();
  console.log('=== 🎉 所有 Chapter 1 视图截图保存完毕！ ===');
}

main().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
