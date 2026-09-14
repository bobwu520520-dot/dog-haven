/**
 * 《汪汪小馆 (Wangwang Diner)》- 游戏核心数据配置表
 * 根据游戏设计文档 (GDD v1.0) 严格制定
 */
// 5 大狗狗料理工位及其三阶料理配置 (GDD 1.2 料理：炖汤、烧烤、烘焙、狗狗火锅、肉干零食)
// 每座工位生产 3 阶料理，随工位等级 1 / 10 / 25 逐级解锁；狗狗在岗时负责切食材与烹饪
var FACILITIES_CONFIG = {
  stew: {
    id: 'stew',
    name: '鲜美炖汤锅',
    icon: '🍲',
    cuisineId: 'stew',
    applianceName: '文火大铁锅炖汤台',
    unlockCost: 0, // 初始拥有！金毛炖汤主厨守在大铁锅旁
    baseUpgradeCost: 10,
    costMultiplier: 1.15,
    speedPerLevel: 0.04,
    autoCollectUnlockLevel: 20,
    dishes: [
      {
        id: 'stew_1',
        name: '大骨蔬菜浓汤',
        icon: '🍲',
        minLevel: 1,
        baseTime: 3.2,
        basePrice: 20,
        ingredients: '牛大骨 + 甜胡萝卜',
        desc: '大骨文火慢熬浓汤，香味四溢，是小镇最经典的暖心第一碗。'
      },
      {
        id: 'stew_2',
        name: '胡萝卜鲜鸡煲',
        icon: '🥣',
        minLevel: 10,
        baseTime: 4.5,
        basePrice: 45,
        ingredients: '鲜鸡胸肉 + 甜脆胡萝卜',
        desc: '鸡胸肉与甜脆胡萝卜熬制的营养暖汤，清甜不腻。'
      },
      {
        id: 'stew_3',
        name: '滋补牛腩鲜菇汤',
        icon: '🥘',
        minLevel: 25,
        baseTime: 6.0,
        basePrice: 95,
        ingredients: '精选牛腩 + 高原口蘑',
        desc: '浓郁醇厚的珍品牛腩汤，喝上一口全身暖洋洋！'
      }
    ]
  },
  bbq: {
    id: 'bbq',
    name: '慢烤烧烤架',
    icon: '🍢',
    cuisineId: 'bbq',
    applianceName: '纯炭火慢烤烧烤架',
    unlockCost: 150, // 柴犬烧烤主厨上岗
    baseUpgradeCost: 20,
    costMultiplier: 1.15,
    speedPerLevel: 0.04,
    autoCollectUnlockLevel: 20,
    dishes: [
      {
        id: 'bbq_1',
        name: '炭火慢烤肉串',
        icon: '🍢',
        minLevel: 1,
        baseTime: 3.8,
        basePrice: 55,
        ingredients: '新鲜鸡肉 + 羊奶酪丁',
        desc: '炭火微微焦香的嫩肉串，嚼劲十足，狗狗闻到口水直流。'
      },
      {
        id: 'bbq_2',
        name: '脆香鸡肉卷',
        icon: '🍖',
        minLevel: 10,
        baseTime: 5.2,
        basePrice: 115,
        ingredients: '金黄脆皮 + 纯肉馅料',
        desc: '金黄薄脆外皮包裹的鲜嫩鸡肉，一口咬下咔嚓作响。'
      },
      {
        id: 'bbq_3',
        name: '炙烤无骨纯牛排',
        icon: '🥩',
        minLevel: 25,
        baseTime: 6.8,
        basePrice: 245,
        ingredients: '厚切纯牛排 + 炭香微焦',
        desc: '厚切原汁牛排，炭烤出迷人菱格纹，是拉布拉多的最爱！'
      }
    ]
  },
  bake: {
    id: 'bake',
    name: '甜品烘焙屋',
    icon: '🧁',
    cuisineId: 'bakery',
    applianceName: '微笑甜品烘焙工坊',
    unlockCost: 1500, // 萨摩耶甜品主厨上岗
    baseUpgradeCost: 80,
    costMultiplier: 1.15,
    speedPerLevel: 0.04,
    autoCollectUnlockLevel: 20,
    dishes: [
      {
        id: 'bakery_1',
        name: '萌爪骨头曲奇',
        icon: '🍪',
        minLevel: 1,
        baseTime: 5.6,
        basePrice: 150,
        ingredients: '燕麦面粉 + 纯骨髓粉',
        desc: '揉入骨髓粉的脆爽黄油小饼干，造型是可爱的骨头与肉垫。'
      },
      {
        id: 'bakery_2',
        name: '羊奶纸杯蛋糕',
        icon: '🧁',
        minLevel: 10,
        baseTime: 7.4,
        basePrice: 330,
        ingredients: '新鲜羊奶 + 宠物酸奶糖霜',
        desc: '顶着酸奶小肉垫糖霜的松软蛋糕，奶香松软入口即化。'
      },
      {
        id: 'bakery_3',
        name: '草莓肉松舒芙蕾',
        icon: '🍰',
        minLevel: 25,
        baseTime: 9.4,
        basePrice: 700,
        ingredients: '冻干草莓 + 纯肉松粉',
        desc: '入口即化的梦幻空气蛋糕，是萨摩耶的招牌甜点！'
      }
    ]
  },
  hotpot: {
    id: 'hotpot',
    name: '狗狗火锅台',
    icon: '🫕',
    cuisineId: 'hotpot',
    applianceName: '热气腾腾寿喜火锅台',
    unlockCost: 12000, // 边牧火锅主厨上岗
    baseUpgradeCost: 240,
    costMultiplier: 1.15,
    speedPerLevel: 0.04,
    autoCollectUnlockLevel: 20,
    dishes: [
      {
        id: 'hotpot_1',
        name: '原汁暖心小火锅',
        icon: '🫕',
        minLevel: 1,
        baseTime: 8.0,
        basePrice: 400,
        ingredients: '沸腾鲜骨汤 + 纯肉丸子',
        desc: '鲜汤沸腾，咕嘟咕嘟翻滚着弹嫩肉丸，冬天小镇最受欢迎。'
      },
      {
        id: 'hotpot_2',
        name: '鲜肉什锦杂烩锅',
        icon: '🍲',
        minLevel: 10,
        baseTime: 10.2,
        basePrice: 880,
        ingredients: '原切牛肉 + 三文鱼 + 西兰花',
        desc: '牛肉片、三文鱼与西兰花的什锦盛宴，营养均衡满满一锅。'
      },
      {
        id: 'hotpot_3',
        name: '极鲜全羊寿喜煲',
        icon: '🥘',
        minLevel: 25,
        baseTime: 12.6,
        basePrice: 1900,
        ingredients: '牧场精选鲜羊肉 + 娃娃菜',
        desc: '牧场精选鲜羊肉煲，哈士奇吃了直呼嗷呜！'
      }
    ]
  },
  jerky: {
    id: 'jerky',
    name: '肉干风干窖',
    icon: '🥩',
    cuisineId: 'jerky',
    applianceName: '70℃低温慢烘风干窖',
    unlockCost: 80000, // 哈士奇风干主厨上岗
    baseUpgradeCost: 800,
    costMultiplier: 1.15,
    speedPerLevel: 0.04,
    autoCollectUnlockLevel: 20,
    dishes: [
      {
        id: 'jerky_1',
        name: '手工风干鸡肉干',
        icon: '🥓',
        minLevel: 1,
        baseTime: 10.8,
        basePrice: 1100,
        ingredients: '低脂高蛋白纯鸡胸肉',
        desc: '低脂高蛋白纯鸡胸肉干，70℃低温慢烘 12 小时，原汁原味。'
      },
      {
        id: 'jerky_2',
        name: '深海三文鱼脆皮',
        icon: '🐟',
        minLevel: 10,
        baseTime: 13.6,
        basePrice: 2400,
        ingredients: '深海三文鱼皮 (美毛Omega-3)',
        desc: '富含美毛 Omega-3 的酥脆鱼皮干，嘎嘣脆耐磨牙。'
      },
      {
        id: 'jerky_3',
        name: '黄金风干牛肋骨',
        icon: '🦴',
        minLevel: 25,
        baseTime: 16.8,
        basePrice: 5200,
        ingredients: '整根原切带筋牛肋骨',
        desc: '带筋肉质饱满的纯天然磨牙大牛骨，狗狗的最爱奖赏！'
      }
    ]
  }
};

