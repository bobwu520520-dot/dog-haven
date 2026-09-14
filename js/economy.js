/**
 * 《汪汪小馆》- 经济模型、技能加成汇总与离线挂机收益系统
 * 三货币体系 (GDD 2.3：金币软货币 + 钻石稀缺货币 + 骨头)、全局技能与天赋被动汇聚、
 * 离线收益上限、日常任务与成就
 */

class WangwangEconomy {
  constructor() {
    // 基础资产 (给新玩家友好的开局赠送：100金币 + 20骨头 + 3个肉干 + 60钻石够首抽)
    this.gold = 100;
    this.bones = 20;
    this.snacks = 3;
    // GDD 2.3 钻石：稀缺货币，用于抽取稀有犬种/传说变体、买装扮、加速、开装饰位
    this.diamonds = 60;

    // GDD 2.1 已拥有的传说变体 id 集合（只能由抽卡获得）
    this.ownedVariantIds = new Set();
    // GDD 2.1 抽卡保底计数器（三重独立保底）
    this.gachaPity = { total: 0, sinceRare: 0, sinceEpic: 0, sinceLegendary: 0 };
    // 抽卡统计（byRarity 必须在这里初始化 —— 否则首抽就会因取不到该字段而抛错）
    this.gachaStats = {
      totalDraws: 0,
      diamondSpent: 0,
      byRarity: { common: 0, rare: 0, epic: 0, legendary: 0 }
    };

    // 统计数据
    this.totalGoldEarned = 100;
    this.totalCoinsCollected = 0;
    this.lastSavedTimestamp = Date.now();

    // 临时加速增益 (激励广告赠送 2 分钟双倍制作速度)
    this.speedBoostEndTime = 0;

    // 每日观看广告免费领取骨头次数 (上限 3 次)
    this.dailyAdBonesWatched = 0;

    // 狗狗数据引用 (由外部绑定)
    this.dogs = null; // Map<breedId, DogChef>
    this.kitchen = null; // RestaurantKitchen

    // 每日任务进度数据
    this.dailyTaskProgress = {
      collect_coins: 0,
      pet_dog: 0,
      play_toy: 0,
      upgrade_facility: 0,
      recruit_dog: 0,
      watch_ad: 0
    };
    this.claimedTasks = new Set();
    this.lastDailyResetDate = new Date().toDateString();

    // 成就解锁集合
    this.unlockedAchievements = new Set();
    this.claimedAchievements = new Set();

    // 森林小镇开荒扩张阶段 (1: 青青小丘, 2: 溪流林苑, 3: 百花密境, 4: 梦幻汪汪王国)
    this.townStage = 1;

    // GDD 1.3 核心循环：5 大狗狗料理食谱等级 (升级食谱 → 单位产出更高)
    this.recipeLevels = { stew: 1, bbq: 1, bakery: 1, hotpot: 1, jerky: 1 };
  }

  bindGameReferences(dogs, kitchen, wardrobe = null) {
    this.dogs = dogs;
    this.kitchen = kitchen;
    if (wardrobe) this.wardrobe = wardrobe;
  }

  // --- 小镇扩张与核心循环相关方法 ---

  getTownStageConfig() {
    return TOWN_EXPANSION_STAGES[this.townStage - 1] || TOWN_EXPANSION_STAGES[0];
  }

  getTownLevel() {
    return this.getFacilityTotalLevels();
  }

  getFacilityTotalLevels() {
    let sum = 0;
    if (this.kitchen && this.kitchen.stations) {
      const uniqueStations = new Set(Object.values(this.kitchen.stations));
      for (const st of uniqueStations) {
        if (st.unlocked) sum += st.level;
      }
    }
    return Math.max(1, sum);
  }

  checkTownExpansionReady() {
    if (this.townStage >= 5) return false;
    const cfg = this.getTownStageConfig();
    const req = cfg ? cfg.requirements : null;
    if (!req) return false;

    const totalLevels = this.getFacilityTotalLevels();
    const goldReq = this.totalGoldEarned >= (req.minTotalGold || 0);
    const levelReq = totalLevels >= (req.minTotalLevels || 1);

    if (this.townStage === 1) {
      const stewpot = this.kitchen?.stations?.stew;
      const targetStewLvl = req.minStewLevel || req.minGardenLevel || req.minTotalLevels || 5;
      return (stewpot && stewpot.level >= targetStewLvl) && goldReq;
    }
    return levelReq && goldReq;
  }

