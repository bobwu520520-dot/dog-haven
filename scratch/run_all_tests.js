/**
 * 《汪汪小馆》测试总入口 —— 一键运行 scratch 下全部自动化测试
 * 用法: node scratch/run_all_tests.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
  { file: 'test_cats_soup_layout.js', name: '场景布局与出餐流程' },
  { file: 'test_golden_start_and_loop.js', name: '金毛开局与 7 节点核心放置循环' },
  { file: 'test_golden_migration_and_anim.js', name: '旧档纠偏迁移与园艺道具渲染' },
  { file: 'test_dog_behavior.js', name: '犬种专属行为序列' },
  { file: 'test_chapter1_features.js', name: '第 1 章核心玩法与四大支柱' },
  { file: 'test_chapter1_gaps.js', name: '第 1 章缺口补齐验证（切食材/食谱/毛色/双迷你玩法）' },
  { file: 'test_sprite_portrait.js', name: '写实立绘渲染管线（抠底/包围盒/分支切换/头像一致）' },
  { file: 'test_chapter2_features.js', name: '第 2 章系统（钻石/稀有度/天赋/抽卡保底/传说变体）' }
];

const results = [];
for (const suite of SUITES) {
  const filePath = path.join(__dirname, suite.file);
  process.stdout.write(`\n${'='.repeat(72)}\n▶ ${suite.name}  (${suite.file})\n${'='.repeat(72)}\n`);
  const r = spawnSync(process.execPath, [filePath], { stdio: 'inherit' });
  const ok = r.status === 0;
  results.push({ ...suite, ok });
}

console.log(`\n${'='.repeat(72)}\n测试总览\n${'='.repeat(72)}`);
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? '✅ PASS' : '❌ FAIL'}  ${r.name.padEnd(38)} ${r.file}`);
  if (!r.ok) failed++;
}
console.log(`\n共 ${results.length} 个测试套件，${results.length - failed} 通过 / ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