// 老存档设施 key → 新料理工位 key 迁移映射 (按原解锁档位对应，保证玩家进度平滑延续)
// 旧版 6 工坊: 阳光花圃(0) / 快递驿站(150) / 清泉果园(1500) / 青青牧场(12000) / 甜品烘焙屋(80000) / 水晶矿洞(500000)
var LEGACY_FACILITY_MIGRATION = {
  garden: 'stew',   stove: 'stew',
  post: 'bbq',      grill: 'bbq',
  orchard: 'bake',  juicer: 'bake',
  ranch: 'hotpot',  steamer: 'hotpot',
  bakery: 'jerky',  dessert: 'jerky',
  mine: 'jerky',    oven: 'jerky'
};

// 5 大料理工位 → 料理菜系 (工位与菜系一一对应)
var FACILITY_CUISINE_MAP = {
  stew: 'stew',
  bbq: 'bbq',
  bake: 'bakery',
  hotpot: 'hotpot',
  jerky: 'jerky'
};

// 8只小镇狗狗居民与专属职业技能配置表
var DOG_BREEDS_CONFIG = {
  golden: {
    id: 'golden',
    name: '金毛',
    title: '金牌炖汤主厨',
    profession: '炖汤主厨',
    professionIcon: '🍲',
    avatar: '🦮',
    image: 'assets/art/golden.jpg',
    recruitCost: 0, // 初始拥有！小镇第一位居民 / 首席炖汤主厨！
    colors: {
      body: '#F5CBA7',
      belly: '#FEF9E7',
      innerEar: '#EDBB99',
      nose: '#34495E',
      cheeks: '#F9E79F'
    },
    skillName: '文火慢炖',
    skillType: 'local_price',
    targetFacility: 'stew',
    baseSkillBonus: 0.15, // 鲜美炖汤锅售价 +15%
    skillDesc: '鲜美炖汤锅料理售价提升 15%（每级好感+1.5%）',
    personality: '温柔体贴的暖心大暖男，守在大铁锅旁文火慢熬，最懂火候与耐心！'
  },
  shiba: {
    id: 'shiba',
    name: '柴犬',
    title: '金牌烧烤主厨',
    profession: '烧烤主厨',
    professionIcon: '🍢',
    avatar: '🐕',
    image: 'assets/art/shiba_inu.jpg',
    recruitCost: 200, // 首位招募伙伴 (200金币轻松解锁)
    colors: {
      body: '#E59866',
      belly: '#FDFEFE',
      innerEar: '#F5B7B1',
      nose: '#2C3E50',
      cheeks: '#FADBD8'
    },
    skillName: '炭火秘技',
    skillType: 'local_price',
    targetFacility: 'bbq',
    baseSkillBonus: 0.15, // 慢烤烧烤架售价 +15%
    skillDesc: '慢烤烧烤架料理售价提升 15%（每级好感+1.5%）',
    personality: '活泼开朗的炭火行家，翻烤手法快得只剩残影，火候拿捏得恰到好处！'
  },
  corgi: {
    id: 'corgi',
    name: '柯基',
    title: '金牌跑堂',
    profession: '自动收取',
    professionIcon: '🐾',
    avatar: '🐶',
    image: 'assets/art/corgi.jpg',
    recruitCost: 5000,
    colors: {
      body: '#F39C12',
      belly: '#FFFFFF',
      innerEar: '#FAD7A0',
      nose: '#1C2833',
      cheeks: '#FCF3CF'
    },
    skillName: '小短腿蹦跳',
    skillType: 'collect_speed',
    targetFacility: null, // 全局辅助技能：不绑定单一工位
    baseSkillBonus: 0.30, // 自动收取冷却 -30%
    skillDesc: '全镇金币自动收取间隔缩短 30%（每级好感+3%）',
    personality: '虽然腿短短的，但叼着木托盘满镇跑堂比谁都积极卖力，蜜桃臀一扭一扭！'
  },
  border_collie: {
    id: 'border_collie',
    name: '边牧',
    title: '金牌火锅领班',
    profession: '火锅主厨',
    professionIcon: '🫕',
    avatar: '🐕‍🦺',
    image: 'assets/art/border_collie.jpg',
    recruitCost: 20000,
    colors: {
      body: '#2C3E50',
      belly: '#FFFFFF',
      innerEar: '#BDC3C7',
      nose: '#17202A',
      cheeks: '#E5E8E8'
    },
    skillName: '汤底掌控',
    skillType: 'local_speed',
    targetFacility: 'hotpot',
    baseSkillBonus: 0.20, // 狗狗火锅台生产时间 -20%
    skillDesc: '狗狗火锅台生产时间缩短 20%（每级好感+2%）',
    personality: '高智商的火锅领班，一个灵动的眼神就能让涮肉火候分秒不差！'
  },
  samoyed: {
    id: 'samoyed',
    name: '萨摩耶',
    title: '金牌甜品主厨',
    profession: '甜品主厨',
    professionIcon: '🧁',
    avatar: '🐕',
    image: 'assets/art/samoyed.jpg',
    recruitCost: 80000,
    colors: {
      body: '#FBFCFC',
      belly: '#FFFFFF',
      innerEar: '#FADBD8',
      nose: '#212F3D',
      cheeks: '#FADBD8'
    },
    skillName: '甜点快手',
    skillType: 'local_speed',
    targetFacility: 'bake',
    baseSkillBonus: 0.20, // 甜品烘焙屋生产时间 -20%
    skillDesc: '甜品烘焙屋生产时间缩短 20%（每级好感+2%）',
    personality: '雪白毛发与天使治愈笑容，挤奶油的手速快到看不清，甜品让全镇赞不绝口！'
  },
  husky: {
    id: 'husky',
    name: '哈士奇',
    title: '金牌风干主厨',
    profession: '风干主厨',
    professionIcon: '🥩',
    avatar: '🐺',
    image: 'assets/art/husky.jpg',
    recruitCost: 300000,
    colors: {
      body: '#7F8C8D',
      belly: '#EAEDED',
      innerEar: '#BDC3C7',
      nose: '#17202A',
      eyes: '#5DADE2', // 蓝眼睛
      cheeks: '#D5D8DC'
    },
    skillName: '风干快手',
    skillType: 'global_speed',
    targetFacility: 'jerky',
    baseSkillBonus: 0.12, // 全局产出速率 +12%
    skillDesc: '全镇料理工位产速提升 12%，烘肉干活很认真但偶尔会跑偏！',
    personality: '干活非常卖力地翻晾肉干！偶尔会撞翻晾肉架倒栽葱栽进肉堆，或叼走一整根牛肋骨！'
  },
  frenchie: {
    id: 'frenchie',
    name: '法斗',
    title: '温泉掌柜',
    profession: '温泉掌柜',
    professionIcon: '♨️',
    avatar: '🐶',
    image: 'assets/art/french_bulldog.jpg',
    recruitCost: 1000000,
    colors: {
      body: '#D0D3D4',
      belly: '#F2F4F4',
      innerEar: '#F5B7B1',
      nose: '#1B2631',
      cheeks: '#E5E7E9'
    },
    skillName: '舒心养生',
    skillType: 'offline_limit',
    baseSkillBonus: 4, // 离线收益上限 +4 小时
    skillDesc: '离线收益上限增加 4 小时（1级4h，10级满级+12h）',
    personality: '趴在温泉边打呼噜，也是招揽顾客的福气招牌。'
  },
  labrador: {
    id: 'labrador',
    name: '拉布拉多',
    title: '码头寻宝船长',
    profession: '寻宝船长',
    professionIcon: '⚓',
    avatar: '🦮',
    image: 'assets/art/labrador.jpg',
    recruitCost: 3000000,
    colors: {
      body: '#A0522D', // 巧克力色
      belly: '#EDBB99',
      innerEar: '#873600',
      nose: '#1C2833',
      cheeks: '#DC7633'
    },
    skillName: '幸运寻宝',
    skillType: 'high_tier_rate',
    baseSkillBonus: 0.20, // 高级特产出现概率 +20%
    skillDesc: '生产时高级稀有特产出现概率提升 20%',
    personality: '细致沉稳的码头领航员，每次出海都能满载珍宝而归。'
  },

  // ===== GDD 2.1 新增犬种 =====
  poodle: {
    id: 'poodle',
    name: '贵宾',
    title: '金牌造型师',
    profession: '造型师',
    professionIcon: '✂️',
    avatar: '🐩',
    image: 'assets/art/poodle.jpg', // 素材早已存在（此前一直闲置），本次正式启用
    recruitCost: 40000,
    colors: {
      body: '#F5EEE6',
      belly: '#FFFFFF',
      innerEar: '#F5D6C6',
      nose: '#34495E',
      cheeks: '#FADBD8'
    },
    skillName: '蓬松巧手',
    skillType: 'local_speed',
    targetFacility: null, // 造型师：可派驻任意工位担任副手
    baseSkillBonus: 0.15,
    skillDesc: '在岗料理工位生产时间缩短 15%（每级好感+1.5%）',
    personality: '刚做完造型的时髦贵宾，卷毛蓬松得像一朵云，走到哪都是全场焦点！'
  },
  beagle: {
    id: 'beagle',
    name: '比格',
    title: '金牌嗅探员',
    profession: '嗅探员',
    professionIcon: '👃',
    avatar: '🐕',
    image: null, // ⚠️ 暂无立绘素材 → 自动回退矢量渲染（详见 README「已知约定」）
    recruitCost: 600000,
    colors: {
      body: '#F8F9F9',
      belly: '#FFFFFF',
      innerEar: '#E8B4A0',
      nose: '#2C3E50',
      cheeks: '#F5CBA7'
    },
    skillName: '雷达鼻',
    skillType: 'collect_speed',
    targetFacility: null,
    baseSkillBonus: 0.25,
    skillDesc: '全镇金币自动收取间隔缩短 25%（每级好感+2.5%）',
    personality: '鼻子比雷达还灵的大垂耳比格，隔着三条街都能闻到刚出炉的肉干香气！'
  }
};

