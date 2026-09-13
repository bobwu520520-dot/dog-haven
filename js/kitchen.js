/**
 * 《汪汪小馆》- 纯正《猫咪和汤》治愈系森林营地与底部出餐托盘系统
 * 1. 全屏童话森林草地 (Forest Glade)、斑驳树影与微风飞舞的蒲公英/落叶
 * 2. 6大烹饪营地 (大铁锅熬汤、炭火烤肉、鲜果栈道、林间烘焙、竹香蒸笼、窑烤披萨)
 * 3. 4大森林休憩工位 (弹跳蹦床、露营帐篷、天然温泉水池、草坪皮球)
 * 4. 《猫咪和汤》标志性【底部出餐木质托盘栏】：做好的佳肴滑入木盘，弹跳金币气泡，轻点清脆爆金！
 */

class RestaurantKitchen {
  constructor(economy, dogs) {
    this.economy = economy;
    this.dogs = dogs; // Map<breedId, DogChef>

    // 6大烹饪设施运行时数据 (纯正自然圆形森林营地坐标分布，全屏 1000 x 600)
    // 小镇中央音乐喷泉 (Central Town Fountain ⛲)
    this.fountain = {
      x: 500,
      y: 295,
      radius: 42,
      animTime: 0,
      ripples: [],
      particles: []
    };

    this.stations = {};
    // 5 大料理工位围绕中央喷泉环形排布 (全屏 1000 x 600)
    // 顶部：🍲 鲜美炖汤锅(500, 150) + 🐕 炖汤主厨金毛
    // 左上：🍢 慢烤烧烤架(215, 250) + 🐕 烧烤主厨柴犬
    // 右上：🧁 甜品烘焙屋(785, 250) + 🐕 甜品主厨萨摩耶
    // 中央：⛲ 阳光公园中央喷泉(500, 295)
    // 左下：🫕 狗狗火锅台(250, 420) + 🐕 火锅领班边牧
    // 右下：🥩 肉干风干窖(750, 420) + 🐕 风干主厨哈士奇
    const stationLayout = {
      stew:   { x: 500, y: 150, radius: 52, campName: '鲜美炖汤锅', unlocked: true,  stage: 1 }, // 顶部：金毛炖汤主厨守灶
      bbq:    { x: 215, y: 250, radius: 52, campName: '慢烤烧烤架', unlocked: false, stage: 2 }, // 左上：柴犬炭火掌炉
      bake:   { x: 785, y: 250, radius: 52, campName: '甜品烘焙屋', unlocked: false, stage: 3 }, // 右上：萨摩耶甜品主厨
      hotpot: { x: 250, y: 420, radius: 52, campName: '狗狗火锅台', unlocked: false, stage: 4 }, // 左下：边牧火锅领班
      jerky:  { x: 750, y: 420, radius: 52, campName: '肉干风干窖', unlocked: false, stage: 5 }  // 右下：哈士奇风干主厨
    };

    for (const [key, config] of Object.entries(FACILITIES_CONFIG)) {
      const layout = stationLayout[key] || { x: 300, y: 300, radius: 50, campName: config.name, unlocked: false, stage: 1 };
      this.stations[key] = {
        id: key,
        config: config,
        unlocked: layout.unlocked,
        level: 1,
        cookTimer: 0,
        cookDuration: config.dishes[0].baseTime,
        currentDishIndex: 0,
        assignedDogId: key === 'stew' ? 'golden' : null, // 金毛初始坐镇鲜美炖汤锅
        stage: layout.stage || 1,
        x: layout.x,
        y: layout.y,
        radius: layout.radius,
        width: layout.radius * 2,
        height: layout.radius * 2,
        campName: layout.campName
      };
    }

    // 《猫咪和汤》标志性【底部出餐木托盘栏】 (Bottom Serving Tray)
    // 位于主画布底部中央，5个圆润木盘位，菜品做好后飞入木盘并弹跳金币气泡
    this.servingTray = {
      x: 180,
      y: 522,
      width: 640,
      height: 68,
      plates: []
    };
    for (let i = 0; i < 5; i++) {
      this.servingTray.plates.push({
        index: i,
        x: 245 + i * 128,
        y: 556,
        radius: 28,
        dish: null // { id, name, icon, price, stationId, life: 14.0, maxLife: 14.0, bounceOffset: 0 }
      });
    }

    // 森林休憩与玩耍设施引用
    this.playGarden = {
      toys: PLAY_TOYS_CONFIG
    };

    // === GDD 1.2 迷你游戏运行时状态：公园散步 & 水里捡球 ===
    this.activeWaterBalls = [];    // 入水待叼的弹力球
    this.waterSplashes = [];       // 水花飞溅粒子
    this.parkWalkCooldown = 0;     // 公园散步冷却计时
    this.waterFetchCooldown = 0;   // 水里捡球冷却计时
    this.dogSouvenirs = [];        // 散步带回的伴手礼气泡

    // 工位原画预加载：**已停用**
    // ------------------------------------------------------------------
    // 这里原本会把 soup_station.jpg / bbq_station.jpg 加载进 stationImages，
    // 但全项目从未有任何绘制代码读取过它（5 个工位实际是纯矢量绘制）。
    // 也就是说每次开局都在白白下载约 2.2MB 永不显示的图片，移动端代价明显。
    // 另外原映射本身也是错的：bake / hotpot 都指向熬汤锅原画，jerky 指向烤架原画。
    // 因此停用加载；若日后要改成「工位用原画贴图」，请连同映射一起修正后再启用。
    this.stationImages = {};
    const STATION_ART_ENABLED = false; // 需要工位贴图时改为 true，并修正下面的映射
    if (STATION_ART_ENABLED) {
      const imgMap = {
        stew: 'assets/art/soup_station.jpg',
        bbq: 'assets/art/bbq_station.jpg',
        bake: 'assets/art/soup_station.jpg',
        hotpot: 'assets/art/soup_station.jpg',
        jerky: 'assets/art/bbq_station.jpg'
      };
      for (const [stId, src] of Object.entries(imgMap)) {
        const img = new Image();
        img.src = src;
        this.stationImages[stId] = img;
      }
    }

    // 森林萌友顾客队列 (在林间野餐木桌前欢快等候)
    this.customers = [];
    this.customerTypes = [
      { name: '垂耳兔', icon: '🐰', color: '#FADBD8' },
      { name: '橘猫', icon: '🐱', color: '#F8C471' },
      { name: '小棕熊', icon: '🐻', color: '#D5D8DC' },
      { name: '小鸭子', icon: '🦆', color: '#F9E79F' },
      { name: '梅花鹿', icon: '🦌', color: '#EDBB99' }
    ];
    this.initCustomers();

    // 飞行动画池与粒子
    this.flyingDishes = [];
    this.flyingCoins = [];
    this.cookingSteamParticles = [];
    this.floatingTexts = [];
    this.confettiParticles = []; // 小镇扩张庆典彩带粒子

    // 童话森林环境粒子：微风中的蒲公英、落叶与微光萤火虫
    this.ambientParticles = [];
    this.initAmbientParticles();

    // === GDD 第 1 章 核心交互系统 ===
    this.weather = 'sunny';
    // 1. 动态天气粒子与水洼
    this.weatherPuddles = [
      { x: 340, y: 360, r: 24, animTime: 0, ripples: [] },
      { x: 670, y: 350, r: 20, animTime: 1.2, ripples: [] },
      { x: 500, y: 470, r: 28, animTime: 2.4, ripples: [] }
    ];
    this.weatherRaindrops = [];
    this.weatherSnowflakes = [];
    this.initWeatherParticles();

    // 2. 高动能飞盘池与刨地宝物
    this.activeFrisbees = [];
    this.dirtParticles = [];
    this.dugTreasures = []; // [{ id, x, y, icon, name, type, amount, desc, life, animTime }]

    // 3. 小院木栅门 (Garden Wooden Gate 🐾 - 守候与迎门场景)
    this.gardenGate = {
      x: 95,
      y: 310,
      width: 52,
      height: 76,
      signText: '欢迎回家 🐾',
      isOpen: false,
      openAnim: 0
    };

    // 烹饪音效节流
    this.lastSoundTime = {};
  }

  // 初始化森林漫步小动物
  initCustomers() {
    this.customers = [];
    for (let i = 0; i < 3; i++) {
      const type = this.customerTypes[Math.floor(Math.random() * this.customerTypes.length)];
      this.customers.push({
        type: type,
        x: 45 + i * 42,
        y: 105,
        mood: 'waiting',
        moodTimer: 0,
        orderDishIcon: '🍲'
      });
    }
  }

