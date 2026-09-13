/**
 * 《汪汪小馆》- 服装收集、衣橱试穿与盲盒抽取系统
 * 30件高萌服装（10帽+10衣+10饰）、金币直购、骨头抽卡十连抽、首次穿戴+50好感
 */

class WardrobeManager {
  constructor(economy, dogs) {
    this.economy = economy;
    this.dogs = dogs;

    // 已解锁拥有的服装 ID 集合 (初始赠送一顶主厨高帽)
    this.ownedOutfitIds = new Set(['hat_chef', 'cloth_apron', 'acc_scarf']);

    // 盲盒奖池配置
    this.allOutfits = OUTFITS_CONFIG;

    // === GDD 1.2 收集亮点：犬种 × 毛色 × 饰品 —— 毛色收集 ===
    // 所有 costType 为 'free' 的基础毛色默认解锁
    this.ownedCoatIds = new Set();
    if (typeof COAT_COLORS_CONFIG !== 'undefined') {
      for (const list of Object.values(COAT_COLORS_CONFIG)) {
        for (const coat of list) {
          if (coat.costType === 'free') this.ownedCoatIds.add(coat.id);
        }
      }
    }
  }

  // 获取某犬种可用的毛色列表
  // 传说变体专属毛色单独存放在 LEGENDARY_COAT_CONFIG（不可购买，只能抽卡获得），
  // 这里**只在该毛色已解锁后**才并入列表，避免衣橱里出现一堆点不动的灰卡。
  getCoatColors(dogId) {
    if (typeof COAT_COLORS_CONFIG === 'undefined') return [];
    const base = (COAT_COLORS_CONFIG[dogId] || []).slice();
    if (typeof LEGENDARY_COAT_CONFIG !== 'undefined') {
      for (const coat of Object.values(LEGENDARY_COAT_CONFIG)) {
        if (coat.breedId === dogId && this.isCoatOwned(coat.id)) base.push(coat);
      }
    }
    return base;
  }

  // 查询毛色定义（普通表 + 传说变体表）
  findCoatColor(coatId) {
    if (typeof COAT_COLORS_CONFIG !== 'undefined') {
      for (const list of Object.values(COAT_COLORS_CONFIG)) {
        const hit = list.find(c => c.id === coatId);
        if (hit) return hit;
      }
    }
    if (typeof LEGENDARY_COAT_CONFIG !== 'undefined' && LEGENDARY_COAT_CONFIG[coatId]) {
      return LEGENDARY_COAT_CONFIG[coatId];
    }
    return null;
  }

  isCoatOwned(coatId) {
    return this.ownedCoatIds.has(coatId);
  }

  // 解锁（购买）毛色
  buyCoatColor(dogId, coatId) {
    const coat = this.findCoatColor(coatId);
    if (!coat) return { success: false, msg: '毛色不存在' };
    if (this.isCoatOwned(coatId)) return { success: false, msg: '已经拥有这款毛色啦！' };
    // 传说变体专属毛色不可购买，只能通过钻石抽卡获得
    if (coat.costType === 'legendary') {
      return { success: false, msg: '这款传说毛色只能通过抽卡获得哦！' };
    }

    if (coat.costType === 'gold') {
      if (!this.economy.spendGold(coat.cost)) return { success: false, msg: '金币不足哦！' };
    } else if (coat.costType === 'bone') {
      if (!this.economy.spendBones(coat.cost)) return { success: false, msg: '骨头不足哦！' };
    }

    this.ownedCoatIds.add(coatId);
    this.economy.recordAction('collect_coat');
    if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
    return { success: true, coat: coat, msg: `成功解锁毛色【${coat.name}】！` };
  }

  // 给狗狗染色（切换毛色）
  equipCoatColor(dogId, coatId) {
    const dog = this.dogs.get(dogId);
    if (!dog || !dog.isOwned) return { success: false, msg: '未找到狗狗' };

    if (coatId === 'default') {
      dog.setCoatColor('default', null);
      return { success: true, dog: dog, msg: `已恢复【${dog.name}】的原生毛色。` };
    }

    const coat = this.findCoatColor(coatId);
    if (!coat) return { success: false, msg: '毛色未找到' };
    if (!this.isCoatOwned(coatId)) return { success: false, msg: '尚未解锁这款毛色' };

    dog.setCoatColor(coatId, coat);
    return { success: true, dog: dog, coat: coat, msg: `【${dog.name}】换上了【${coat.name}】！` };
  }