// ============================================================================
// GDD 2.1 犬种收集系统：稀有度 + 天赋 Passive
// ----------------------------------------------------------------------------
// 设计意图：每个犬种是一张「卡」，除**职业**外还带一项**全局天赋被动**。
// 两层加成刻意分开，互不干扰：
//   · 职业 skillType（原有系统，未改动）：狗狗**在岗**时对本工位生效；
//   · 天赋 passive（本次新增）：只要**拥有**该犬种就全局生效，与是否在岗无关。
// 所有天赋加成统一走 economy.getPassiveBonus(type) 汇总，不散落在各处。
// ============================================================================

// 稀有度阶梯：普通 → 稀有 → 史诗 → 传说
// weight 是抽卡权重（相对值），recycleDiamonds 是抽到重复卡时的钻石返还
var RARITY_CONFIG = {
  common:    { id: 'common',    name: '普通', stars: 1, color: '#95A5A6', weight: 52, recycleDiamonds: 3 },
  rare:      { id: 'rare',      name: '稀有', stars: 2, color: '#3498DB', weight: 30, recycleDiamonds: 8 },
  epic:      { id: 'epic',      name: '史诗', stars: 3, color: '#9B59B6', weight: 14, recycleDiamonds: 20 },
  legendary: { id: 'legendary', name: '传说', stars: 4, color: '#F1C40F', weight: 4,  recycleDiamonds: 50 }
};

// 犬种卡片表：rarity 稀有度 + passive 天赋被动
// passive.type 是聚合键，见 economy.getPassiveBonus()
var DOG_CARDS_CONFIG = {
  golden:        { rarity: 'common', passive: { id: 'p_soup_master',  name: '汤品大师', desc: '全体汤品售价 +5%',      type: 'dish_price',       value: 0.05, scope: 'stew' } },
  labrador:      { rarity: 'common', passive: { id: 'p_fast_chop',    name: '快刀切配', desc: '食材切块速度 +10%',     type: 'chop_speed',       value: 0.10 } },
  shiba:         { rarity: 'common', passive: { id: 'p_coin_nose',    name: '财运嗅觉', desc: '金币掉落 +8%',          type: 'gold_gain',        value: 0.08 } },
  corgi:         { rarity: 'common', passive: { id: 'p_short_legs',   name: '飞毛短腿', desc: '狗狗移动速度 +12%',     type: 'move_speed',       value: 0.12 } },
  samoyed:       { rarity: 'rare',   passive: { id: 'p_snow_warm',    name: '雪原暖意', desc: '离线收益 +15%',         type: 'offline_bonus',    value: 0.15 } },
  husky:         { rarity: 'rare',   passive: { id: 'p_wild_crit',    name: '野性直觉', desc: '烹饪暴击率 +5%',        type: 'cook_crit',        value: 0.05 } },
  border_collie: { rarity: 'rare',   passive: { id: 'p_multi_task',   name: '一犬多岗', desc: '可同时看管 2 个灶台',   type: 'multi_station',    value: 1 } },
  poodle:        { rarity: 'rare',   passive: { id: 'p_fashion',      name: '时尚品味', desc: '装扮评分 +10%',         type: 'outfit_score',     value: 0.10 } },
  frenchie:      { rarity: 'epic',   passive: { id: 'p_thrifty',      name: '精打细算', desc: '设施升级成本 -8%',      type: 'upgrade_discount', value: 0.08 } },
  beagle:        { rarity: 'epic',   passive: { id: 'p_sniff_reward', name: '猎犬嗅觉', desc: '迷你游戏奖励 +15%',     type: 'minigame_bonus',   value: 0.15 } }
};

// GDD 2.1 传说稀有变体：特殊配色/发光 + 双重天赋
// 「双重天赋」= 基础犬种自带的天赋 + 本变体额外附带的第二项天赋。
// 变体**只能**通过钻石抽取获得（犬种本体可用金币直购），这是抽卡存在的意义。
// coat 直接复用已有的毛色系统 —— 抽到变体即解锁该发光配色。
var DOG_VARIANTS_CONFIG = [
  {
    id: 'variant_sunny_golden',
    name: '晴天金毛',
    baseBreed: 'golden',
    icon: '☀️',
    rarity: 'legendary',
    desc: '被午后阳光镀上金边的稀有金毛，毛发会随光线泛起暖金色流光。',
    coat: {
      id: 'coat_sunny_golden',
      name: '晴天流光',
      costType: 'legendary',
      glow: '#FFD86B',
      colors: { body: '#FFD86B', belly: '#FFF7DC', innerEar: '#FFB84D', nose: '#5D4037', cheeks: '#FFE9A8' }
    },
    extraPassive: { id: 'p_sunny_bless', name: '晴空祝福', desc: '全体料理售价 +6%', type: 'dish_price', value: 0.06 }
  },
  {
    id: 'variant_snow_husky',
    name: '雪原哈士奇',
    baseBreed: 'husky',
    icon: '❄️',
    rarity: 'legendary',
    desc: '来自极北雪原的稀有二哈，周身飘散着细碎冰晶，蓝眼在雪光下近乎透明。',
    coat: {
      id: 'coat_snow_husky',
      name: '极地雪光',
      costType: 'legendary',
      glow: '#AED6F1',
      colors: { body: '#EAF2F8', belly: '#FFFFFF', innerEar: '#D6EAF8', nose: '#2C3E50', eyes: '#85C1E9', cheeks: '#D4E6F1' }
    },
    extraPassive: { id: 'p_frost_speed', name: '霜原疾行', desc: '全镇料理工位产速 +6%', type: 'global_speed', value: 0.06 }
  }
];

// GDD 2.1 解锁方式：钻石抽取 + 保底机制
// 保底设计：pityRare 抽内必出「稀有」及以上；pityEpic 抽内必出「史诗」及以上；
//           pityLegendary 抽内必出「传说」（即变体）。三个计数器独立累计。
var DOG_GACHA_CONFIG = {
  singleCost: 60,          // 钻石单抽
  tenCost: 540,            // 钻石十连（9 折）
  pityRare: 10,            // 累计 10 抽内必出稀有及以上
  pityEpic: 30,            // 累计 30 抽内必出史诗及以上
  pityLegendary: 80,       // 累计 80 抽内必出传说变体
  dupeDiamonds: 8          // 抽到已拥有犬种/变体时返还的钻石
};