  getTownExpansionProgress() {
    if (this.townStage >= 5) {
      return {
        progress: 1.0,
        text: '小镇已达顶级形态【Lv.50 🏝️ 狗狗度假岛】！👑',
        ready: false,
        nextStageName: '已登峰造极'
      };
    }
    const cfg = this.getTownStageConfig();
    const req = cfg.requirements;
    const totalLvl = this.getFacilityTotalLevels();

    if (this.townStage === 1) {
      const stewpot = this.kitchen?.stations?.stew;
      const stewLvl = stewpot ? stewpot.level : 1;
      const targetLvl = req.minStewLevel || req.minGardenLevel || req.minTotalLevels || 5;
      const p1 = Math.min(1, stewLvl / targetLvl);
      const p2 = Math.min(1, this.totalGoldEarned / (req.minTotalGold || 500));
      return {
        progress: (p1 + p2) / 2,
        text: `鲜美炖汤锅 Lv.${stewLvl}/${targetLvl} | 累计金币 🪙${this.totalGoldEarned}/${req.minTotalGold}`,
        ready: this.checkTownExpansionReady(),
        nextStageName: cfg.nextStageName
      };
    } else {
      const targetLvl = req.minTotalLevels || 15;
      const p1 = Math.min(1, totalLvl / targetLvl);
      const p2 = Math.min(1, this.totalGoldEarned / (req.minTotalGold || 10000));
      return {
        progress: (p1 + p2) / 2,
        text: `设施总等级 Lv.${totalLvl}/${targetLvl} | 累计金币 🪙${this.totalGoldEarned}/${req.minTotalGold}`,
        ready: this.checkTownExpansionReady(),
        nextStageName: cfg.nextStageName
      };
    }
  }

  // 获取当前核心放置循环行动目标 (🐶解锁小狗 → 🏡建造设施 → 🐶小狗自动工作 → 💰自动赚钱 → ⬆️升级设施/小狗 → 🌳扩张小镇 → 循环)
  getCurrentLoopObjective() {
    if (this.checkTownExpansionReady()) {
      return {
        step: 'expand',
        icon: '🌳',
        text: `达成阶段开荒！点击【扩张小镇】！`,
        action: 'expand_town'
      };
    }

    if (this.townStage === 1) {
      const stewpot = this.kitchen?.stations?.stew;
      const shiba = this.dogs?.get('shiba');
      const bbqgrill = this.kitchen?.stations?.bbq;

      if (stewpot && stewpot.level < 5) {
        return {
          step: 'upgrade',
          icon: '⬆️',
          text: `升级鲜美炖汤锅至 Lv.5 (当前 Lv.${stewpot.level}/5)`,
          action: 'upgrade_station',
          stationId: 'stew'
        };
      }
      if (shiba && !shiba.isOwned) {
        return {
          step: 'recruit',
          icon: '🐶',
          text: `招募新伙伴【柴犬】(烧烤主厨 🪙200)`,
          action: 'open_dogs_modal',
          dogId: 'shiba'
        };
      }
      if (bbqgrill && !bbqgrill.unlocked) {
        return {
          step: 'build',
          icon: '🏡',
          text: `建造新料理工位【慢烤烧烤架】(🪙150)`,
          action: 'unlock_station',
          stationId: 'bbq'
        };
      }
      if (bbqgrill && bbqgrill.unlocked && !bbqgrill.assignedDogId) {
        return {
          step: 'assign',
          icon: '🍢',
          text: `指派柴犬前往慢烤烧烤架掌炉`,
          action: 'open_dog_profile',
          dogId: 'shiba'
        };
      }
      if (this.totalGoldEarned < 500) {
        return {
          step: 'earn',
          icon: '💰',
          text: `自动烹饪出餐 累计 🪙500 (当前 🪙${this.totalGoldEarned}/500)`,
          action: 'wait_earn'
        };
      }
    } else {
      // 进阶阶段目标
      const cfg = this.getTownStageConfig();
      const req = cfg.requirements;
      const totalLvl = this.getFacilityTotalLevels();

      // 检查是否有本阶段解锁但未拥有的狗狗
      for (const dId of cfg.unlockedDogs) {
        const d = this.dogs?.get(dId);
        if (d && !d.isOwned) {
          return {
            step: 'recruit',
            icon: '🐶',
            text: `招募新伙伴【${d.name}】(🪙${d.config.recruitCost.toLocaleString()})`,
            action: 'open_dogs_modal',
            dogId: dId
          };
        }
      }

      // 检查是否有本阶段解锁但未建造的设施
      for (const stId of cfg.unlockedFacilities) {
        const st = this.kitchen?.stations[stId];
        if (st && !st.unlocked) {
          return {
            step: 'build',
            icon: '🏡',
            text: `建造新设施【${st.config.name}】(🪙${st.config.unlockCost.toLocaleString()})`,
            action: 'unlock_station',
            stationId: stId
          };
        }
      }

      // 检查空缺岗位
      for (const st of Object.values(this.kitchen?.stations || {})) {
        if (st.unlocked && !st.assignedDogId) {
          return {
            step: 'assign',
            icon: '👨‍🍳',
            text: `指派狗狗前往【${st.config.name}】开工`,
            action: 'open_facilities_modal'
          };
        }
      }

      // 升级设施总等级
      if (totalLvl < req.minTotalLevels) {
        return {
          step: 'upgrade',
          icon: '⬆️',
          text: `升级设施 提升总等级 (${totalLvl}/${req.minTotalLevels})`,
          action: 'open_facilities_modal'
        };
      }

      // 累计收益
      if (this.totalGoldEarned < req.minTotalGold) {
        return {
          step: 'earn',
          icon: '💰',
          text: `小馆营业 累计金币 🪙${this.totalGoldEarned.toLocaleString()}/${req.minTotalGold.toLocaleString()}`,
          action: 'wait_earn'
        };
      }
    }

    return {
      step: 'ready',
      icon: '✨',
      text: `小馆繁荣运转中，享受治愈时光~`,
      action: 'idle'
    };
  }

