/**
 * 《汪汪小馆》- GDD 2.1 犬种抽卡系统 (DogGachaManager)
 * ------------------------------------------------------------------
 * 奖池 = 10 个犬种 + 传说稀有变体。按稀有度加权抽取，带三重独立保底：
 *   · pityRare     抽内必出「稀有」及以上
 *   · pityEpic     抽内必出「史诗」及以上
 *   · pityLegendary 抽内必出「传说」（即变体）
 *
 * 设计要点：
 *  1. 保底计数与统计**直接存在 economy 上**（economy.gachaPity / gachaStats），
 *     不另建一份，存档时天然被带上，不会出现两处状态不一致。
 *  2. 同稀有度内**优先给未拥有**的条目 —— 避免保底触发时又抽到重复卡，体验很差。
 *  3. 抽到已拥有的条目 → 按稀有度返还钻石（重复转化补偿），不会空手而归。
 *  4. 抽到传说变体 → 同时解锁该变体的专属发光毛色（复用已有毛色系统）。
 */

class DogGachaManager {
  constructor(economy, dogs, wardrobe) {
    this.economy = economy;
    this.dogs = dogs;
    this.wardrobe = wardrobe;
  }

  getConfig() {
    return (typeof DOG_GACHA_CONFIG !== 'undefined') ? DOG_GACHA_CONFIG : null;
  }

  // 构建完整奖池（犬种 + 传说变体）
  buildPool() {
    const pool = [];
    if (typeof DOG_CARDS_CONFIG !== 'undefined') {
      for (const [breedId, card] of Object.entries(DOG_CARDS_CONFIG)) {
        pool.push({ kind: 'dog', id: breedId, rarity: card.rarity || 'common' });
      }
    }
    if (typeof DOG_VARIANTS_CONFIG !== 'undefined') {
      for (const v of DOG_VARIANTS_CONFIG) {
        pool.push({ kind: 'variant', id: v.id, rarity: v.rarity || 'legendary', variant: v });
      }
    }
    return pool;
  }

  isOwned(entry) {
    if (entry.kind === 'dog') {
      const d = this.dogs && this.dogs.get(entry.id);
      return !!(d && d.isOwned);
    }
    return this.economy.hasVariant(entry.id);
  }

  // 取条目展示信息（名称 / 图标 / 稀有度），供 UI 使用
  describe(entry) {
    const rc = (typeof RARITY_CONFIG !== 'undefined' && RARITY_CONFIG[entry.rarity]) || { name: '普通', color: '#95A5A6', stars: 1 };
    if (entry.kind === 'dog') {
      const d = this.dogs && this.dogs.get(entry.id);
      const cfg = (typeof DOG_BREEDS_CONFIG !== 'undefined') ? DOG_BREEDS_CONFIG[entry.id] : null;
      return {
        kind: 'dog', id: entry.id, rarity: entry.rarity, rarityName: rc.name,
        rarityColor: rc.color, stars: rc.stars,
        name: d ? d.name : (cfg ? cfg.name : entry.id),
        icon: cfg ? cfg.avatar : '🐶',
        title: cfg ? cfg.title : '',
        passiveDesc: (typeof DOG_CARDS_CONFIG !== 'undefined' && DOG_CARDS_CONFIG[entry.id] && DOG_CARDS_CONFIG[entry.id].passive)
          ? DOG_CARDS_CONFIG[entry.id].passive.desc : ''
      };
    }
    const v = entry.variant;
    return {
      kind: 'variant', id: entry.id, rarity: entry.rarity, rarityName: rc.name,
      rarityColor: rc.color, stars: rc.stars,
      name: v.name, icon: v.icon, title: '传说变体',
      passiveDesc: v.extraPassive ? v.extraPassive.desc : '',
      coatName: v.coat ? v.coat.name : ''
    };
  }

  // 按稀有度权重随机挑一个稀有度
  rollRarity(rarities) {
    const total = rarities.reduce((s, r) => s + (RARITY_CONFIG[r] ? RARITY_CONFIG[r].weight : 1), 0);
    let rand = Math.random() * total;
    for (const r of rarities) {
      const w = RARITY_CONFIG[r] ? RARITY_CONFIG[r].weight : 1;
      if (rand < w) return r;
      rand -= w;
    }
    return rarities[rarities.length - 1];
  }