// 30件服装配置表 (10帽子 + 10衣服 + 10配饰)
var OUTFITS_CONFIG = [
  // --- 帽子类 (10件) ---
  { id: 'hat_chef', type: 'hat', name: '经典高筒主厨帽', icon: '👨‍🍳', costType: 'gold', cost: 500, desc: '名厨认证！戴上后做饭更有仪式感。', render: 'chef_toque' },
  { id: 'hat_egg', type: 'hat', name: '荷包蛋贝雷帽', icon: '🍳', costType: 'gold', cost: 1200, desc: '头顶顶着一颗金黄流心荷包蛋。', render: 'egg_beret' },
  { id: 'hat_party', type: 'hat', name: '缤纷派对帽', icon: '🎉', costType: 'gold', cost: 2500, desc: '彩色条纹小尖帽，天天都像过生日！', render: 'party_cone' },
  { id: 'hat_bear', type: 'hat', name: '小熊耳朵发箍', icon: '🧸', costType: 'gold', cost: 4000, desc: '软萌的小熊绒毛耳，可爱度翻倍。', render: 'bear_ears' },
  { id: 'hat_straw', type: 'hat', name: '田园小草帽', icon: '👒', costType: 'gold', cost: 5000, desc: '夏天遮阳必备，充满乡村田野清新感。', render: 'straw_hat' },
  { id: 'hat_crown', type: 'hat', name: '闪耀黄金王冠', icon: '👑', costType: 'bone', cost: 30, desc: '纯金打造的小王冠，小馆的小国王！', render: 'gold_crown' },
  { id: 'hat_pirate', type: 'hat', name: '加勒比海盗帽', icon: '🏴‍☠️', costType: 'bone', cost: 40, desc: '霸气黑金海盗帽，向着烤肉大海前进！', render: 'pirate_hat' },
  { id: 'hat_frog', type: 'hat', name: '绿呱呱青蛙帽', icon: '🐸', costType: 'bone', cost: 45, desc: '大眼睛眨巴眨巴的治愈系青蛙帽。', render: 'frog_hat' },
  { id: 'hat_magic', type: 'hat', name: '星月魔法礼帽', icon: '🧙‍♂️', costType: 'bone', cost: 60, desc: '深紫色巫师帽，料理仿佛被施展了美味魔法。', render: 'magic_hat' },
  { id: 'hat_dino', type: 'hat', name: '恐龙背刺头套', icon: '🦖', costType: 'bone', cost: 80, desc: '嗷呜！变成一只会做披萨的可爱小恐龙。', render: 'dino_hood' },

  // --- 衣服类 (10件) ---
  { id: 'cloth_apron', type: 'cloth', name: '红白条纹围裙', icon: '🎽', costType: 'gold', cost: 800, desc: '标准小厨工围裙，防止油星溅到毛发。', render: 'striped_apron' },
  { id: 'cloth_sailor', type: 'cloth', name: '蓝白水手服', icon: '👔', costType: 'gold', cost: 2000, desc: '飘逸的海军领，走起路来格外神气。', render: 'sailor_suit' },
  { id: 'cloth_sweater', type: 'cloth', name: '暖茸茸黄毛衣', icon: '🧶', costType: 'gold', cost: 3500, desc: '温暖细腻的针织毛衣，像个小绅士。', render: 'yellow_sweater' },
  { id: 'cloth_suit', type: 'cloth', name: '绅士小燕尾服', icon: '🤵', costType: 'gold', cost: 5000, desc: '英伦风西装，领班范儿拿捏得死死的。', render: 'tuxedo' },
  { id: 'cloth_hoodie', type: 'cloth', name: '潮牌连帽卫衣', icon: '🧥', costType: 'gold', cost: 5000, desc: '亮橙色街头潮犬卫衣，活力满满！', render: 'orange_hoodie' },
  { id: 'cloth_kimono', type: 'cloth', name: '樱花祭和服浴衣', icon: '👘', costType: 'bone', cost: 35, desc: '落樱图案日式和服，适合做章鱼烧与寿喜烧。', render: 'sakura_kimono' },
  { id: 'cloth_dino_body', type: 'cloth', name: '小恐龙连体睡衣', icon: '🦕', costType: 'bone', cost: 50, desc: '毛茸茸的恐龙肚皮连体衣，萌力爆表。', render: 'dino_onesie' },
  { id: 'cloth_super', type: 'cloth', name: '超人拉风披风', icon: '🦸‍♂️', costType: 'bone', cost: 65, desc: '红色英勇披风，做饭速度好像变快了！', render: 'hero_cape' },
  { id: 'cloth_pajamas', type: 'cloth', name: '星空丝绸睡衣', icon: '🌙', costType: 'bone', cost: 70, desc: '缀满银色星星的静谧深蓝睡袍。', render: 'star_pajamas' },
  { id: 'cloth_cyber', type: 'cloth', name: '赛博发光机甲战衣', icon: '🤖', costType: 'bone', cost: 95, desc: '未来科幻荧光机甲，小馆里的科技主厨！', render: 'cyber_armor' },

  // --- 配饰类 (10件) ---
  { id: 'acc_scarf', type: 'acc', name: '鲜艳小红领巾', icon: '🧣', costType: 'gold', cost: 600, desc: '系在脖子上的鲜红小方巾，精神抖擞。', render: 'red_scarf' },
  { id: 'acc_bone_tag', type: 'acc', name: '纯铜肉骨项牌', icon: '🏷️', costType: 'gold', cost: 1500, desc: '刻着小狗专属名字的锃亮项牌。', render: 'bone_collar' },
  { id: 'acc_glasses', type: 'acc', name: '圆圆黑框眼镜', icon: '👓', costType: 'gold', cost: 2800, desc: '戴上后瞬间变成博学多才的厨艺学院教授。', render: 'round_glasses' },
  { id: 'acc_bowtie', type: 'acc', name: '红色蝴蝶领结', icon: '🎀', costType: 'gold', cost: 4200, desc: '贵族气息十足的小红蝴蝶结。', render: 'red_bowtie' },
  { id: 'acc_spatula', type: 'acc', name: '迷你黄金锅铲', icon: '🥄', costType: 'gold', cost: 5000, desc: '腰间别着小巧实用的专属翻肉铲。', render: 'golden_spatula' },
  { id: 'acc_sunglasses', type: 'acc', name: '酷炫黑超墨镜', icon: '🕶️', costType: 'bone', cost: 30, desc: '冷酷墨镜一戴，谁都不爱，只爱做饭。', render: 'cool_sunglasses' },
  { id: 'acc_wings', type: 'acc', name: '天使羽毛小翅膀', icon: '🪽', costType: 'bone', cost: 45, desc: '背后微微拍打的洁白小羽翼，是天使小狗！', render: 'angel_wings' },
  { id: 'acc_bubble', type: 'acc', name: '粉色泡泡糖', icon: '🫧', costType: 'bone', cost: 50, desc: '嘴里吹着一个大大的草莓泡泡。', render: 'bubble_gum' },
  { id: 'acc_donut', type: 'acc', name: '甜甜圈救生项圈', icon: '🍩', costType: 'bone', cost: 75, desc: '草莓撒糖甜甜圈伊丽莎白圈，又萌又好吃。', render: 'donut_collar' },
  { id: 'acc_fire', type: 'acc', name: '炽热烹饪厨神光环', icon: '🔥', costType: 'bone', cost: 100, desc: '周身环绕的美食金色烈焰，传说级厨艺！', render: 'chef_aura' }
];

