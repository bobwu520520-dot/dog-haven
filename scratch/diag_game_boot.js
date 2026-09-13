/**
 * 诊断：为什么 window.game 有时是 undefined
 * 关键在于「先连接 CDP、再导航」，这样才能捕获页面加载期的异常 ——
 * 现有脚本都是先用 URL 启动 Chrome，等 2~3 秒才连上去，加载期报错全被漏掉。
 */
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].find(p => fs.existsSync(p));

const SERVE_PORT = 8097, DEBUG_PORT = 9337;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function httpJson(url) {
  return new Promise((res, rej) => {
    http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}

function startServer() {
  const root = path.resolve(__dirname, '..');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
  const s = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => s.listen(SERVE_PORT, '127.0.0.1', () => r(s)));
}

async function main() {
  const server = await startServer();
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu', '--no-first-run', '--window-size=1280,900', 'about:blank'
  ]);
  await sleep(2500);

  const list = await httpJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const page = list.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1; const cbs = new Map();
  const events = [];

  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && cbs.has(m.id)) { cbs.get(m.id)(m.result, m.error); cbs.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled') {
      events.push(`[console.${m.params.type}] ` + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      events.push('[EXCEPTION] ' + (d?.exception?.description || d?.text || 'unknown'));
    } else if (m.method === 'Log.entryAdded') {
      events.push(`[log.${m.params.entry.level}] ${m.params.entry.text}`);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = id++; cbs.set(i, (r, e) => e ? rej(e) : res(r));
    ws.send(JSON.stringify({ id: i, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  console.log('--- 导航到游戏页面 ---');
  await send('Page.navigate', { url: `http://127.0.0.1:${SERVE_PORT}/` });
  await sleep(6000);

  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return 'THREW: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result ? r.result.value : undefined;
  };

  console.log('typeof window.game      =', await ev('typeof window.game'));
  console.log('window.game is object   =', await ev('typeof window.game === "object" && !!window.game'));
  console.log('typeof WangwangGame     =', await ev('typeof WangwangGame'));
  console.log('DOMContentLoaded fired? =', await ev('document.readyState'));
  console.log('btn-park-walk exists    =', await ev('!!document.getElementById("btn-park-walk")'));
  console.log('scripts loaded          =', await ev('Array.from(document.scripts).map(s=>s.src.split("/").pop()).join(",")'));

  // 若确实没建起来，手动尝试一次，把真实异常抓出来
  const manual = await ev(`(() => {
    if (window.game) return 'already ok';
    try { window.game = new WangwangGame(); return 'manual construct OK'; }
    catch (e) { return 'manual construct THREW: ' + (e && e.stack ? e.stack.split('\\n').slice(0,4).join(' | ') : e); }
  })()`);
  console.log('手动构造                =', manual);

  console.log('\n--- 页面事件（加载期） ---');
  if (!events.length) console.log('(无)');
  events.slice(0, 25).forEach(e => console.log('  ' + e));

  ws.close(); chrome.kill(); server.close();
  process.exit(0);
}
main().catch(e => { console.error('诊断失败:', e); process.exit(1); });