  expandTown() {
    if (!this.checkTownExpansionReady() || this.townStage >= 4) return false;
    const prevStage = this.getTownStageConfig();
    this.townStage++;
    const newStage = this.getTownStageConfig();

    // 发放扩张小镇荣誉骨头奖励
    this.addBones(prevStage.rewardBones || 20);

    return {
      success: true,
      newStage: newStage,
      rewardBones: prevStage.rewardBones
    };
  }

  // --- 货币增减接口 ---

  addGold(amount) {
    const val = Math.max(0, Math.round(amount));
    this.gold += val;
    this.totalGoldEarned += val;
    this.checkMilestones();
    return this.gold;
  }

  spendGold(amount) {
    if (this.gold >= amount) {
      this.gold -= amount;
      return true;
    }
    return false;
  }

  addBones(amount) {
    this.bones += Math.max(0, amount);
    return this.bones;
  }

  spendBones(amount) {
    if (this.bones >= amount) {
      this.bones -= amount;
      return true;
    }
    return false;
  }

  addSnacks(amount) {
    this.snacks += Math.max(0, amount);
    return this.snacks;
  }

  spendSnack() {
    if (this.snacks > 0) {
      this.snacks--;
      return true;
    }
    return false;
  }

  // --- GDD 2.3 钻石（稀缺货币）---

  addDiamonds(amount) {
    this.diamonds += Math.max(0, Math.round(amount));
    return this.diamonds;
  }

  spendDiamonds(amount) {
    if (this.diamonds >= amount) {
      this.diamonds -= amount;
      return true;
    }
    return false;
  }

  hasDog(breedId) {
    if (!this.dogs) return false;
    const d = this.dogs.get(breedId);
    return d && d.isOwned;
  }