// 每日任务配置
const DAILY_TASKS_CONFIG = [
  { id: 'task_coins_100', name: '金币大亨', desc: '收取金币 100 次', target: 100, rewardBones: 5, action: 'collect_coins' },
  { id: 'task_pet_5', name: '温柔抚摸', desc: '抚摸狗狗 5 次', target: 5, rewardBones: 5, action: 'pet_dog' },
  { id: 'task_play_3', name: '乐园嬉戏', desc: '在休息乐园与狗狗玩耍 3 次', target: 3, rewardBones: 5, action: 'play_toy' },
  { id: 'task_upgrade_3', name: '餐厅扩建', desc: '升级任意设施 3 次', target: 3, rewardBones: 5, action: 'upgrade_facility' },
  { id: 'task_recruit_1', name: '广纳贤才', desc: '招募 1 只新狗狗', target: 1, rewardBones: 20, action: 'recruit_dog' },
  { id: 'task_ad_3', name: '助力宣传', desc: '观看 3 次宣传广告', target: 3, rewardBones: 10, action: 'watch_ad' }
];

// 狗狗休息与玩耍乐园互动道具配置 (散布在小镇四角休闲绿地，不遮挡核心工位与喷泉)
const PLAY_TOYS_CONFIG = [
  { id: 'ball', name: '缤纷弹力球', icon: '🎾', x: 90, y: 140, radius: 28, desc: '抛球捡球！立即恢复+20体力与+10好感！' },
  { id: 'dog_bed', name: '露营帐篷狗窝', icon: '⛺', x: 910, y: 140, radius: 36, desc: '舒服打呼噜~ 立即回满体力！' },
  { id: 'trampoline', name: '弹跳蹦床', icon: '🎪', x: 90, y: 470, radius: 36, desc: '点击小狗跳高高！立即恢复+25体力与+10好感！' },
  { id: 'pool', name: '清凉戏水池', icon: '🛁', x: 910, y: 470, radius: 40, desc: '泡澡解乏！立即恢复+30体力与+10好感！' }
];

// 永久成就配置
const ACHIEVEMENTS_CONFIG = [
  { id: 'ach_first_upgrade', name: '文火初燃', desc: '首次升级鲜美炖汤锅到 2 级', target: 1, rewardBones: 10 },
  { id: 'ach_auto_collect', name: '自动小镇', desc: '任意设施达到 20 级解锁自动收取', target: 20, rewardBones: 25 },
  { id: 'ach_recruit_4', name: '四犬成群', desc: '成功招募 4 只不同职业的小镇狗狗', target: 4, rewardBones: 30 },
  { id: 'ach_all_dogs', name: '汪汪全家福', desc: '集齐小镇全部明星狗狗居民', target: 10, rewardBones: 120 },
  { id: 'ach_outfit_10', name: '时尚弄潮儿', desc: '收集并拥有 10 件狗狗服装', target: 10, rewardBones: 35 },
  { id: 'ach_husky_fun', name: '风干房奇遇', desc: '见证哈士奇烘肉干时的搞笑奇遇', target: 1, rewardBones: 20 },
  { id: 'ach_affection_max', name: '心有灵犀', desc: '任意一只狗狗好感度达到 10 级满级', target: 10, rewardBones: 50 },
  { id: 'ach_gold_100k', name: '日进斗金', desc: '小镇累计营业总收入达到 100,000 金币', target: 100000, rewardBones: 50 },
];

// 5 大等级形态小镇开荒与扩张发展阶段配置表 (核心循环驱动主轴)
// Lv.1 🌳 小森林 → Lv.5 🏡 狗狗村 → Lv.15 🏘️ 狗狗小镇 → Lv.30 🌆 狗狗城市 → Lv.50 🏝️ 狗狗度假岛
const TOWN_EXPANSION_STAGES = [
  {
    stage: 1,
    minTownLevel: 1,
    name: 'Lv.1 🌳 小森林',
    title: '小森林',
    icon: '🌳',
    desc: '阳光公园的第一缕炊烟！暖心金毛守在大铁锅旁文火慢熬，端出小镇第一碗鲜美炖汤！',
    unlockedFacilities: ['stew'],
    unlockedDogs: ['golden'],
    unlockedToys: [],
    requirements: {
      desc: '鲜美炖汤锅达到 Lv.5，赚取累计 500 金币',
      minTotalLevels: 5,
      minStewLevel: 5,
      minTotalGold: 500
    },
    nextStageName: 'Lv.5 🏡 狗狗村',
    rewardBones: 15
  },
  {
    stage: 2,
    minTownLevel: 5,
    name: 'Lv.5 🏡 狗狗村',
    title: '狗狗村',
    icon: '🏡',
    desc: '公园长椅与路灯亮起！柴犬架起纯炭火烤炉，焦香四溢的慢烤烧烤引来全镇狗狗排队！',
    unlockedFacilities: ['stew', 'bbq'],
    unlockedDogs: ['golden', 'shiba'],
    unlockedToys: ['trampoline'],
    requirements: {
      desc: '设施总等级达到 15 级，累计金币 10,000',
      minTotalLevels: 15,
      minTotalGold: 10000
    },
    nextStageName: 'Lv.15 🏘️ 狗狗小镇',
    rewardBones: 25
  },
  {
    stage: 3,
    minTownLevel: 15,
    name: 'Lv.15 🏘️ 狗狗小镇',
    title: '狗狗小镇',
    icon: '🏘️',
    desc: '中央清泉喷泉涌动！萨摩耶的甜品烘焙屋飘满曲奇与舒芙蕾香气，全镇都甜滋滋！',
    unlockedFacilities: ['stew', 'bbq', 'bake'],
    unlockedDogs: ['golden', 'shiba', 'corgi', 'samoyed', 'poodle'],
    unlockedToys: ['trampoline', 'dog_bed'],
    requirements: {
      desc: '设施总等级达到 30 级，累计金币 100,000',
      minTotalLevels: 30,
      minTotalGold: 100000
    },
    nextStageName: 'Lv.30 🌆 狗狗城市',
    rewardBones: 45
  },
  {
    stage: 4,
    minTownLevel: 30,
    name: 'Lv.30 🌆 狗狗城市',
    title: '狗狗城市',
    icon: '🌆',
    desc: '现代化繁华狗狗大都市！边牧掌勺的寿喜火锅台热气腾腾，哈士奇在风干窖里认真翻晾肉干！',
    unlockedFacilities: ['stew', 'bbq', 'bake', 'hotpot'],
    unlockedDogs: ['golden', 'shiba', 'corgi', 'samoyed', 'poodle', 'border_collie', 'husky', 'frenchie', 'beagle'],
    unlockedToys: ['trampoline', 'dog_bed', 'pool'],
    requirements: {
      desc: '设施总等级达到 50 级，累计金币 1,000,000',
      minTotalLevels: 50,
      minTotalGold: 1000000
    },
    nextStageName: 'Lv.50 🏝️ 狗狗度假岛',
    rewardBones: 70
  },
  {
    stage: 5,
    minTownLevel: 50,
    name: 'Lv.50 🏝️ 狗狗度假岛',
    title: '狗狗度假岛',
    icon: '🏝️',
    desc: '全明星汪汪齐聚热带度假岛！5 大料理工位齐开，碧海金沙与阳光椰林间香气四溢！',
    unlockedFacilities: ['stew', 'bbq', 'bake', 'hotpot', 'jerky'],
    unlockedDogs: ['golden', 'shiba', 'corgi', 'samoyed', 'poodle', 'border_collie', 'husky', 'frenchie', 'beagle', 'labrador'],
    unlockedToys: ['trampoline', 'dog_bed', 'pool', 'ball'],
    requirements: {
      desc: '已达到顶级狗狗度假岛！全岛欢庆！',
      minTotalLevels: 99999,
      minTotalGold: 99999999
    },
    nextStageName: '已满级',
    rewardBones: 120
  }
];

// 数值计算辅助工具类
const WangwangFormulas = {
  // 设施升级所需费用: 基础费用 * 1.15^(等级)
  getFacilityUpgradeCost(facilityKey, currentLevel) {
    const fac = FACILITIES_CONFIG[facilityKey];
    if (!fac) return 999999;
    return Math.floor(fac.baseUpgradeCost * Math.pow(fac.costMultiplier, currentLevel));
  },

  // 狗狗好感度升下一级所需经验: 100 * (当前等级)^1.5
  getDogAffectionRequiredExp(currentLevel) {
    if (currentLevel >= 10) return 999999;
    return Math.floor(100 * Math.pow(currentLevel, 1.5));
  },

  // 计算好感度带来的技能倍率: 1级为1.0，每级+10%
  getDogAffectionMultiplier(level) {
    return 1.0 + (level - 1) * 0.10;
  },

  // 食谱升到下一级所需金币: 400 * 1.65^(当前等级-1)
  getRecipeUpgradeCost(currentLevel) {
    const cfg = RECIPE_UPGRADE_CONFIG;
    if (currentLevel >= cfg.maxLevel) return Infinity;
    return Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, currentLevel - 1));
  },

  // 食谱等级带来的售价倍率: 1级为1.0，每级 +8%
  getRecipePriceMultiplier(level) {
    return 1.0 + (level - 1) * RECIPE_UPGRADE_CONFIG.priceBonusPerLevel;
  }
};

