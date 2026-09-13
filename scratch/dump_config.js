/**
 * 从 js/config.js 导出全部数值配置为 JSON，供 generate_excel.py 生成平衡表。
 * 单一数据源：平衡表不再手抄数值，永远与游戏代码一致。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'config.js'), 'utf8'), sandbox);

const KEYS = [
  'FACILITIES_CONFIG',
  'DOG_CUISINES_CONFIG',
  'DOG_BREEDS_CONFIG',
  'OUTFITS_CONFIG',
  'DAILY_TASKS_CONFIG',
  'ACHIEVEMENTS_CONFIG',
  'TOWN_EXPANSION_STAGES',
  'PLAY_TOYS_CONFIG',
  'WEATHER_CONFIG',
  'DOGPEDIA_CONFIG',
  'PARK_ACTIVITIES_CONFIG',
  'RECIPE_UPGRADE_CONFIG',
  'COAT_COLORS_CONFIG',
  'FACILITY_CUISINE_MAP'
];

const out = {};
for (const k of KEYS) {
  try {
    out[k] = vm.runInContext(k, sandbox);
  } catch (e) {
    console.warn(`跳过 ${k}: ${e.message}`);
  }
}

// 附带升级费用公式结果 (与 WangwangFormulas.getFacilityUpgradeCost 保持一致)
const formulas = vm.runInContext('WangwangFormulas', sandbox);
out.__formulas__ = { note: '升级费用 = floor(baseUpgradeCost * costMultiplier^level)' };

const outPath = path.join(__dirname, '_config_dump.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`已导出配置快照: ${outPath}`);
console.log(`  料理工位 ${Object.keys(out.FACILITIES_CONFIG || {}).length} 个`);
console.log(`  料理菜系 ${Object.keys(out.DOG_CUISINES_CONFIG || {}).length} 个`);
console.log(`  狗狗居民 ${Object.keys(out.DOG_BREEDS_CONFIG || {}).length} 只`);
console.log(`  服装 ${(out.OUTFITS_CONFIG || []).length} 件`);
console.log(`  毛色 ${Object.values(out.COAT_COLORS_CONFIG || {}).reduce((s, l) => s + l.length, 0)} 款`);