  // ==================== GDD 2.1 天赋被动汇总 ====================
  // 职业技能（skillType，绑工位）与天赋被动（passive，全局）是两层独立加成。
  // 这里只汇总「只要拥有该犬种就生效」的天赋，不掺入职业技能。
  //
  // scope 语义（很重要，否则会重复计加成）：
  //   getPassiveBonus('dish_price')                 → 只取**不限菜系**的（全局生效）
  //   getPassiveBonus('dish_price', {scope:'stew'}) → 取全局的 + 限定 stew 的
  // 也就是说：不带 scope 查询 = 全局部分；带 scope 查询 = 全局 + 该 scope 部分。
  //
  // @param {string} type 聚合键，见 DOG_CARDS_CONFIG[*].passive.type
  // @param {object} [opts] 可选过滤，如 { scope: 'stew' }
  // @returns {number} 该类型的加成总量（比例类为小数，如 0.13 表示 +13%）
  getPassiveBonus(type, opts) {
    const wantScope = opts && opts.scope;
    // 是否采纳一条被动：type 必须匹配；scope 按上面的语义判定
    const accept = (p) => {
      if (!p || p.type !== type) return false;
      if (wantScope) return !p.scope || p.scope === wantScope;
      return !p.scope; // 不带 scope 查询时，只收全局被动
    };

    let total = 0;

    // 1) 犬种天赋
    if (this.dogs && typeof DOG_CARDS_CONFIG !== 'undefined') {
      for (const [breedId, card] of Object.entries(DOG_CARDS_CONFIG)) {
        if (!accept(card.passive)) continue;
        const dog = this.dogs.get(breedId);
        if (dog && dog.isOwned) total += card.passive.value;
      }
    }

    // 2) 传说变体的额外天赋（「双重天赋」的第二项）
    if (typeof DOG_VARIANTS_CONFIG !== 'undefined' && this.ownedVariantIds) {
      for (const v of DOG_VARIANTS_CONFIG) {
        if (!this.ownedVariantIds.has(v.id)) continue;
        if (accept(v.extraPassive)) total += v.extraPassive.value;
      }
    }

    return total;
  }

  // 是否拥有某传说变体
  hasVariant(variantId) {
    return !!(this.ownedVariantIds && this.ownedVariantIds.has(variantId));
  }

  // 汇总所有已拥有的天赋被动（用于图鉴 / 名册展示）
  getActivePassives() {
    const list = [];
    if (this.dogs && typeof DOG_CARDS_CONFIG !== 'undefined') {
      for (const [breedId, card] of Object.entries(DOG_CARDS_CONFIG)) {
        const p = card.passive;
        if (!p) continue;
        const dog = this.dogs.get(breedId);
        if (dog && dog.isOwned) list.push(Object.assign({ source: dog.name, breedId: breedId }, p));
      }
    }
    if (typeof DOG_VARIANTS_CONFIG !== 'undefined' && this.ownedVariantIds) {
      for (const v of DOG_VARIANTS_CONFIG) {
        if (this.ownedVariantIds.has(v.id)) {
          list.push(Object.assign({ source: v.name, variantId: v.id, isVariant: true }, v.extraPassive));
        }
      }
    }
    return list;
  }

  // ==================== GDD 2.4 装扮评分 ====================
  // 装扮评分 = 每件已穿戴服装的稀有度权重之和（骨头装 > 金币装 > 免费装）。
  // 评分本身不直接产出，而是转化为「时尚小馆」售价加成，让换装真正有玩法意义。
  getFashionScore() {
    if (!this.dogs) return 0;
    let score = 0;
    for (const dog of this.dogs.values()) {
      if (!dog.isOwned || !dog.equippedOutfits) continue;
      for (const outfit of Object.values(dog.equippedOutfits)) {
        if (!outfit) continue;
        score += (outfit.costType === 'bone') ? 10 : (outfit.costType === 'gold' ? 4 : 2);
      }
    }
    return score;
  }

  // 装扮评分带来的售价加成：每 10 分 +1%，上限 +20%；贵宾的「时尚品味」天赋在此处生效
  getFashionPriceBonus() {
    const raw = this.getFashionScore() * (1 + this.getPassiveBonus('outfit_score'));
    return Math.min(0.20, raw * 0.001);
  }

  // GDD 2.1 天赋被动「猎犬嗅觉」（比格）：迷你游戏奖励倍率
  // 4 项迷你游戏（接飞盘 / 嗅闻寻宝 / 公园散步 / 水里捡球）的奖励统一乘以此倍率。
  getMinigameMultiplier() {
    return 1 + this.getPassiveBonus('minigame_bonus');
  }