// ==================== GDD 第 1 章 核心差异化配置 ====================

// 1. 5 大狗狗专属料理体系 (GDD 1.2 料理：炖汤、烧烤、烘焙、狗狗火锅、肉干零食)
// 菜品数据统一取自 FACILITIES_CONFIG 对应料理工位的 dishes（单一数据源，避免两处重复维护）
// stage 为该菜系所需的小镇等级门槛，facilityId 指向产出该菜系的料理工位
const DOG_CUISINES_CONFIG = {
  stew: {
    id: 'stew',
    name: '鲜美炖汤',
    icon: '🍲',
    tag: '治愈暖心',
    stage: 1,
    facilityId: 'stew',
    desc: '大铁锅文火慢熬高汤，加入大骨、胡萝卜与浓缩肉汁，香气弥漫整个小镇！',
    dishes: FACILITIES_CONFIG.stew.dishes
  },
  bbq: {
    id: 'bbq',
    name: '慢烤烧烤',
    icon: '🍢',
    tag: '焦香四溢',
    stage: 5,
    facilityId: 'bbq',
    desc: '纯炭火轻烟熏烤，锁住肉汁，狗狗闻到口水直流三千尺！',
    dishes: FACILITIES_CONFIG.bbq.dishes
  },
  bakery: {
    id: 'bakery',
    name: '甜品烘焙',
    icon: '🧁',
    tag: '奶香松软',
    stage: 15,
    facilityId: 'bake',
    desc: '无糖健康燕麦、羊奶与肉松融合，做成狗狗专属的甜蜜小点心！',
    dishes: FACILITIES_CONFIG.bake.dishes
  },
  hotpot: {
    id: 'hotpot',
    name: '狗狗火锅',
    icon: '🫕',
    tag: '热气腾腾',
    stage: 30,
    facilityId: 'hotpot',
    desc: '冬天小镇最受欢迎的寿喜小火锅，新鲜肉卷在沸腾原汤中涮熟！',
    dishes: FACILITIES_CONFIG.hotpot.dishes
  },
  jerky: {
    id: 'jerky',
    name: '肉干零食',
    icon: '🥩',
    tag: '耐嚼磨牙',
    stage: 50,
    facilityId: 'jerky',
    desc: '70℃低温慢烘12小时的原切肉干，嘎嘣脆、耐磨牙，狗狗的最爱奖赏！',
    dishes: FACILITIES_CONFIG.jerky.dishes
  }
};

// 食谱升级系统 (GDD 1.3 核心循环中的「升级设施/食谱」环节)
// 5 大料理类别各自拥有独立食谱等级，升级食谱可提升对应菜系的售价
const RECIPE_UPGRADE_CONFIG = {
  maxLevel: 10,
  baseCost: 400,
  costMultiplier: 1.65,
  // 每级食谱为对应菜系带来 +8% 售价加成
  priceBonusPerLevel: 0.08,
  // 食谱等级带来的额外全局加成 (满级 Lv.10 时额外 +10% 全镇产速)
  maxLevelGlobalSpeedBonus: 0.10
};

// 2. 动态天气系统配置 (☀️ 晴天 / 🌧️ 治愈小雨 / ❄️ 梦幻飘雪)
const WEATHER_CONFIG = {
  sunny: {
    id: 'sunny',
    name: '晴空暖阳',
    icon: '☀️',
    desc: '微风轻拂，暖阳洒在小院草地上，小蝴蝶飞舞，全镇营业产出 +10%！',
    skyTint: 'rgba(255, 248, 220, 0.12)',
    sunRays: true,
    rain: false,
    snow: false,
    puddles: false,
    outfitWeather: 'none',
    gpsBonus: 0.10
  },
  rainy: {
    id: 'rainy',
    name: '治愈小雨',
    icon: '🌧️',
    desc: '淅淅沥沥的柔和雨丝，草地泛起涟漪水洼，狗狗戴上萌系黄色小雨帽！',
    skyTint: 'rgba(200, 225, 240, 0.22)',
    sunRays: false,
    rain: true,
    snow: false,
    puddles: true,
    soundKey: 'rain_asmr',
    outfitWeather: 'yellow_rainhat',
    gpsBonus: 0.05
  },
  snowy: {
    id: 'snowy',
    name: '梦幻初雪',
    icon: '❄️',
    desc: '洁白雪花缓缓飘落，屋檐积起软雪，狗狗系上暖心红围巾，呼出白气！',
    skyTint: 'rgba(235, 245, 255, 0.28)',
    sunRays: false,
    rain: false,
    snow: true,
    puddles: false,
    snowCover: true,
    outfitWeather: 'red_scarf',
    gpsBonus: 0.08
  }
};

