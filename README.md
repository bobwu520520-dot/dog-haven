# 汪汪小馆 / 金毛和汤 · Dog Haven

一款 HTML5 Canvas 放置经营游戏。核心循环：**狗狗切食材 → 丢进料理工位 → 成品卖出换金币 → 升级工位/食谱 → 解锁新犬种与新地块**。

- **技术栈**：原生 HTML5 + Canvas 2D + 原生 JS（ES6 class），**无构建工具、无依赖、无后端**
- **美术**：8 张犬种写实立绘（运行时抠白底）+ 矢量手绘场景与动作
- **音频**：`js/audio.js` 程序化生成 BGM / ASMR 音效（无音频文件）

---

## 一、快速开始

### 方式 A：一键启动（Windows）

双击 **`启动汪汪小馆.bat`** —— 会自动起本地服务器并打开浏览器。

### 方式 B：手动启动

```bash
node serve.js          # 默认 http://127.0.0.1:8089
```

然后浏览器打开 `http://127.0.0.1:8089/`。

> ⚠️ **必须通过 HTTP 打开，不能直接双击 `index.html`。**
> 游戏需要读取立绘像素做抠底（`getImageData`），`file://` 协议下会被浏览器判定为跨域而失败 —— 此时立绘会退化为「带白色底块的方块」。

---

## 二、目录结构

```
dog_haven/
├── index.html                 # 入口页（含全部 UI 结构）
├── serve.js                   # 极简静态服务器（端口 8089）
├── 启动汪汪小馆.bat            # Windows 一键启动
├── generate_excel.py          # 由 config.js 生成数值平衡表
├── 金毛和汤_数值配置与经济平衡表.xlsx   # 数值平衡表（由上面脚本生成）
│
├── css/main.css               # 全部样式
│
├── js/
│   ├── config.js              # ★ 数值唯一来源：工位/菜系/犬种/毛色/服装/成就/小镇阶段
│   ├── game.js                # 主控制器：主循环、存档、UI 绑定、图鉴
│   ├── kitchen.js             # 场景渲染 + 出餐托盘 + 迷你玩法特效（实际渲染主体）
│   ├── dog.js                 # ★ 狗狗实体：状态机、动作、立绘渲染、头像生成
│   ├── sprite.js              # ★ 立绘加载器：抠白底 + 羽化 + 包围盒
│   ├── economy.js             # 经济系统：离线收益、食谱加成、全局产速
│   ├── wardrobe.js            # 换装系统
│   ├── audio.js               # 程序化音频
│   ├── scene.js               # ⚠️ 已废弃（见文件头说明）
│   └── furniture.js           # ⚠️ 已废弃（见文件头说明）
│
├── assets/art/                # 8 张犬种立绘 + 部分闲置素材（见 docs 报告第五节）
│
├── docs/
│   ├── 第1章实现核对报告.md      # 第 1 章实现现状核对与改动清单
│   ├── 第2章实现核对报告.md      # ★ 第 2 章 7 大系统详细设计实现核对报告
│   └── 玩法与平衡设计简报.md     # 经济平衡诊断与调优方案
│
└── scratch/                   # 测试与验证脚本（开发用，不影响游戏运行）
    ├── run_all_tests.js              # ★ 测试总入口（8 个套件全绿）
    ├── test_chapter2_features.js     # ★ 第 2 章核心系统（73 项断言）
    ├── test_*.js                     # 单元/集成测试（Node vm 沙箱）
    ├── cdp_verify_gaps.js            # 浏览器端到端验证：第 2 章玩法（34 项断言）
    ├── cdp_verify_sprite_render.js   # 浏览器端到端验证：10 犬种立绘管线（44 项断言）
    ├── cdp_breed_sheet.js            # 导出犬种立绘/头像总览图（视觉 QA）
    ├── dump_config.js                # 从 config.js 导出数值快照
    ├── head_grid.py                  # 生成头部标定网格图（新增立绘时用）
    └── shots/                        # 验证截图产物
```

★ = 核心文件　⚠️ = 已废弃，勿当活代码修改

---

## 三、验证与测试

改完代码**必跑**以下三套（全绿才算通过）：

```bash
# 1) 单元 / 集成测试：8 个套件全部通过（包含第 2 章 73 项断言）
node scratch/run_all_tests.js

# 2) 真实浏览器验证：第 2 章玩法，34 项断言全部通过
node scratch/cdp_verify_gaps.js

# 3) 真实浏览器验证：10 犬种立绘与场景管线，44 项断言全部通过
node scratch/cdp_verify_sprite_render.js
```

后两者会**自动启动静态服务器 + 自动启动 Chrome/Edge（无头模式）**，开箱即跑，无需任何前置。
它们会把「外部噪声」（如离线环境下 Google Fonts CDN 不可达、favicon 404）从报错断言中剔除，只对应用自身错误断言。

视觉 QA：`node scratch/cdp_breed_sheet.js` → 导出 `scratch/shots/{breed_sheet,avatar_sheet}.png`。

---

## 四、改数值的正确姿势

**数值唯一来源是 `js/config.js`**，禁止手抄到别处。改完数值后重新生成平衡表：

```bash
node scratch/dump_config.js && python generate_excel.py
```

---

## 五、已知约定与陷阱

| 事项 | 说明 |
|---|---|
| **立绘朝向分两派** | 金毛/边牧/萨摩耶/拉布拉多朝左，柴犬/柯基/哈士奇/法斗朝右。**新增或替换立绘素材后，必须在 `DogChef.SPRITE_TUNING` 逐犬种声明 `artFacing`**，否则狗狗会「倒着走」。 |
| **染色必须在离屏 canvas** | 毛色染色要用立绘自身 alpha 做遮罩。**绝不可**在主画布上 `fillRect + source-atop` —— 主画布已被草地铺满，会导致整块矩形被染色。 |
| **工位 key ≠ 菜系 key** | 工位是 `stew/bbq/bake/hotpot/jerky`，菜系中 `bakery` 刻意与工位 `bake` 不同名，避免与旧 key 冲突。 |
| **犬种 id ≠ 素材文件名** | 犬种 id 是 `frenchie`，而素材文件是 `french_bulldog.jpg`。 |
| **共享数组引用** | `DOG_CUISINES_CONFIG[id].dishes` 与 `FACILITIES_CONFIG[id].dishes` 是**同一数组引用**，不存在双份维护。 |

---

## 六、待决策事项

详见 `docs/第1章实现核对报告.md` 第五节，摘要：

1. **4.27MB 闲置素材**（占 `assets/art` 的 63%）已停止加载但**未删除** —— 删不删属产品决策。
2. **设施产出物仍是「小镇特产」**（花卉/信件/苹果…），未按 GDD 改为 5 大料理工位成品名 —— 会牵动存档结构。
3. **经济平衡方案 C 已测算但未实施**（`costMultiplier` 1.15→1.22、解锁费 ×3 等），见平衡简报。
4. **立绘素材风格统一性**：新增的边牧/萨摩耶线条比原 6 张略干净，并排可辨。

---

## 七、存档

存档走 `localStorage`，`saveGameData()` / `loadSaveData()` 带版本号与字段回退，老存档缺失字段会自动补默认值。清档：浏览器控制台执行 `localStorage.clear()` 后刷新。