  // GDD 2.1 天赋被动「精打细算」（法斗）：设施升级成本 -8%
  // 包装 WangwangFormulas 的纯函数，统一在此处打折，避免每个调用点各写一遍。
  getFacilityUpgradeCost(facilityId, currentLevel) {
    const base = WangwangFormulas.getFacilityUpgradeCost(facilityId, currentLevel);
    if (!isFinite(base)) return base;
    const discount = Math.min(0.5, this.getPassiveBonus('upgrade_discount'));
    return Math.max(1, Math.floor(base * (1 - discount)));
  }

  // --- 全局技能汇总计算 ---

  // 全局制作速度加成
  //
  // ⚠️ 修掉一处历史 bug：这里原本还会把**金毛**的 baseSkillBonus 加进来，
  // 但金毛的技能是 `local_price`（鲜美炖汤锅售价 +15%），并非全局产速。
  // 结果是金毛的售价加成被错误地又当成「全镇产速 +15%」生效了一次 —— 一次加成、两处生效。
  // 金毛的售价加成由 kitchen.calcActualDishPrice() 的 local_price 分支正确承担，此处移除。
  getGlobalSpeedBonus() {
    if (!this.dogs) return 0;
    let bonus = 0;

    // 哈士奇职业技能：风干快手 (所有料理工位产出速率 +12%)
    const husky = this.dogs.get('husky');
    if (husky && husky.isOwned) {
      bonus += husky.config.baseSkillBonus * husky.getSkillMultiplier();
    }

    // GDD 2.1 天赋被动：雪原哈士奇变体的「霜原疾行」(全镇产速 +6%)
    bonus += this.getPassiveBonus('global_speed');

    // GDD 1.3：5 大食谱全部满级时的额外全局产速加成
    bonus += this.getRecipeGlobalSpeedBonus();

    return bonus;
  }

  // 全局菜品售价加成
  // 构成：边牧职业技能（汤底掌控）+ 天赋被动 dish_price（无 scope 限定的部分）+ 装扮评分
  getGlobalPriceBonus() {
    if (!this.dogs) return 0;
    let bonus = 0;

    const collie = this.dogs.get('border_collie');
    if (collie && collie.isOwned) {
      bonus += collie.config.baseSkillBonus * collie.getSkillMultiplier();
    }

    // 天赋被动中**不限菜系**的售价加成（如晴天金毛的「晴空祝福」+6%）
    // 带 scope 的（如金毛天赋限定 stew）由 calcActualDishPrice 单独处理，避免重复计入
    bonus += this.getPassiveBonus('dish_price');

    // GDD 2.4 装扮评分转化而来的售价加成
    bonus += this.getFashionPriceBonus();

    return bonus;
  }

  // ==================== GDD 1.3 食谱升级系统 ====================
  // 获取指定料理菜系的食谱等级
  getRecipeLevel(cuisineId) {
    if (!this.recipeLevels) this.recipeLevels = { stew: 1, bbq: 1, bakery: 1, hotpot: 1, jerky: 1 };
    return this.recipeLevels[cuisineId] || 1;
  }

  // 获取指定料理菜系升级到下一级所需金币
  getRecipeUpgradeCost(cuisineId) {
    const lvl = this.getRecipeLevel(cuisineId);
    const cost = WangwangFormulas.getRecipeUpgradeCost(lvl);
    return cost === Infinity ? Infinity : cost;
  }

  // 该菜系是否已解锁（按小镇等级或对应料理工位解锁：炖汤 1 / 烧烤 5 / 烘焙 15 / 火锅 30 / 肉干 50）
  isRecipeCuisineUnlocked(cuisineId) {
    if (typeof DOG_CUISINES_CONFIG === 'undefined') return true;
    const cuisine = DOG_CUISINES_CONFIG[cuisineId];
    if (!cuisine) return false;
    // 如果对应的料理工位已在后厨解锁，直接视为已解锁
    if (this.kitchen && cuisine.facilityId && this.kitchen.stations && this.kitchen.stations[cuisine.facilityId]?.unlocked) {
      return true;
    }
    const reqLevel = cuisine.stage || 1;
    return this.getTownLevel() >= reqLevel || this.townStage >= reqLevel;
  }