// 3. 国民犬种图鉴元数据 (Dogpedia)
var DOGPEDIA_CONFIG = {
  golden: {
    breedId: 'golden',
    name: '金毛寻回犬',
    alias: '大暖男 / 阳光天使',
    origin: '英国苏格兰',
    temperament: '友善、聪慧、极度忠诚、阳光热情',
    colors: ['经典浅金', '浓郁深金', '温柔奶白金'],
    favoriteDish: '大骨蔬菜浓汤 🍲',
    favoriteDishId: 'stew_1',
    quirk: '无论离开多久，只要主人一出现就螺旋桨疯狂甩尾巴！',
    welcomeQuote: '主人你终于回来啦汪！我一直在门口看着路口等你呢！',
    badge: '首席店长伙伴'
  },
  shiba: {
    breedId: 'shiba',
    name: '日本柴犬',
    alias: '表情包天王 / 倔强柴柴',
    origin: '日本本州',
    temperament: '独立机敏、元气满满、偶尔固执倔强',
    colors: ['经典赤柴', '帅气黑柴', '稀有白柴'],
    favoriteDish: '炭火慢烤肉串 🍢',
    favoriteDishId: 'bbq_1',
    quirk: '走路神气活现，叼到包裹会激动得跑错方向，再急刹车拐回来！',
    welcomeQuote: '汪！主人辛苦了！柴柴今天也准时送达所有包裹了哦！',
    badge: '金牌特派员'
  },
  corgi: {
    breedId: 'corgi',
    name: '威尔士柯基',
    alias: '小短腿 / 蜜桃电臀',
    origin: '英国威尔士',
    temperament: '精力充沛、开朗自信、勇敢忠诚',
    colors: ['黄白双色', '黑白三色', '黄褐白三色'],
    favoriteDish: '手工风干鸡肉干 🥓',
    favoriteDishId: 'jerky_1',
    quirk: '腿短短的但是跳得极高，摘苹果和接飞盘时一跃而起！',
    welcomeQuote: '主人快看我的屁屁！不对……快看我给你摘的甜苹果！',
    badge: '元气小飞侠'
  },
  border_collie: {
    breedId: 'border_collie',
    name: '边境牧羊犬',
    alias: '智商天花板 / 全能领班',
    origin: '苏格兰边境',
    temperament: '敏锐聪明、执行力极高、热爱思考',
    colors: ['经典黑白', '陨石蓝', '红白双色'],
    favoriteDish: '胡萝卜鲜鸡煲 🥣',
    favoriteDishId: 'stew_2',
    quirk: '眼神专注如炬，接飞盘计算提前量，从未失误过！',
    welcomeQuote: '主人，今天的小镇经营指标超额达成，快来检阅吧！汪！',
    badge: '小镇大管家'
  },
  samoyed: {
    breedId: 'samoyed',
    name: '萨摩耶犬',
    alias: '微笑天使 / 纯白大棉花糖',
    origin: '西伯利亚',
    temperament: '温和甜美、热情亲人、无忧无虑',
    colors: ['纯净雪白', '奶白冰川'],
    favoriteDish: '草莓肉松舒芙蕾 🍰',
    favoriteDishId: 'bakery_3',
    quirk: '永远挂着治愈微笑，烘焙时胡须经常沾上雪白糖霜！',
    welcomeQuote: '主人主人~抱抱！刚刚出炉的草莓舒芙蕾第一个给你尝！',
    badge: '治愈甜心'
  },
  husky: {
    breedId: 'husky',
    name: '西伯利亚雪橇犬',
    alias: '二哈 / 拆家大师 / 矿山奇才',
    origin: '俄罗斯西伯利亚',
    temperament: '热情好动、天马行空、偶尔犯二、活力无限',
    colors: ['银灰白', '浓黑白', '红棕色'],
    favoriteDish: '极鲜全羊寿喜煲 🥘',
    favoriteDishId: 'hotpot_3',
    quirk: '挥铁镐挖矿极其卖力，偶尔挖塌土堆栽进去，或者跑去追蝴蝶！',
    welcomeQuote: '嗷呜呜呜——主人你回来啦！本哈今天挖出好大一块发光宝石！',
    badge: '掘金快乐星'
  },
  frenchie: {
    breedId: 'frenchie',
    name: '法国斗牛犬',
    alias: '法斗老板 / 呼噜大王',
    origin: '法国巴黎',
    temperament: '敦厚沉稳、亲切幽默、慢条斯理',
    colors: ['经典奶油', '黑白花斑', '深虎斑'],
    favoriteDish: '黄金风干牛肋骨 🦴',
    favoriteDishId: 'jerky_3',
    quirk: '趴在温泉边打着小呼噜，偶尔咂咂嘴梦见大牛排！',
    welcomeQuote: '呼哧……呼哧……主人你回来啦，快泡泡温泉歇歇脚~',
    badge: '养生掌柜'
  },
  labrador: {
    breedId: 'labrador',
    name: '拉布拉多寻回犬',
    alias: '寻宝探险家 / 忠诚水手',
    origin: '加拿大纽芬兰',
    temperament: '忠实可靠、水性极佳、充满好奇心',
    colors: ['醇厚巧克力', '神秘纯黑', '温暖米黄'],
    favoriteDish: '炙烤无骨纯牛排 🥩',
    favoriteDishId: 'bbq_3',
    quirk: '擅长水里捡球与嗅闻寻宝，总能从土里翻出失落的金色大骨头！',
    welcomeQuote: '主人，今天码头风平浪静，这是我从海滩刨出的宝藏！汪！',
    badge: '金色航海家'
  },
  poodle: {
    breedId: 'poodle',
    name: '贵宾犬（泰迪）',
    alias: '时尚造型师 / 蓬松小云朵',
    origin: '德国（后盛行于法国）',
    temperament: '聪明机敏、优雅粘人、极度爱美',
    colors: ['奶油白', '杏色', '银灰', '香槟金'],
    favoriteDish: '莓果酸奶杯 🥛',
    favoriteDishId: 'bake_2',
    quirk: '每天都要照三遍镜子，出门前必须把卷毛抖得蓬蓬的才肯走！',
    welcomeQuote: '主人你看！我今天的新造型是不是全镇最时髦的？汪呜～',
    badge: '小馆时尚总监'
  },
  beagle: {
    breedId: 'beagle',
    name: '比格犬',
    alias: '嗅探员 / 大垂耳雷达',
    origin: '英国',
    temperament: '活泼好奇、嗅觉超群、贪吃但极忠诚',
    colors: ['黑褐白三色', '柠檬白', '红白'],
    favoriteDish: '香烤鸡肉串 🍢',
    favoriteDishId: 'bbq_2',
    quirk: '鼻子永远贴在地上，隔着三条街都能锁定刚出炉的肉干香气！',
    welcomeQuote: '汪！我闻到你回来啦——从街角就闻到啦！',
    badge: '金牌嗅探员'
  }
};

// 4. 公园高动能微玩法配置 (接飞盘 & 嗅闻刨地)
const PARK_ACTIVITIES_CONFIG = {
  frisbee: {
    id: 'frisbee',
    name: '飞盘投掷',
    icon: '🥏',
    cooldown: 8, // 冷却 8 秒
    speed: 320,  // 飞盘飞行像素速度
    catchDistance: 32, // 接住判定半径
    rewardAffection: 15, // 好感度 +15
    goldBonus: 100, // 额外金币奖励
    boneDropChance: 0.25 // 25% 掉落骨头
  },
  treasureDig: {
    id: 'treasure_dig',
    name: '嗅闻刨地寻宝',
    sniffDuration: 2.0, // 嗅闻 2 秒
    digDuration: 3.2,   // 疯狂刨地 3.2 秒
    particleDensity: 24,
    rewards: [
      { type: 'bone', amount: 3, weight: 35, desc: '挖出珍贵香脆大骨 🦴！' },
      { type: 'gold', amount: 500, weight: 45, desc: '挖出埋藏的钱袋 🪙！' },
      { type: 'snack', amount: 1, weight: 20, desc: '挖出美味肉干零食 🥩！' }
    ]
  },
  // GDD 1.2 迷你游戏：公园散步（与狗狗结伴巡游阳光公园小径，归来带回伴手礼）
  parkWalk: {
    id: 'park_walk',
    name: '公园散步',
    icon: '🚶',
    cooldown: 12,
    walkDuration: 6.0,   // 结伴巡游时长
    rewardAffection: 12, // 好感度 +12
    staminaRecover: 18,  // 散步回血
    boneDropChance: 0.20,
    rewards: [
      { type: 'gold', amount: 800, weight: 45, desc: '散步时在长椅下捡到游客掉落的钱袋 🪙！' },
      { type: 'bone', amount: 4, weight: 30, desc: '在公园灌木丛翻出一根香脆大骨 🦴！' },
      { type: 'snack', amount: 2, weight: 25, desc: '遇见热心路人投喂的美味肉干 🥩！' }
    ]
  },
  // GDD 1.2 迷你游戏：水里捡球（向戏水池投球，狗狗纵身入水叼回，水性犬加成）
  waterFetch: {
    id: 'water_fetch',
    name: '水里捡球',
    icon: '🎾',
    cooldown: 10,
    diveDuration: 3.6,
    catchDistance: 34,
    rewardAffection: 15,
    goldBonus: 300,
    // 水性犬种额外加成（拉布拉多、金毛为寻回猎犬，天生爱水）
    waterLoverBonus: { labrador: 1.6, golden: 1.35, samoyed: 1.15, default: 1.0 },
    boneDropChance: 0.30
  }
};