  // 初始化森林环境粒子系统
  initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 28; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1000,
        y: Math.random() * 600,
        type: i % 3 === 0 ? 'dandelion' : (i % 3 === 1 ? 'leaf' : 'firefly'),
        vx: 8 + Math.random() * 16,
        vy: 4 + Math.random() * 12,
        size: 2 + Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 2,
        pulseOffset: Math.random() * 10
      });
    }
  }

  // 初始化动态天气雨雪粒子
  initWeatherParticles() {
    this.weatherRaindrops = [];
    for (let i = 0; i < 60; i++) {
      this.weatherRaindrops.push({
        x: Math.random() * 1020 - 10,
        y: Math.random() * 620 - 10,
        len: 14 + Math.random() * 14,
        speed: 550 + Math.random() * 250,
        alpha: 0.35 + Math.random() * 0.4
      });
    }

    this.weatherSnowflakes = [];
    for (let i = 0; i < 70; i++) {
      this.weatherSnowflakes.push({
        x: Math.random() * 1020 - 10,
        y: Math.random() * 620 - 10,
        r: 1.5 + Math.random() * 3.5,
        speedY: 25 + Math.random() * 35,
        speedX: (Math.random() - 0.5) * 20,
        alpha: 0.45 + Math.random() * 0.45,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  setWeather(weatherKey) {
    this.weather = weatherKey;
  }

  // 玩家/系统投掷飞盘
  throwFrisbee(startX = 500, startY = 510, targetX = null, targetY = null) {
    if (!targetX || !targetY) {
      targetX = 260 + Math.random() * 480;
      targetY = 200 + Math.random() * 200;
    }
    const frisbee = {
      id: 'frisbee_' + Date.now(),
      startX: startX,
      startY: startY,
      targetX: targetX,
      targetY: targetY,
      x: startX,
      y: startY,
      t: 0,
      duration: 1.6,
      height: 0,
      rot: 0,
      isCaught: false,
      isLanded: false,
      trail: []
    };
    this.activeFrisbees.push(frisbee);

    if (window.wangwangAudio) {
      window.wangwangAudio.playFrisbeeWhoosh();
    }

    // 挑选最近的未在岗狗狗去接飞盘
    let bestDog = null;
    let bestDist = 99999;
    for (const dog of this.dogs.values()) {
      if (dog.isOwned && !dog.assignedFacility) {
        const d = Math.hypot(dog.x - targetX, dog.y - targetY);
        if (d < bestDist) {
          bestDist = d;
          bestDog = dog;
        }
      }
    }
    if (!bestDog) {
      for (const dog of this.dogs.values()) {
        if (dog.isOwned) {
          bestDog = dog;
          break;
        }
      }
    }
    if (bestDog) {
      bestDog.fetchFrisbee(frisbee);
    }
    return frisbee;
  }

  // 添加飞溅泥土粒子
  addDirtParticles(x, y, facing = 1) {
    for (let i = 0; i < 4; i++) {
      this.dirtParticles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 6,
        vx: -facing * (45 + Math.random() * 85),
        vy: -35 - Math.random() * 65,
        color: Math.random() > 0.35 ? '#6D4C41' : '#4E342E',
        size: 2.5 + Math.random() * 3.5,
        life: 0.55 + Math.random() * 0.35
      });
    }
  }

  // 产出刨地挖出的宝藏
  spawnDigTreasure(x, y) {
    const rewards = PARK_ACTIVITIES_CONFIG.treasureDig.rewards;
    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = rewards[0];
    for (const r of rewards) {
      if (rand < r.weight) {
        selected = r;
        break;
      }
      rand -= r.weight;
    }

    let icon = '🎁';
    let name = '神秘宝箱';
    if (selected.type === 'bone') {
      icon = '🦴';
      name = '香脆黄金骨';
    } else if (selected.type === 'snack') {
      icon = '🥩';
      name = '风干肉干';
    } else {
      icon = '🪙';
      name = '金币钱袋';
    }

    // GDD 2.1 天赋「猎犬嗅觉」（比格）：迷你游戏奖励 +15%
    const mgMul = (this.economy && typeof this.economy.getMinigameMultiplier === 'function')
      ? this.economy.getMinigameMultiplier() : 1;

    this.dugTreasures.push({
      id: 'treasure_' + Date.now(),
      x: x,
      y: y,
      type: selected.type,
      amount: Math.max(1, Math.round(selected.amount * mgMul)),
      desc: selected.desc,
      icon: icon,
      name: name,
      life: 25.0,
      animTime: 0
    });

    if (window.wangwangAudio) {
      window.wangwangAudio.playCoin();
    }
  }

  // 玩家点击拾取挖出的宝藏
  collectDugTreasure(target) {
    let index = -1;
    let t = null;
    if (typeof target === 'number') {
      index = target;
      t = this.dugTreasures[index];
    } else if (typeof target === 'object' && target) {
      index = this.dugTreasures.indexOf(target);
      t = target;
    }
    if (index === -1 || !t) return;
    this.dugTreasures.splice(index, 1);

    if (this.economy) {
      if (t.type === 'bone') {
        this.economy.addBones(t.amount);
      } else if (t.type === 'gold') {
        this.economy.addGold(t.amount);
      } else if (t.type === 'snack') {
        this.economy.addSnacks(t.amount);
      }
    }

    this.floatingTexts.push({
      text: `+${t.amount} ${t.icon} ${t.desc}`,
      x: t.x,
      y: t.y - 25,
      alpha: 1.0,
      life: 1.8
    });

    if (window.wangwangAudio) {
      window.wangwangAudio.playCoin();
    }
  }
  getCurrentDish(station) {
    const dishes = station.config.dishes;
    let maxAvailableIndex = 0;
    if (station.level >= 25) maxAvailableIndex = 2;
    else if (station.level >= 10) maxAvailableIndex = 1;

    // 拉布拉多技能：高级菜品出现率提升
    const hasLabrador = this.economy.hasDog('labrador');
    let chosenIndex = station.currentDishIndex;
    if (maxAvailableIndex > 0 && Math.random() < (hasLabrador ? 0.6 : 0.4)) {
      chosenIndex = maxAvailableIndex;
    }
    return dishes[chosenIndex] || dishes[0];
  }

  // 计算设施制作时间
  calcActualCookTime(station) {
    const dish = this.getCurrentDish(station);
    // 等级提速: 每级 -4% (最多减 80%)
    const levelSpeedReduction = Math.min(0.8, (station.level - 1) * station.config.speedPerLevel);

    // 狗狗个人技能提速
    // GDD 2.1 天赋「一犬多岗」：拥有该天赋的犬种（边牧）可额外看管第二个灶台，
    // 通过 dog.secondaryFacility 记录，第二个灶台同样吃到它的 local_speed 加成。
    let dogSpeedReduction = 0;
    const applyDogSpeed = (dog) => {
      if (dog && dog.isOwned && dog.config.skillType === 'local_speed') {
        dogSpeedReduction = Math.max(dogSpeedReduction, dog.config.baseSkillBonus * dog.getSkillMultiplier());
      }
    };
    if (station.assignedDogId) applyDogSpeed(this.dogs.get(station.assignedDogId));
    for (const d of this.dogs.values()) {
      if (d.secondaryFacility === station.id) applyDogSpeed(d);
    }

    // 全局提速 (金毛、哈士奇等全局技能)
    const globalSpeedBonus = this.economy.getGlobalSpeedBonus();

    // 广告双倍加速
    const adSpeedMultiplier = this.economy.isSpeedBoostActive() ? 2.0 : 1.0;

    const actual = (dish.baseTime * (1 - levelSpeedReduction) * (1 - dogSpeedReduction)) / (1 + globalSpeedBonus);
    return Math.max(0.6, actual / adSpeedMultiplier);
  }

  // 计算设施当前菜品实际售价
  calcActualDishPrice(station) {
    const dish = this.getCurrentDish(station);
    // 设施等级提价 (每级 +10%)
    const levelPriceBonus = (station.level - 1) * 0.10;

    // 狗狗特定岗位提价 (如柴犬的烤肉达人)
    let dogPriceBonus = 0;
    if (station.assignedDogId) {
      const dog = this.dogs.get(station.assignedDogId);
      if (dog) {
        if (dog.config.skillType === 'local_price' && dog.config.targetFacility === station.id) {
          dogPriceBonus = dog.config.baseSkillBonus * dog.getSkillMultiplier();
        }
      }
    }

    // 全局售价加成 (如边牧的聪明领班 + 天赋 dish_price 全局部分 + 装扮评分)
    const globalPriceBonus = this.economy.getGlobalPriceBonus();

    // GDD 2.1 天赋被动：**限定菜系**的售价加成（如金毛「汤品大师」全体汤品 +5%）
    let passiveScopedBonus = 0;
    if (this.economy && typeof this.economy.getPassiveBonus === 'function') {
      passiveScopedBonus = this.economy.getPassiveBonus('dish_price', { scope: this.getFacilityCuisineId(station.id) });
      // getPassiveBonus 带 scope 时会同时返回「全局部分」，而全局部分已由 getGlobalPriceBonus 计入，需扣掉避免重复
      passiveScopedBonus -= this.economy.getPassiveBonus('dish_price');
    }

    // GDD 2.1 天赋被动：柴犬「财运嗅觉」金币掉落 +8%（按售价折算，在线与离线口径一致）
    let goldGainBonus = 0;
    if (this.economy && typeof this.economy.getPassiveBonus === 'function') {
      goldGainBonus = this.economy.getPassiveBonus('gold_gain');
    }

    // GDD 1.3 食谱加成：该设施所属料理菜系的食谱等级售价加成
    let recipeBonus = 0;
    if (this.economy && typeof this.economy.getRecipePriceBonusForFacility === 'function') {
      recipeBonus = this.economy.getRecipePriceBonusForFacility(station.id);
    }

    const actualPrice = dish.basePrice * (1 + levelPriceBonus) * (1 + dogPriceBonus)
      * (1 + globalPriceBonus) * (1 + recipeBonus)
      * (1 + passiveScopedBonus) * (1 + goldGainBonus);
    return Math.max(1, Math.round(actualPrice));
  }

  // 获取设施对应的料理菜系 ID (GDD 1.3：设施产出成品归类到 5 大狗狗料理菜系)
  getFacilityCuisineId(stationId) {
    if (typeof FACILITY_CUISINE_MAP !== 'undefined' && FACILITY_CUISINE_MAP[stationId]) {
      return FACILITY_CUISINE_MAP[stationId];
    }
    return 'stew';
  }

  // ==================== GDD 1.2 公园散步 ====================
  // 派遣一只空闲狗狗结伴巡游阳光公园小径
  startParkWalk() {
    if (this.parkWalkCooldown > 0) {
      return { success: false, msg: `散步的狗狗还在回来的路上，请稍等 ${Math.ceil(this.parkWalkCooldown)} 秒~` };
    }
    let dog = null;
    // 优先选择空闲在公园玩耍的狗狗
    for (const d of this.dogs.values()) {
      if (d.isOwned && !d.assignedFacility && !d.routineState) { dog = d; break; }
    }
    // 其次选择任何当前不忙碌的狗狗（在岗狗狗也可暂时离岗陪主人散步）
    if (!dog) {
      for (const d of this.dogs.values()) {
        if (d.isOwned && !d.routineState) { dog = d; break; }
      }
    }
    if (!dog) return { success: false, msg: '狗狗们都在忙着手上的事，稍后再一起去散步吧！' };

    const target = { x: 130 + Math.random() * 740, y: 380 + Math.random() * 110 };
    const ok = dog.startParkWalk(target);
    if (!ok) return { success: false, msg: '这只狗狗现在走不开哦~' };

    this.parkWalkCooldown = PARK_ACTIVITIES_CONFIG.parkWalk.cooldown;
    if (window.wangwangAudio) window.wangwangAudio.playBark(dog.id);
    return { success: true, dog: dog };
  }

  // 散步归来结算伴手礼
  grantParkWalkReward(dog) {
    const cfg = PARK_ACTIVITIES_CONFIG.parkWalk;
    const rewards = cfg.rewards;
    const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = rewards[0];
    for (const r of rewards) {
      if (rand < r.weight) { selected = r; break; }
      rand -= r.weight;
    }

    // GDD 2.1 天赋「猎犬嗅觉」（比格）：迷你游戏奖励 +15%
    const mgMul = (this.economy && typeof this.economy.getMinigameMultiplier === 'function')
      ? this.economy.getMinigameMultiplier() : 1;
    const amount = Math.max(1, Math.round(selected.amount * mgMul));
    selected.amount = amount;

    if (this.economy) {
      if (selected.type === 'gold') this.economy.addGold(amount);
      else if (selected.type === 'bone') this.economy.addBones(amount);
      else if (selected.type === 'snack') this.economy.addSnacks(amount);
      this.economy.recordAction('park_walk');
    }

    dog.stamina = Math.min(dog.maxStamina, dog.stamina + cfg.staminaRecover);
    dog.addAffectionExp(cfg.rewardAffection, 'park_walk');

    let icon = '🎁';
    if (selected.type === 'gold') icon = '🪙';
    else if (selected.type === 'bone') icon = '🦴';
    else if (selected.type === 'snack') icon = '🥩';

    this.dogSouvenirs.push({
      x: dog.x,
      y: dog.y - 34,
      text: `${icon} +${selected.amount} ${selected.desc}`,
      life: 2.2,
      maxLife: 2.2
    });

    if (window.wangwangAudio) window.wangwangAudio.playCoin();
    return selected;
  }

  // ==================== GDD 1.2 水里捡球 ====================
  // 向戏水池投球，狗狗纵身入水叼回
  startWaterFetch() {
    if (this.waterFetchCooldown > 0) {
      return { success: false, msg: `狗狗还在甩身上的水珠，请稍等 ${Math.ceil(this.waterFetchCooldown)} 秒~` };
    }
    const poolToy = PLAY_TOYS_CONFIG.find(t => t.id === 'pool') || { x: 910, y: 470, radius: 40 };

    // 优先挑选水性犬种（拉布拉多 > 金毛 > 萨摩耶）
    const order = ['labrador', 'golden', 'samoyed', 'border_collie', 'corgi', 'shiba', 'husky', 'frenchie'];
    let dog = null;
    for (const id of order) {
      const d = this.dogs.get(id);
      if (d && d.isOwned && !d.routineState) { dog = d; break; }
    }
    if (!dog) {
      for (const d of this.dogs.values()) {
        if (d.isOwned && !d.routineState) { dog = d; break; }
      }
    }
    if (!dog) return { success: false, msg: '狗狗们都在忙碌，稍后再玩水吧！' };

    const ball = {
      id: 'waterball_' + Date.now(),
      x: poolToy.x,
      y: poolToy.y,
      isCaught: false,
      bounceOffset: 0,
      life: 8.0
    };
    this.activeWaterBalls.push(ball);

    const ok = dog.startWaterFetch(ball);
    if (!ok) {
      this.activeWaterBalls.pop();
      return { success: false, msg: '这只狗狗现在走不开哦~' };
    }

    this.spawnWaterSplash(poolToy.x, poolToy.y);
    this.waterFetchCooldown = PARK_ACTIVITIES_CONFIG.waterFetch.cooldown;
    if (window.wangwangAudio) window.wangwangAudio.playFrisbeeWhoosh();
    return { success: true, dog: dog };
  }

  // 水花飞溅粒子
  spawnWaterSplash(x, y) {
    for (let i = 0; i < 16; i++) {
      const ang = Math.PI + Math.random() * Math.PI; // 向上半圆
      const spd = 60 + Math.random() * 110;
      this.waterSplashes.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.9,
        size: 2 + Math.random() * 3.5,
        life: 0.5 + Math.random() * 0.4,
        color: Math.random() > 0.4 ? '#7FD8E8' : '#FFFFFF'
      });
    }
  }

  // 水里捡球结算
  grantWaterFetchReward(dog) {
    const cfg = PARK_ACTIVITIES_CONFIG.waterFetch;
    const bonusMap = cfg.waterLoverBonus || {};
    const multiplier = bonusMap[dog.id] || bonusMap.default || 1.0;

    // GDD 2.1 天赋「猎犬嗅觉」（比格）：迷你游戏奖励 +15%（与水性犬加成叠乘）
    const mgMul = (this.economy && typeof this.economy.getMinigameMultiplier === 'function')
      ? this.economy.getMinigameMultiplier() : 1;
    const gold = Math.round(cfg.goldBonus * multiplier * mgMul);
    if (this.economy) {
      this.economy.addGold(gold);
      if (Math.random() < cfg.boneDropChance) this.economy.addBones(2);
      this.economy.recordAction('water_fetch');
    }
    dog.addAffectionExp(cfg.rewardAffection, 'water_fetch');

    this.dogSouvenirs.push({
      x: dog.x,
      y: dog.y - 34,
      text: `💧 水中捡球成功！+${gold} 🪙${multiplier > 1 ? ` (水性犬 ×${multiplier})` : ''}`,
      life: 2.2,
      maxLife: 2.2
    });

    // 清除已被叼回的弹力球
    this.activeWaterBalls = this.activeWaterBalls.filter(b => !b.isCaught);
    if (window.wangwangAudio) window.wangwangAudio.playCoin();
    return { gold, multiplier };
  }

  // 解锁新设施
  unlockStation(stationId) {
    const station = this.stations[stationId];
    if (!station || station.unlocked) return false;

    if (this.economy.spendGold(station.config.unlockCost)) {
      station.unlocked = true;
      station.level = 1;
      station.cookTimer = 0;

      // 自动分配一个在森林草地休息的空闲狗狗来上岗
      for (const dog of this.dogs.values()) {
        if (dog.isOwned && !dog.assignedFacility) {
          this.assignDogToStation(dog.id, stationId);
          break;
        }
      }

      if (window.wangwangAudio) {
        window.wangwangAudio.playUpgrade();
      }
      return true;
    }
    return false;
  }

  // 升级设施
  upgradeStation(stationId) {
    const station = this.stations[stationId];
    if (!station || !station.unlocked || station.level >= 50) return false;

    const cost = this.economy.getFacilityUpgradeCost(stationId, station.level);
    if (this.economy.spendGold(cost)) {
      station.level++;

      // 检查升级成就和每日任务
      this.economy.recordAction('upgrade_facility');
      if (station.level >= 20) {
        this.economy.unlockAchievement('ach_auto_collect');
      }
      if (station.id === 'stew' && station.level >= 2) {
        this.economy.unlockAchievement('ach_first_upgrade');
      }

      if (window.wangwangAudio) {
        window.wangwangAudio.playUpgrade();
      }
      return true;
    }
    return false;
  }

  // 分配狗狗上岗
  assignDogToStation(dogId, stationId) {
    const targetStation = this.stations[stationId];
    if (!targetStation || !targetStation.unlocked) return false;

    const targetDog = this.dogs.get(dogId);
    if (!targetDog || !targetDog.isOwned) return false;

    // 如果该设施已有狗狗，让原狗狗回到森林草地
    if (targetStation.assignedDogId) {
      const prevDog = this.dogs.get(targetStation.assignedDogId);
      if (prevDog) {
        prevDog.assignedFacility = null;
      }
    }

    // 如果新狗狗原本在其他岗位，将原岗位清空
    if (targetDog.assignedFacility && this.stations[targetDog.assignedFacility]) {
      this.stations[targetDog.assignedFacility].assignedDogId = null;
    }

    // 正式上岗
    targetStation.assignedDogId = dogId;
    targetDog.assignedFacility = stationId;

    // 设置狗狗在小镇专属岗位的站位坐标，完美契合布局示意图
    const stationOffsets = {
      stew:   { x: -72, y: 6, facing: 1 },  // 🐕 炖汤主厨 (金毛) 站在大铁锅左侧
      bbq:    { x: 72,  y: 6, facing: -1 }, // 🐕 烧烤主厨 (柴犬) 站在烤架右侧
      bake:   { x: -72, y: 6, facing: 1 },  // 🐕 甜品主厨 (萨摩耶) 站在烘焙屋左侧
      hotpot: { x: 70,  y: 6, facing: -1 }, // 🐕 火锅领班 (边牧) 站在火锅台右侧
      jerky:  { x: -70, y: 6, facing: 1 }   // 🐕 风干主厨 (哈士奇) 站在风干窖左侧
    };
    const off = stationOffsets[stationId] || { x: -60, y: 6, facing: 1 };
    targetDog.x = targetStation.x + off.x;
    targetDog.y = targetStation.y + off.y;
    targetDog.facing = off.facing;

    const professionBubbles = {
      stew: '文火慢炖出好汤！汪！🍲',
      bbq: '炭火翻烤焦香四溢！🍢',
      bake: '香甜舒芙蕾出炉咯！🧁',
      hotpot: '汤底沸腾，涮肉啦！🫕',
      jerky: '低温慢烘出肉干！🥩'
    };
    targetDog.showBubble(professionBubbles[stationId] || '开工啦！汪！', '✨');

    return true;
  }

  // 卸下在岗狗狗，放去森林草地漫步
  sendDogToRest(dogId) {
    const dog = this.dogs.get(dogId);
    if (!dog || !dog.assignedFacility) return;

    const st = this.stations[dog.assignedFacility];
    if (st) st.assignedDogId = null;

    dog.assignedFacility = null;
    dog.x = 200 + Math.random() * 500;
    dog.y = 180 + Math.random() * 260;
    dog.showBubble('下班去草地玩耍咯~ 呼噜噜~', '💤');
  }

  // 帧更新
  update(dt) {
    // 1. 各设施烹饪倒计时更新
    for (const station of Object.values(this.stations)) {
      if (!station.unlocked) continue;

      if (station.assignedDogId) {
        const dog = this.dogs.get(station.assignedDogId);
        if (dog) {
          // 被动增加在岗烹饪好感度 (每60秒+1，静默无飘字)
          dog.addAffectionExp((dt / 60) * 1.0, 'cooking', false);
        }

        station.cookDuration = this.calcActualCookTime(station);
        station.cookTimer += dt;

        // 产生温馨的烹饪锅气烟火微粒
        if (Math.random() < 0.16) {
          this.cookingSteamParticles.push({
            x: station.x + (Math.random() * 24 - 12),
            y: station.y - 10,
            vx: Math.random() * 8 - 4,
            vy: -18 - Math.random() * 12,
            alpha: 0.85,
            scale: 3 + Math.random() * 6,
            life: 1.1
          });
        }

        // 烹饪出锅！
        if (station.cookTimer >= station.cookDuration) {
          station.cookTimer = 0;
          this.onDishComplete(station);
        }
      }
    }

    // 2. 蒸汽粒子更新
    for (let i = this.cookingSteamParticles.length - 1; i >= 0; i--) {
      const p = this.cookingSteamParticles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life);
      p.scale += dt * 3.5;
      if (p.life <= 0) this.cookingSteamParticles.splice(i, 1);
    }

    // 3. 飞入底部木托盘的菜品抛物线更新
    for (let i = this.flyingDishes.length - 1; i >= 0; i--) {
      const fd = this.flyingDishes[i];
      fd.progress += dt * 1.4;

      if (fd.progress >= 1.0) {
        // 到达底部托盘
        this.onDishArriveTray(fd);
        this.flyingDishes.splice(i, 1);
      }
    }

    // 4. 底部木托盘菜品倒计时与自动售卖 (超时 14 秒平滑自动售出)
    for (const plate of this.servingTray.plates) {
      if (plate.dish) {
        plate.dish.life -= dt;
        if (plate.dish.life <= 0) {
          this.sellTrayPlate(plate.index, false); // 超时自动售出
        }
      }
    }

    // 5. 金币飞行动画更新 (飞向顶部金币栏)
    for (let i = this.flyingCoins.length - 1; i >= 0; i--) {
      const fc = this.flyingCoins[i];
      fc.progress += dt * 2.3;
      if (fc.progress >= 1.0) {
        this.economy.addGold(fc.value);
        this.flyingCoins.splice(i, 1);
      }
    }

    // 6. 飘字提示更新
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 30 * dt;
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 6.1 GDD 1.2 迷你游戏：公园散步 / 水里捡球 冷却与粒子
    if (this.parkWalkCooldown > 0) this.parkWalkCooldown = Math.max(0, this.parkWalkCooldown - dt);
    if (this.waterFetchCooldown > 0) this.waterFetchCooldown = Math.max(0, this.waterFetchCooldown - dt);

    // 入水弹力球浮动
    for (let i = this.activeWaterBalls.length - 1; i >= 0; i--) {
      const b = this.activeWaterBalls[i];
      b.life -= dt;
      b.bounceOffset = Math.sin(Date.now() / 220) * 3;
      if (b.life <= 0) this.activeWaterBalls.splice(i, 1);
    }

    // 水花粒子物理
    for (let i = this.waterSplashes.length - 1; i >= 0; i--) {
      const s = this.waterSplashes[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 320 * dt;
      if (s.life <= 0) this.waterSplashes.splice(i, 1);
    }

    // 散步/玩水伴手礼气泡上浮
    for (let i = this.dogSouvenirs.length - 1; i >= 0; i--) {
      const sv = this.dogSouvenirs[i];
      sv.life -= dt;
      sv.y -= 22 * dt;
      if (sv.life <= 0) this.dogSouvenirs.splice(i, 1);
    }

    // 7. 顾客小动物心情
    for (const c of this.customers) {
      if (c.moodTimer > 0) {
        c.moodTimer -= dt;
        if (c.moodTimer <= 0) {
          c.mood = 'waiting';
        }
      }
    }

    // 8. 森林环境粒子微动更新 (蒲公英、落叶随风飘动)
    for (const ap of this.ambientParticles) {
      ap.x += ap.vx * dt;
      ap.y += ap.vy * dt;
      ap.angle += ap.vAngle * dt;
      if (ap.x > 1020) ap.x = -20;
      if (ap.y > 620) ap.y = -20;
    }

    // 9. 柯基辅助自动收取
    this.checkAutoCollect(dt);

    // 10. 小镇扩张庆祝彩带微粒更新
    // 10. 小镇扩张庆祝彩带微粒更新
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > 620) {
        this.confettiParticles.splice(i, 1);
      }
    }

    // 11. 小镇中央音乐喷泉水波与水花粒子更新
    if (this.fountain) {
      this.fountain.animTime += dt;
      for (let i = this.fountain.particles.length - 1; i >= 0; i--) {
        const p = this.fountain.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 90 * dt; // 重力沉降
        p.life -= dt;
        if (p.life <= 0) {
          this.fountain.particles.splice(i, 1);
        }
      }
    }

    // 12. 高动能飞盘物理与轨迹更新
    for (let i = this.activeFrisbees.length - 1; i >= 0; i--) {
      const f = this.activeFrisbees[i];
      if (f.isCaught) {
        this.activeFrisbees.splice(i, 1);
        continue;
      }
      f.t += dt / f.duration;
      f.rot += 18 * dt;
      if (f.t < 1.0) {
        f.x = f.startX + (f.targetX - f.startX) * f.t;
        f.y = f.startY + (f.targetY - f.startY) * f.t;
        f.height = Math.sin(f.t * Math.PI) * 75;
      } else {
        f.x = f.targetX;
        f.y = f.targetY;
        f.height = 0;
        f.isLanded = true;
      }
    }

    // 13. 刨地泥土粒子与出土宝藏更新
    for (let i = this.dirtParticles.length - 1; i >= 0; i--) {
      const dp = this.dirtParticles[i];
      dp.x += dp.vx * dt;
      dp.y += dp.vy * dt;
      dp.vy += 120 * dt; // 重力
      dp.life -= dt;
      if (dp.life <= 0) this.dirtParticles.splice(i, 1);
    }

    for (let i = this.dugTreasures.length - 1; i >= 0; i--) {
      const tr = this.dugTreasures[i];
      tr.animTime += dt;
      tr.life -= dt;
      if (tr.life <= 0) this.dugTreasures.splice(i, 1);
    }

    // 14. 动态天气雨雪粒子更新
    const weather = (window.currentGame && window.currentGame.currentWeather) || 'sunny';
    if (weather === 'rainy') {
      for (const rd of this.weatherRaindrops) {
        rd.y += rd.speed * dt;
        rd.x -= rd.speed * 0.18 * dt;
        if (rd.y > 620 || rd.x < -20) {
          rd.y = -20;
          rd.x = Math.random() * 1050;
        }
      }
      for (const pud of this.weatherPuddles) {
        pud.animTime += dt;
        if (Math.random() < 0.08) {
          pud.ripples.push({ r: 2, maxR: pud.r, alpha: 0.7 });
        }
        for (let rIdx = pud.ripples.length - 1; rIdx >= 0; rIdx--) {
          const rip = pud.ripples[rIdx];
          rip.r += 28 * dt;
          rip.alpha = Math.max(0, 0.7 * (1 - rip.r / rip.maxR));
          if (rip.r >= rip.maxR) pud.ripples.splice(rIdx, 1);
        }
      }
    } else if (weather === 'snowy') {
      for (const sf of this.weatherSnowflakes) {
        sf.y += sf.speedY * dt;
        sf.x += (sf.speedX + Math.sin(sf.angle)) * dt;
        sf.angle += 1.5 * dt;
        if (sf.y > 620) {
          sf.y = -10;
          sf.x = Math.random() * 1020;
        }
      }
    }
  }

  // 玩家轻点中央音乐喷泉交互：祈愿爆金与水花飞溅
  triggerFountainClick(x, y) {
    if (!this.fountain) return;
    const earnedGold = Math.max(10, Math.floor(15 * (this.economy.townStage || 1)));
    this.economy.addGold(earnedGold);

    // 激起欢快水花与金币粒子
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.3;
      const speed = 40 + Math.random() * 60;
      this.fountain.particles.push({
        x: this.fountain.x + (Math.random() - 0.5) * 16,
        y: this.fountain.y - 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 65,
        color: Math.random() > 0.35 ? '#4DD0E1' : '#F1C40F',
        size: 3 + Math.random() * 3,
        life: 0.6 + Math.random() * 0.4
      });
    }

    this.floatingTexts.push({
      text: `+${earnedGold} 🪙 泉水祈愿 ✨`,
      x: this.fountain.x,
      y: this.fountain.y - 35,
      alpha: 1.0,
      life: 1.2
    });

    if (window.wangwangAudio) {
      window.wangwangAudio.playPetHeart();
    }
  }

  // 菜品完成出锅：飞向底部出餐木托盘
  onDishComplete(station) {
    const dish = this.getCurrentDish(station);
    let price = this.calcActualDishPrice(station);

    // GDD 2.1 天赋被动「野性直觉」（哈士奇）：烹饪暴击率 +5%
    // 暴击 = 这一份做成了「完美料理」，售价翻倍，并弹出金色飘字给玩家即时反馈。
    let isCrit = false;
    const critChance = (this.economy && typeof this.economy.getPassiveBonus === 'function')
      ? this.economy.getPassiveBonus('cook_crit') : 0;
    if (critChance > 0 && Math.random() < critChance) {
      isCrit = true;
      price = price * 2;
    }
    if (isCrit && this.floatingTexts) {
      this.floatingTexts.push({
        text: `✨ 完美料理 ×2`,
        x: station.x,
        y: station.y - 34,
        alpha: 1.0,
        life: 1.3
      });
    }

    // 播放对应做菜声效
    const now = Date.now();
    if (!this.lastSoundTime[station.id] || now - this.lastSoundTime[station.id] > 1000) {
      this.lastSoundTime[station.id] = now;
      if (window.wangwangAudio) {
        if (station.id === 'stew') window.wangwangAudio.playWokStir();
        else if (station.id === 'bbq') window.wangwangAudio.playGrillSizzle();
        else if (station.id === 'bake') window.wangwangAudio.playOvenDing();
        else if (station.id === 'hotpot') window.wangwangAudio.playSteamer();
        else if (station.id === 'jerky') window.wangwangAudio.playJuicer();
        else window.wangwangAudio.playCoin();
      }
    }

    // 在底部木托盘中寻找空闲的木盘位
    let targetPlate = null;
    for (const p of this.servingTray.plates) {
      const alreadyTargeted = this.flyingDishes.some(fd => fd.targetPlateIndex === p.index);
      if (!p.dish && !alreadyTargeted) {
        targetPlate = p;
        break;
      }
    }

    if (targetPlate) {
      // 优美抛物线飞向底部托盘对应盘位
      this.flyingDishes.push({
        icon: dish.icon,
        name: dish.name,
        price: price,
        startX: station.x,
        startY: station.y - 12,
        targetX: targetPlate.x,
        targetY: targetPlate.y,
        targetPlateIndex: targetPlate.index,
        progress: 0,
        stationId: station.id
      });
    } else {
      // 托盘已满：自动顺溢售卖并入账
      this.economy.addGold(price);
      this.flyingCoins.push({
        startX: station.x,
        startY: station.y - 15,
        targetX: 85,
        targetY: 35,
        value: price,
        progress: 0
      });
      if (window.wangwangAudio) window.wangwangAudio.playCoin();
    }
  }

  // 菜品到达底部木盘位
  onDishArriveTray(flyingDish) {
    const plate = this.servingTray.plates[flyingDish.targetPlateIndex];
    if (plate && !plate.dish) {
      plate.dish = {
        name: flyingDish.name,
        icon: flyingDish.icon,
        price: flyingDish.price,
        stationId: flyingDish.stationId,
        life: 14.0,
        maxLife: 14.0
      };

      // 动物客人欢喜
      if (this.customers.length > 0) {
        this.customers[0].mood = 'happy';
        this.customers[0].moodTimer = 1.0;
      }

      // 如果设施升到了 20 级解锁全自动收取，则延时 0.4 秒自动点击售出，省去手动点击
      const station = this.stations[flyingDish.stationId];
      if (station && station.level >= station.config.autoCollectUnlockLevel) {
        setTimeout(() => {
          if (plate.dish && plate.dish.name === flyingDish.name) {
            this.sellTrayPlate(plate.index, false);
          }
        }, 400);
      }
    } else {
      // 盘位被占，顺溢入账
      this.economy.addGold(flyingDish.price);
    }
  }

  // 售出底部托盘某个盘位的菜品 (玩家点击或自动售出)
  sellTrayPlate(plateIndex, isManual = true) {
    const plate = this.servingTray.plates[plateIndex];
    if (!plate || !plate.dish) return 0;

    const dishInfo = plate.dish;
    const price = dishInfo.price;
    plate.dish = null; // 清空盘位

    // 播放叮当收钱声
    if (window.wangwangAudio) {
      window.wangwangAudio.playCoin();
    }

    // 飞出金币粒子动画奔向顶部金币栏
    const coinSpawns = isManual ? 5 : 3;
    for (let i = 0; i < coinSpawns; i++) {
      this.flyingCoins.push({
        startX: plate.x + (Math.random() - 0.5) * 24,
        startY: plate.y - 12 + (Math.random() - 0.5) * 12,
        targetX: 85,
        targetY: 35,
        value: Math.ceil(price / coinSpawns),
        progress: -i * 0.07
      });
    }

    if (isManual) {
      this.economy.recordAction('collect_coins');
      // 弹出金色售卖飘字
      this.floatingTexts.push({
        text: `+${price.toLocaleString()}🪙`,
        x: plate.x,
        y: plate.y - 28,
        alpha: 1.0,
        life: 0.9
      });
    }

    return { price, name: dishInfo.name };
  }

  // 辅助犬种自动巡逻收取托盘
  // 原本硬编码只认柯基，现改为按 skillType='collect_speed' 汇总所有拥有该职业的犬种
  // （柯基 + 新增的比格），冷却缩减叠加、整体夹在合理下限内。
  checkAutoCollect(dt) {
    let cdReduction = 0;
    let hasHelper = false;
    for (const dog of this.dogs.values()) {
      if (dog.isOwned && dog.config.skillType === 'collect_speed') {
        hasHelper = true;
        cdReduction += dog.config.baseSkillBonus * dog.getSkillMultiplier();
      }
    }
    if (!hasHelper) return;

    if (!this.autoCollectTimer) this.autoCollectTimer = 0;
    this.autoCollectTimer += dt;

    // 叠加上限 80%，避免多只辅助犬把间隔压到接近 0
    const interval = Math.max(1.8, 6.5 * (1 - Math.min(0.8, cdReduction)));

    if (this.autoCollectTimer >= interval) {
      this.autoCollectTimer = 0;
      // 自动收取最靠左的一个菜品
      for (let i = 0; i < this.servingTray.plates.length; i++) {
        if (this.servingTray.plates[i].dish) {
          this.sellTrayPlate(i, false);
          break;
        }
      }
    }
  }

  // =================== 渲染主入口 (Canvas 2D) ===================
  draw(ctx) {
    // 1. 童话森林草地底色与5大阶段地貌风貌演化
    this.drawForestBackground(ctx);

    // 2. 密林松树边框 🌲 🌲 🌲 (顶部与底部环抱，完美呼应图示)
    this.drawPineTreesBorder(ctx);

    // 2.5 阳光公园公共设施 🪑 💡 (GDD 1.2 公园主题：路灯 / 长椅 / 花坛 / 公园指示牌)
    this.drawParkFurnishings(ctx);

    // 3. 小院木栅门 🐾 (守候与迎门场景)
    this.drawGardenGate(ctx);

    // 4. 小镇中央音乐喷泉 ⛲ (正中央 500, 295)
    this.drawCentralFountain(ctx);

    // 5. 森林休憩与玩耍工位 (四角休闲区：蹦床、露营帐篷、天然温泉池、草坪皮球)
    this.drawWoodlandRecreation(ctx);

    // 6. 森林萌友野餐等候区
    this.drawCustomers(ctx);

    // 7. 6大小镇核心设施营地 (阳光花园、快递驿站、甜品工坊、水晶矿洞等)
    this.drawCircularCampsites(ctx);

    // 8. 烹饪白蒸汽粒子与水花
    this.drawSteamParticles(ctx);

    // 9. 刨地泥土粒子与出土宝藏
    this.drawDirtParticles(ctx);
    this.drawDugTreasures(ctx);

    // 10. 高动能飞盘飞行与地面阴影
    this.drawActiveFrisbees(ctx);

    // 10.1 GDD 1.2 迷你游戏：入水弹力球、水花与散步伴手礼气泡
    this.drawWaterFetchEffects(ctx);
    this.drawDogSouvenirs(ctx);

    // 11. 《猫咪和汤》标志性【底部出餐木质托盘栏】与售卖气泡
    this.drawBottomServingTray(ctx);

    // 12. 飞行的出餐与金币
    this.drawFlyingDishesAndCoins(ctx);

    // 13. 售卖浮动飘字与喷泉金币飘字
    this.drawFloatingTexts(ctx);

    // 14. 森林漂浮环境粒子 (蒲公英、落叶、萤火虫)
    this.drawAmbientParticles(ctx);

    // 15. 动态天气系统视觉层 (☀️ 晴天暖阳光斑 / 🌧️ 柔和小雨与水洼涟漪 / ❄️ 梦幻积雪落雪)
    this.drawWeatherEffects(ctx);

    // 16. 小镇开荒与扩张庆典彩带粒子
    this.drawConfettiParticles(ctx);
  }

  // 绘制根据 5 大阶段演化的小镇底色与地貌路网
  // Lv.1 🌳 小森林 → Lv.5 🏡 狗狗村 → Lv.15 🏘️ 狗狗小镇 → Lv.30 🌆 狗狗城市 → Lv.50 🏝️ 狗狗度假岛
  drawForestBackground(ctx) {
    ctx.save();
    const stage = this.economy ? this.economy.townStage : 1;

    // 1. 大地渐变底色 (随着阶段提升呈现越来越富饶繁华或度假海岛质感)
    let cInner = '#C8E6C9', cMid = '#A5D6A7', cOuter = '#81C784';
    if (stage === 2) {
      // 狗狗村：更加明媚温暖的田园绿
      cInner = '#D4EFDF'; cMid = '#A9DFBF'; cOuter = '#7DCEA0';
    } else if (stage === 3) {
      // 狗狗小镇：清爽典雅草甸搭配石阶
      cInner = '#E8F8F5'; cMid = '#A3E4D7'; cOuter = '#76D7C4';
    } else if (stage === 4) {
      // 狗狗城市：现代绿意城市花园
      cInner = '#E8F6F3'; cMid = '#A2D9CE'; cOuter = '#73C6B6';
    } else if (stage >= 5) {
      // 狗狗度假岛：碧海沙滩环抱的梦幻绿岛！
      cInner = '#E8F8F5'; cMid = '#A3E4D7'; cOuter = '#FAD7A0';
    }

    const grad = ctx.createRadialGradient(500, 300, 60, 500, 300, 580);
    grad.addColorStop(0, cInner);
    grad.addColorStop(0.55, cMid);
    grad.addColorStop(1, cOuter);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1000, 600);

    // 度假岛金色沙滩外缘 (Stage 5)
    if (stage >= 5) {
      ctx.strokeStyle = 'rgba(245, 176, 65, 0.45)';
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 984, 584);

      // 碧蓝微浪
      ctx.strokeStyle = 'rgba(77, 208, 225, 0.35)';
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, 964, 564);
    }

    // 2. 阳光斑驳投影 (林荫缝隙倾泻的柔和光圈)
    ctx.fillStyle = 'rgba(255, 255, 240, 0.16)';
    const sunSpots = [
      { x: 500, y: 295, r: 180 },
      { x: 215, y: 250, r: 120 },
      { x: 785, y: 250, r: 120 },
      { x: 500, y: 150, r: 120 },
      { x: 250, y: 420, r: 120 },
      { x: 750, y: 420, r: 120 }
    ];
    for (const sp of sunSpots) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 小镇设施与中央喷泉连接的道路网络
    // 顶部炖汤锅(500,150)、左上烧烤架(215,250)、右上烘焙屋(785,250)、左下火锅台(250,420)、右下风干窖(750,420)、中央喷泉(500,295)
    const paths = [
      [{ x: 500, y: 150 }, { x: 505, y: 220 }, { x: 500, y: 295 }], // 顶部炖汤锅 -> 中央喷泉
      [{ x: 215, y: 250 }, { x: 350, y: 275 }, { x: 500, y: 295 }], // 左上烧烤架 -> 中央喷泉
      [{ x: 785, y: 250 }, { x: 650, y: 275 }, { x: 500, y: 295 }], // 右上烘焙屋 -> 中央喷泉
      [{ x: 250, y: 420 }, { x: 370, y: 350 }, { x: 500, y: 295 }], // 左下火锅台 -> 中央喷泉
      [{ x: 750, y: 420 }, { x: 630, y: 350 }, { x: 500, y: 295 }]  // 右下风干窖 -> 中央喷泉
    ];

    if (stage >= 3) {
      // 狗狗小镇 & 城市：石板大道与精致砖路
      ctx.strokeStyle = stage >= 4 ? '#BDC3C7' : '#D5D8DC';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const p of paths) {
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (let k = 1; k < p.length; k++) {
          ctx.lineTo(p[k].x, p[k].y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      for (const p of paths) {
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (let k = 1; k < p.length; k++) {
          ctx.lineTo(p[k].x, p[k].y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      // 小森林 & 狗狗村：天然鹅卵石与乡间泥土小径
      ctx.fillStyle = stage === 2 ? '#EDBB99' : '#E4D5B7';
      ctx.strokeStyle = stage === 2 ? '#DC7633' : '#D7C29E';
      ctx.lineWidth = 1;
      for (const p of paths) {
        for (let step = 0; step < p.length - 1; step++) {
          const p1 = p[step];
          const p2 = p[step + 1];
          const count = 5;
          for (let j = 1; j <= count; j++) {
            const t = j / (count + 1);
            const sx = p1.x + (p2.x - p1.x) * t + Math.sin(j * 3) * 6;
            const sy = p1.y + (p2.y - p1.y) * t + Math.cos(j * 3) * 5;
            ctx.beginPath();
            ctx.ellipse(sx, sy, 8 + (j % 2) * 2, 5 + (j % 2), 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }

    // 4. 草地上点缀的花草雏菊
    const flowers = [
      { x: 340, y: 170, color: '#FFFFFF' }, { x: 660, y: 170, color: '#FCF3CF' },
      { x: 350, y: 410, color: '#FADBD8' }, { x: 650, y: 410, color: '#FFFFFF' },
      { x: 500, y: 100, color: '#F9E79F' }, { x: 500, y: 490, color: '#FFFFFF' },
      { x: 140, y: 190, color: '#FADBD8' }, { x: 860, y: 190, color: '#FCF3CF' }
    ];
    for (const f of flowers) {
      ctx.fillStyle = f.color;
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(ang) * 4, f.y + Math.sin(ang) * 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. 阶段特色街道设施 (村庄木桩路灯 / 小镇铁艺路灯 / 城市霓虹灯柱)
    if (stage >= 2) {
      const lampPos = [
        { x: 380, y: 260 }, { x: 620, y: 260 },
        { x: 440, y: 360 }, { x: 560, y: 360 }
      ];
      for (const lp of lampPos) {
        // 灯柱
        ctx.fillStyle = stage >= 3 ? '#34495E' : '#795548';
        ctx.fillRect(lp.x - 2, lp.y - 18, 4, 20);

        // 暖黄光芒晕染
        ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
        ctx.beginPath();
        ctx.arc(lp.x, lp.y - 20, 16, 0, Math.PI * 2);
        ctx.fill();

        // 灯泡
        ctx.fillStyle = '#FFF59D';
        ctx.beginPath();
        ctx.arc(lp.x, lp.y - 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 度假岛热带彩旗吊绳 (Stage 5)
    if (stage >= 5) {
      const buntingColors = ['#E74C3C', '#F39C12', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6'];
      ctx.strokeStyle = '#7F8C8D';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(40, 80);
      ctx.quadraticCurveTo(500, 120, 960, 80);
      ctx.stroke();

      for (let i = 0; i < 28; i++) {
        const t = i / 27;
        const bx = 40 + (960 - 40) * t;
        const by = 80 + Math.sin(t * Math.PI) * 35;
        const col = buntingColors[i % buntingColors.length];

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(bx + 6, by);
        ctx.lineTo(bx, by + 12);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // 绘制「阳光公园」公共设施：复古路灯、公园长椅、圆形花坛与公园指示牌
  // (GDD 1.2 公园主题：把森林厨房场景塑造成「阳光公园 · 后院」)
  drawParkFurnishings(ctx) {
    ctx.save();

    // ---------- 1. 复古公园路灯 (铁艺灯柱 + 暖黄灯罩 + 柔光晕) ----------
    const lamps = [{ x: 345, y: 178 }, { x: 655, y: 178 }];
    for (const lp of lamps) {
      ctx.save();
      ctx.translate(lp.x, lp.y);

      // 地面投影
      ctx.fillStyle = 'rgba(46, 125, 50, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 铁艺灯柱与底座
      ctx.fillStyle = '#4E5A63';
      ctx.fillRect(-2.5, -34, 5, 40);
      ctx.beginPath();
      ctx.ellipse(0, 6, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 暖黄灯罩
      ctx.fillStyle = '#F9E79F';
      ctx.beginPath();
      ctx.moveTo(-8, -34);
      ctx.lineTo(8, -34);
      ctx.lineTo(5, -46);
      ctx.lineTo(-5, -46);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4E5A63';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 灯顶盖
      ctx.fillStyle = '#4E5A63';
      ctx.beginPath();
      ctx.ellipse(0, -46, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 灯光柔光晕
      ctx.fillStyle = 'rgba(249, 231, 159, 0.32)';
      ctx.beginPath();
      ctx.arc(0, -40, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ---------- 2. 公园木质长椅 ----------
    const benches = [{ x: 128, y: 300 }, { x: 872, y: 300 }];
    for (const bp of benches) {
      ctx.save();
      ctx.translate(bp.x, bp.y);

      // 投影
      ctx.fillStyle = 'rgba(46, 125, 50, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 26, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 椅腿
      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(-20, 0, 4, 10);
      ctx.fillRect(16, 0, 4, 10);

      // 椅面木条
      ctx.fillStyle = '#A1887F';
      ctx.beginPath();
      ctx.roundRect(-24, -4, 48, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.roundRect(-24, -12, 48, 6, 3);
      ctx.fill();

      // 靠背木条
      ctx.fillStyle = '#A1887F';
      ctx.beginPath();
      ctx.roundRect(-24, -24, 48, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.roundRect(-24, -31, 48, 5, 2.5);
      ctx.fill();

      // 靠背立柱
      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(-22, -32, 3.5, 30);
      ctx.fillRect(18.5, -32, 3.5, 30);

      ctx.restore();
    }

    // ---------- 3. 圆形花坛 (砖砌外圈 + 盛开花丛) ----------
    const flowerbeds = [{ x: 300, y: 320 }, { x: 700, y: 320 }];
    const bloomColors = ['#E74C3C', '#F1C40F', '#FF8FAB', '#FFFFFF', '#AF7AC5'];
    for (let bi = 0; bi < flowerbeds.length; bi++) {
      const fb = flowerbeds[bi];
      ctx.save();
      ctx.translate(fb.x, fb.y);

      // 砖砌外圈
      ctx.fillStyle = '#B9770E';
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      // 泥土
      ctx.fillStyle = '#6E4B3A';
      ctx.beginPath();
      ctx.ellipse(0, -1, 24, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // 绿丛
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.ellipse(0, -3, 21, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // 花团 (固定伪随机，保证每帧稳定)
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + bi * 0.6;
        const fx = Math.cos(ang) * (7 + (i % 3) * 4);
        const fy = -3 + Math.sin(ang) * (4 + (i % 2) * 3);
        ctx.fillStyle = bloomColors[(i + bi) % bloomColors.length];
        for (let pet = 0; pet < 5; pet++) {
          const pa = (pet / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(pa) * 2.6, fy + Math.sin(pa) * 2.6, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#F39C12';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // ---------- 4. 公园指示牌「☀️ 阳光公园」 ----------
    ctx.save();
    ctx.translate(500, 76);

    // 立柱
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(-2.5, 0, 5, 20);

    // 木牌
    ctx.fillStyle = '#F5CBA7';
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-62, -22, 124, 24, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6E4B3A';
    ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☀️ 阳光公园', 0, -10);

    ctx.restore();

    ctx.restore();
  }

  // 绘制小镇四周与顶部的密林松树边框 🌲 🌲 🌲
  drawPineTreesBorder(ctx) {
    ctx.save();

    // 绘制单颗茂密针叶松树的辅助函数
    const drawPineTree = (x, y, scale = 1.0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // 树底阴影
      ctx.fillStyle = 'rgba(27, 67, 50, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 粗壮树干
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(-4, 0, 8, 14);

      // 三层层叠松针 (墨绿 -> 翠绿 -> 嫩绿)
      const tiers = [
        { y: 2,   w: 22, h: 14, color: '#1B4332' },
        { y: -8,  w: 18, h: 13, color: '#2D6A4F' },
        { y: -18, w: 13, h: 12, color: '#40916C' }
      ];

      for (const t of tiers) {
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.moveTo(0, t.y - t.h);
        ctx.lineTo(-t.w, t.y);
        ctx.lineTo(t.w, t.y);
        ctx.closePath();
        ctx.fill();

        // 枝叶边缘亮线高光
        ctx.strokeStyle = '#52B788';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-t.w * 0.7, t.y - 1);
        ctx.lineTo(0, t.y - t.h + 2);
        ctx.lineTo(t.w * 0.7, t.y - 1);
        ctx.stroke();
      }

      ctx.restore();
    };

    // 1. 顶部密林松树排列 (按用户图示：顶部 🌲 🌲 🌲 环抱整片天空)
    const topTrees = [
      { x: 35, y: 40, s: 1.1 }, { x: 80, y: 35, s: 0.95 }, { x: 130, y: 42, s: 1.05 },
      { x: 180, y: 36, s: 0.9 }, { x: 230, y: 44, s: 1.1 },  { x: 280, y: 35, s: 1.0 },
      { x: 330, y: 42, s: 0.95 }, { x: 380, y: 38, s: 1.05 }, { x: 430, y: 44, s: 0.9 },
      { x: 480, y: 35, s: 1.1 }, { x: 530, y: 42, s: 1.0 },  { x: 580, y: 38, s: 0.95 },
      { x: 630, y: 44, s: 1.05 }, { x: 680, y: 36, s: 0.9 }, { x: 730, y: 42, s: 1.1 },
      { x: 780, y: 35, s: 1.0 }, { x: 830, y: 43, s: 0.95 }, { x: 880, y: 38, s: 1.05 },
      { x: 930, y: 42, s: 1.0 }, { x: 975, y: 36, s: 1.1 }
    ];
    for (const t of topTrees) {
      drawPineTree(t.x, t.y, t.s);
    }

    // 2. 底部出餐木托盘两侧及外围环抱松树 (按用户图示：底部 🌲 🌲 🌲 🌲 🌲 🌲 🌲)
    const bottomTrees = [
      { x: 30, y: 550, s: 1.15 }, { x: 75, y: 545, s: 1.0 }, { x: 120, y: 555, s: 1.1 },
      { x: 880, y: 555, s: 1.1 }, { x: 925, y: 545, s: 1.0 }, { x: 970, y: 550, s: 1.15 }
    ];
    for (const t of bottomTrees) {
      drawPineTree(t.x, t.y, t.s);
    }

    // 3. 左侧与右侧边缘纵深松树
    const sideTrees = [
      { x: 25, y: 130, s: 0.95 }, { x: 20, y: 310, s: 1.0 }, { x: 25, y: 450, s: 0.95 },
      { x: 975, y: 130, s: 0.95 }, { x: 980, y: 310, s: 1.0 }, { x: 975, y: 450, s: 0.95 }
    ];
    for (const t of sideTrees) {
      drawPineTree(t.x, t.y, t.s);
    }

    ctx.restore();
  }

  // 绘制小镇中央音乐喷泉 ⛲ (中心坐标 500, 295)
  drawCentralFountain(ctx) {
    if (!this.fountain) return;
    const f = this.fountain;
    const t = f.animTime || 0;

    ctx.save();
    ctx.translate(f.x, f.y);

    // 1. 喷泉底座外围鹅卵石环形广场
    ctx.fillStyle = 'rgba(215, 204, 200, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 8, f.radius * 1.35, f.radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 喷泉池外层石基与倒影
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.ellipse(0, 4, f.radius + 4, f.radius * 0.58 + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D7CCC8';
    ctx.beginPath();
    ctx.ellipse(0, 0, f.radius + 2, f.radius * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#BCAAA4';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. 碧蓝清泉水池 (动态波纹)
    const poolGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, f.radius - 2);
    poolGrad.addColorStop(0, '#80DEEA');
    poolGrad.addColorStop(0.7, '#26C6DA');
    poolGrad.addColorStop(1, '#00838F');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, f.radius - 4, (f.radius - 4) * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 动态同心水波涟漪 (扩散动画)
    for (let r = 0; r < 3; r++) {
      let ripProg = ((t * 0.8 + r * 0.33) % 1.0);
      // 兼容负时间参数：JS 取模可能返回负数，会导致 canvas ellipse 半径非法而抛 IndexSizeError
      if (ripProg < 0) ripProg += 1.0;
      const rw = Math.max(0, (f.radius - 8) * ripProg);
      const rh = rw * 0.54;
      const alpha = Math.max(0, 0.6 * (1 - ripProg));

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. 喷泉中央立柱与雕花水钵
    // 中立柱
    ctx.fillStyle = '#ECEFF1';
    ctx.fillRect(-7, -22, 14, 24);
    ctx.strokeStyle = '#CFD8DC';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-7, -22, 14, 24);

    // 立柱雕刻可爱小狗爪印 🐾
    ctx.fillStyle = '#F39C12';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐾', 0, -10);

    // 上层水钵
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, -22, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. 喷涌欢跃的水柱与弧形水线
    // 主水柱 (高度上下自然呼吸律动)
    const jetHeight = 24 + Math.sin(t * 6) * 8;
    ctx.save();
    const jetGrad = ctx.createLinearGradient(0, -22, 0, -22 - jetHeight);
    jetGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    jetGrad.addColorStop(0.6, 'rgba(77, 208, 225, 0.9)');
    jetGrad.addColorStop(1, 'rgba(255, 255, 255, 0.98)');

    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.quadraticCurveTo(-6, -22 - jetHeight * 0.6, 0, -22 - jetHeight);
    ctx.quadraticCurveTo(6, -22 - jetHeight * 0.6, 4, -22);
    ctx.closePath();
    ctx.fill();

    // 水花顶端飞溅小水珠
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -22 - jetHeight - 2, 3, 0, Math.PI * 2);
    ctx.arc(-5 + Math.sin(t * 8) * 3, -22 - jetHeight + 4, 2, 0, Math.PI * 2);
    ctx.arc(5 + Math.cos(t * 8) * 3, -22 - jetHeight + 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // 两侧倾泻落下的弧线泉水
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(-20, -20, -18, -2);
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(20, -20, 18, -2);
    ctx.stroke();
    ctx.restore();

    // 7. 飞溅水花粒子绘制 (点击或自然产生的粒子)
    for (const p of f.particles) {
      ctx.fillStyle = p.color || '#4DD0E1';
      ctx.beginPath();
      ctx.arc(p.x - f.x, p.y - f.y, p.size || 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. 喷泉下方木质小镇中心铭牌
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(-46, f.radius * 0.58 + 4, 92, 18, 9);
    ctx.fill();
    ctx.strokeStyle = '#F39C12';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⛲ 中央喷泉 (祈愿)', 0, f.radius * 0.58 + 17);

    ctx.restore();
  }

  // 绘制 4 大森林休憩与玩耍工位
  drawWoodlandRecreation(ctx) {
    ctx.save();

    for (const toy of PLAY_TOYS_CONFIG) {
      ctx.save();
      ctx.translate(toy.x, toy.y);

      // 设施底部柔和绿荫倒影
      ctx.beginPath();
      ctx.ellipse(0, toy.radius * 0.45, toy.radius * 0.9, toy.radius * 0.38, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46, 125, 50, 0.2)';
      ctx.fill();

      if (toy.id === 'trampoline') {
        // (1) 花丛弹跳蹦床：圆环编织床、彩色边条
        ctx.fillStyle = '#78909C';
        ctx.fillRect(-28, 4, 6, 16);
        ctx.fillRect(22, 4, 6, 16);

        ctx.fillStyle = '#FF7675';
        ctx.beginPath();
        ctx.ellipse(0, 4, 38, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.ellipse(0, 3, 30, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎪', 0, 6);

      } else if (toy.id === 'dog_bed') {
        // (2) 露营帐篷与豪华狗窝：温馨棉麻三角帐篷与复古马灯
        ctx.fillStyle = '#D35400';
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(-36, 12);
        ctx.lineTo(36, 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#F5CBA7';
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(-14, 12);
        ctx.lineTo(14, 12);
        ctx.closePath();
        ctx.fill();

        // 帐篷洞口软垫
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.ellipse(0, 14, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 小马灯暖黄光芒
        ctx.fillStyle = '#F1C40F';
        ctx.beginPath();
        ctx.arc(28, -8, 6, 0, Math.PI * 2);
        ctx.fill();

      } else if (toy.id === 'pool') {
        // (3) 林间温石温泉池：自然卵石圈与清澈微漾的碧蓝池水
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.ellipse(0, 0, 46, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4DD0E1';
        ctx.beginPath();
        ctx.ellipse(0, -1, 38, 19, 0, 0, Math.PI * 2);
        ctx.fill();

        // 绿色小荷叶
        ctx.fillStyle = '#2ECC71';
        ctx.beginPath();
        ctx.ellipse(-14, -2, 7, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛁', 10, 4);

      } else if (toy.id === 'ball') {
        // (4) 草坪缤纷弹力球
        ctx.fillStyle = '#E67E22';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0.4, 2.6);
        ctx.stroke();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎾', 2, 5);
      }

      // 设施浮动木质名称标签
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.roundRect(-42, toy.radius * 0.48 + 4, 84, 18, 9);
      ctx.fill();

      ctx.strokeStyle = '#D7CCC8';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#5D4037';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(toy.name, 0, toy.radius * 0.48 + 17);

      ctx.restore();
    }

    ctx.restore();
  }

  // 绘制森林萌友等候野餐桌
  drawCustomers(ctx) {
    ctx.save();
    // 左上方野餐木桌与长凳 (x: 20 ~ 170, y: 70 ~ 115)
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.roundRect(25, 88, 130, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#BCAAA4';
    ctx.beginPath();
    ctx.roundRect(28, 90, 124, 10, 4);
    ctx.fill();

    // 顾客队列
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      ctx.save();
      ctx.translate(c.x, c.y);

      // 头像底色
      ctx.fillStyle = c.type.color;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.type.icon, 0, -1);

      // 心情气泡
      if (c.mood === 'happy') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(8, -22, 26, 17, 6);
        ctx.fill();
        ctx.font = '11px sans-serif';
        ctx.fillText('❤️', 21, -13);
      } else if (i === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(8, -22, 28, 17, 6);
        ctx.fill();
        ctx.font = '12px sans-serif';
        ctx.fillText('🍽️', 22, -13);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 绘制 6 大自然圆形小镇设施营地 (核心工位)
  drawCircularCampsites(ctx) {
    // 使用 Set 去重，避免别名导致同一工位绘制两次
    const uniqueStations = Array.from(new Set(Object.values(this.stations)));

    for (const station of uniqueStations) {
      ctx.save();
      ctx.translate(station.x, station.y);

      const r = station.radius;

      // 1. 地面柔和阴影
      ctx.beginPath();
      ctx.ellipse(0, r * 0.5, r * 1.06, r * 0.52, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46, 125, 50, 0.24)';
      ctx.fill();

      const isFutureStage = (station.stage || 1) > this.economy.townStage;
      if (isFutureStage) {
        // 未开拓远方林地：晨雾缭绕效果与阶段路标
        ctx.fillStyle = 'rgba(230, 245, 235, 0.78)';
        ctx.beginPath();
        ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#A5D6A7';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌫️', 0, -4);

        const stageTitle = TOWN_EXPANSION_STAGES[(station.stage || 2) - 1]?.title || `小镇 Lv.${station.stage}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(-52, 12, 104, 20, 10);
        ctx.fill();
        ctx.strokeStyle = '#81C784';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#2E7D32';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`🌲 ${stageTitle}解锁`, 0, 26);

        ctx.restore();
        continue;
      }

      if (!station.unlocked) {
        // 未解锁营地：自然原木桩底座与锁头路标
        ctx.fillStyle = '#D7CCC8';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#A1887F';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 木质纹理同心圆
        ctx.strokeStyle = 'rgba(161, 136, 127, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        // 锁头与解锁价格标牌
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', 0, -4);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(-48, 14, 96, 20, 10);
        ctx.fill();
        ctx.strokeStyle = '#F39C12';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#D35400';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`🪙 ${station.config.unlockCost.toLocaleString()}`, 0, 28);

        ctx.restore();
        continue;
      }

      // 2. 已解锁营地圆形基座 (天然卵石环 + 夯土底)
      ctx.fillStyle = '#EFEBE9';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#D7CCC8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 专属小镇设施手绘矢量实景（阳光花圃、快递驿站、果园栈道、青青牧场、甜品工坊、水晶矿洞）
      this.drawTownFacilityCampsite(ctx, station.id, 0, -4);

      // 3. 《猫咪和汤》经典圆环工作进度条 (围绕营地圆周律动)
      if (station.assignedDogId) {
        const progress = Math.min(1.0, station.cookTimer / Math.max(0.1, station.cookDuration));

        // 底轨
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
        ctx.stroke();

        // 琥珀金色动态进度环
        ctx.strokeStyle = station.level >= 20 ? '#2ECC71' : '#F39C12';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
      }

      // 4. 浮动在营地上方的精致原木标牌 (产出特产 + 等级 + 价格)
      const dish = this.getCurrentDish(station);
      const actualPrice = this.calcActualDishPrice(station);

      ctx.save();
      const badgeY = -r - 18;

      // 木质底衬
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = 'rgba(90, 60, 40, 0.16)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.roundRect(-60, badgeY, 120, 24, 12);
      ctx.fill();

      // 金色细描边
      ctx.strokeStyle = '#FAD7A0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 标牌文字内容
      ctx.fillStyle = '#2C3E50';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${dish.icon} ${dish.name}`, -52, badgeY + 16);

      // 等级胶囊
      ctx.fillStyle = station.level >= 20 ? '#27AE60' : '#E67E22';
      ctx.beginPath();
      ctx.roundRect(16, badgeY + 3, 38, 17, 8);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${station.level}${station.level >= 20 ? '⚡' : ''}`, 35, badgeY + 15);

      // 无主厨警告红点
      if (!station.assignedDogId) {
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(0, r * 0.45, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, r * 0.45 + 4);
      }

      ctx.restore();
    }
  }

  // 绘制 6 大小镇设施营地实景 (按示意图：花园🌻、快递小木屋🏡、甜品烘焙屋🏡、水晶矿洞⛏️🪨💎)
  // 绘制 5 大料理工位营地实景 (🍲鲜美炖汤锅 / 🍢慢烤烧烤架 / 🧁甜品烘焙屋 / 🫕狗狗火锅台 / 🥩肉干风干窖)
  drawTownFacilityCampsite(ctx, stationId, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    if (stationId === 'stew') {
      // 🍲 鲜美炖汤锅：石砌灶台、咕嘟冒泡的大铁锅、木勺与骨汤食材
      ctx.fillStyle = '#95A5A6';
      ctx.beginPath();
      ctx.ellipse(0, 12, 34, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7F8C8D';
      ctx.beginPath();
      ctx.ellipse(0, 9, 30, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // 灶膛炭火
      ctx.fillStyle = '#E67E22';
      ctx.beginPath();
      ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.ellipse(0, 14, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 大铁锅
      ctx.fillStyle = '#34495E';
      ctx.beginPath();
      ctx.ellipse(0, -4, 27, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // 奶白高汤汤面
      ctx.fillStyle = '#F5CBA7';
      ctx.beginPath();
      ctx.ellipse(0, -5, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // 咕嘟翻滚的气泡
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(-8, -7, 3.2, 0, Math.PI * 2);
      ctx.arc(4, -9, 2.4, 0, Math.PI * 2);
      ctx.arc(10, -3, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // 飘出的食材：胡萝卜与牛大骨
      ctx.fillStyle = '#E67E22';
      ctx.beginPath();
      ctx.moveTo(-13, -3);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-7, -3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FDFEFE';
      ctx.beginPath();
      ctx.roundRect(8, -8, 11, 4, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7, -6, 2.6, 0, Math.PI * 2);
      ctx.arc(20, -6, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // 木勺斜倚锅沿
      ctx.strokeStyle = '#A1887F';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, -14);
      ctx.lineTo(30, -30);
      ctx.stroke();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(20, -13, 5, 3.5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // 锅沿反光
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, -5, 22, 11, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

    } else if (stationId === 'bbq') {
      // 🍢 慢烤烧烤架：砖砌炭炉、长烤网、一排焦香肉串与升腾烟火
      // 砖砌炉体
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.roundRect(-32, -6, 64, 22, 5);
      ctx.fill();
      ctx.fillStyle = '#6D4C41';
      for (let i = -28; i <= 24; i += 13) {
        ctx.fillRect(i, -4, 10, 6);
      }
      // 炉膛炭火红光
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.roundRect(-26, 4, 52, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#E67E22';
      ctx.beginPath();
      ctx.roundRect(-22, 6, 44, 6, 3);
      ctx.fill();

      // 长烤网
      ctx.strokeStyle = '#4E5A63';
      ctx.lineWidth = 1.6;
      for (let x = -30; x <= 30; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, -12);
        ctx.lineTo(x, -4);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-32, -12);
      ctx.lineTo(32, -12);
      ctx.stroke();

      // 三根烤串 (肉块 + 彩椒)
      const skewers = [{ x: -18, c: '#A0522D' }, { x: 0, c: '#C0392B' }, { x: 18, c: '#A0522D' }];
      for (const sk of skewers) {
        ctx.strokeStyle = '#D7CCC8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sk.x, -22);
        ctx.lineTo(sk.x, -8);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === 1 ? '#F1C40F' : sk.c;
          ctx.beginPath();
          ctx.roundRect(sk.x - 4, -21 + i * 4.6, 8, 4.2, 1.6);
          ctx.fill();
        }
      }

      // 升腾的白烟与火星
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(-10, -32, 6, 0, Math.PI * 2);
      ctx.arc(2, -40, 7.5, 0, Math.PI * 2);
      ctx.arc(14, -33, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(-16, -26, 1.4, 0, Math.PI * 2);
      ctx.arc(12, -27, 1.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (stationId === 'bake') {
      // 🧁 甜品烘焙屋：粉色小屋、条纹遮阳篷、橱窗蛋糕与烟囱
      ctx.fillStyle = '#FADBD8';
      ctx.beginPath();
      ctx.roundRect(-30, -34, 60, 44, 8);
      ctx.fill();
      ctx.strokeStyle = '#E8B4B8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 屋顶
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.moveTo(-36, -34);
      ctx.lineTo(0, -54);
      ctx.lineTo(36, -34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.lineTo(36, -34);
      ctx.lineTo(20, -34);
      ctx.closePath();
      ctx.fill();

      // 烟囱
      ctx.fillStyle = '#B9770E';
      ctx.fillRect(14, -56, 9, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(20, -62, 4.5, 0, Math.PI * 2);
      ctx.arc(26, -70, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // 粉白条纹遮阳篷
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#FF8FAB' : '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(-30 + i * 10, -30, 10, 10, 2);
        ctx.fill();
      }

      // 橱窗与展示的纸杯蛋糕
      ctx.fillStyle = '#FFF5E8';
      ctx.beginPath();
      ctx.roundRect(-24, -16, 48, 22, 5);
      ctx.fill();
      ctx.strokeStyle = '#E8B4B8';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.roundRect(-19, -8, 10, 9, 2);
      ctx.fill();
      ctx.fillStyle = '#FADBD8';
      ctx.beginPath();
      ctx.arc(-14, -10, 5.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(-14, -15, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.roundRect(2, -8, 10, 9, 2);
      ctx.fill();
      ctx.fillStyle = '#FADBD8';
      ctx.beginPath();
      ctx.arc(7, -10, 5.5, Math.PI, 0);
      ctx.fill();

      // 门口小招牌
      ctx.fillStyle = '#FFF3E0';
      ctx.beginPath();
      ctx.roundRect(22, -18, 12, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#D35400';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧁', 28, -12);

    } else if (stationId === 'hotpot') {
      // 🫕 狗狗火锅台：圆桌、鸳鸯铜锅、沸腾蒸汽与鲜肉卷拼盘
      // 圆木桌
      ctx.fillStyle = '#A1887F';
      ctx.beginPath();
      ctx.ellipse(0, 6, 36, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(0, 4, 32, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // 桌腿
      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(-4, 12, 8, 14);

      // 鸳鸯铜锅外圈
      ctx.fillStyle = '#B9770E';
      ctx.beginPath();
      ctx.ellipse(0, -2, 25, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // 左半红汤
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -2, 22, 11, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(-24, -14, 24, 26);
      // 右半白汤
      ctx.fillStyle = '#FDF3E3';
      ctx.fillRect(0, -14, 24, 26);
      ctx.restore();

      // 中央隔板
      ctx.strokeStyle = '#B9770E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(0, 9);
      ctx.stroke();

      // 沸腾气泡
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(-11, -3, 2.6, 0, Math.PI * 2);
      ctx.arc(-5, -6, 2, 0, Math.PI * 2);
      ctx.arc(8, -4, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // 鲜肉卷拼盘
      ctx.fillStyle = '#FFF5E8';
      ctx.beginPath();
      ctx.ellipse(30, 2, 13, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#E74C3C' : '#F1948A';
        ctx.beginPath();
        ctx.ellipse(26 + i * 4, 1 - i * 1.5, 4, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 蒸汽
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(-8, -26, 6, 0, Math.PI * 2);
      ctx.arc(4, -34, 7, 0, Math.PI * 2);
      ctx.arc(15, -27, 5, 0, Math.PI * 2);
      ctx.fill();

    } else if (stationId === 'jerky') {
      // 🥩 肉干风干窖：木构晾肉架、垂挂的原切肉条与低温风干风机
      // 窖体拱门
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.roundRect(-30, -30, 60, 40, [16, 16, 4, 4]);
      ctx.fill();
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.roundRect(-22, -22, 44, 32, [12, 12, 3, 3]);
      ctx.fill();

      // 横向晾肉杆
      ctx.strokeStyle = '#A1887F';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-26, -16);
      ctx.lineTo(26, -16);
      ctx.stroke();

      // 垂挂的三条原切肉干
      const strips = [
        { x: -16, w: 9, h: 20, c: '#A0522D' },
        { x: 0, w: 10, h: 24, c: '#8B4513' },
        { x: 16, w: 9, h: 18, c: '#B5651D' }
      ];
      for (const s of strips) {
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.roundRect(s.x - s.w / 2, -16, s.w, s.h, 3);
        ctx.fill();
        // 肉纹高光
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, -13);
        ctx.lineTo(s.x, -16 + s.h - 3);
        ctx.stroke();
        // 挂钩
        ctx.strokeStyle = '#BDC3C7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, -17, 2.2, Math.PI, Math.PI * 2);
        ctx.stroke();
      }

      // 左下角低温风干风机
      ctx.fillStyle = '#7F8C8D';
      ctx.beginPath();
      ctx.roundRect(-34, -2, 16, 14, 3);
      ctx.fill();
      ctx.strokeStyle = '#BDC3C7';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-26, 5, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-26, 1);
      ctx.lineTo(-26, 9);
      ctx.moveTo(-30, 5);
      ctx.lineTo(-22, 5);
      ctx.stroke();

      // 右下角待晾的肉条木箱
      ctx.fillStyle = '#A1887F';
      ctx.beginPath();
      ctx.roundRect(14, -2, 20, 13, 3);
      ctx.fill();
      ctx.fillStyle = '#B5651D';
      ctx.beginPath();
      ctx.roundRect(16, -5, 7, 5, 1.5);
      ctx.roundRect(25, -5, 7, 5, 1.5);
      ctx.fill();
    }

    ctx.restore();
  }

  // 绘制出锅香气白蒸汽粒子
  drawSteamParticles(ctx) {
    ctx.save();
    for (const p of this.cookingSteamParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // =================== 《猫咪和汤》标志性：底部出餐木托盘栏 ===================
  drawBottomServingTray(ctx) {
    ctx.save();
    const tray = this.servingTray;

    // 1. 实木质感大托盘底托
    ctx.fillStyle = '#8D6E63';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(tray.x, tray.y, tray.width, tray.height, 18);
    ctx.fill();

    // 托盘原木高光纹理
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.roundRect(tray.x + 4, tray.y + 4, tray.width - 8, tray.height - 8, 14);
    ctx.fill();

    // 托盘左侧小巧铜铃刻印
    ctx.fillStyle = '#EFEBE9';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🛎️ 出餐托盘', tray.x + 12, tray.y + 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px sans-serif';
    ctx.fillText('点餐盘立刻售卖', tray.x + 12, tray.y + 36);

    // 2. 5个圆形精雕木盘位
    for (let i = 0; i < tray.plates.length; i++) {
      const plate = tray.plates[i];
      ctx.save();
      ctx.translate(plate.x, plate.y);

      // 盘底内凹深木色凹槽
      ctx.fillStyle = '#6D4C41';
      ctx.beginPath();
      ctx.arc(0, 0, plate.radius, 0, Math.PI * 2);
      ctx.fill();

      // 陶瓷浅白盘心
      ctx.fillStyle = '#FDFEFE';
      ctx.beginPath();
      ctx.arc(0, 0, plate.radius - 3, 0, Math.PI * 2);
      ctx.fill();

      if (plate.dish) {
        const dish = plate.dish;

        // 鲜美出餐：轻微上下起伏呼吸动效
        const bounce = Math.sin(Date.now() / 180 + i) * 2.5;

        // 倒计时保鲜进度外圈 (14秒内高亮，超时平滑滑出售卖)
        const progress = Math.max(0, dish.life / dish.maxLife);
        ctx.strokeStyle = progress > 0.3 ? '#2ECC71' : '#E74C3C';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, plate.radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();

        // 菜品大图标
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dish.icon, 0, bounce);

        // 菜品上方弹跳的金色金币价格气泡 (《猫咪和汤》经典核心交互点)
        const bubbleY = -plate.radius - 12 + bounce;

        // 金黄价格气泡底
        ctx.fillStyle = '#F1C40F';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(-32, bubbleY, 64, 18, 9);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 价格文字
        ctx.fillStyle = '#784212';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🪙 +${dish.price}`, 0, bubbleY + 9);

      } else {
        // 空盘位：浅色小爪印
        ctx.fillStyle = 'rgba(161, 136, 127, 0.35)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', 0, 0);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // 绘制抛物线飞行的菜品与飞入顶部HUD的金币
  drawFlyingDishesAndCoins(ctx) {
    ctx.save();

    // 1. 菜品出餐滑翔 (优雅抛物线滑入底部托盘)
    for (const fd of this.flyingDishes) {
      const p = fd.progress;
      const curX = fd.startX + (fd.targetX - fd.startX) * p;
      // 优美高拱抛物线
      const arcH = Math.sin(p * Math.PI) * 60;
      const curY = fd.startY + (fd.targetY - fd.startY) * p - arcH;

      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fd.icon, curX, curY);

      // 金色轨迹火花
      ctx.fillStyle = 'rgba(243, 156, 18, 0.8)';
      ctx.beginPath();
      ctx.arc(curX - 4 * p, curY + 4 * p, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 金币飞翔 (直奔顶部HUD金币栏)
    for (const fc of this.flyingCoins) {
      if (fc.progress < 0) continue;
      const p = Math.min(1.0, fc.progress);
      const curX = fc.startX + (fc.targetX - fc.startX) * p;
      const curY = fc.startY + (fc.targetY - fc.startY) * p;

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪙', curX, curY);
    }

    ctx.restore();
  }

  // 绘制即时售出飘字 (+120🪙)
  drawFloatingTexts(ctx) {
    ctx.save();
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = '#F39C12';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  // 绘制森林微尘、蒲公英与萤火虫环境粒子
  drawAmbientParticles(ctx) {
    ctx.save();
    for (const ap of this.ambientParticles) {
      ctx.save();
      ctx.translate(ap.x, ap.y);
      ctx.rotate(ap.angle);

      if (ap.type === 'dandelion') {
        // 白绒蒲公英
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(0, 0, ap.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (ap.type === 'leaf') {
        // 金黄/翠绿轻薄小树叶
        ctx.fillStyle = 'rgba(241, 196, 15, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, ap.size * 1.5, ap.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 萤火虫闪烁微光
        const glow = 0.4 + Math.sin(Date.now() / 200 + ap.pulseOffset) * 0.35;
        ctx.fillStyle = `rgba(255, 235, 59, ${glow})`;
        ctx.beginPath();
        ctx.arc(0, 0, ap.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 触发小镇开荒扩张大庆典动效 (漫天五彩花瓣与金色大飘字)
  triggerTownExpansionCelebration(stageName) {
    this.confettiParticles = [];
    const colors = ['#E74C3C', '#F39C12', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#E91E63', '#FFFFFF'];
    for (let i = 0; i < 80; i++) {
      this.confettiParticles.push({
        x: 80 + Math.random() * 840,
        y: -10 - Math.random() * 200,
        w: 8 + Math.random() * 6,
        h: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 80,
        vy: 110 + Math.random() * 160,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 9,
        life: 3.5
      });
    }

    // 屏幕中央大飘字
    this.floatingTexts.push({
      text: `🎉 成功开拓【${stageName}】！新工位与新伙伴解锁！`,
      x: 500,
      y: 260,
      alpha: 1.0,
      life: 2.8
    });
  }

  // 绘制庆典五彩礼花
  drawConfettiParticles(ctx) {
    if (!this.confettiParticles || this.confettiParticles.length === 0) return;
    ctx.save();
    for (const p of this.confettiParticles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.restore();
  }

  // 1. 绘制小院木栅门 🐾 (守候与迎门场景)
  drawGardenGate(ctx) {
    if (!this.gardenGate) return;
    const gx = this.gardenGate.x;
    const gy = this.gardenGate.y;

    ctx.save();
    // 门前迎宾鹅卵石小径
    ctx.fillStyle = '#E0D4B8';
    ctx.beginPath();
    ctx.ellipse(gx + 12, gy + 34, 18, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(gx + 34, gy + 36, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 白色与温木色栅栏立柱
    ctx.fillStyle = '#D7CCC8';
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1.5;

    [-18, 42].forEach(offX => {
      ctx.fillRect(gx + offX, gy - 20, 8, 52);
      ctx.strokeRect(gx + offX, gy - 20, 8, 52);
      // 栅栏顶端尖顶
      ctx.beginPath();
      ctx.moveTo(gx + offX, gy - 20);
      ctx.lineTo(gx + offX + 4, gy - 28);
      ctx.lineTo(gx + offX + 8, gy - 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 栅栏横木
    ctx.fillStyle = '#EFEBE9';
    ctx.fillRect(gx - 18, gy - 6, 68, 6);
    ctx.strokeRect(gx - 18, gy - 6, 68, 6);
    ctx.fillRect(gx - 18, gy + 14, 68, 6);
    ctx.strokeRect(gx - 18, gy + 14, 68, 6);

    // 栅栏垂直尖头木板
    [-10, 2, 14, 26, 38].forEach(bx => {
      ctx.fillRect(gx + bx, gy - 14, 6, 44);
      ctx.strokeRect(gx + bx, gy - 14, 6, 44);
      ctx.beginPath();
      ctx.moveTo(gx + bx, gy - 14);
      ctx.lineTo(gx + bx + 3, gy - 20);
      ctx.lineTo(gx + bx + 6, gy - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 门牌木匾: 🐾 欢迎回家 🐾
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.roundRect(gx - 8, gy - 42, 54, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#FFF8E1';
    ctx.font = 'bold 9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐾 欢迎回家 🐾', gx + 19, gy - 30);

    // 门旁小油灯/挂灯
    ctx.fillStyle = '#F39C12';
    ctx.beginPath();
    ctx.arc(gx + 46, gy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
    ctx.beginPath();
    ctx.arc(gx + 46, gy - 8, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 2. 绘制高动能飞盘飞行与地面投影
  drawActiveFrisbees(ctx) {
    if (!this.activeFrisbees || this.activeFrisbees.length === 0) return;
    ctx.save();
    for (const f of this.activeFrisbees) {
      if (f.isCaught) continue;

      // 地面阴影 (高度越高阴影越散漫淡雅)
      const shadowAlpha = Math.max(0.06, 0.22 - (f.height / 75) * 0.14);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 4, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 空中自旋飞盘
      const drawY = f.y - f.height;
      ctx.save();
      ctx.translate(f.x, drawY);
      ctx.rotate(f.rot);

      // 鲜红盘身
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#C0392B';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 金黄流光同心环
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 盘心反光
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-2, -1, 3, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // 3. 绘制飞溅泥土粒子
  drawDirtParticles(ctx) {
    if (!this.dirtParticles || this.dirtParticles.length === 0) return;
    ctx.save();
    for (const p of this.dirtParticles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3.1 GDD 1.2 迷你游戏：水里捡球 —— 入水弹力球与水花飞溅
  drawWaterFetchEffects(ctx) {
    ctx.save();

    // 入水的弹力球
    if (this.activeWaterBalls && this.activeWaterBalls.length > 0) {
      for (const b of this.activeWaterBalls) {
        if (b.isCaught) continue;
        const by = b.y + (b.bounceOffset || 0);

        // 水面涟漪
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y + 6, 16, 5.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 橙黄弹力球
        ctx.fillStyle = '#E67E22';
        ctx.beginPath();
        ctx.arc(b.x, by, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(b.x, by, 7, 0.4, 2.6);
        ctx.stroke();

        // 球面高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(b.x - 3, by - 4, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 水花粒子
    if (this.waterSplashes && this.waterSplashes.length > 0) {
      for (const s of this.waterSplashes) {
        ctx.globalAlpha = Math.max(0, Math.min(1, s.life / 0.5));
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // 3.2 GDD 1.2 迷你游戏：散步与玩水的伴手礼飘浮气泡
  drawDogSouvenirs(ctx) {
    if (!this.dogSouvenirs || this.dogSouvenirs.length === 0) return;
    ctx.save();
    for (const sv of this.dogSouvenirs) {
      const alpha = Math.max(0, Math.min(1, sv.life / 1.2));
      ctx.globalAlpha = alpha;

      ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = Math.max(96, ctx.measureText(sv.text).width + 20);

      ctx.fillStyle = 'rgba(255, 253, 245, 0.95)';
      ctx.strokeStyle = '#F0B27A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(sv.x - w / 2, sv.y - 11, w, 22, 11);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#B9770E';
      ctx.fillText(sv.text, sv.x, sv.y + 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // 4. 绘制出土的宝物
  drawDugTreasures(ctx) {
    if (!this.dugTreasures || this.dugTreasures.length === 0) return;
    ctx.save();
    for (const t of this.dugTreasures) {
      // 刨出的小土坑
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 10, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6D4C41';
      ctx.beginPath();
      ctx.ellipse(t.x - 2, t.y + 8, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 金色脉冲光芒
      const pulse = 0.5 + Math.sin(t.animTime * 4) * 0.3;
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.35})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
      ctx.fill();

      // 浮动悬赏图标
      const floatY = t.y - 6 + Math.sin(t.animTime * 3) * 4;
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.icon, t.x, floatY);

      // 点我拾取气泡标
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.beginPath();
      ctx.roundRect(t.x - 30, floatY - 26, 60, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#FFEB3B';
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.fillText('✨ 点我拾取', t.x, floatY - 14);
    }
    ctx.restore();
  }

  // 5. 绘制动态天气系统视觉层 (☀️ 晴天暖阳 / 🌧️ 柔和小雨 / ❄️ 梦幻落雪)
  drawWeatherEffects(ctx) {
    const weather = (window.currentGame && window.currentGame.currentWeather) || 'sunny';
    ctx.save();

    if (weather === 'sunny') {
      // 温暖阳光丁达尔光柱 (God Rays)
      const grad = ctx.createLinearGradient(0, 0, 900, 600);
      grad.addColorStop(0, 'rgba(255, 255, 230, 0.12)');
      grad.addColorStop(0.5, 'rgba(255, 245, 200, 0.05)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1000, 600);

      // 斜射阳光光束
      ctx.fillStyle = 'rgba(255, 255, 220, 0.08)';
      ctx.beginPath();
      ctx.moveTo(100, 0);
      ctx.lineTo(240, 0);
      ctx.lineTo(580, 600);
      ctx.lineTo(440, 600);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(520, 0);
      ctx.lineTo(820, 600);
      ctx.lineTo(700, 600);
      ctx.closePath();
      ctx.fill();
    } else if (weather === 'rainy') {
      // 柔和治愈雨天浅蓝微润滤镜
      ctx.fillStyle = 'rgba(52, 73, 94, 0.10)';
      ctx.fillRect(0, 0, 1000, 600);

      // 雨水洼与同心涟漪
      for (const pud of this.weatherPuddles) {
        ctx.fillStyle = 'rgba(174, 214, 241, 0.35)';
        ctx.beginPath();
        ctx.ellipse(pud.x, pud.y, pud.r, pud.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(133, 193, 233, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 扩散涟漪
        for (const rip of pud.ripples) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${rip.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(pud.x, pud.y, rip.r, rip.r * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 高速斜飘细雨丝
      ctx.strokeStyle = 'rgba(220, 235, 252, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const rd of this.weatherRaindrops) {
        ctx.moveTo(rd.x, rd.y);
        ctx.lineTo(rd.x - rd.len * 0.2, rd.y + rd.len);
      }
      ctx.stroke();
    } else if (weather === 'snowy') {
      // 梦幻冬日冷白淡蓝滤镜
      ctx.fillStyle = 'rgba(235, 245, 255, 0.12)';
      ctx.fillRect(0, 0, 1000, 600);

      // 树梢与建筑物积雪点缀 (白色软绵积雪顶)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 18; i++) {
        const sx = 30 + i * 55;
        ctx.beginPath();
        ctx.arc(sx, 18, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 18; i++) {
        const sx = 30 + i * 55;
        ctx.beginPath();
        ctx.arc(sx, 582, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // 缓缓飞旋下落的蓬松白雪花
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const sf of this.weatherSnowflakes) {
        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