  // 从候选里挑一个：优先未拥有
  pickFrom(candidates) {
    if (!candidates || candidates.length === 0) return null;
    const unowned = candidates.filter(e => !this.isOwned(e));
    const list = unowned.length ? unowned : candidates;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 抽一张（含保底判定）
  rollOne() {
    const cfg = this.getConfig();
    const pool = this.buildPool();
    if (pool.length === 0) return null;
    const p = this.economy.gachaPity;

    // --- 保底优先级：传说 > 史诗 > 稀有 ---
    // 用 sinceX + 1 >= pityX 表示「这一抽就是第 pityX 抽」
    if (cfg && p.sinceLegendary + 1 >= cfg.pityLegendary) {
      const hit = this.pickFrom(pool.filter(e => e.rarity === 'legendary'));
      if (hit) return hit;
    }
    if (cfg && p.sinceEpic + 1 >= cfg.pityEpic) {
      const hit = this.pickFrom(pool.filter(e => e.rarity === 'epic' || e.rarity === 'legendary'));
      if (hit) return hit;
    }
    if (cfg && p.sinceRare + 1 >= cfg.pityRare) {
      const hit = this.pickFrom(pool.filter(e => e.rarity !== 'common'));
      if (hit) return hit;
    }

    // --- 普通抽取：先定稀有度，再在同稀有度内挑 ---
    const rarity = this.rollRarity(Object.keys(RARITY_CONFIG));
    const sameRarity = pool.filter(e => e.rarity === rarity);
    return this.pickFrom(sameRarity.length ? sameRarity : pool);
  }

  // 结算一张：发放新条目，或对重复条目做钻石返还
  settle(entry) {
    const cfg = this.getConfig();
    const rc = (typeof RARITY_CONFIG !== 'undefined' && RARITY_CONFIG[entry.rarity]) || { recycleDiamonds: 0 };

    if (this.isOwned(entry)) {
      const refund = (cfg ? cfg.dupeDiamonds : 0) + (rc.recycleDiamonds || 0);
      this.economy.addDiamonds(refund);
      return { entry, isNew: false, refundDiamonds: refund };
    }

    if (entry.kind === 'dog') {
      const dog = this.dogs && this.dogs.get(entry.id);
      if (dog) dog.isOwned = true;
      this.economy.recordAction('recruit_dog');
    } else {
      // 传说变体：记录拥有 + 解锁专属毛色
      this.economy.ownedVariantIds.add(entry.id);
      if (this.wardrobe && entry.variant && entry.variant.coat) {
        this.wardrobe.ownedCoatIds.add(entry.variant.coat.id);
      }
    }
    return { entry, isNew: true, refundDiamonds: 0 };
  }

  // 更新保底计数
  bumpPity(rarity) {
    const p = this.economy.gachaPity;
    p.total++;
    p.sinceRare++;
    p.sinceEpic++;
    p.sinceLegendary++;
    if (rarity !== 'common') p.sinceRare = 0;
    if (rarity === 'epic' || rarity === 'legendary') p.sinceEpic = 0;
    if (rarity === 'legendary') p.sinceLegendary = 0;

    const st = this.economy.gachaStats;
    st.totalDraws++;
    st.byRarity[rarity] = (st.byRarity[rarity] || 0) + 1;
  }

  // 抽取 count 次（1 或 10）
  draw(count = 1) {
    const cfg = this.getConfig();
    if (!cfg) return { success: false, msg: '抽卡配置缺失' };

    const cost = (count === 10) ? cfg.tenCost : cfg.singleCost * count;
    if (!this.economy.spendDiamonds(cost)) {
      return { success: false, msg: `钻石不足（需 💎${cost}）！` };
    }
    this.economy.gachaStats.diamondSpent += cost;

    const results = [];
    for (let i = 0; i < count; i++) {
      const entry = this.rollOne();
      if (!entry) break;
      const r = this.settle(entry);
      this.bumpPity(entry.rarity);
      results.push(r);
    }

    if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
    return { success: true, results: results, cost: cost, count: results.length };
  }

  // 距离下一次保底还有多少抽（用于 UI 展示）
  getPityStatus() {
    const cfg = this.getConfig();
    if (!cfg) return null;
    const p = this.economy.gachaPity;
    return {
      sinceLegendary: p.sinceLegendary,
      untilLegendary: Math.max(0, cfg.pityLegendary - p.sinceLegendary),
      untilEpic: Math.max(0, cfg.pityEpic - p.sinceEpic),
      untilRare: Math.max(0, cfg.pityRare - p.sinceRare),
      totalDraws: this.economy.gachaStats.totalDraws
    };
  }

  // 单抽 / 十连价格
  getCost(count = 1) {
    const cfg = this.getConfig();
    if (!cfg) return 0;
    return (count === 10) ? cfg.tenCost : cfg.singleCost * count;
  }
}

if (typeof window !== 'undefined') {
  window.DogGachaManager = DogGachaManager;
}