// 5. 毛色收集系统配置 (GDD 1.2 收集亮点：犬种 × 毛色 × 饰品)
// 每个犬种可解锁 2~3 种毛色，解锁后可在衣橱中自由染色；染色会覆盖 body/belly/innerEar 三色
var COAT_COLORS_CONFIG = {
  golden: [
    { id: 'coat_golden_1', name: '经典浅金', costType: 'free', cost: 0, colors: { body: '#F5CBA7', belly: '#FEF9E7', innerEar: '#EDBB99' }, desc: '金毛最经典的阳光浅金色，温暖治愈。' },
    { id: 'coat_golden_2', name: '浓郁深金', costType: 'gold', cost: 3000, colors: { body: '#E0A458', belly: '#FDF3E3', innerEar: '#C8863C' }, desc: '毛发色泽浓郁的深金，像被夕阳镀了一层蜜。' },
    { id: 'coat_golden_3', name: '温柔奶白金', costType: 'bone', cost: 25, colors: { body: '#FBEEDB', belly: '#FFFDF8', innerEar: '#EFD9BB' }, desc: '近乎奶白的温柔毛色，稀有而柔软。' }
  ],
  shiba: [
    { id: 'coat_shiba_1', name: '经典赤柴', costType: 'free', cost: 0, colors: { body: '#E59866', belly: '#FDFEFE', innerEar: '#F5B7B1' }, desc: '最经典的赤色柴犬毛，元气满满。' },
    { id: 'coat_shiba_2', name: '帅气黑柴', costType: 'gold', cost: 3000, colors: { body: '#4A4A4A', belly: '#F5F0E6', innerEar: '#8D6E63' }, desc: '黑褐相间的黑柴毛色，帅气又倔强。' },
    { id: 'coat_shiba_3', name: '稀有白柴', costType: 'bone', cost: 30, colors: { body: '#F7F3EA', belly: '#FFFFFF', innerEar: '#E8D5C8' }, desc: '万分之一的稀有白色柴犬，传说会带来好运。' }
  ],
  corgi: [
    { id: 'coat_corgi_1', name: '黄白双色', costType: 'free', cost: 0, colors: { body: '#F39C12', belly: '#FFFFFF', innerEar: '#FAD7A0' }, desc: '柯基招牌的黄白双色毛。' },
    { id: 'coat_corgi_2', name: '黑白三色', costType: 'gold', cost: 3500, colors: { body: '#2C3E50', belly: '#FDFEFE', innerEar: '#95A5A6' }, desc: '带黑背与白胸的三色柯基，帅气度翻倍。' },
    { id: 'coat_corgi_3', name: '黄褐白三色', costType: 'bone', cost: 28, colors: { body: '#D68910', belly: '#FFF8EE', innerEar: '#E59866' }, desc: '温暖黄褐调的稀有蜜桃臀配色。' }
  ],
  border_collie: [
    { id: 'coat_bc_1', name: '经典黑白', costType: 'free', cost: 0, colors: { body: '#2C3E50', belly: '#FFFFFF', innerEar: '#BDC3C7' }, desc: '边牧最经典的黑白配色。' },
    { id: 'coat_bc_2', name: '陨石蓝', costType: 'bone', cost: 32, colors: { body: '#7F8C9B', belly: '#F2F4F4', innerEar: '#AAB7C4' }, desc: '如星河洒落般的稀有陨石蓝毛色。' },
    { id: 'coat_bc_3', name: '红白双色', costType: 'gold', cost: 3500, colors: { body: '#A0522D', belly: '#FFF8F0', innerEar: '#C98B5E' }, desc: '温润的红白双色，气质沉稳。' }
  ],
  samoyed: [
    { id: 'coat_samoyed_1', name: '纯净雪白', costType: 'free', cost: 0, colors: { body: '#FBFCFC', belly: '#FFFFFF', innerEar: '#FADBD8' }, desc: '萨摩耶标志性的纯白棉花糖毛。' },
    { id: 'coat_samoyed_2', name: '奶白冰川', costType: 'bone', cost: 26, colors: { body: '#F3EFE6', belly: '#FFFDF7', innerEar: '#EAD9C9' }, desc: '带一点奶油色调的冰川奶白毛。' }
  ],
  husky: [
    { id: 'coat_husky_1', name: '银灰白', costType: 'free', cost: 0, colors: { body: '#7F8C8D', belly: '#EAEDED', innerEar: '#BDC3C7', eyes: '#5DADE2' }, desc: '哈士奇经典的银灰白配色与蓝眼睛。' },
    { id: 'coat_husky_2', name: '浓黑白', costType: 'gold', cost: 3500, colors: { body: '#34495E', belly: '#F4F6F7', innerEar: '#7F8C8D', eyes: '#5DADE2' }, desc: '对比强烈的浓黑白二哈，威风凛凛。' },
    { id: 'coat_husky_3', name: '红棕色', costType: 'bone', cost: 30, colors: { body: '#B5651D', belly: '#FDF2E9', innerEar: '#D9A066', eyes: '#5DADE2' }, desc: '罕见的红棕哈士奇，像一团跳动的火焰。' }
  ],
  frenchie: [
    { id: 'coat_frenchie_1', name: '经典奶油', costType: 'free', cost: 0, colors: { body: '#D0D3D4', belly: '#F2F4F4', innerEar: '#F5B7B1' }, desc: '法斗最讨喜的奶油色毛。' },
    { id: 'coat_frenchie_2', name: '黑白花斑', costType: 'gold', cost: 3500, colors: { body: '#3D3D3D', belly: '#FFFFFF', innerEar: '#A1887F' }, desc: '黑白花斑的俏皮法斗。' },
    { id: 'coat_frenchie_3', name: '深虎斑', costType: 'bone', cost: 28, colors: { body: '#6E4B3A', belly: '#F0E4D8', innerEar: '#A9724F' }, desc: '沉稳厚重的深虎斑纹毛色。' }
  ],
  labrador: [
    { id: 'coat_lab_1', name: '醇厚巧克力', costType: 'free', cost: 0, colors: { body: '#A0522D', belly: '#EDBB99', innerEar: '#873600' }, desc: '拉布拉多经典的巧克力色毛。' },
    { id: 'coat_lab_2', name: '神秘纯黑', costType: 'gold', cost: 3500, colors: { body: '#2B2B2B', belly: '#5D6D7E', innerEar: '#4A4A4A' }, desc: '油亮如缎的神秘纯黑拉布拉多。' },
    { id: 'coat_lab_3', name: '温暖米黄', costType: 'bone', cost: 26, colors: { body: '#F0D9A8', belly: '#FFFBF0', innerEar: '#D9BE86' }, desc: '温柔米黄的暖色调毛色，亲和力满分。' }
  ],
  // ===== GDD 2.1 新增犬种毛色 =====
  poodle: [
    { id: 'coat_poodle_1', name: '奶油白', costType: 'free', cost: 0, colors: { body: '#F5EEE6', belly: '#FFFFFF', innerEar: '#F5D6C6' }, desc: '贵宾最经典的蓬松奶油白卷毛。' },
    { id: 'coat_poodle_2', name: '香槟金', costType: 'gold', cost: 3500, colors: { body: '#E8C89A', belly: '#FFF8EC', innerEar: '#D4AC78' }, desc: '带香槟光泽的暖金色卷毛，高级感十足。' },
    { id: 'coat_poodle_3', name: '银灰云', costType: 'bone', cost: 30, colors: { body: '#C8CCD0', belly: '#F7F9FA', innerEar: '#AAB2B8' }, desc: '如云朵般柔和的稀有银灰卷毛。' }
  ],
  beagle: [
    { id: 'coat_beagle_1', name: '黑褐白三色', costType: 'free', cost: 0, colors: { body: '#F8F9F9', belly: '#FFFFFF', innerEar: '#E8B4A0' }, desc: '比格标志性的黑褐白三色大垂耳。' },
    { id: 'coat_beagle_2', name: '柠檬白', costType: 'gold', cost: 3500, colors: { body: '#FAF3DC', belly: '#FFFDF5', innerEar: '#E6CE9E' }, desc: '清爽的柠檬白配色，罕见又温柔。' },
    { id: 'coat_beagle_3', name: '红白双色', costType: 'bone', cost: 28, colors: { body: '#D98862', belly: '#FFF6F0', innerEar: '#C4703F' }, desc: '温暖的红白双色，像秋日午后的阳光。' }
  ],
};

// ============================================================================
// 传说变体专属毛色：costType 为 'legendary' —— **只能由抽卡获得，不可购买**。
// 单独一张表，抽到变体时由 game.js 动态并入 COAT_COLORS_CONFIG[baseBreed]，
// 避免在 COAT_COLORS_CONFIG 里重复书写 golden / husky 键（对象字面量重复键会被后者覆盖）。
// ============================================================================
var LEGENDARY_COAT_CONFIG = {
  coat_sunny_golden: {
    id: 'coat_sunny_golden', breedId: 'golden', name: '晴天流光 ☀️', costType: 'legendary', cost: 0,
    glow: '#FFD86B',
    colors: { body: '#FFD86B', belly: '#FFF7DC', innerEar: '#FFB84D' },
    desc: '传说变体【晴天金毛】专属：毛发会随光线泛起暖金色流光。'
  },
  coat_snow_husky: {
    id: 'coat_snow_husky', breedId: 'husky', name: '极地雪光 ❄️', costType: 'legendary', cost: 0,
    glow: '#AED6F1',
    colors: { body: '#EAF2F8', belly: '#FFFFFF', innerEar: '#D6EAF8', eyes: '#85C1E9' },
    desc: '传说变体【雪原哈士奇】专属：周身飘散细碎冰晶，蓝眼近乎透明。'
  }
};