  // 升级指定料理菜系的食谱
  upgradeRecipe(cuisineId) {
    const lvl = this.getRecipeLevel(cuisineId);
    if (lvl >= RECIPE_UPGRADE_CONFIG.maxLevel) {
      return { success: false, msg: '该食谱已达到满级 Lv.10 啦！' };
    }
    if (!this.isRecipeCuisineUnlocked(cuisineId)) {
      const cuisine = DOG_CUISINES_CONFIG[cuisineId];
      return { success: false, msg: `该菜系需小镇 Lv.${cuisine ? cuisine.stage : 1} 或解锁对应工位哦！` };
    }
    const cost = this.getRecipeUpgradeCost(cuisineId);
    if (!this.spendGold(cost)) {
      return { success: false, msg: `金币不足（需 🪙${cost.toLocaleString()}）！` };
    }
    this.recipeLevels[cuisineId] = lvl + 1;
    if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
    const cuisine = (typeof DOG_CUISINES_CONFIG !== 'undefined') ? DOG_CUISINES_CONFIG[cuisineId] : null;
    return {
      success: true,
      level: lvl + 1,
      msg: `【${cuisine ? cuisine.name : cuisineId}】食谱升至 Lv.${lvl + 1}！`
    };
  }

  // 指定设施所属菜系的食谱售价加成
  getRecipePriceBonusForFacility(facilityId) {
    if (typeof FACILITY_CUISINE_MAP === 'undefined') return 0;
    const cuisineId = FACILITY_CUISINE_MAP[facilityId];
    if (!cuisineId) return 0;
    if (!this.isRecipeCuisineUnlocked(cuisineId)) return 0;
    const lvl = this.getRecipeLevel(cuisineId);
    return (lvl - 1) * RECIPE_UPGRADE_CONFIG.priceBonusPerLevel;
  }

  // 全部菜系均满级时的额外全局产速加成
  getRecipeGlobalSpeedBonus() {
    if (typeof DOG_CUISINES_CONFIG === 'undefined') return 0;
    const ids = Object.keys(DOG_CUISINES_CONFIG);
    if (ids.length === 0) return 0;
    const allMax = ids.every(id => this.getRecipeLevel(id) >= RECIPE_UPGRADE_CONFIG.maxLevel);
    return allMax ? RECIPE_UPGRADE_CONFIG.maxLevelGlobalSpeedBonus : 0;
  }

  // 离线收益上限 (基础 8 小时 + 所有 offline_limit 职业犬种的加成)
  // 原本硬编码只认法斗，现改为按 skillType 汇总，新犬种只要声明该技能即自动生效。
  getOfflineLimitHours() {
    let limit = 8; // 基础 8 小时
    if (this.dogs) {
      for (const dog of this.dogs.values()) {
        if (dog.isOwned && dog.config.skillType === 'offline_limit') {
          limit += dog.config.baseSkillBonus * dog.getSkillMultiplier();
        }
      }
    }
    return Math.min(24, limit);
  }

  // 临时双倍制作速度增益是否激活
  isSpeedBoostActive() {
    return Date.now() < this.speedBoostEndTime;
  }

  activateSpeedBoost(durationSeconds = 120) {
    this.speedBoostEndTime = Date.now() + durationSeconds * 1000;
  }

  // --- 实时产出速率 (每秒金币产出) ---
  calcGoldPerSecond() {
    if (!this.kitchen) return 5;
    let gps = 0;

    for (const st of Object.values(this.kitchen.stations)) {
      if (st.unlocked && st.assignedDogId) {
        const time = this.kitchen.calcActualCookTime(st);
        const price = this.kitchen.calcActualDishPrice(st);
        gps += price / Math.max(0.5, time);
      }
    }
    return Math.max(1, Math.round(gps * 10) / 10);
  }