  // 获取特定部位服装列表
  getOutfitsByCategory(category) {
    // category: 'hat', 'cloth', 'acc', 或 'all'
    if (category === 'all') return this.allOutfits;
    return this.allOutfits.filter(item => item.type === category);
  }

  // 检查是否拥有
  isOwned(outfitId) {
    return this.ownedOutfitIds.has(outfitId);
  }

  // 使用金币或骨头购买基础服装
  buyOutfit(outfitId) {
    const outfit = this.allOutfits.find(o => o.id === outfitId);
    if (!outfit) return { success: false, msg: '服装不存在' };
    if (this.isOwned(outfitId)) return { success: false, msg: '已经拥有这件衣服啦！' };

    if (outfit.costType === 'gold') {
      if (!this.economy.spendGold(outfit.cost)) {
        return { success: false, msg: '金币不足哦！' };
      }
    } else {
      if (!this.economy.spendBones(outfit.cost)) {
        return { success: false, msg: '骨头不足哦！' };
      }
    }

    this.ownedOutfitIds.add(outfitId);
    this.economy.recordAction('collect_outfit');

    if (window.wangwangAudio) {
      window.wangwangAudio.playUpgrade();
    }

    return { success: true, outfit: outfit, msg: `成功获得【${outfit.name}】！` };
  }

  // 盲盒单抽 (10 骨头)
  drawSingle() {
    if (!this.economy.spendBones(10)) {
      return { success: false, msg: '骨头不足（单抽需10骨头）！' };
    }

    const randomItem = this.allOutfits[Math.floor(Math.random() * this.allOutfits.length)];
    const isNew = !this.isOwned(randomItem.id);

    if (isNew) {
      this.ownedOutfitIds.add(randomItem.id);
      this.economy.recordAction('collect_outfit');
    } else {
      // 重复抽到返还 2 根骨头和 1 块肉干零食
      this.economy.addBones(2);
      this.economy.addSnacks(1);
    }

    if (window.wangwangAudio) {
      window.wangwangAudio.playUpgrade();
    }

    return {
      success: true,
      items: [{ outfit: randomItem, isNew: isNew }]
    };
  }

  // 盲盒十连抽 (90 骨头，9折优惠)
  drawTen() {
    if (!this.economy.spendBones(90)) {
      return { success: false, msg: '骨头不足（十连抽需90骨头）！' };
    }

    const results = [];
    for (let i = 0; i < 10; i++) {
      const item = this.allOutfits[Math.floor(Math.random() * this.allOutfits.length)];
      const isNew = !this.isOwned(item.id);
      if (isNew) {
        this.ownedOutfitIds.add(item.id);
        this.economy.recordAction('collect_outfit');
      } else {
        this.economy.addBones(2);
        this.economy.addSnacks(1);
      }
      results.push({ outfit: item, isNew: isNew });
    }

    if (window.wangwangAudio) {
      window.wangwangAudio.playUpgrade();
    }

    return {
      success: true,
      items: results
    };
  }

  // 给特定狗狗换装
  equipOutfit(dogId, outfitId) {
    const dog = this.dogs.get(dogId);
    if (!dog || !dog.isOwned) return { success: false, msg: '未找到狗狗' };

    const outfit = this.allOutfits.find(o => o.id === outfitId);
    if (!outfit) return { success: false, msg: '服装未找到' };
    if (!this.isOwned(outfitId)) return { success: false, msg: '尚未解锁这件服装' };

    dog.equipOutfit(outfit);
    return { success: true, dog: dog, outfit: outfit };
  }

  // 卸下狗狗的特定部位服装
  unequipSlot(dogId, slotType) {
    const dog = this.dogs.get(dogId);
    if (!dog) return false;
    dog.unequipOutfit(slotType);
    return true;
  }
}