  // --- 离线收益计算 ---
  calcOfflineEarnings() {
    const now = Date.now();
    const elapsedSec = Math.floor((now - this.lastSavedTimestamp) / 1000);

    // 离线时间若小于 10 秒则不弹窗
    if (elapsedSec < 10) return null;

    const maxLimitSec = this.getOfflineLimitHours() * 3600;
    const effectiveSec = Math.min(elapsedSec, maxLimitSec);
    const gps = this.calcGoldPerSecond();
    // GDD 2.1 天赋被动：萨摩耶「雪原暖意」离线收益 +15%（按已拥有犬种叠加）
    const offlineBonus = this.getPassiveBonus('offline_bonus');
    const goldEarned = Math.round(effectiveSec * gps * (1 + offlineBonus));

    return {
      offlineSeconds: effectiveSec,
      totalOfflineSeconds: elapsedSec,
      maxHours: this.getOfflineLimitHours(),
      goldPerSec: gps,
      offlineBonus: offlineBonus,
      earnedGold: goldEarned
    };
  }

  // 领取离线金币
  claimOfflineGold(isDouble = false, earnedGold = 0) {
    const finalGold = isDouble ? earnedGold * 2 : earnedGold;
    this.addGold(finalGold);
    this.lastSavedTimestamp = Date.now();
    return finalGold;
  }

  // --- 日常任务与成就触发 ---

  recordAction(actionType, count = 1) {
    this.checkDailyReset();
    if (this.dailyTaskProgress[actionType] === undefined) {
      this.dailyTaskProgress[actionType] = 0;
    }
    this.dailyTaskProgress[actionType] += count;
    if (actionType === 'collect_coins') {
      this.totalCoinsCollected += count;
    }
    this.checkMilestones(actionType);
  }

  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.lastDailyResetDate !== today) {
      this.lastDailyResetDate = today;
      this.dailyTaskProgress = {
        collect_coins: 0,
        pet_dog: 0,
        play_toy: 0,
        upgrade_facility: 0,
        recruit_dog: 0,
        watch_ad: 0
      };
      this.claimedTasks.clear();
      this.dailyAdBonesWatched = 0;
    }
  }

  claimDailyTask(taskId) {
    const task = DAILY_TASKS_CONFIG.find(t => t.id === taskId);
    if (!task || this.claimedTasks.has(taskId)) return false;

    const cur = this.dailyTaskProgress[task.action] || 0;
    if (cur >= task.target) {
      this.claimedTasks.add(taskId);
      this.addBones(task.rewardBones);
      if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
      return true;
    }
    return false;
  }

  unlockAchievement(achId) {
    this.unlockedAchievements.add(achId);
  }

  claimAchievement(achId) {
    const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === achId);
    if (!ach || this.claimedAchievements.has(achId)) return false;

    if (this.unlockedAchievements.has(achId)) {
      this.claimedAchievements.add(achId);
      this.addBones(ach.rewardBones);
      if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
      return true;
    }
    return false;
  }

  checkMilestones(actionType = null) {
    if (this.totalGoldEarned >= 100000) {
      this.unlockAchievement('ach_gold_100k');
    }
    if (actionType === 'husky_fun') {
      this.unlockAchievement('ach_husky_fun');
    }
    if (this.kitchen && this.kitchen.stations) {
      if (this.kitchen.stations.stew && this.kitchen.stations.stew.level >= 2) {
        this.unlockAchievement('ach_first_upgrade');
      }
      for (const st of Object.values(this.kitchen.stations)) {
        if (st.level >= 20) {
          this.unlockAchievement('ach_auto_collect');
          break;
        }
      }
    }
    const w = this.wardrobe || (typeof window !== 'undefined' && window.game ? window.game.wardrobe : null);
    if (w && w.ownedOutfitIds && w.ownedOutfitIds.size >= 10) {
      this.unlockAchievement('ach_outfit_10');
    }
    if (this.dogs) {
      let ownedCount = 0;
      let hasMaxAffection = false;
      for (const d of this.dogs.values()) {
        if (d.isOwned) ownedCount++;
        if (d.affectionLevel >= 10) hasMaxAffection = true;
      }
      if (ownedCount >= 4) this.unlockAchievement('ach_recruit_4');
      // 「集齐全部犬种」按实际犬种数判定，而不是硬编码 8 —— 新增犬种后成就自动跟随
      const totalBreeds = (typeof DOG_BREEDS_CONFIG !== 'undefined') ? Object.keys(DOG_BREEDS_CONFIG).length : 8;
      if (ownedCount >= totalBreeds) this.unlockAchievement('ach_all_dogs');
      if (hasMaxAffection) this.unlockAchievement('ach_affection_max');
    }
  }
}
