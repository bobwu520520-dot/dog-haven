/**
 * 《汪汪小馆》- 狗狗厨师角色实体与动画系统
 * 8大品种手绘治愈卡通风格、动作状态机、三件套换装图层、好感度与互动
 */

class DogChef {
  // 立绘在场景中的目标高度（px）。
  // 标定依据：矢量小狗鼻尖约在 y=-24、脚底约在 y=+20，站立高度约 44px。
  // 立绘是全须全尾的站姿（含尾巴、耳尖、脚掌），视觉体量取 48px 与矢量版基本齐平；
  // 若调大，立绘会盖住工位设施。
  static SPRITE_DRAW_HEIGHT = 48;
  // 立绘底边在局部坐标系的落点。矢量管线把脚掌画在 y≈+20、地面阴影画在 y=24，
  // 所以立绘底边必须落在 y≈+22 才与阴影和工位对齐；用 0 会让狗「飘在地面上方」。
  static SPRITE_FEET_Y = 22;

  // 素材本身的朝向：-1 = 画的是「朝左」，需要水平翻转后才等于 facing=1（向右）；
  //                  1 = 画的是「朝右」，不需要翻转。
  //
  // 这里踩过一个真实的坑：早期实现默认写成 1（注释还写着「立绘原画一律朝右」），
  // 但 8 张素材其实**朝向并不统一** —— 金毛/边牧/萨摩耶/拉布拉多是朝左画的，
  // 柴犬/柯基/哈士奇/法斗是朝右画的。而 facing=1 在全局约定里表示「向右移动」
  // （见 `facing = dx > 0 ? 1 : -1`），于是朝左那 4 只全程倒着走。
  // 现在改为逐犬种显式声明，见 SPRITE_TUNING。
  static SPRITE_ART_FACING = 1;

  // 逐犬种的立绘微调。
  // 8 张素材出自同一套画风（3/4 侧视、纯白底、全身站姿），但**朝向分两派**，
  // 因此 artFacing 必须逐只写清楚，不能靠一个全局默认值糊过去。
  //   artFacing: -1 → 素材朝左（渲染时需翻转）
  //   artFacing:  1 → 素材朝右（无需翻转）
  static SPRITE_TUNING = {
    golden:        { artFacing: -1 }, // 朝左
    border_collie: { artFacing: -1 }, // 朝左
    samoyed:       { artFacing: -1 }, // 朝左
    labrador:      { artFacing: -1 }, // 朝左
    poodle:        { artFacing: -1 }, // 朝左（GDD 2.1 新增素材）
    shiba:         { artFacing: 1 },  // 朝右
    corgi:         { artFacing: 1 },  // 朝右
    husky:         { artFacing: 1 },  // 朝右
    frenchie:      { artFacing: 1 }   // 朝右
    // 其余可选项：drawHeight（体型偏大/偏小时压低或抬高）、centerBiasX（脚爪不居中时平移）
    // 注意：比格（beagle）暂无立绘，走矢量回退，无需在此声明 artFacing。
  };

  constructor(breedId, config, isOwned = false) {
    this.id = breedId;
    this.config = config;
    this.name = config.name;
    this.title = config.title;
    this.avatar = config.avatar;
    this.isOwned = isOwned;

    // 岗位分配: null 表示在公园休息区闲逛，'stew', 'bbq' 等表示在特定料理工位
    this.assignedFacility = null;

    // 坐标与移动
    this.x = 200;
    this.y = 500;
    this.targetX = 200;
    this.targetY = 500;
    this.facing = 1; // 1: 向右, -1: 向左
    this.speed = 40; // 休息区移动速度 px/s

    // 好感度系统 (1 - 10 级)
    this.affectionLevel = 1;
    this.affectionExp = 0;
    this.lastPetTime = 0; // 上次抚摸时间戳，CD 30秒

    // 体力值系统 (0 - 100)
    this.stamina = 100;
    this.maxStamina = 100;
    this.isTired = false;
    this.playJumpY = 0; // 蹦床跳跃
    this.currentToyId = null;

    // 换装三槽位: { hat: null, cloth: null, acc: null }
    this.equippedOutfits = {
      hat: null,
      cloth: null,
      acc: null
    };
    this.wornOutfitIds = new Set(); // 记录已穿过的衣服，用于仅首次穿戴+50好感

    // 动画状态与2D柔体谐振形变参数
    this.state = 'idle'; // 'cooking', 'idle', 'walk', 'nap', 'tail_wag', 'happy', 'play_trampoline', 'play_ball'
    this.stateTimer = 0;
    this.animTime = Math.random() * 10;
    this.bobOffset = 0;
    this.tailAngle = 0;
    this.pawAngle = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.bodyTilt = 0;

    // 写实立绘：由 DogSpriteLoader 在首次加载时抠掉白底、统计透明包围盒并缓存。
    // 处理中的首帧仍保留矢量小狗作为降级显示，立绘就绪后再由场景渲染器接管。
    this.spriteEntry = null;
    this.spriteImg = null;
    this.cookImg = null;
    this.imgLoaded = false;
    this.cookImgLoaded = false;
    this._tintCache = null; // 染膏版立绘缓存 { key, canvas }
    this._headBoundsCache = null; // 头部特写包围盒缓存（供头像裁切使用）

    // 立绘对齐参数（可在 SPRITE_TUNING 里按犬种微调，避免逐只硬编码）
    const tuning = (typeof DogChef.SPRITE_TUNING === 'object' && DogChef.SPRITE_TUNING[breedId]) || {};
    this.drawHeight = tuning.drawHeight || DogChef.SPRITE_DRAW_HEIGHT; // 场景中的立绘高度
    this.spriteCenterBiasX = tuning.centerBiasX || 0;                  // 3/4 侧视的水平中心补偿
    this.spriteArtFacing = tuning.artFacing != null
      ? tuning.artFacing
      : DogChef.SPRITE_ART_FACING;                                     // 素材本身朝向：1 朝右 / -1 朝左
    this.coatTintAlpha = tuning.tintAlpha != null ? tuning.tintAlpha : 0.5; // 毛色叠加强度

    if (this.config && this.config.image) {
      const loader = (typeof window !== 'undefined' && window.DogSpriteLoader) ||
                     (typeof DogSpriteLoader !== 'undefined' && DogSpriteLoader);
      if (loader) {
        this.spriteEntry = loader.load(this.config.image, (entry) => {
          this.spriteEntry = entry;
          this.spriteImg = entry ? entry.canvas : null;
          this.imgLoaded = Boolean(entry);
        });
        if (this.spriteEntry) {
          this.spriteImg = this.spriteEntry.canvas;
          this.imgLoaded = true;
        }
      } else {
        // 兼容独立加载 dog.js 的旧测试环境；正常游戏页面始终会先加载 sprite.js。
        this.spriteImg = new Image();
        this.spriteImg.src = this.config.image;
        this.spriteImg.onload = () => { this.imgLoaded = true; };
      }
    }

    // 柴犬熬汤特写原画（cookImg）：**已停用**
    // 该图（assets/art/shiba_stir_soup.jpg）从未被任何绘制代码使用，
    // 柴犬的在岗动作由 drawPaws 矢量绘制。字段保留以免历史引用报错，
    // 但不再触发 460KB 的无效下载。

    // 哈士奇“干活很认真，但是偶尔跑偏”特色机制
    this.huskyMishapType = null; // 'dino_bone' | 'stuck_dirt'
    this.huskyMishapTimer = 0;
    this.huskyCooldownTimer = 8 + Math.random() * 6;

    // 气泡与反馈
    this.bubble = null; // { text: '滋滋~', icon: '🍖', timer: 2.0 }
    this.floatingTexts = []; // [{ text: '+5❤️', x, y, alpha, life }]

    // === 狗狗治愈随机微小动作与专属行为序列系统 ===
    this.homeStationX = null;
    this.homeStationY = null;
    this.routineState = null;      // 当前微动作阶段: 'tired', 'sit', 'pant', 'spot_player', 'wag_tail', 'resume_work', 'spot_box', 'pick_box', 'run_wrong_way', 'turn_back', 'sudden_stop', 'look_sky', 'chase_butterfly', 'return_mine' 等
    this.routineTimer = 0;          // 当前微动作阶段倒计时
    this.routineCooldown = 5 + Math.random() * 6; // 随机微动作触发CD (5~11秒)
    this.routineProp = null;       // 伴生动效道具: { type: 'butterfly'|'box'|'apple', x, y, vx, vy, ... }

    // 姿势与五官骨骼状态参数
    this.isSitting = false;        // 是否蹲坐 (后腿盘坐，身体贴地)
    this.isPantingTongue = false;  // 是否吐出粉嫩小舌头上下喘气
    this.isLookingAtSky = false;   // 是否仰头呆滞望天
    this.isCrouching = false;      // 是否低姿潜行匍匐 (边牧)
    this.isNoticingPlayer = false; // 是否察觉到了玩家的注视
    this.noticePlayerTimer = 0;    // 玩家注视状态持续时间
    this.headTilt = 0;             // 好奇歪头杀角度 (-0.3 ~ 0.3 rad)
    this.eyeExpression = 'normal'; // 'normal' | 'happy' | 'sparkle' | 'dizzy' | 'closed'
    this.hasCreamMustache = false; // 萨摩耶偷舔鲜奶油白胡子
    this.isCoveringFace = false;   // 萨摩耶害羞双爪捂脸
    this.holdsBox = false;         // 柴犬叼/抱住快递包裹
    this.holdsApple = false;       // 柯基啃苹果
    this.peachButtWiggle = 0;      // 柯基奔跑时蜜桃臀摇摆
    this.isTailWaggingFast = false;// 尾巴螺旋桨高速超频甩尾

    // === GDD 第 1 章 核心交互扩展字段 ===
    this.holdsFrisbee = false;     // 嘴里叼着飞盘
    this.activeFrisbee = null;     // 当前追逐的飞盘对象
    this.isDigging = false;        // 是否在疯狂刨土
    this.digTimer = 0;             // 刨地计时器
    this.waitingAtGate = false;    // 是否在木门前等待主人回家
    this.breathPuffs = [];         // 冬天雪地哈气白雾粒子
    this.breathPuffTimer = 0;      // 哈气生成计时

    // === GDD 1.3 核心循环首环节：切食材 ===
    this.chopTimer = 0;            // 切食材碎块生成计时
    this.chopParticles = [];       // 切食材飞溅的碎块粒子
    this.totalChopped = 0;         // 累计切食材次数 (成就统计)

    // === GDD 1.2 迷你游戏扩展：公园散步 & 水里捡球 ===
    this.isParkWalking = false;    // 是否正在阳光公园散步
    this.isWaterFetching = false;  // 是否正在戏水池捡球
    this.waterBall = null;         // 当前入水的弹力球

    // === GDD 1.2 收集亮点：犬种 × 毛色 × 饰品 ===
    this.coatColorId = 'default';  // 当前佩戴的毛色 ID ('default' 为犬种原生毛色)
    this.coatColors = null;        // 毛色覆盖配色 { body, belly, innerEar, ... }，null 表示原生
  }

  // 获得好感度当前等级上限经验
  getRequiredExp() {
    return WangwangFormulas.getDogAffectionRequiredExp(this.affectionLevel);
  }

  // 获得好感度带来的技能倍率
  getSkillMultiplier() {
    return WangwangFormulas.getDogAffectionMultiplier(this.affectionLevel);
  }

  // GDD 2.1 天赋被动「飞毛短腿」（柯基）：狗狗移动速度 +12%
  // 全局移动倍率，作用于所有「走向目标点」的位移（散步、跑堂、回工位、玩耍…）。
  // 走 economy 汇总，因此多只带该天赋的犬种会叠加；不缓存以便招募后立即生效。
  getMoveSpeedMul() {
    const eco = (typeof window !== 'undefined' && window.game) ? window.game.economy : null;
    if (!eco || typeof eco.getPassiveBonus !== 'function') return 1;
    return 1 + eco.getPassiveBonus('move_speed');
  }

  // GDD 2.1 天赋被动「快刀切配」（拉布拉多）：食材切块速度 +10%
  // 表现为切菜碎块生成间隔变短（节奏更快），不改变动作时长本身。
  getChopSpeedMul() {
    const eco = (typeof window !== 'undefined' && window.game) ? window.game.economy : null;
    if (!eco || typeof eco.getPassiveBonus !== 'function') return 1;
    return 1 + eco.getPassiveBonus('chop_speed');
  }

  // 增加好感度
  addAffectionExp(exp, reason = '', showFloating = true) {
    if (this.affectionLevel >= 10) return;
    this.affectionExp += exp;

    // 飘字动画: 仅在主动互动且经验>=1时飘字，彻底解决被动微量经验每帧刷屏红字问题
    if (showFloating && exp >= 1) {
      this.addFloatingText(`+${Math.round(exp)} 好感度 ❤️`);
    }

    // 检查升级
    while (this.affectionLevel < 10 && this.affectionExp >= this.getRequiredExp()) {
      this.affectionExp -= this.getRequiredExp();
      this.affectionLevel++;
      this.addFloatingText(`🎉 好感度 Lv.${this.affectionLevel}!`);
      this.showBubble(`汪！好感度升到Lv.${this.affectionLevel}了！技能增强+10%!`);
      if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
    }
  }

  // 抚摸狗狗
  pet() {
    const now = Date.now();
    const cd = 30 * 1000; // 30秒
    if (now - this.lastPetTime < cd) {
      const remainSec = Math.ceil((cd - (now - this.lastPetTime)) / 1000);
      this.showBubble(`还要休息 ${remainSec} 秒才能再抚摸哦~`, '🐾');
      return false;
    }

    this.lastPetTime = now;
    this.addAffectionExp(5, 'pet');
    this.state = 'happy';
    this.stateTimer = 2.0;
    this.showBubble('呼噜呼噜~ 好舒服汪！', '❤️');

    if (window.wangwangAudio) {
      window.wangwangAudio.playPetHeart();
      window.wangwangAudio.playBark(this.id);
    }
    return true;
  }

  // 喂食零食 (+30好感)
  feedSnack() {
    this.addAffectionExp(30, 'snack');
    this.state = 'happy';
    this.stateTimer = 2.5;
    this.showBubble('肉干太好吃了！汪汪！', '🥩');
    if (window.wangwangAudio) {
      window.wangwangAudio.playPetHeart();
      window.wangwangAudio.playBark(this.id);
    }
    return true;
  }

  // 穿戴服装
  equipOutfit(outfit) {
    if (!outfit) return;
    const type = outfit.type; // 'hat', 'cloth', 'acc'
    this.equippedOutfits[type] = outfit;
    this.invalidatePortrait();

    // 首次穿戴增加 50 好感度
    if (!this.wornOutfitIds.has(outfit.id)) {
      this.wornOutfitIds.add(outfit.id);
      this.addAffectionExp(50, 'new_outfit');
      this.showBubble(`新衣服好神气！好感+50！`, '✨');
    } else {
      this.showBubble(`换上新造型啦！好看吗汪？`, '👔');
    }
  }

  // 卸下服装
  unequipOutfit(type) {
    this.equippedOutfits[type] = null;
    this.invalidatePortrait();
  }

  // 气泡提示
  showBubble(text, icon = '') {
    this.bubble = {
      text: icon ? `${icon} ${text}` : text,
      timer: 2.8,
      opacity: 1
    };
  }

  // 飘字提示
  addFloatingText(text) {
    this.floatingTexts.push({
      text: text,
      x: this.x,
      y: this.y - 45,
      alpha: 1.0,
      life: 1.2
    });
  }

  // 帧更新
  update(dt, loungeBounds) {
    this.animTime += dt;

    // 记录工位初始家园基准点（用于跑偏后精准原路返回）
    if (this.assignedFacility && (this.homeStationX === null || this.homeStationY === null)) {
      if (!this.routineState) {
        this.homeStationX = this.x;
        this.homeStationY = this.y;
      }
    }

    // 更新气泡
    if (this.bubble) {
      this.bubble.timer -= dt;
      if (this.bubble.timer <= 0) {
        this.bubble = null;
      }
    }

    // 更新飘字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 25 * dt;
      ft.alpha = Math.max(0, ft.life / 1.2);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 更新切食材碎块粒子 (GDD 1.3 核心循环首环节)
    for (let i = this.chopParticles.length - 1; i >= 0; i--) {
      const cp = this.chopParticles[i];
      cp.life -= dt;
      cp.x += cp.vx * dt;
      cp.y += cp.vy * dt;
      cp.vy += 220 * dt;   // 重力下落
      cp.rot += dt * 6;
      if (cp.life <= 0) {
        this.chopParticles.splice(i, 1);
      }
    }

    // 更新玩家互动注视状态倒计时
    if (this.noticePlayerTimer > 0) {
      this.noticePlayerTimer -= dt;
      if (this.noticePlayerTimer <= 0) {
        this.isNoticingPlayer = false;
        if (!this.routineState) {
          this.headTilt = 0;
          this.eyeExpression = 'normal';
          this.isTailWaggingFast = false;
        }
      }
    }

    // 更新专属治愈微动作状态机（金毛/柴犬/二哈/萨摩耶/柯基/边牧等）
    this.updateBehaviorRoutine(dt);

    // 如果当前正处于专属微动作状态中，狗狗所有骨骼姿态、坐标与表情由微行为引擎完全主导
    if (this.routineState) {
      if (this.assignedFacility) {
        this.stamina = Math.max(0, this.stamina - 0.15 * dt);
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + 2.0 * dt);
      }
      return;
    }

    // 否则执行常规在岗工作与休息区状态
    if (this.assignedFacility) {
      this.state = 'cooking';

      // 检查哈士奇在肉干风干窖工作时的“偶尔跑偏”特色机制
      const isDrying = (this.assignedFacility === 'jerky');
      if (this.id === 'husky' && isDrying) {
        if (this.huskyMishapTimer > 0) {
          this.huskyMishapTimer -= dt;
          if (this.huskyMishapTimer <= 0) {
            this.huskyMishapType = null;
            this.huskyCooldownTimer = 12 + Math.random() * 8; // 跑偏结束，重新认真烘肉12~20秒
          }
        } else {
          this.huskyCooldownTimer -= dt;
          if (this.huskyCooldownTimer <= 0) {
            // 触发跑偏！
            this.huskyMishapType = Math.random() < 0.5 ? 'dino_bone' : 'stuck_dirt';
            this.huskyMishapTimer = 3.5;
            if (this.huskyMishapType === 'dino_bone') {
              this.showBubble('嗷呜！整根黄金牛肋骨被我叼下来啦！🦴', '⭐');
            } else {
              this.showBubble('哎呀！撞翻晾肉架，倒栽葱栽进肉堆啦！💨', '❓');
            }
            if (window.game && window.game.economy) {
              window.game.economy.recordAction('husky_fun');
            }
            if (window.wangwangAudio) {
              window.wangwangAudio.playBark('husky');
            }
          }
        }
      } else {
        this.huskyMishapType = null;
      }

      // 根据工作状态计算形变动效
      if (this.huskyMishapType === 'dino_bone') {
        // 叼下大牛肋骨：极度兴奋欢跃旋转
        this.bobOffset = -Math.abs(Math.sin(this.animTime * 10)) * 8;
        this.bodyTilt = Math.sin(this.animTime * 12) * 0.18;
        this.squashY = 1.15;
        this.squashX = 0.9;
        this.tailAngle = Math.sin(this.animTime * 18) * 0.8;
      } else if (this.huskyMishapType === 'stuck_dirt') {
        // 撞翻晾肉架：身体下潜进肉堆，后腿空中踢腾
        this.bobOffset = 8;
        this.bodyTilt = Math.sin(this.animTime * 14) * 0.05;
        this.squashY = 0.85;
        this.squashX = 1.15;
        this.tailAngle = Math.sin(this.animTime * 20) * 0.6;
      } else {
        // 正常富有节奏的身体上下律动、前倾后仰、挤压拉伸与小狗甩尾
        const cookPulse = Math.sin(this.animTime * 7.5);
        this.bobOffset = cookPulse * 5;
        this.bodyTilt = cookPulse * 0.08;
        this.squashY = 1 + cookPulse * 0.07;
        this.squashX = 1 - cookPulse * 0.04;
        this.tailAngle = this.isTailWaggingFast ? Math.sin(this.animTime * 24) * 0.95 : Math.sin(this.animTime * 10) * 0.6;
      }
      this.pawAngle = Math.sin(this.animTime * 8) * 0.8;
      this.playJumpY = 0;

      // 体力消耗: 每秒消耗 0.35 点 (~5分钟连续工作耗尽)
      this.stamina = Math.max(0, this.stamina - 0.35 * dt);
      if (this.stamina <= 0 && !this.isTired) {
        this.isTired = true;
        this.showBubble('累扁啦汪~ 去草地休息玩耍！', '💦');
        this.assignedFacility = null;
        this.x = 240 + Math.random() * 500;
        this.y = 160 + Math.random() * 260;
      } else if (this.stamina <= 20 && Math.random() < 0.006) {
        this.showBubble('有点累了汪~ 待会儿想去玩耍', '💦');
      }
    } else {
      // 休息与玩耍乐园区：快速恢复体力 (每秒 +2.5 点，约40秒充满)
      this.stamina = Math.min(this.maxStamina, this.stamina + 2.5 * dt);
      if (this.isTired && this.stamina >= 100) {
        this.isTired = false;
        this.showBubble('⚡ 活力满满！随时可以掌勺！', '🎉');
      }

      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.pickNewRestState(loungeBounds);
      }

      if (this.state === 'play_trampoline') {
        // 在蹦床上超大弹跳 (高高弹起55像素，触床强压缩、腾空大拉伸)
        const jumpPhase = Math.sin(this.animTime * 6.5);
        this.playJumpY = -Math.abs(jumpPhase) * 55;
        if (this.playJumpY > -10) {
          this.squashY = 0.72;
          this.squashX = 1.28;
        } else {
          this.squashY = 1.22;
          this.squashX = 0.82;
        }
        this.tailAngle = Math.sin(this.animTime * 14) * 0.8;
        this.bodyTilt = Math.sin(this.animTime * 6.5) * 0.22;
        this.bobOffset = 0;
      } else if (this.state === 'play_ball') {
        // 追球跑动与欢快扑腾
        const ballPhase = this.animTime * 10;
        this.bobOffset = -Math.abs(Math.sin(ballPhase)) * 6;
        this.bodyTilt = Math.sin(ballPhase) * 0.12;
        this.squashY = 1 + Math.sin(ballPhase * 2) * 0.08;
        this.squashX = 1 - Math.sin(ballPhase * 2) * 0.05;
        this.tailAngle = Math.sin(this.animTime * 12) * 0.6;
        this.playJumpY = 0;
      } else if (this.state === 'walk') {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 4) {
          const vx = (dx / dist) * this.speed * dt;
          const vy = (dy / dist) * this.speed * dt;
          this.x += vx;
          this.y += vy;
          this.facing = dx > 0 ? 1 : -1;
          const walkPhase = this.animTime * 9;
          this.bobOffset = -Math.abs(Math.sin(walkPhase)) * 5.5;
          this.bodyTilt = Math.sin(walkPhase) * 0.1;
          this.squashY = 1 + Math.sin(walkPhase * 2) * 0.06;
          this.squashX = 1 - Math.sin(walkPhase * 2) * 0.04;
          this.tailAngle = Math.sin(this.animTime * 10) * 0.45;
          this.playJumpY = 0;
        } else {
          this.state = 'idle';
          this.bodyTilt = 0;
          this.squashX = 1;
          this.squashY = 1;
          this.stateTimer = 2.0 + Math.random() * 3.0;
        }
      } else if (this.state === 'nap') {
        const breath = Math.sin(this.animTime * 2.2);
        this.bobOffset = 3;
        this.bodyTilt = 0.04;
        this.squashY = 0.92 + breath * 0.05;
        this.squashX = 1.08 - breath * 0.04;
        this.tailAngle = 0.1;
        this.playJumpY = 0;
      } else {
        // idle 呆萌呼吸
        const breath = Math.sin(this.animTime * 3);
        this.bobOffset = breath * 2.0;
        this.bodyTilt = Math.sin(this.animTime * 1.5) * 0.03;
        this.squashY = 1 + breath * 0.04;
        this.squashX = 1 - breath * 0.03;
        this.tailAngle = this.isTailWaggingFast ? Math.sin(this.animTime * 24) * 0.95 : Math.sin(this.animTime * 4) * 0.3;
        this.playJumpY = 0;
      }
    }
  }

  // === 狗狗治愈专属微动作状态机引擎 ===
  updateBehaviorRoutine(dt) {
    // 1. 若当前没有进行微动作，计算触发冷却
    if (!this.routineState) {
      this.routineCooldown -= dt;
      if (this.routineCooldown <= 0) {
        this.startNextBehaviorRoutine();
      }
      return;
    }

    // 2. 当前处于某种行为序列中，推进阶段计时
    this.routineTimer -= dt;

    // ==================== 0. GDD 1.3 核心循环首环节：狗狗切食材 ====================
    // 所有犬种在岗烹饪时通用：高速挥爪剁剁剁，飞溅出五彩食材碎块
    if (this.routineState === 'chop_ingredients') {
      this.isSitting = false;
      this.isCrouching = false;
      this.isPantingTongue = false;
      this.isLookingAtSky = false;
      this.eyeExpression = 'happy';

      const chopPulse = Math.sin(this.animTime * 18);
      this.pawAngle = 0.5 + chopPulse * 0.9;
      this.bobOffset = -Math.abs(chopPulse) * 3.5;
      this.bodyTilt = chopPulse * 0.07;
      this.squashY = 1 + Math.abs(chopPulse) * 0.05;
      this.squashX = 1 - Math.abs(chopPulse) * 0.03;
      this.tailAngle = Math.sin(this.animTime * 12) * 0.5;

      this.chopTimer -= dt;
      if (this.chopTimer <= 0) {
        this.chopTimer = 0.12 / this.getChopSpeedMul();
        this.spawnChopParticles();
      }

      if (this.routineTimer <= 0) {
        this.routineState = null;
        this.routineCooldown = 5 + Math.random() * 6;
        this.pawAngle = 0;
        this.bobOffset = 0;
        this.bodyTilt = 0;
      }
      return;
    }

    // ==================== 0.1 GDD 1.2 公园散步 ====================
    if (this.routineState === 'park_walk') {
      this.isParkWalking = true;
      this.tailAngle = Math.sin(this.animTime * 11) * 0.55;
      this.eyeExpression = 'happy';
      this.isPantingTongue = false;

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        this.facing = dx >= 0 ? 1 : -1;
        const step = Math.min(58 * this.getMoveSpeedMul() * dt, dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        const walkPhase = this.animTime * 9;
        this.bobOffset = -Math.abs(Math.sin(walkPhase)) * 5;
        this.bodyTilt = Math.sin(walkPhase) * 0.09;
      } else {
        this.bobOffset = Math.sin(this.animTime * 6) * 2;
        // 到达小径终点后继续巡游到下一个随机点
        if (this.routineTimer > 1.2) {
          this.targetX = 120 + Math.random() * 760;
          this.targetY = 380 + Math.random() * 110;
        }
      }

      if (this.routineTimer <= 0) {
        this.routineState = 'park_walk_return';
        this.routineTimer = 2.0;
        this.isTailWaggingFast = true;
        this.isPantingTongue = true;
        this.eyeExpression = 'sparkle';
        this.showBubble('🌳 散步好开心！还捡到了伴手礼，快看我！', '🎁');
        const gameKit = (window.game && window.game.kitchen) || (window.currentGame && window.currentGame.kitchen);
        if (gameKit && typeof gameKit.grantParkWalkReward === 'function') {
          gameKit.grantParkWalkReward(this);
        }
      }
      return;
    }

    if (this.routineState === 'park_walk_return') {
      this.isTailWaggingFast = true;
      this.isPantingTongue = true;
      this.isSitting = true;
      this.tailAngle = Math.sin(this.animTime * 22) * 0.9;
      const hx = this.homeStationX || 500;
      const hy = this.homeStationY || 420;
      const dx = hx - this.x;
      const dy = hy - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        this.facing = dx >= 0 ? 1 : -1;
        const step = Math.min(110 * this.getMoveSpeedMul() * dt, dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.isSitting = false;
      }
      if (this.routineTimer <= 0) {
        this.routineState = null;
        this.isParkWalking = false;
        this.isSitting = false;
        this.isTailWaggingFast = false;
        this.isPantingTongue = false;
        this.routineCooldown = 8 + Math.random() * 6;
      }
      return;
    }

    // ==================== 0.2 GDD 1.2 水里捡球 ====================
    if (this.routineState === 'water_dive') {
      this.isWaterFetching = true;
      this.tailAngle = Math.sin(this.animTime * 20) * 0.8;
      this.eyeExpression = 'sparkle';
      this.isPantingTongue = false;

      // 纵身跃入池中扑向弹力球
      if (this.waterBall) {
        const dx = this.waterBall.x - this.x;
        const dy = this.waterBall.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.facing = dx >= 0 ? 1 : -1;
        if (dist > 10) {
          const step = Math.min(170 * this.getMoveSpeedMul() * dt, dist);
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
          this.bobOffset = -Math.abs(Math.sin(this.animTime * 16)) * 5;
        } else if (!this.waterBall.isCaught) {
          this.waterBall.isCaught = true;
          this.playJumpY = -22;
          this.showBubble('💦 扑通！一口叼住水里的弹力球！', '🎾');
          const gameKit = (window.game && window.game.kitchen) || (window.currentGame && window.currentGame.kitchen);
          if (gameKit && typeof gameKit.spawnWaterSplash === 'function') {
            gameKit.spawnWaterSplash(this.x, this.y);
          }
        }
      }

      if (this.routineTimer <= 0) {
        this.routineState = 'water_return';
        this.routineTimer = 1.8;
        this.isTailWaggingFast = true;
        this.isPantingTongue = true;
        this.waterBall = null;
        this.showBubble('🎾 湿漉漉地叼回来了！快夸夸我！', '💧');
        const gameKit = (window.game && window.game.kitchen) || (window.currentGame && window.currentGame.kitchen);
        if (gameKit && typeof gameKit.grantWaterFetchReward === 'function') {
          gameKit.grantWaterFetchReward(this);
        }
      }
      return;
    }

    if (this.routineState === 'water_return') {
      this.isWaterFetching = true;
      this.isSitting = true;
      this.isTailWaggingFast = true;
      this.isPantingTongue = true;
      this.tailAngle = Math.sin(this.animTime * 24) * 0.95;
      this.squashY = 0.94 + Math.sin(this.animTime * 18) * 0.06; // 抖水节奏
      this.squashX = 1.06 - Math.sin(this.animTime * 18) * 0.04;
      if (this.routineTimer <= 0) {
        this.routineState = null;
        this.isWaterFetching = false;
        this.isSitting = false;
        this.isTailWaggingFast = false;
        this.isPantingTongue = false;
        this.routineCooldown = 7 + Math.random() * 6;
      }
      return;
    }

    // ==================== 1. 金毛 (Golden Retriever) 专属行为序列 ====================
    // 工作 → 累了 (擦汗叹气) → 坐下 (后腿盘坐) → 吐舌头 (大口呼哧喘气) → 发现玩家 (歪头星星眼) → 摇尾巴 (螺旋桨狂摇) → 继续工作
    if (this.id === 'golden') {
      if (this.routineState === 'tired') {
        this.isSitting = false;
        this.isPantingTongue = false;
        this.eyeExpression = 'closed';
        this.bodyTilt = 0.06;
        this.bobOffset = 3;
        if (this.routineTimer <= 0) {
          this.routineState = 'sit';
          this.routineTimer = 2.0;
          this.isSitting = true;
          this.eyeExpression = 'normal';
          this.showBubble('累了汪~ 坐下歇歇爪子', '🐾');
        }
      } else if (this.routineState === 'sit') {
        this.isSitting = true;
        this.bobOffset = 4;
        this.bodyTilt = 0;
        this.eyeExpression = 'normal';
        if (this.routineTimer <= 0) {
          this.routineState = 'pant';
          this.routineTimer = 2.8;
          this.isPantingTongue = true;
          this.showBubble('呼哧呼哧~ 吐出粉嫩小舌头散热', '👅');
        }
      } else if (this.routineState === 'pant') {
        this.isSitting = true;
        this.isPantingTongue = true;
        this.bobOffset = 4;
        // 呼哧喘气胸腔与舌头起伏律动
        this.squashY = 0.94 + Math.sin(this.animTime * 14) * 0.06;
        this.squashX = 1.06 - Math.sin(this.animTime * 14) * 0.04;
        if (this.routineTimer <= 0) {
          this.routineState = 'spot_player';
          this.routineTimer = 2.2;
          this.isPantingTongue = false;
          this.isNoticingPlayer = true;
          this.headTilt = 0.24; // 歪头杀
          this.eyeExpression = 'sparkle'; // 星星眼闪烁
          this.showBubble('👀 咦？发现主人在看着我！', '✨');
          if (window.wangwangAudio) window.wangwangAudio.playBark('golden');
        }
      } else if (this.routineState === 'spot_player') {
        this.isSitting = true;
        this.isNoticingPlayer = true;
        this.headTilt = 0.22;
        this.eyeExpression = 'sparkle';
        this.tailAngle = Math.sin(this.animTime * 15) * 0.7;
        if (this.routineTimer <= 0) {
          this.routineState = 'wag_tail';
          this.routineTimer = 3.2;
          this.isTailWaggingFast = true;
          this.eyeExpression = 'happy';
          this.headTilt = 0.12;
          this.showBubble('❤️ 螺旋桨狂摇尾巴！最喜欢主人了！', '❤️');
          this.addFloatingText('+5 ❤️');
          this.addAffectionExp(5, 'routine_wag', false);
          if (window.wangwangAudio) window.wangwangAudio.playPetHeart();
        }
      } else if (this.routineState === 'wag_tail') {
        this.isSitting = true;
        this.isNoticingPlayer = true;
        this.isTailWaggingFast = true;
        this.eyeExpression = 'happy';
        this.tailAngle = Math.sin(this.animTime * 24) * 0.95; // 24Hz 螺旋桨超频甩尾
        if (this.routineTimer <= 0) {
          this.routineState = 'resume_work';
          this.routineTimer = 1.6;
          this.isSitting = false;
          this.isNoticingPlayer = false;
          this.isTailWaggingFast = false;
          this.headTilt = 0;
          this.eyeExpression = 'happy';
          this.showBubble('🌻 活力充沛！拿起水壶继续浇花！', '🌱');
        }
      } else if (this.routineState === 'resume_work') {
        this.isSitting = false;
        this.eyeExpression = 'normal';
        this.playJumpY = -Math.abs(Math.sin(this.animTime * 8)) * 8; // 开心地一跃站起
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.playJumpY = 0;
          this.routineCooldown = 12 + Math.random() * 8;
        }
      }
    }

    // ==================== 2. 柴犬 (Shiba Inu) 专属行为序列 ====================
    // 走路 → 发现箱子 (惊讶驻足) → 叼起来 (抱起包裹) → 跑错方向 (晕圈反向狂奔) → 回来 (急刹掉头送回)
    else if (this.id === 'shiba') {
      if (this.routineState === 'spot_box') {
        this.eyeExpression = 'sparkle';
        this.bodyTilt = 0.05;
        this.bobOffset = 0;
        this.tailAngle = Math.sin(this.animTime * 12) * 0.4;
        if (this.routineTimer <= 0) {
          this.routineState = 'pick_box';
          this.routineTimer = 1.8;
          this.holdsBox = true;
          this.routineProp = null; // 捡起地面上的包裹
          this.showBubble('📦 叼起包裹！这就去派送！', '🐶');
        }
      } else if (this.routineState === 'pick_box') {
        this.holdsBox = true;
        this.eyeExpression = 'happy';
        this.bodyTilt = 0;
        this.bobOffset = -Math.abs(Math.sin(this.animTime * 6)) * 4;
        if (this.routineTimer <= 0) {
          this.routineState = 'run_wrong_way';
          this.routineTimer = 3.2;
          this.facing = -1; // 往完全相反的左侧反方向狂奔！
          this.eyeExpression = 'dizzy'; // 晕乎乎冲鸭
          this.showBubble('💨 冲鸭——！...咦？好像走反了？！', '📦');
        }
      } else if (this.routineState === 'run_wrong_way') {
        this.holdsBox = true;
        this.facing = -1;
        this.x -= 48 * dt; // 向左狂奔
        this.eyeExpression = 'dizzy';
        const runCycle = Math.sin(this.animTime * 14);
        this.bobOffset = -Math.abs(runCycle) * 6;
        this.bodyTilt = -0.15;
        this.tailAngle = Math.sin(this.animTime * 16) * 0.8;
        if (this.routineTimer <= 0) {
          this.routineState = 'turn_back';
          this.routineTimer = 3.2;
          this.facing = 1; // 急刹180度掉头
          this.eyeExpression = 'happy';
          this.showBubble('💦 哎呀跑错啦！急刹掉头送回信箱！', '🏠');
        }
      } else if (this.routineState === 'turn_back') {
        this.holdsBox = true;
        this.facing = 1;
        if (this.homeStationX) {
          const dx = this.homeStationX - this.x;
          if (Math.abs(dx) > 3) {
            this.x += Math.sign(dx) * 65 * this.getMoveSpeedMul() * dt;
          } else {
            this.x = this.homeStationX;
          }
        }
        const runCycle = Math.sin(this.animTime * 14);
        this.bobOffset = -Math.abs(runCycle) * 5;
        this.bodyTilt = 0.12;
        this.tailAngle = Math.sin(this.animTime * 16) * 0.7;
        this.eyeExpression = 'happy';
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.holdsBox = false;
          this.eyeExpression = 'normal';
          this.bodyTilt = 0;
          this.routineCooldown = 14 + Math.random() * 8;
          this.showBubble('🎉 呼~ 包裹成功送达邮政木屋！', '✨');
          if (window.game && window.game.economy) {
            window.game.economy.earnGold(50, false);
            this.addFloatingText('+50 🪙');
          }
        }
      }
    }

    // ==================== 3. 哈士奇 (Husky) 专属行为序列 ====================
    // 挖矿 → 突然停下 (铁镐卡石缝) → 看天空 (呆滞望天/梦见大牛排) → 跑去追蝴蝶 (狂奔抓蝶) → 回来继续挖 (阿嚏抖毛)
    else if (this.id === 'husky') {
      if (this.routineState === 'sudden_stop') {
        this.bodyTilt = 0;
        this.bobOffset = 0;
        this.tailAngle = 0;
        this.eyeExpression = 'normal';
        if (this.routineTimer <= 0) {
          this.routineState = 'look_sky';
          this.routineTimer = 3.0;
          this.isLookingAtSky = true;
          this.headTilt = -0.15;
          this.eyeExpression = 'normal';
          this.showBubble('💭 ☁️ 天上的白云好像一块大牛排...', '💭');
        }
      } else if (this.routineState === 'look_sky') {
        this.isLookingAtSky = true;
        this.bobOffset = -1;
        this.tailAngle = Math.sin(this.animTime * 4) * 0.2;
        if (this.routineTimer <= 0) {
          this.routineState = 'chase_butterfly';
          this.routineTimer = 5.5;
          this.isLookingAtSky = false;
          this.eyeExpression = 'sparkle';
          // 生成仙气大蓝蝶道具
          this.routineProp = {
            type: 'butterfly',
            x: this.x + 30,
            y: this.y - 45,
            baseY: this.y - 40,
            vx: 55,
            wingPhase: 0,
            t: 0
          };
          this.showBubble('🦋 别跑呀小蝴蝶！陪二哈玩！嗷呜！', '🦋');
          if (window.wangwangAudio) window.wangwangAudio.playBark('husky');
        }
      } else if (this.routineState === 'chase_butterfly') {
        if (this.routineProp && this.routineProp.type === 'butterfly') {
          const bf = this.routineProp;
          bf.wingPhase += 25 * dt;
          bf.t += dt;
          bf.x += bf.vx * dt;
          bf.y = bf.baseY + Math.sin(bf.t * 4) * 25;

          // 蝴蝶边界反弹
          if (bf.x < 140) bf.vx = Math.abs(bf.vx);
          if (bf.x > 860) bf.vx = -Math.abs(bf.vx);

          // 哈士奇追随蝴蝶奔跑弹跳
          const distToBf = bf.x - this.x;
          this.facing = distToBf > 0 ? 1 : -1;
          this.x += Math.sign(distToBf) * Math.min(Math.abs(distToBf), 65 * this.getMoveSpeedMul() * dt);
          this.playJumpY = -Math.abs(Math.sin(this.animTime * 9)) * 20;
          this.tailAngle = Math.sin(this.animTime * 18) * 0.8;
          this.bodyTilt = Math.sin(this.animTime * 9) * 0.16;
          this.eyeExpression = 'sparkle';
        }

        if (this.routineTimer <= 0) {
          this.routineState = 'return_mine';
          this.routineTimer = 3.0;
          this.routineProp = null; // 蝴蝶飞走
          this.playJumpY = 0;
          this.eyeExpression = 'happy';
          this.showBubble('阿嚏~ 💨 玩够了！回矿坑接着挖！', '⛏️');
        }
      } else if (this.routineState === 'return_mine') {
        this.isLookingAtSky = false;
        if (this.homeStationX) {
          const dx = this.homeStationX - this.x;
          if (Math.abs(dx) > 4) {
            this.x += Math.sign(dx) * 60 * this.getMoveSpeedMul() * dt;
            this.facing = dx > 0 ? 1 : -1;
          } else {
            this.x = this.homeStationX;
            this.y = this.homeStationY;
            this.facing = 1;
          }
        }
        const trot = Math.sin(this.animTime * 10);
        this.bobOffset = -Math.abs(trot) * 4;
        this.tailAngle = Math.sin(this.animTime * 12) * 0.5;
        this.eyeExpression = 'happy';
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.eyeExpression = 'normal';
          this.routineCooldown = 15 + Math.random() * 8;
        }
      }
    }

    // ==================== 4. 萨摩耶 (Samoyed) 专属行为序列 ====================
    // 做蛋糕 → 偷舔鲜奶油 (大口舔) → 挂满白胡子 → 害羞捂脸 (双爪捂脸) → 乐呵呵献上大蛋糕
    else if (this.id === 'samoyed') {
      if (this.routineState === 'sneak_lick') {
        this.bobOffset = 6;
        this.bodyTilt = 0.15;
        this.eyeExpression = 'happy';
        if (this.routineTimer <= 0) {
          this.routineState = 'cream_mustache';
          this.routineTimer = 2.2;
          this.hasCreamMustache = true;
          this.bobOffset = 0;
          this.bodyTilt = 0;
          this.showBubble('😋 满嘴都是白白软软的鲜奶油~ 好香！', '🧁');
        }
      } else if (this.routineState === 'cream_mustache') {
        this.hasCreamMustache = true;
        this.eyeExpression = 'sparkle';
        if (this.routineTimer <= 0) {
          this.routineState = 'shy_cover';
          this.routineTimer = 2.5;
          this.isCoveringFace = true;
          this.showBubble('🙈 哎呀！被主人抓到偷吃了，害羞捂脸！', '❤️');
        }
      } else if (this.routineState === 'shy_cover') {
        this.isCoveringFace = true;
        this.bodyTilt = Math.sin(this.animTime * 8) * 0.08;
        if (this.routineTimer <= 0) {
          this.routineState = 'present_cake';
          this.routineTimer = 2.5;
          this.isCoveringFace = false;
          this.hasCreamMustache = false;
          this.eyeExpression = 'happy';
          this.showBubble('🎂 送给世界上最可爱的主人！尝尝看！', '🍓');
        }
      } else if (this.routineState === 'present_cake') {
        this.eyeExpression = 'happy';
        this.tailAngle = Math.sin(this.animTime * 20) * 0.8;
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.routineCooldown = 14 + Math.random() * 8;
        }
      }
    }

    // ==================== 5. 柯基 (Corgi) 专属行为序列 ====================
    // 摘苹果 → 苹果掉了滚跑 (骨碌碌) → 小短腿狂奔追赶 (蜜桃臀高频摇摆) → 扑咬大苹果 → 乐滋滋带回
    else if (this.id === 'corgi') {
      if (this.routineState === 'apple_drop') {
        this.eyeExpression = 'sparkle';
        if (this.routineProp && this.routineProp.type === 'apple') {
          this.routineProp.x += this.routineProp.vx * dt;
          this.routineProp.rot += 12 * dt;
        }
        if (this.routineTimer <= 0) {
          this.routineState = 'chase_apple';
          this.routineTimer = 3.2;
          this.showBubble('🍎 苹果别跑！柯基小短腿极速狂奔！', '💨');
        }
      } else if (this.routineState === 'chase_apple') {
        if (this.routineProp && this.routineProp.type === 'apple') {
          this.routineProp.x += 25 * dt;
          this.routineProp.rot += 10 * dt;
          const dx = this.routineProp.x - this.x;
          this.x += Math.sign(dx) * 55 * this.getMoveSpeedMul() * dt;
        }
        // 柯基标志性圆滚滚蜜桃屁屁高频摇摆
        this.peachButtWiggle = Math.sin(this.animTime * 22) * 6;
        const runCycle = Math.sin(this.animTime * 14);
        this.bobOffset = -Math.abs(runCycle) * 5;
        this.bodyTilt = 0.12;
        if (this.routineTimer <= 0) {
          this.routineState = 'pounce_bite';
          this.routineTimer = 2.0;
          this.routineProp = null; // 抓住了苹果
          this.holdsApple = true;
          this.playJumpY = -10;
          this.eyeExpression = 'happy';
          this.showBubble('🍎 扑抱住了！咔嚓一口，清甜多汁！', '✨');
        }
      } else if (this.routineState === 'pounce_bite') {
        this.holdsApple = true;
        this.eyeExpression = 'happy';
        this.bobOffset = 2;
        this.playJumpY = 0;
        if (this.routineTimer <= 0) {
          this.routineState = 'waddle_back';
          this.routineTimer = 2.2;
          this.showBubble('🧺 乐滋滋叼着大红苹果带回果园！', '🍎');
        }
      } else if (this.routineState === 'waddle_back') {
        this.holdsApple = true;
        if (this.homeStationX) {
          const dx = this.homeStationX - this.x;
          if (Math.abs(dx) > 3) {
            this.x += Math.sign(dx) * 45 * this.getMoveSpeedMul() * dt;
          } else {
            this.x = this.homeStationX;
          }
        }
        const waddle = Math.sin(this.animTime * 10);
        this.bodyTilt = waddle * 0.1;
        this.bobOffset = -Math.abs(waddle) * 4;
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.holdsApple = false;
          this.eyeExpression = 'normal';
          this.bodyTilt = 0;
          this.routineCooldown = 15 + Math.random() * 8;
        }
      }
    }

    // ==================== 6. 边牧 (Border Collie) 专属行为序列 ====================
    // 巡视羊群 → 低姿匍匐潜行 (锁定脱队羊) → 敏捷绕圈赶羊 → 优雅蹲坐邀功
    else if (this.id === 'border_collie') {
      if (this.routineState === 'crouch_stalk') {
        this.isCrouching = true;
        this.bobOffset = 3;
        this.bodyTilt = 0.05;
        this.x += 16 * this.getMoveSpeedMul() * dt; // 慢慢蹑手蹑脚匍匐前行
        if (this.routineTimer <= 0) {
          this.routineState = 'sprint_circle';
          this.routineTimer = 3.0;
          this.isCrouching = false;
          this.showBubble('💨 敏捷飞奔，弧线包抄集拢小羊！', '🐑');
        }
      } else if (this.routineState === 'sprint_circle') {
        this.isCrouching = false;
        const sprintCycle = Math.sin(this.animTime * 16);
        this.bobOffset = -Math.abs(sprintCycle) * 6;
        this.bodyTilt = sprintCycle * 0.15;
        this.tailAngle = Math.sin(this.animTime * 18) * 0.7;
        if (this.routineTimer <= 0) {
          this.routineState = 'proud_sit';
          this.routineTimer = 2.5;
          this.isSitting = true;
          this.eyeExpression = 'happy';
          this.showBubble('🐑 报告主人！小羊全数归位！求摸摸！', '❤️');
          if (this.homeStationX) this.x = this.homeStationX;
        }
      } else if (this.routineState === 'proud_sit') {
        this.isSitting = true;
        this.eyeExpression = 'happy';
        this.tailAngle = Math.sin(this.animTime * 20) * 0.8;
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.isSitting = false;
          this.eyeExpression = 'normal';
          this.routineCooldown = 16 + Math.random() * 8;
        }
      }
    }

    // 通用闲置行为兜底
    else {
      if (this.routineState === 'tail_spin') {
        this.tailAngle = Math.sin(this.animTime * 20) * 0.9;
        this.bodyTilt = Math.sin(this.animTime * 15) * 0.2;
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.routineCooldown = 12 + Math.random() * 8;
        }
      } else if (this.routineState === 'sneeze') {
        this.bodyTilt = Math.sin(this.animTime * 30) * 0.1;
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.routineCooldown = 12 + Math.random() * 8;
        }
      } else if (this.routineState === 'yawn') {
        this.squashY = 1.1;
        this.squashX = 0.92;
        if (this.routineTimer <= 0) {
          this.routineState = null;
          this.routineCooldown = 12 + Math.random() * 8;
        }
      }
    }

    // === GDD 1.2 高动能微玩法动作状态驱动 ===
    // 1. 追赶飞盘与凌空叼住
    if (this.routineState === 'chase_frisbee') {
      if (this.activeFrisbee && !this.activeFrisbee.isCaught) {
        const dx = this.activeFrisbee.x - this.x;
        const dy = this.activeFrisbee.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.facing = dx >= 0 ? 1 : -1;
        this.tailAngle = Math.sin(this.animTime * 24) * 0.9;
        this.isTailWaggingFast = true;
        this.eyeExpression = 'sparkle';

        if (dist <= 36 || this.activeFrisbee.isLanded) {
          // 凌空跃起咬住飞盘！
          this.holdsFrisbee = true;
          this.activeFrisbee.isCaught = true;
          this.playJumpY = -24;
          this.routineState = 'bring_back_frisbee';
          this.routineTimer = 3.0;
          this.showBubble('🥏 嗷呜！一口咬住飞盘啦！', '✨');
          if (window.wangwangAudio) window.wangwangAudio.playBark(this.id);
        } else {
          // 四足如飞全速狂奔
          const moveDist = Math.min(220 * this.getMoveSpeedMul() * dt, dist);
          this.x += (dx / dist) * moveDist;
          this.y += (dy / dist) * moveDist;
          this.bobOffset = Math.sin(this.animTime * 18) * 4;
        }
      } else {
        this.routineState = null;
      }
    } else if (this.routineState === 'bring_back_frisbee') {
      this.routineTimer -= dt;
      this.tailAngle = Math.sin(this.animTime * 26) * 1.0;
      this.isTailWaggingFast = true;
      this.isPantingTongue = true;
      this.eyeExpression = 'happy';

      // 叼着飞盘一颠一颠跑回主人/草地中心 (500, 360)
      const hx = this.homeStationX || 500;
      const hy = this.homeStationY || 360;
      const dx = hx - this.x;
      const dy = hy - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 15) {
        this.facing = dx >= 0 ? 1 : -1;
        const moveDist = Math.min(130 * this.getMoveSpeedMul() * dt, dist);
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
        this.bobOffset = Math.sin(this.animTime * 14) * 3.5;
      }

      if (this.routineTimer <= 0) {
        this.holdsFrisbee = false;
        this.routineState = null;
        this.isSitting = true;
        this.showBubble('❤️ 飞盘送回！尾巴摇成螺旋桨求夸夸~', '🥰');
        this.floatingTexts.push({
          text: '+15 ❤️ 接飞盘大胜利！',
          x: this.x,
          y: this.y - 35,
          alpha: 1.0,
          life: 1.6
        });
        this.addAffectionExp(15, 'frisbee_catch');
        const gameEco = (window.game && window.game.economy) || (window.currentGame && window.currentGame.economy);
        if (gameEco) {
          gameEco.addGold(100);
          if (Math.random() < 0.25) {
            gameEco.addBones(1);
          }
        }
      }
    }
    // 2. 嗅闻寻宝与狂热刨地
    else if (this.routineState === 'sniff_ground') {
      this.routineTimer -= dt;
      this.headTilt = Math.sin(this.animTime * 8) * 0.22;
      this.bodyTilt = 0.14; // 压低嗅探
      this.tailAngle = Math.sin(this.animTime * 12) * 0.4;
      this.isPantingTongue = false;
      if (this.routineTimer <= 0) {
        this.routineState = 'dig_ground';
        this.routineTimer = 3.2;
        this.isDigging = true;
        this.showBubble('🐾 泥土里有宝藏！疯狂刨土！', '💨');
        if (window.wangwangAudio) window.wangwangAudio.playDigging();
      }
    } else if (this.routineState === 'dig_ground') {
      this.routineTimer -= dt;
      this.isDigging = true;
      this.bodyTilt = -0.16; // 屁股抬高
      this.tailAngle = Math.sin(this.animTime * 28) * 0.85;
      this.isTailWaggingFast = true;
      const gameKit = (window.game && window.game.kitchen) || (window.currentGame && window.currentGame.kitchen);
      if (gameKit) {
        gameKit.addDirtParticles(this.x - this.facing * 12, this.y + 16, this.facing);
      }
      if (this.routineTimer <= 0) {
        this.isDigging = false;
        this.routineState = 'proud_treasure';
        this.routineTimer = 2.4;
        this.isSitting = true;
        this.isPantingTongue = true;
        this.eyeExpression = 'sparkle';
        if (gameKit) {
          gameKit.spawnDigTreasure(this.x + this.facing * 20, this.y + 10);
        }
        this.showBubble('🎁 哇！挖出闪光大宝物啦！快点我收取！', '✨');
      }
    } else if (this.routineState === 'proud_treasure') {
      this.routineTimer -= dt;
      this.isSitting = true;
      this.isPantingTongue = true;
      this.tailAngle = Math.sin(this.animTime * 20) * 0.8;
      if (this.routineTimer <= 0) {
        this.routineState = null;
        this.isSitting = false;
      }
    }
  }

  // 接收飞盘追赶任务
  fetchFrisbee(frisbee) {
    if (!this.isOwned) return;
    this.activeFrisbee = frisbee;
    this.routineState = 'chase_frisbee';
    this.showBubble('🥏 发现飞盘！看我的飞扑截咬！', '🏃');
  }

  // 开始嗅闻与刨土挖宝
  startDiggingTreasure(spotX, spotY) {
    if (!this.isOwned || this.assignedFacility) return;
    this.targetX = spotX;
    this.targetY = spotY;
    this.routineState = 'sniff_ground';
    this.routineTimer = 2.0;
    this.showBubble('👃 嗅嗅……这里散发出神奇的气味！', '✨');
  }

  // 切食材飞溅的碎块粒子 (GDD 1.3 核心循环首环节)
  spawnChopParticles() {
    const palette = ['#F5B041', '#E67E22', '#2ECC71', '#E74C3C', '#F7DC6F', '#AF7AC5'];
    for (let i = 0; i < 3; i++) {
      this.chopParticles.push({
        x: this.x + this.facing * (10 + Math.random() * 14),
        y: this.y - 4 + Math.random() * 12,
        vx: this.facing * (20 + Math.random() * 45),
        vy: -34 - Math.random() * 48,
        size: 2 + Math.random() * 3.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        life: 0.5 + Math.random() * 0.3,
        rot: Math.random() * Math.PI
      });
    }
  }

  // 公园散步 (GDD 1.2 迷你游戏：与狗狗结伴巡游阳光公园小径)
  startParkWalk(walkTarget) {
    if (!this.isOwned) return false;
    const cfg = PARK_ACTIVITIES_CONFIG.parkWalk;
    this.isParkWalking = true;
    this.routineState = 'park_walk';
    this.routineTimer = cfg.walkDuration;
    // 记录归位点（在岗狗狗保留工位坐标，散步结束后自动回岗）
    if (this.homeStationX === null || this.homeStationY === null) {
      this.homeStationX = this.x;
      this.homeStationY = this.y;
    }
    this.targetX = walkTarget ? walkTarget.x : (120 + Math.random() * 760);
    this.targetY = walkTarget ? walkTarget.y : (380 + Math.random() * 110);
    this.showBubble('🚶 主人一起散步去咯！阳光公园真舒服~', '🌳');
    return true;
  }

  // 水里捡球 (GDD 1.2 迷你游戏：向戏水池投球，狗狗纵身入水叼回)
  startWaterFetch(ball) {
    if (!this.isOwned) return false;
    const cfg = PARK_ACTIVITIES_CONFIG.waterFetch;
    this.isWaterFetching = true;
    this.waterBall = ball || { x: 910, y: 470, isCaught: false };
    this.routineState = 'water_dive';
    this.routineTimer = cfg.diveDuration;
    if (this.homeStationX === null || this.homeStationY === null) {
      this.homeStationX = this.x;
      this.homeStationY = this.y;
    }
    this.showBubble('🎾 球掉进水池啦！看我的跳水绝技！', '💦');
    return true;
  }

  // 设置/切换毛色 (GDD 1.2 收集亮点：犬种 × 毛色)
  setCoatColor(coatId, coatDef) {
    this.invalidatePortrait();
    this._tintCache = null; // 毛色变了，染膏版立绘必须重算
    if (!coatId || coatId === 'default' || !coatDef) {
      this.coatColorId = 'default';
      this.coatColors = null;
      return;
    }
    this.coatColorId = coatId;
    this.coatColors = Object.assign({}, coatDef.colors);
  }

  // 获取当前渲染配色（毛色覆盖优先于犬种原生配色）
  getRenderColors() {
    if (!this.coatColors) return this.config.colors;
    return Object.assign({}, this.config.colors, this.coatColors);
  }

  // 小院木门前守候
  waitAtGate(gx = 95, gy = 330) {
    this.x = gx;
    this.y = gy;
    this.targetX = gx;
    this.targetY = gy;
    this.facing = 1;
    this.waitingAtGate = true;
    this.isSitting = true;
    this.eyeExpression = 'sparkle';
  }

  // 玩家上线时木门热情欢迎
  welcomePlayerAtGate() {
    this.waitingAtGate = false;
    this.isSitting = false;
    this.isTailWaggingFast = true;
    this.isPantingTongue = true;
    this.eyeExpression = 'sparkle';
    this.playJumpY = -26;
    const meta = DOGPEDIA_CONFIG[this.id];
    const quote = meta ? meta.welcomeQuote : '主人！你终于回来啦！想死你啦汪！';
    this.showBubble(quote, '❤️');
    if (window.wangwangAudio) {
      window.wangwangAudio.playGateWelcome();
    }
  }

  // 触发下一个萌趣微动作
  startNextBehaviorRoutine() {
    if (!this.isOwned) return;
    if (this.routineState === 'chase_frisbee' || this.routineState === 'bring_back_frisbee' ||
        this.routineState === 'dig_ground' || this.routineState === 'park_walk' ||
        this.routineState === 'park_walk_return' || this.routineState === 'water_dive' ||
        this.routineState === 'water_return') return;

    // GDD 1.3 核心循环首环节：在岗狗狗周期性进入「切食材」，构成
    // 切食材 → 丢进烹饪设施 → 成品卖出换金币 → 升级设施/食谱 的完整闭环
    if (this.assignedFacility && Math.random() < 0.5) {
      this.routineState = 'chop_ingredients';
      this.routineTimer = 2.4;
      this.chopTimer = 0;
      this.totalChopped += 1;
      this.showBubble('🔪 剁剁剁~ 先把新鲜食材切好！', '🥕');
      return;
    }

    if (this.id === 'golden') {
      this.routineState = 'tired';
      this.routineTimer = 2.2;
      this.showBubble('💦 呼~ 好累呀，擦擦汗歇会儿', '💦');
    } else if (this.id === 'shiba') {
      this.routineState = 'spot_box';
      this.routineTimer = 2.0;
      // 在柴犬前方生成掉落的包裹
      this.routineProp = {
        type: 'box',
        x: this.x + (this.facing > 0 ? 22 : -22),
        y: this.y + 12
      };
      this.showBubble('❗ 咦？草地上有个神秘包裹！', '📦');
    } else if (this.id === 'husky') {
      this.routineState = 'sudden_stop';
      this.routineTimer = 2.0;
      this.showBubble('❓ 晾肉杆上的肉干缠成一团了！', '🥩');
    } else if (this.id === 'samoyed') {
      this.routineState = 'sneak_lick';
      this.routineTimer = 2.0;
      this.showBubble('😋 趁没人注意，偷舔一口鲜奶油~', '🍰');
    } else if (this.id === 'corgi') {
      this.routineState = 'apple_drop';
      this.routineTimer = 1.8;
      this.routineProp = {
        type: 'apple',
        x: this.x + 25,
        y: this.y + 14,
        vx: 45,
        rot: 0
      };
      this.showBubble('🍎 哎呀！红苹果掉在地上滚跑了！', '💦');
    } else if (this.id === 'border_collie') {
      this.routineState = 'crouch_stalk';
      this.routineTimer = 2.5;
      this.isCrouching = true;
      this.showBubble('👀 发现脱队小羊，压低身体潜行锁定！', '🐑');
    } else {
      const actions = ['tail_spin', 'sneeze', 'yawn'];
      const act = actions[Math.floor(Math.random() * actions.length)];
      this.routineState = act;
      this.routineTimer = 2.0;
      if (act === 'tail_spin') this.showBubble('🌀 追着尾巴转圈圈！', '🐾');
      else if (act === 'sneeze') this.showBubble('阿嚏~ 揉揉小鼻子！', '💨');
      else this.showBubble('嗷呜~ 伸个大懒腰！', '🥱');
    }
  }

  // 响应玩家目光靠近或点击抚摸
  noticePlayer(isClick = false) {
    if (!this.isOwned) return;
    this.isNoticingPlayer = true;
    this.noticePlayerTimer = isClick ? 3.5 : 2.0;

    // 歪头杀、表情与高速摇尾巴
    this.headTilt = this.facing > 0 ? 0.22 : -0.22;
    this.eyeExpression = isClick ? 'sparkle' : 'happy';
    this.isTailWaggingFast = true;

    if (isClick) {
      // 触碰与点击：开心地高高起跳！
      this.playJumpY = -14;
      this.squashY = 1.18;
      this.squashX = 0.88;
      this.addFloatingText('+5 ❤️');
      this.addAffectionExp(5, 'click_interact', false);

      const dialogues = [
        `汪！最喜欢主人摸摸啦！❤️`,
        `嘿嘿~ 主人今天也来看我啦！✨`,
        `摇尾巴~ 摇尾巴~ 汪汪！🐾`,
        `有主人在身边，工作一点都不累！🥰`
      ];
      const randomLine = dialogues[Math.floor(Math.random() * dialogues.length)];
      this.showBubble(randomLine, '❤️');

      if (window.wangwangAudio) {
        window.wangwangAudio.playPetHeart();
        window.wangwangAudio.playBark(this.id);
      }
    } else {
      // 玩家鼠标靠近悬停注视
      if (!this.bubble || this.bubble.timer <= 1.0) {
        this.showBubble('👀 发现主人在看着我！', '✨');
      }
    }
  }

  // 手动或事件触发哈士奇“偶尔跑偏”彩蛋动画
  triggerHuskyMishap(type = null) {
    if (this.id !== 'husky') return;
    this.huskyMishapType = type || (Math.random() < 0.5 ? 'dino_bone' : 'stuck_dirt');
    this.huskyMishapTimer = 3.5;
    if (this.huskyMishapType === 'dino_bone') {
      this.showBubble('嗷呜！整根黄金牛肋骨被我叼下来啦！🦴', '⭐');
    } else {
      this.showBubble('哎呀！撞翻晾肉架，倒栽葱栽进肉堆啦！💨', '❓');
    }
  }

  // 与乐园玩具互动 (+20~30体力与+10好感)
  interactWithToy(toy) {
    this.stamina = Math.min(this.maxStamina, this.stamina + 25);
    this.addAffectionExp(10, 'play_toy');
    this.stateTimer = 4.0;
    this.currentToyId = toy.id;
    this.x = toy.x;
    this.y = toy.y + 15;

    if (toy.id === 'trampoline') {
      this.state = 'play_trampoline';
      this.showBubble('蹦床起飞啦！超好玩！', '🎪');
    } else if (toy.id === 'ball') {
      this.state = 'play_ball';
      this.showBubble('接住大皮球！汪汪！', '🎾');
    } else if (toy.id === 'pool') {
      this.state = 'happy';
      this.showBubble('清凉泡澡，精神百倍！', '🛁');
    } else {
      this.state = 'nap';
      this.showBubble('软绵狗窝，呼噜呼噜~', '🛋️');
    }

    if (window.wangwangAudio) {
      window.wangwangAudio.playPetHeart();
      window.wangwangAudio.playBark(this.id);
    }
  }

  // 休息区状态机切换
  pickNewRestState(bounds) {
    const r = Math.random();
    if (r < 0.45) {
      // 走动
      this.state = 'walk';
      this.stateTimer = 3.5;
      if (bounds) {
        this.targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        this.targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      }
    } else if (r < 0.7) {
      // 趴下打盹
      this.state = 'nap';
      this.stateTimer = 4.0 + Math.random() * 4.0;
    } else {
      // 站立发呆吐舌头
      this.state = 'idle';
      this.stateTimer = 2.5 + Math.random() * 2.5;
    }
  }

  // =================== 渲染主入口 (Canvas 2D) ===================
  draw(ctx) {
    if (!this.isOwned) return;

    // 先在世界坐标系绘制掉落道具、滚动苹果或飞舞的蝴蝶
    this.drawRoutineProp(ctx);
    // 切食材飞溅碎块 (GDD 1.3)
    this.drawChopParticles(ctx);

    ctx.save();
    ctx.translate(this.x, this.y + this.bobOffset + this.playJumpY);
    ctx.scale(this.facing * (this.squashX || 1), (this.squashY || 1));
    if (this.bodyTilt) {
      ctx.rotate(this.bodyTilt);
    }

    // 地面柔和椭圆阴影
    ctx.beginPath();
    ctx.ellipse(0, 24, 22, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fill();

    const useSprite = this.useSpriteRenderer() && this.spriteSupportsPose();

    if (useSprite) {
      // 立绘直接接管长相 + 毛色 → 矢量管线的尾巴 / 身体 / 头耳 / 脸 / 衣物整体让位，
      // 否则会出现「立绘一只狗 + 矢量第二只狗」的重影。
      this.drawSpriteFigure(ctx);
    } else {
      // 立绘未就绪，或当前姿势（坐/匍匐）没有对应立绘 → 回退完整矢量管线
      this.drawCharacterSprite(ctx);
    }

    // 换装道具层：立绘不含帽子/配饰，始终叠加
    this.drawFrontAccessories(ctx);
    this.drawHat(ctx);

    // 前爪与大幅度动态工作动作：立绘不含切菜/翻烤等肢体，始终叠加
    this.drawPaws(ctx);

    // GDD 1.2 高动能道具：叼着飞盘
    if (this.holdsFrisbee) {
      ctx.save();
      ctx.translate(14, -6);
      ctx.rotate(0.15);
      // 亮红飞盘外环
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // 金黄同心圆环
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // GDD 1.2 刨地泥土堆
    if (this.isDigging) {
      ctx.save();
      ctx.fillStyle = '#6D4C41';
      ctx.beginPath();
      ctx.ellipse(10, 20, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(8, 18, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // 渲染气泡、头顶体力条与好感度标志（不随镜像反转）
    this.drawOverheadUI(ctx);
  }

  // 绘制充满生命力与微表情的卡通小狗矢量骨骼图层
  drawCharacterSprite(ctx) {
    this.drawBackAccessories(ctx);
    this.drawTail(ctx);
    this.drawBody(ctx);
    this.drawClothes(ctx);
    this.drawHeadAndEars(ctx);
    this.drawFace(ctx);
  }

  // =================== 写实立绘渲染管线 ===================
  // 立绘是全身站姿静帧，无法像矢量管线那样做骨骼摆姿。因此这里的策略是：
  //   1. 立绘负责提供「长相与毛色」（未被染色时）；
  //   2. 矢量管线的细碎动作（前爪/在岗道具/头顶 UI）在立绘上继续叠加；
  //   3. 被立绘替代的部件（尾巴/身体/头耳/脸/衣物/背饰）在 draw 中整体 gate 跳过，
  //      避免出现「两只尾巴」「四只眼睛」这类重影；
  //   4. 立绘未就绪、或狗狗正处于坐/匍匐等无对应立绘的姿势时，整体回退矢量管线。

  // 当前是否应当使用立绘渲染
  useSpriteRenderer() {
    return Boolean(this.isOwned && this.imgLoaded && this.spriteEntry && this.spriteEntry.canvas);
  }

  // 立绘姿势对齐：立绘只有「站立」。坐下 / 匍匐 / 翻肚等姿态若强行贴站姿立绘会很出戏，
  // 这些状态整体交给矢量管线表现。
  spriteSupportsPose() {
    return !this.isSitting && !this.isCrouching;
  }

  // 立绘本体绘制：等比缩放 + 脚底锚点定位 + 朝向镜像
  drawSpriteFigure(ctx) {
    const entry = this.spriteEntry;
    if (!entry) return;
    // 染色后画「染膏版」离屏立绘；未染色时直接画原画（零额外开销）
    const art = this._getTintedSprite() || entry.canvas;
    const b = entry.bounds;
    const artH = b.h || entry.canvas.height;
    const artW = b.w || entry.canvas.width;

    // 以「脚底贴地」为锚点：立绘高度占场景高度的比例固定，
    // 不同尺寸的素材放进场景后视觉体量彼此一致。
    const scale = (this.drawHeight || DogChef.SPRITE_DRAW_HEIGHT) / artH;
    const feetY = DogChef.SPRITE_FEET_Y;

    ctx.save();
    ctx.translate(this.spriteCenterBiasX || 0, 0);
    // 立绘原画一律朝右，facing 由调用方的 scale 提供；若素材本身朝左则再翻一次
    if (this.spriteArtFacing === -1) ctx.scale(-1, 1);

    // 底边落在 feetY，而不是 0 —— 矢量管线的脚掌/阴影也在 y≈+20~24
    ctx.drawImage(
      art,
      b.x, b.y, artW, artH,
      -artW * scale / 2, feetY - artH * scale,
      artW * scale, artH * scale
    );
    ctx.restore();
  }

  /**
   * 生成（并缓存）「染膏版」立绘。
   *
   * 这里刻意在**离屏画布**上完成染色，而不是像早期实现那样直接在主画布上
   * fillRect + source-atop —— 后者是个真实 bug：source-atop 是按「目标 alpha」
   * 生效的，而主画布此时已经被草地/工位/其他狗狗铺满像素，于是整块 fillRect
   * 矩形都会被染上色，草地上会出现一个突兀的色块，工位美术也被糊掉。
   * 离屏画布上只有狗狗本身有 alpha，source-atop 天然被限制在剪影内部。
   *
   * 同时把结果缓存下来：染色只在换毛色时算一次，之后每帧只是一次 drawImage，
   * 对移动端很友好。
   *
   * @returns {HTMLCanvasElement|null} 染色后的画布；未染色或环境不支持时返回 null
   */
  _getTintedSprite() {
    const entry = this.spriteEntry;
    if (!entry || !entry.canvas) return null;

    const colors = this.coatColors;
    if (!colors || !colors.body) return null; // 原生毛色：直接用原画

    const key = [
      this.coatColorId,
      colors.body,
      colors.belly || '',
      colors.innerEar || ''
    ].join('|');
    if (this._tintCache && this._tintCache.key === key) return this._tintCache.canvas;

    if (typeof document === 'undefined' || !document.createElement) return null;

    const src = entry.canvas;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const octx = out.getContext && out.getContext('2d');
    if (!octx) return null;

    try {
      octx.drawImage(src, 0, 0);

      // 只落在狗狗剪影内（离屏画布上仅狗狗有像素，所以这里天然安全）
      octx.globalCompositeOperation = 'source-atop';
      octx.globalAlpha = this.coatTintAlpha != null ? this.coatTintAlpha : 0.5;

      // 竖直渐变近似「背部主色 → 腹部浅色」的毛色分布
      const b = entry.bounds;
      const top = b.y;
      const bottom = b.y + (b.h || src.height);
      const grad = octx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, colors.body);
      grad.addColorStop(1, colors.belly || colors.body);
      octx.fillStyle = grad;
      octx.fillRect(0, 0, out.width, out.height);

      octx.globalAlpha = 1;
      octx.globalCompositeOperation = 'source-over';
    } catch (e) {
      console.warn('生成染膏版立绘失败:', this.id, e);
      return null;
    }

    this._tintCache = { key: key, canvas: out };
    return out;
  }

  // =================== 场景同款矢量头像渲染 ===================
  // 复用与场景 draw() 完全相同的绘制管线生成头像，因此图鉴 / 名册 / 档案里的狗狗
  // 与场景中的狗狗是同一种画风、同一副长相（同配色、同比例、同五官）。
  // 仅剥离会随时间变化的部分（工作动作、职业帽、天气帽、气泡、悬浮体力条、道具），
  // 让头像保持稳定干净的「中性站姿」，姿态与场景中的常态姿态一致。

  // 备份会受头像渲染影响的瞬时状态
  _backupPoseState() {
    return {
      routineState: this.routineState,
      assignedFacility: this.assignedFacility,
      state: this.state,
      isSitting: this.isSitting,
      isCrouching: this.isCrouching,
      isPantingTongue: this.isPantingTongue,
      isLookingAtSky: this.isLookingAtSky,
      isDigging: this.isDigging,
      holdsFrisbee: this.holdsFrisbee,
      holdsBox: this.holdsBox,
      holdsApple: this.holdsApple,
      isNoticingPlayer: this.isNoticingPlayer,
      isTailWaggingFast: this.isTailWaggingFast,
      headTilt: this.headTilt,
      eyeExpression: this.eyeExpression,
      facing: this.facing,
      bobOffset: this.bobOffset,
      bodyTilt: this.bodyTilt,
      squashX: this.squashX,
      squashY: this.squashY,
      tailAngle: this.tailAngle,
      pawAngle: this.pawAngle,
      playJumpY: this.playJumpY,
      animTime: this.animTime
    };
  }

  // 切到中性站姿（不改配色与比例，只去掉动态姿态与在岗道具）
  _applyNeutralPose() {
    const backup = this._backupPoseState();
    this.routineState = null;
    this.assignedFacility = null;
    this.state = 'idle';
    this.isSitting = false;
    this.isCrouching = false;
    this.isPantingTongue = false;
    this.isLookingAtSky = false;
    this.isDigging = false;
    this.holdsFrisbee = false;
    this.holdsBox = false;
    this.holdsApple = false;
    this.isNoticingPlayer = false;
    this.isTailWaggingFast = false;
    this.headTilt = 0;
    this.eyeExpression = 'happy';
    this.facing = 1;
    this.bobOffset = 0;
    this.bodyTilt = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.tailAngle = 0.3;
    this.pawAngle = 0;
    this.playJumpY = 0;
    this.animTime = 0;
    return backup;
  }

  // 用与场景一致的绘制顺序画一只中性站姿的狗（去掉地面阴影 / 道具 / 气泡 / 头顶 UI）
  _drawPortraitFigure(ctx) {
    if (this.useSpriteRenderer() && this.spriteSupportsPose()) {
      // 头像与场景保持同一副长相：同样优先用立绘，避免「场景是立绘、图鉴是矢量」的割裂
      this.drawSpriteFigure(ctx);
    } else {
      this.drawCharacterSprite(ctx);
    }
    this.drawFrontAccessories(ctx);
    if (this.equippedOutfits.hat) this.drawHat(ctx);
    this.drawPaws(ctx);
  }

  // 立绘头部特写包围盒（局部坐标）。
  //
  // 为什么需要：图鉴 / 名册里的头像只有 40~50px，把整只狗缩进去之后五官完全看不清，
  // 而「犬种图鉴」这种界面恰恰是要看脸的。所以头像裁到头部。
  //
  // 难点：8 张素材的朝向**分两派**（金毛/边牧/萨摩耶/拉布拉多朝左，柴犬/柯基/
  // 哈士奇/法斗朝右），不能一律取左上角。这里先从 alpha 分布判出头在哪一侧，
  // 再在那一侧取框，最后换算回局部坐标（与 drawSpriteFigure 同一套映射）。
  _spriteHeadBounds() {
    const entry = this.spriteEntry;
    if (!entry || !entry.canvas) return null;
    if (this._headBoundsCache) return this._headBoundsCache;

    const b = entry.bounds;
    const src = entry.canvas;
    const artW = b.w || src.width;
    const artH = b.h || src.height;

    const scale = (this.drawHeight || DogChef.SPRITE_DRAW_HEIGHT) / artH;
    const feetY = DogChef.SPRITE_FEET_Y;
    const bias = this.spriteCenterBiasX || 0;
    const flip = this.spriteArtFacing === -1 ? -1 : 1;

    // 素材像素 → 局部坐标（与 drawSpriteFigure 完全一致）
    const toLocalX = (ax) => bias + flip * (-artW * scale / 2 + (ax - b.x) * scale);
    const toLocalY = (ay) => feetY - artH * scale + (ay - b.y) * scale;

    let headBox = null;
    try {
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const cx = c.getContext('2d');
      if (!cx) return null;
      cx.drawImage(src, 0, 0);
      const d = cx.getImageData(b.x, b.y, artW, artH).data;
      const W = artW, H = artH;
      const A = (x, y) => d[(y * W + x) * 4 + 3];

      // 1) 判头在哪一侧：上部 45% 横带内左右两半的前景像素数。
      //    头比尾巴厚实，像素多的一侧就是脸朝向的一侧。
      const bandH = Math.max(1, Math.round(H * 0.45));
      let leftCnt = 0, rightCnt = 0;
      for (let y = 0; y < bandH; y++) {
        for (let x = 0; x < W; x++) {
          if (A(x, y) > 40) { if (x < W / 2) leftCnt++; else rightCnt++; }
        }
      }
      const headLeft = leftCnt >= rightCnt;

      // 2) 头所在的外侧 40% 竖带 × 上部 42% 横带 = 头部候选区
      const x0 = headLeft ? 0 : Math.floor(W * 0.60);
      const x1 = headLeft ? Math.ceil(W * 0.40) : W;
      const yLimit = Math.max(1, Math.round(H * 0.42));

      let minX = W, maxX = -1, minY = H, maxY = -1;
      for (let y = 0; y < yLimit; y++) {
        for (let x = x0; x < x1; x++) {
          if (A(x, y) > 40) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return null;

      // 3) 取正方形（头像框是方的），中心对准头部，留 10% 余量
      const side = Math.max(maxX - minX + 1, maxY - minY + 1) * 1.10;
      const ccx = b.x + (minX + maxX) / 2;
      const ccy = b.y + (minY + maxY) / 2;

      const lx = toLocalX(ccx);
      const ly = toLocalY(ccy);
      const lside = side * scale;
      headBox = {
        minX: lx - lside / 2, maxX: lx + lside / 2,
        minY: ly - lside / 2, maxY: ly + lside / 2,
        w: lside, h: lside, cx: lx, cy: ly
      };
    } catch (e) {
      console.warn('测量立绘头部包围盒失败:', this.id, e);
      return null;
    }

    this._headBoundsCache = headBox;
    return headBox;
  }

  // 立绘未就绪时，头像包围盒可以直接用素材的 alpha 包围盒换算，省掉一次整舱位测量
  _spritePortraitBounds() {
    const entry = this.spriteEntry;
    if (!entry || !entry.bounds) return null;
    const b = entry.bounds;
    const artH = b.h || entry.canvas.height;
    const artW = b.w || entry.canvas.width;
    const scale = (this.drawHeight || DogChef.SPRITE_DRAW_HEIGHT) / artH;
    const w = artW * scale;
    const h = artH * scale;
    const offX = this.spriteCenterBiasX || 0;
    const feetY = DogChef.SPRITE_FEET_Y;
    // 与 drawSpriteFigure 保持同一套定位：水平居中、底边落在 feetY
    return {
      minX: -w / 2 + offX, maxX: w / 2 + offX,
      minY: feetY - h, maxY: feetY,
      w: w, h: h,
      cx: offX, cy: feetY - h / 2
    };
  }

  // 像素级测量当前长相的实际包围盒（含尾巴与耳朵），保证任何犬种都能精准居中充满
  _measurePortraitBounds() {
    const SPAN = 360;
    const canvas = document.createElement('canvas');
    canvas.width = SPAN;
    canvas.height = SPAN;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    const backup = this._applyNeutralPose();
    let bounds = null;
    try {
      ctx.save();
      ctx.translate(SPAN / 2, SPAN / 2);
      this._drawPortraitFigure(ctx);
      ctx.restore();

      const data = ctx.getImageData(0, 0, SPAN, SPAN).data;
      let minX = SPAN, maxX = -1, minY = SPAN, maxY = -1;
      for (let y = 0; y < SPAN; y++) {
        const row = y * SPAN;
        for (let x = 0; x < SPAN; x++) {
          if (data[(row + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= 0) {
        const half = SPAN / 2;
        bounds = {
          minX: minX - half, maxX: maxX - half,
          minY: minY - half, maxY: maxY - half
        };
        bounds.w = bounds.maxX - bounds.minX;
        bounds.h = bounds.maxY - bounds.minY;
        bounds.cx = (bounds.minX + bounds.maxX) / 2;
        bounds.cy = (bounds.minY + bounds.maxY) / 2;
      }
    } catch (e) {
      console.warn('测量狗狗头像包围盒失败:', this.id, e);
    } finally {
      Object.assign(this, backup);
    }
    return bounds;
  }

  // 生成场景同款头像 dataURL
  createPortraitDataURL(displaySize = 46, dpr = 2) {
    if (typeof document === 'undefined' || !document.createElement) return null;

    // 缓存键包含尺寸、毛色、穿戴与「是否已切到立绘」，
    // 这样立绘异步加载完成的那一刻会自动重出头像，不会一直停留在矢量版
    const signature = [
      displaySize, dpr,
      this.coatColorId,
      this.equippedOutfits.hat ? this.equippedOutfits.hat.id : '-',
      this.equippedOutfits.cloth ? this.equippedOutfits.cloth.id : '-',
      this.equippedOutfits.acc ? this.equippedOutfits.acc.id : '-',
      this.useSpriteRenderer() ? 'sprite' : 'vector'
    ].join('|');
    if (this._portraitCache && this._portraitCache.key === signature) {
      return this._portraitCache.url;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(displaySize * dpr);
    canvas.height = Math.round(displaySize * dpr);
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    const backup = this._applyNeutralPose();
    let url = null;
    try {
      // 立绘模式下优先取「头部特写」：头像只有 40~50px，整只狗缩进去五官就糊了。
      // 立绘未就绪时退回整身包围盒，再退回像素级测量，最后兜一个默认值。
      const b = (this.useSpriteRenderer() && this._spriteHeadBounds()) ||
                this._spritePortraitBounds() ||
                this._measurePortraitBounds() ||
                { minX: -33, maxX: 22, minY: -32, maxY: 23, w: 55, h: 55, cx: -5.5, cy: -4.5 };

      ctx.save();
      ctx.scale(dpr, dpr);
      // 留 8% 白边，取宽高较大的一边做等比缩放，保证不裁切
      const scale = (displaySize * 0.92) / Math.max(b.w, b.h);
      ctx.translate(displaySize / 2 - b.cx * scale, displaySize / 2 - b.cy * scale);
      ctx.scale(scale, scale);
      this._drawPortraitFigure(ctx);
      ctx.restore();

      url = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('生成狗狗头像失败:', this.id, e);
    } finally {
      Object.assign(this, backup);
    }

    if (url) this._portraitCache = { key: signature, url: url };
    return url;
  }

  // 换装 / 染色后清除头像缓存
  invalidatePortrait() {
    this._portraitCache = null;
  }

  // --- 细节绘制子函数 ---

  // 尾巴（支持 24Hz 螺旋桨超频摇尾与柯基蜜桃臀摇摆）
  drawTail(ctx) {
    ctx.save();
    const c = this.getRenderColors();
    ctx.fillStyle = c.body;

    let effTailAngle = this.tailAngle;
    if (this.isTailWaggingFast || this.routineState === 'wag_tail') {
      // 24Hz 螺旋桨超频甩尾
      effTailAngle = Math.sin(this.animTime * 24) * 0.95;
    }

    if (this.id === 'shiba') {
      // 柴犬卷尾巴
      ctx.translate(-14, 2);
      ctx.rotate(effTailAngle);
      ctx.beginPath();
      ctx.arc(-4, -6, 8, 0, Math.PI * 1.6);
      ctx.lineWidth = 6;
      ctx.strokeStyle = c.body;
      ctx.stroke();
      // 尾尖白毛
      ctx.beginPath();
      ctx.arc(-4, -6, 8, 0.8, Math.PI * 1.5);
      ctx.strokeStyle = c.belly;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (this.id === 'corgi') {
      // 柯基心形蜜桃屁屁与短尾小毛团
      const buttWiggle = (this.routineState === 'chase_apple' || this.peachButtWiggle) ? Math.sin(this.animTime * 22) * 5 : 0;
      ctx.translate(-14, 5 + buttWiggle);
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      // 白色爱心印花毛
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.arc(-1, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 通用蓬松长尾
      ctx.translate(-14, this.isSitting ? 12 : 6); // 坐姿时长尾贴近地表摆动
      ctx.rotate(effTailAngle);
      ctx.beginPath();
      ctx.ellipse(-8, -4, 11, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // 螺旋桨超速甩尾时的气流漩涡动效 💨
      if (this.isTailWaggingFast || this.routineState === 'wag_tail') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-8, -4, 13, -0.6, 0.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 身体与肚皮（支持蹲坐与潜行匍匐姿态）
  drawBody(ctx) {
    const c = this.getRenderColors();

    if (this.isSitting) {
      // 坐下姿势：身体下压微后倾，后腿弯曲盘坐在草地上，前腿直立支撑
      ctx.fillStyle = c.body;
      // 蹲坐主身躯（圆润饱满）
      ctx.beginPath();
      ctx.ellipse(0, 10, 18, 14, -0.06, 0, Math.PI * 2);
      ctx.fill();

      // 肚皮软毛
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.ellipse(4, 11, 11, 10, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // 弯曲折叠的后大腿屁股 (饱满大圆)
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.ellipse(-12, 16, 8, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // 贴地后小肉垫爪爪
      ctx.beginPath();
      ctx.ellipse(-8, 22, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 直立支撑的前爪
      ctx.beginPath();
      ctx.ellipse(8, 20, 5, 6, 0.05, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (this.isCrouching) {
      // 边牧低姿匍匐潜行姿势
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.ellipse(0, 12, 20, 10, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.ellipse(3, 13, 12, 7, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // 匍匐四肢
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.ellipse(-14, 18, 6, 3, -0.2, 0, Math.PI * 2);
      ctx.ellipse(12, 18, 6, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // 正常站立身体主色
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 肚皮浅色软毛
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(3, 8, 10, 11, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 腿爪
    ctx.fillStyle = c.body;
    // 后腿
    ctx.beginPath();
    ctx.ellipse(-10, 18, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 前腿
    ctx.beginPath();
    ctx.ellipse(8, 18, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 头部与耳朵（支持歪头倾听、仰天望天、警觉竖耳与疲惫耷拉耳）
  drawHeadAndEars(ctx) {
    const c = this.getRenderColors();
    ctx.save();
    let headOffsetY = -14;
    let headOffsetX = 2;
    if (this.isSitting) {
      headOffsetY = -8; // 坐姿头部微降
    } else if (this.isCrouching) {
      headOffsetY = -4; // 匍匐头部贴地
    }

    ctx.translate(headOffsetX, headOffsetY);

    if (this.headTilt) {
      ctx.rotate(this.headTilt);
    } else if (this.isLookingAtSky || this.routineState === 'look_sky') {
      ctx.rotate(-0.35); // 仰头望向天空角度
    }

    // 耳朵额外高度或耷拉
    let earExtraH = 0;
    if (this.isNoticingPlayer || this.routineState === 'spot_player') {
      earExtraH = 3; // 警觉竖耳
    } else if (this.routineState === 'tired') {
      earExtraH = -3; // 疲惫耷拉耳
    }

    // 耳朵
    if (this.id === 'corgi' || this.id === 'shiba' || this.id === 'husky') {
      // 尖耳朵（柯基大尖耳、柴犬小尖耳、二哈狼耳）
      const earH = (this.id === 'corgi' ? 19 : 14) + earExtraH;
      // 左耳
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-17, -8 - earH);
      ctx.lineTo(-5, -12);
      ctx.closePath();
      ctx.fill();
      // 内耳粉色
      ctx.fillStyle = c.innerEar;
      ctx.beginPath();
      ctx.moveTo(-11, -8);
      ctx.lineTo(-15, -8 - earH + 4);
      ctx.lineTo(-6, -11);
      ctx.closePath();
      ctx.fill();

      // 右耳
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.moveTo(5, -12);
      ctx.lineTo(13, -8 - earH);
      ctx.lineTo(13, -6);
      ctx.closePath();
      ctx.fill();
      // 右内耳
      ctx.fillStyle = c.innerEar;
      ctx.beginPath();
      ctx.moveTo(6, -11);
      ctx.lineTo(11, -8 - earH + 4);
      ctx.lineTo(12, -6);
      ctx.closePath();
      ctx.fill();
    } else if (this.id === 'frenchie') {
      // 法斗大蝙蝠圆耳
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.ellipse(-14, -18, 7, 12, -0.3, 0, Math.PI * 2);
      ctx.ellipse(14, -18, 7, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.innerEar;
      ctx.beginPath();
      ctx.ellipse(-14, -18, 4, 8, -0.3, 0, Math.PI * 2);
      ctx.ellipse(14, -18, 4, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 金毛/边牧/拉布拉多 垂耳
      const earAngle = this.routineState === 'tired' ? 0.35 : 0.2;
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.ellipse(-14, -6, 6, 12, earAngle, 0, Math.PI * 2);
      ctx.ellipse(14, -6, 6, 12, -earAngle, 0, Math.PI * 2);
      ctx.fill();
    }

    // 头部圆脸蛋
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // 脸部花纹特异性
    if (this.id === 'shiba') {
      // 柴犬白脸颊与豆豆眉
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.ellipse(0, 5, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // 豆豆白眉
      ctx.beginPath();
      ctx.arc(-6, -8, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.id === 'husky') {
      // 二哈面具额头火纹
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-12, 5);
      ctx.lineTo(12, 5);
      ctx.lineTo(6, -4);
      ctx.closePath();
      ctx.fill();
    } else if (this.id === 'border_collie') {
      // 边牧经典对称白围脖和脸中分
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.ellipse(0, 2, 6, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 腮红
    ctx.fillStyle = 'rgba(255, 130, 150, 0.45)';
    ctx.beginPath();
    ctx.arc(-11, 4, 3.5, 0, Math.PI * 2);
    ctx.arc(11, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 五官与眼神（支持星星眼、圈圈眼、仰天望天、大口吐舌与奶油胡子）
  drawFace(ctx) {
    const c = this.getRenderColors();
    ctx.save();
    let headOffsetY = -14;
    let headOffsetX = 2;
    if (this.isSitting) {
      headOffsetY = -8;
    } else if (this.isCrouching) {
      headOffsetY = -4;
    }
    ctx.translate(headOffsetX, headOffsetY);

    if (this.headTilt) {
      ctx.rotate(this.headTilt);
    } else if (this.isLookingAtSky || this.routineState === 'look_sky') {
      ctx.rotate(-0.35);
    }

    // 眼睛
    const eyeColor = (this.id === 'husky') ? '#3498DB' : '#1C2833';
    ctx.fillStyle = eyeColor;

    if (this.state === 'nap' || this.eyeExpression === 'closed') {
      // 睡觉闭眼眯眯眼 ^ ^
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-6, -1, 3.5, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(6, -1, 3.5, Math.PI, 0);
      ctx.stroke();
    } else if (this.state === 'happy' || this.eyeExpression === 'happy') {
      // 开心弯弯月牙笑眼
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-6, -1, 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(6, -1, 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (this.eyeExpression === 'dizzy' || this.routineState === 'run_wrong_way') {
      // 跑错方向时的晕乎乎圈圈眼 @ @
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-6, -1, 3.5, 0, Math.PI * 2);
      ctx.arc(6, -1, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-6, -1, 1.5, 0, Math.PI * 2);
      ctx.arc(6, -1, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.eyeExpression === 'sparkle' || this.isNoticingPlayer || this.routineState === 'spot_player') {
      // 发现主人时的布灵布灵动漫星星大眼 ✨
      ctx.beginPath();
      ctx.arc(-6, -1, 4, 0, Math.PI * 2);
      ctx.arc(6, -1, 4, 0, Math.PI * 2);
      ctx.fill();
      // 双重高光点
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-4.5, -2.5, 1.8, 0, Math.PI * 2);
      ctx.arc(7.5, -2.5, 1.8, 0, Math.PI * 2);
      ctx.arc(-7, 0.5, 0.9, 0, Math.PI * 2);
      ctx.arc(5, 0.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.isLookingAtSky || this.routineState === 'look_sky') {
      // 仰望天空时的呆滞上视眼神
      ctx.beginPath();
      ctx.ellipse(-6, -3, 3, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(6, -3, 3, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-5, -4, 1.2, 0, Math.PI * 2);
      ctx.arc(7, -4, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 正常黑亮大眼睛
      ctx.beginPath();
      ctx.arc(-6, -1, 3, 0, Math.PI * 2);
      ctx.arc(6, -1, 3, 0, Math.PI * 2);
      ctx.fill();
      // 高光小点
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-5, -2, 1.2, 0, Math.PI * 2);
      ctx.arc(7, -2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 鼻子与嘴巴
    ctx.fillStyle = c.nose;
    ctx.beginPath();
    ctx.ellipse(0, 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 吐舌头或微微笑
    if (this.isPantingTongue || this.routineState === 'pant' || this.routineState === 'sit_pant') {
      // 大口呼哧吐舌头散热 👅
      const pantBreath = Math.sin(this.animTime * 14);
      // 张开的小嘴
      ctx.fillStyle = '#78281F';
      ctx.beginPath();
      ctx.arc(0, 5, 4, 0, Math.PI);
      ctx.fill();

      // 粉嫩长舌头上下颤动
      ctx.fillStyle = '#FF8A80';
      ctx.beginPath();
      ctx.roundRect(-3, 5, 6, 7 + pantBreath * 1.5, 3);
      ctx.fill();

      // 舌头中线
      ctx.strokeStyle = '#E57373';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 10 + pantBreath * 1.5);
      ctx.stroke();
    } else if (this.state === 'happy' || this.id === 'samoyed' || this.isNoticingPlayer) {
      ctx.fillStyle = '#F1948A';
      ctx.beginPath();
      ctx.arc(0, 6, 3, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-2, 5, 2.5, 0, Math.PI * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2, 5, 2.5, Math.PI * 0.2, Math.PI);
      ctx.stroke();
    }

    // 萨摩耶偷舔奶油后留在脸庞的白胡子
    if (this.hasCreamMustache || this.routineState === 'cream_mustache') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-4, 4, 3, 0, Math.PI * 2);
      ctx.arc(0, 5, 3.5, 0, Math.PI * 2);
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.arc(0, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 独立绘制飞舞彩蝶 🦋、地面掉落包裹 📦 与滚动红苹果 🍎
  // 切食材碎块粒子渲染 (GDD 1.3 核心循环首环节)
  drawChopParticles(ctx) {
    if (!this.chopParticles || this.chopParticles.length === 0) return;
    ctx.save();
    for (const cp of this.chopParticles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, cp.life / 0.5));
      ctx.fillStyle = cp.color;
      ctx.translate(cp.x, cp.y);
      ctx.rotate(cp.rot);
      ctx.fillRect(-cp.size / 2, -cp.size / 2, cp.size, cp.size);
      ctx.restore();
    }
    ctx.restore();
  }

  drawRoutineProp(ctx) {
    if (!this.routineProp) return;
    const prop = this.routineProp;

    if (prop.type === 'butterfly') {
      ctx.save();
      ctx.translate(prop.x, prop.y);
      const wingScale = Math.sin(prop.wingPhase);

      // 蝴蝶灵动微光
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 8;

      // 左右晶莹渐变蝶翼
      // 左翼
      ctx.save();
      ctx.scale(wingScale, 1);
      ctx.fillStyle = '#60A5FA';
      ctx.beginPath();
      ctx.ellipse(-6, -4, 7, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(-5, 3, 5, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(-6, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 右翼
      ctx.save();
      ctx.scale(-wingScale, 1);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.ellipse(-6, -4, 7, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(-5, 3, 5, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(-6, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 细巧身体与触角
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(-2.5, -7);
      ctx.moveTo(0, -3);
      ctx.lineTo(2.5, -7);
      ctx.stroke();

      // 飞行动态闪亮粒子 ✨
      if (Math.sin(prop.t * 10) > 0.2) {
        ctx.fillStyle = '#FDE047';
        ctx.font = '10px sans-serif';
        ctx.fillText('✨', -4, 10);
      }
      ctx.restore();
    } else if (prop.type === 'box') {
      // 掉在草地上的牛皮纸神秘包裹 📦
      ctx.save();
      ctx.translate(prop.x, prop.y);
      // 阴影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // 箱子
      ctx.fillStyle = '#D35400';
      ctx.beginPath();
      ctx.roundRect(-8, -7, 16, 14, 2);
      ctx.fill();
      // 十字绳
      ctx.strokeStyle = '#FAD7A0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      // 红色印章
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(2, -5, 4, 4);
      // 闪烁提示光
      ctx.fillStyle = '#F1C40F';
      ctx.font = '10px sans-serif';
      ctx.fillText('⭐', -12, -8);
      ctx.restore();
    } else if (prop.type === 'apple') {
      // 滚跑的大红苹果 🍎
      ctx.save();
      ctx.translate(prop.x, prop.y);
      ctx.rotate(prop.rot || 0);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(2, -6, 3, 1.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 前爪与手持专属职业工具（花洒喷壶浇花、快递邮包、果园采摘、放牧绵羊、甜品裱花、挥镐挖矿与哈士奇奇遇）
  drawPaws(ctx) {
    const c = this.getRenderColors();
    ctx.save();
    ctx.fillStyle = c.body;

    // === 特殊萌趣小动作与专属行为状态下的独立前爪与道具渲染 ===
    if (this.routineState) {
      // 1. 金毛工作累了/坐下/吐舌头/发现玩家/摇尾巴
      if (this.id === 'golden' && (this.routineState === 'tired' || this.routineState === 'sit' || this.routineState === 'pant' || this.routineState === 'spot_player' || this.routineState === 'wag_tail')) {
        // (1) 园艺水壶放在身旁草坪上
        ctx.save();
        ctx.translate(22, 14);
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.roundRect(0, -6, 14, 11, 3);
        ctx.fill();
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(7, -6, 5, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(13, 1);
        ctx.lineTo(21, -3);
        ctx.stroke();
        ctx.fillStyle = '#F1C40F';
        ctx.beginPath();
        ctx.ellipse(22, -4, 2.5, 4, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // (2) 旁边的向日葵花盆在阳光下微摇
        const potX = 36;
        const potY = 16;
        ctx.fillStyle = '#D35400';
        ctx.beginPath();
        ctx.moveTo(potX - 7, potY);
        ctx.lineTo(potX + 7, potY);
        ctx.lineTo(potX + 5, potY + 10);
        ctx.lineTo(potX - 5, potY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#27AE60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(potX, potY);
        ctx.lineTo(potX, potY - 12);
        ctx.stroke();
        ctx.fillStyle = '#F39C12';
        for (let pet = 0; pet < 8; pet++) {
          const petAng = (pet * Math.PI) / 4;
          ctx.beginPath();
          ctx.arc(potX + Math.cos(petAng) * 6, potY - 13 + Math.sin(petAng) * 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#6E2C00';
        ctx.beginPath();
        ctx.arc(potX, potY - 13, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // (3) 金毛双爪姿势
        if (this.routineState === 'tired') {
          // 累了擦汗：左爪支地，右爪抬起抹额头
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(-2, 16, 4.5, 3.5, 0, 0, Math.PI * 2); // 左前爪着地
          ctx.fill();
          // 右前爪擦额头
          ctx.beginPath();
          ctx.ellipse(8, -12, 4, 4.5, -0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.routineState === 'sit' || this.routineState === 'pant') {
          // 坐地吐舌：两只小爪乖乖并在胸前地面上
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(-3, 17, 4.5, 3.5, 0, 0, Math.PI * 2);
          ctx.ellipse(5, 17, 4.5, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 发现玩家/高速摇尾巴：两只前爪开心地轻快拍手/踏地
          const tapOffset = Math.sin(this.animTime * 18) * 2;
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(-3, 16 + tapOffset, 4.5, 3.5, 0, 0, Math.PI * 2);
          ctx.ellipse(6, 16 - tapOffset, 4.5, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return;
      }

      // 2. 柴犬叼起箱子/跑错方向/急刹掉头
      if (this.id === 'shiba' && (this.holdsBox || this.routineState === 'pick_box' || this.routineState === 'run_wrong_way' || this.routineState === 'turn_back')) {
        const runCycle = Math.sin(this.animTime * 14);
        const bx = 12;
        const by = 5 + runCycle * 2;

        // 斜挎墨绿小邮包
        ctx.strokeStyle = '#6E2C00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(10, 14);
        ctx.stroke();
        ctx.fillStyle = '#196F3D';
        ctx.beginPath();
        ctx.roundRect(-10, 8, 12, 11, 3);
        ctx.fill();

        // 双爪抱住神秘包裹 📦
        ctx.fillStyle = '#D35400';
        ctx.beginPath();
        ctx.roundRect(bx - 9, by - 8, 18, 16, 2.5);
        ctx.fill();
        // 十字绳
        ctx.strokeStyle = '#FAD7A0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by - 8);
        ctx.lineTo(bx, by + 8);
        ctx.moveTo(bx - 9, by);
        ctx.lineTo(bx + 9, by);
        ctx.stroke();
        // 红色小印章
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(bx + 2, by - 6, 4, 4);

        // 爪子抓在箱子左右两侧
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(bx - 8, by + 1, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(bx + 8, by + 1, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 跑错方向时的反向风烟与冲刺动线
        if (this.routineState === 'run_wrong_way') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx + 16, by - 6);
          ctx.lineTo(bx + 28, by - 6);
          ctx.moveTo(bx + 14, by + 4);
          ctx.lineTo(bx + 24, by + 4);
          ctx.stroke();
        } else if (this.routineState === 'turn_back') {
          // 急刹掉头拉出的白色刹车烟圈 💨
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(-8, 22, 5, 0, Math.PI * 2);
          ctx.arc(-16, 20, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return;
      }

      // 3. 哈士奇挖矿停下、呆滞看天、追蝴蝶
      if (this.id === 'husky' && (this.routineState === 'sudden_stop' || this.routineState === 'look_sky' || this.routineState === 'chase_butterfly' || this.routineState === 'return_mine')) {
        // (1) 铁镐深深卡在水晶矿石中 ⛏️🪨
        const rockX = 28;
        const rockY = 12;
        ctx.fillStyle = '#566573';
        ctx.beginPath();
        ctx.moveTo(rockX - 10, rockY + 8);
        ctx.lineTo(rockX - 8, rockY - 6);
        ctx.lineTo(rockX + 2, rockY - 12);
        ctx.lineTo(rockX + 10, rockY - 4);
        ctx.lineTo(rockX + 11, rockY + 8);
        ctx.closePath();
        ctx.fill();
        // 水晶
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.moveTo(rockX - 3, rockY - 4);
        ctx.lineTo(rockX, rockY - 9);
        ctx.lineTo(rockX + 4, rockY - 4);
        ctx.lineTo(rockX + 1, rockY);
        ctx.closePath();
        ctx.fill();

        // 铁镐卡在石头缝隙里（略微斜倾）
        ctx.save();
        ctx.translate(rockX - 2, rockY - 6);
        const stuckWobble = this.routineState === 'sudden_stop' ? Math.sin(this.animTime * 24) * 0.08 : 0;
        ctx.rotate(0.35 + stuckWobble);
        // 木柄
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-12, -26);
        ctx.stroke();
        // 镐尖深深嵌在石中
        ctx.fillStyle = '#7F8C8D';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // (2) 哈士奇自身的动作姿势
        if (this.routineState === 'sudden_stop') {
          // 突然停下：两只前爪惊呆悬空张开
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(-2, 6, 4.5, 4, -0.4, 0, Math.PI * 2);
          ctx.ellipse(8, 6, 4.5, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.routineState === 'look_sky') {
          // 仰头望天：一只爪子挠腮，一只爪子叉腰发呆
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(-4, 9, 4, 3.5, -0.2, 0, Math.PI * 2);
          ctx.ellipse(6, -6, 4, 4.5, 0.3, 0, Math.PI * 2); // 挠挠下巴
          ctx.fill();
        } else if (this.routineState === 'chase_butterfly') {
          // 飞扑抓蝴蝶：双爪欢乐向前大伸
          const reach = Math.sin(this.animTime * 16) * 4;
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(12 + reach, -2, 5, 4, 0.3, 0, Math.PI * 2);
          ctx.ellipse(16 + reach, 4, 5, 4, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.routineState === 'return_mine') {
          // 跑回来重新握住镐柄
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(10, 4, 4.5, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return;
      }

      // 4. 萨摩耶偷舔奶油/害羞捂脸/端出草莓大蛋糕
      if (this.id === 'samoyed' && (this.isCoveringFace || this.routineState === 'shy_cover_face' || this.routineState === 'serve_cake')) {
        if (this.routineState === 'serve_cake') {
          // 骄傲端出多层双层草莓大蛋糕 🎂
          const cakeX = 18;
          const cakeY = 10;
          ctx.fillStyle = '#FDFEFE';
          ctx.strokeStyle = '#F1C40F';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cakeX, cakeY + 8, 16, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FADBD8';
          ctx.beginPath();
          ctx.roundRect(cakeX - 12, cakeY - 2, 24, 10, 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(cakeX - 9, cakeY - 10, 18, 9, 2);
          ctx.fill();

          ctx.fillStyle = '#E74C3C';
          ctx.beginPath();
          ctx.arc(cakeX - 5, cakeY - 12, 2.5, 0, Math.PI * 2);
          ctx.arc(cakeX, cakeY - 13, 3, 0, Math.PI * 2);
          ctx.arc(cakeX + 5, cakeY - 12, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(cakeX - 14, cakeY + 6, 4.5, 3.5, 0, 0, Math.PI * 2);
          ctx.ellipse(cakeX + 14, cakeY + 6, 4.5, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 害羞双爪捂脸 🙈
          ctx.fillStyle = c.body;
          ctx.beginPath();
          ctx.ellipse(-3, -7, 5, 4.5, -0.3, 0, Math.PI * 2);
          ctx.ellipse(5, -7, 5, 4.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // 脸颊红晕
          ctx.fillStyle = 'rgba(255, 105, 180, 0.55)';
          ctx.beginPath();
          ctx.arc(-8, -4, 4, 0, Math.PI * 2);
          ctx.arc(10, -4, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return;
      }

      // 5. 柯基抱紧大红苹果
      if (this.id === 'corgi' && (this.holdsApple || this.routineState === 'hug_apple' || this.routineState === 'waddle_back')) {
        const ax = 12;
        const ay = 4;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(ax, ay, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(ax + 5, ay - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.ellipse(ax + 2, ay - 10, 4, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(ax - 8, ay + 2, 4.5, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(ax + 8, ay + 2, 4.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;
      }
    }

    if (this.assignedFacility) {
      const st = this.assignedFacility;

      if (st === 'stew') {
        // ==================== 1. 炖汤主厨 (🍲 大铁锅文火慢炖) ====================
        // 狗狗握着长柄木勺在锅里画圈搅拌，奶白高汤翻涌气泡，灶膛炭火泛着暖光
        const stirAngle = this.animTime * 3.2;
        const bubblePhase = (this.animTime * 1.6) % 1.0;

        ctx.save();
        ctx.translate(4, 2);

        // (1) 灶台与大铁锅
        ctx.fillStyle = '#34495E';
        ctx.beginPath();
        ctx.ellipse(20, 16, 19, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F5CBA7';
        ctx.beginPath();
        ctx.ellipse(20, 14, 15, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 翻滚的气泡
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = 0; i < 3; i++) {
          const bp = (bubblePhase + i * 0.33) % 1.0;
          ctx.beginPath();
          ctx.arc(12 + i * 8, 14 - bp * 5, 2.4 - bp * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // (2) 长柄木勺画圈搅拌
        ctx.save();
        ctx.translate(6, 4);
        ctx.rotate(stirAngle * 0.35);
        ctx.strokeStyle = '#A1887F';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-2, 12);
        ctx.lineTo(22, -4);
        ctx.stroke();
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.ellipse(24, -6, 6, 4, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // (3) 灶膛暖光
        ctx.fillStyle = 'rgba(241, 196, 15, 0.35)';
        ctx.beginPath();
        ctx.arc(20, 22, 9, 0, Math.PI * 2);
        ctx.fill();

        // (4) 锅内食材：胡萝卜与牛大骨
        ctx.fillStyle = '#E67E22';
        ctx.beginPath();
        ctx.moveTo(30, 12);
        ctx.lineTo(35, 9);
        ctx.lineTo(36, 13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FDFEFE';
        ctx.beginPath();
        ctx.roundRect(8, 11, 9, 3.5, 1.6);
        ctx.fill();

        // (5) 前爪扶锅沿
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(2, 16, 4.5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else if (st === 'bbq') {
        // ==================== 2. 烧烤主厨 (🍢 炭火慢烤) ====================
        // 狗狗手持长夹翻动烤串，炭火泛红，火星噼啪上窜
        const flipPhase = Math.sin(this.animTime * 5.5);

        ctx.save();
        ctx.translate(4, 2);

        // (1) 砖砌炭炉
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.roundRect(8, 14, 34, 12, 3);
        ctx.fill();
        ctx.fillStyle = '#C0392B';
        ctx.beginPath();
        ctx.roundRect(11, 20, 28, 6, 2.5);
        ctx.fill();
        ctx.fillStyle = '#E67E22';
        ctx.beginPath();
        ctx.roundRect(13, 21, 24, 4, 2);
        ctx.fill();

        // (2) 炭火红光
        ctx.fillStyle = 'rgba(230, 126, 34, 0.3)';
        ctx.beginPath();
        ctx.arc(25, 22, 13, 0, Math.PI * 2);
        ctx.fill();

        // (3) 烤网与三根肉串
        ctx.strokeStyle = '#4E5A63';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(8, 14);
        ctx.lineTo(42, 14);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const sx = 14 + i * 11;
          const lift = (i === 1 ? flipPhase : -flipPhase) * 2.2;
          ctx.strokeStyle = '#D7CCC8';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx, 4 + lift);
          ctx.lineTo(sx, 15);
          ctx.stroke();
          for (let k = 0; k < 2; k++) {
            ctx.fillStyle = k === 0 ? '#A0522D' : '#F1C40F';
            ctx.beginPath();
            ctx.roundRect(sx - 3.5, 5 + k * 4.4 + lift, 7, 3.8, 1.4);
            ctx.fill();
          }
        }

        // (4) 火星
        ctx.fillStyle = '#F39C12';
        ctx.fillRect(16, 6 - (this.animTime * 26) % 14, 2, 2);
        ctx.fillRect(33, 8 - (this.animTime * 22) % 14, 1.8, 1.8);

        // (5) 前爪持夹
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(4, 15, 4.5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else if (st === 'bake') {
        // ==================== 3. 甜品主厨 (🧁 裱花挤奶油) ====================
        // 狗狗握着裱花袋在蛋糕上挤出旋转奶油花，旁边摆着刚出炉的曲奇
        const pipeAngle = Math.sin(this.animTime * 6) * 0.25;

        ctx.save();
        ctx.translate(4, 2);

        // (1) 展示台
        ctx.fillStyle = '#FADBD8';
        ctx.beginPath();
        ctx.roundRect(8, 18, 34, 8, 3);
        ctx.fill();

        // (2) 蛋糕胚
        ctx.fillStyle = '#D35400';
        ctx.beginPath();
        ctx.roundRect(20, 8, 18, 11, 2.5);
        ctx.fill();
        // 草莓夹层
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(20, 12, 18, 3);

        // (3) 旋转奶油花
        ctx.save();
        ctx.translate(29, 8);
        ctx.rotate(pipeAngle);
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + this.animTime * 2.2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 4.2, Math.sin(a) * 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FF8FAB';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // (4) 裱花袋
        ctx.save();
        ctx.translate(8, 4);
        ctx.rotate(-0.5 + pipeAngle);
        ctx.fillStyle = '#FFF5E8';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(14, -5);
        ctx.lineTo(14, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#E8B4B8';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#BDC3C7';
        ctx.beginPath();
        ctx.moveTo(14, -2);
        ctx.lineTo(19, 0);
        ctx.lineTo(14, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // (5) 前爪扶台
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(3, 18, 4.5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else if (st === 'hotpot') {
        // ==================== 4. 火锅领班 (🫕 涮肉与撇沫) ====================
        // 狗狗用长筷夹着肉片在沸腾鸳鸯锅里涮煮，蒸汽袅袅升腾
        const dipPhase = Math.sin(this.animTime * 3.4) * 0.5;

        ctx.save();
        ctx.translate(4, 2);

        // (1) 圆桌与鸳鸯锅
        ctx.fillStyle = '#A1887F';
        ctx.beginPath();
        ctx.ellipse(22, 18, 22, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#B9770E';
        ctx.beginPath();
        ctx.ellipse(22, 15, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(22, 15, 14, 6.5, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(8, 6, 14, 18);
        ctx.fillStyle = '#FDF3E3';
        ctx.fillRect(22, 6, 14, 18);
        ctx.restore();

        // 沸腾气泡
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(16, 14, 2.2, 0, Math.PI * 2);
        ctx.arc(28, 16, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // (2) 长筷涮肉片
        ctx.save();
        ctx.translate(6, 2);
        ctx.rotate(dipPhase * 0.3);
        ctx.strokeStyle = '#A1887F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, 10);
        ctx.lineTo(20, 8);
        ctx.moveTo(0, 13);
        ctx.lineTo(21, 11);
        ctx.stroke();
        // 夹着的肉片
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.ellipse(22, 10, 5, 3.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F1948A';
        ctx.beginPath();
        ctx.ellipse(22, 10, 2.6, 1.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // (3) 蒸汽
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(18, 4, 4.5, 0, Math.PI * 2);
        ctx.arc(26, -2, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // (4) 前爪扶桌
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(3, 19, 4.5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else if (st === 'jerky') {
        // ==================== 5. 风干主厨 (🥩 挂晾肉干) ====================
        // 狗狗叼着一条肉干往晾肉杆上挂，架上肉干随风轻摆，低温风机缓缓转动
        const fanAngle = this.animTime * 4.5;
        const hangLift = Math.abs(Math.sin(this.animTime * 2.2)) * 3;

        ctx.save();
        ctx.translate(4, 2);

        // (1) 晾肉架横杆
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-2, -8);
        ctx.lineTo(44, -8);
        ctx.stroke();
        // 立杆
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(44, -8);
        ctx.lineTo(44, 20);
        ctx.stroke();

        // (2) 已挂好的两条肉干轻轻摆动
        const hung = [{ x: 14, h: 16, sw: 0.5 }, { x: 30, h: 19, sw: 1.2 }];
        for (const hg of hung) {
          const sway = Math.sin(this.animTime * 2 + hg.sw) * 0.12;
          ctx.save();
          ctx.translate(hg.x, -8);
          ctx.rotate(sway);
          ctx.fillStyle = '#A0522D';
          ctx.beginPath();
          ctx.roundRect(-4.5, 0, 9, hg.h, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 2);
          ctx.lineTo(0, hg.h - 2);
          ctx.stroke();
          ctx.restore();
          // 挂钩
          ctx.strokeStyle = '#BDC3C7';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(hg.x, -9, 2, Math.PI, Math.PI * 2);
          ctx.stroke();
        }

        // (3) 嘴里叼着待挂的肉干（随呼吸上抬）
        ctx.save();
        ctx.translate(6, 6 - hangLift);
        ctx.rotate(-0.3);
        ctx.fillStyle = '#B5651D';
        ctx.beginPath();
        ctx.roundRect(0, -2, 12, 5, 2);
        ctx.fill();
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.roundRect(0, 0, 12, 2.5, 1.2);
        ctx.fill();
        ctx.restore();

        // (4) 低温风干风机
        ctx.fillStyle = '#7F8C8D';
        ctx.beginPath();
        ctx.roundRect(0, 12, 14, 11, 3);
        ctx.fill();
        ctx.strokeStyle = '#BDC3C7';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(7, 17.5, 3.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(7 + Math.cos(fanAngle) * 3.6, 17.5 + Math.sin(fanAngle) * 3.6);
        ctx.lineTo(7 - Math.cos(fanAngle) * 3.6, 17.5 - Math.sin(fanAngle) * 3.6);
        ctx.stroke();

        // (5) 前爪
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.ellipse(3, 20, 4.5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // 通用兜底动作：大木勺翻炒
        ctx.save();
        ctx.translate(6, 6);
        ctx.rotate(this.pawAngle * 1.6);
        ctx.beginPath();
        ctx.ellipse(4, 2, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(7, -1, 15, 3.5);
        ctx.fillStyle = '#7F8C8D';
        ctx.fillRect(19, -6, 9, 13);
        ctx.restore();
      }
    } else {
      // 乐园自由状态爪子动效
      if (this.state === 'play_trampoline') {
        // 蹦床在空中展开四肢开心大跳
        ctx.beginPath();
        ctx.ellipse(13, -2, 4.5, 3.5, -0.7, 0, Math.PI * 2);
        ctx.ellipse(-11, -2, 4.5, 3.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 乖巧放在前胸
        ctx.beginPath();
        ctx.ellipse(6, 9, 3.5, 4, 0.2, 0, Math.PI * 2);
        ctx.ellipse(-2, 9, 3.5, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- 服装与配饰渲染层 ---

  drawBackAccessories(ctx) {
    const acc = this.equippedOutfits.acc;
    if (!acc) return;
    if (acc.render === 'angel_wings') {
      // 天使纯白羽翼
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#BDC3C7';
      ctx.lineWidth = 1.5;
      // 左翼
      ctx.beginPath();
      ctx.ellipse(-14, 0, 12, 6, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 右翼
      ctx.beginPath();
      ctx.ellipse(-6, -4, 12, 6, -0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (this.equippedOutfits.cloth && this.equippedOutfits.cloth.render === 'hero_cape') {
      // 超人红色拉风披风
      ctx.save();
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(-24 + Math.sin(this.animTime * 6) * 3, 20);
      ctx.lineTo(-6, 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawClothes(ctx) {
    const cloth = this.equippedOutfits.cloth;
    if (!cloth) return;

    ctx.save();
    if (cloth.render === 'striped_apron') {
      // 红白条纹主厨围裙
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(3, 8, 12, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // 红色条纹
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2.5;
      for (let i = -6; i <= 10; i += 5) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 17);
        ctx.stroke();
      }
    } else if (cloth.render === 'sailor_suit') {
      // 蓝白水手服
      ctx.fillStyle = '#2980B9';
      ctx.beginPath();
      ctx.ellipse(2, 7, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-2, 1, 8, 12);
      // 红领结
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.arc(2, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (cloth.render === 'yellow_sweater') {
      // 暖茸黄毛衣
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.ellipse(1, 7, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D68910';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (cloth.render === 'tuxedo') {
      // 绅士燕尾服
      ctx.fillStyle = '#2C3E50';
      ctx.beginPath();
      ctx.ellipse(1, 7, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-1, 0);
      ctx.lineTo(6, 0);
      ctx.lineTo(2, 12);
      ctx.closePath();
      ctx.fill();
      // 小红领结
      ctx.fillStyle = '#C0392B';
      ctx.fillRect(1, 1, 3, 2);
    } else {
      // 默认潮流外衣 (橙色/绿色)
      ctx.fillStyle = '#E67E22';
      ctx.beginPath();
      ctx.ellipse(1, 7, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFrontAccessories(ctx) {
    const acc = this.equippedOutfits.acc;
    if (!acc) {
      // 动态天气效果：下雪天小狗自动系上暖心红围巾
      const isSnowy = window.currentGame && window.currentGame.currentWeather === 'snowy';
      if (isSnowy) {
        ctx.save();
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(-8, -4, 18, 6);
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(13, 11);
        ctx.lineTo(8, 13);
        ctx.closePath();
        ctx.fill();
        // 围巾白流苏
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 11, 5, 2);
        ctx.restore();
      }
      return;
    }

    ctx.save();
    if (acc.render === 'red_scarf') {
      // 鲜红小围巾
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(-8, -4, 18, 5);
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.lineTo(12, 10);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.fill();
    } else if (acc.render === 'cool_sunglasses') {
      // 酷炫黑超墨镜
      ctx.fillStyle = '#17202A';
      ctx.beginPath();
      ctx.roundRect(-10, -18, 10, 7, 2);
      ctx.roundRect(2, -18, 10, 7, 2);
      ctx.fill();
      ctx.strokeStyle = '#7F8C8D';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(2, -15);
      ctx.stroke();
    } else if (acc.render === 'round_glasses') {
      // 圆圆眼镜
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-5, -14, 5, 0, Math.PI * 2);
      ctx.arc(7, -14, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(2, -14);
      ctx.stroke();
    } else if (acc.render === 'bubble_gum') {
      // 粉色泡泡糖
      ctx.fillStyle = 'rgba(255, 105, 180, 0.85)';
      ctx.beginPath();
      ctx.arc(3, -9, 6 + Math.sin(this.animTime * 4) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (acc.render === 'red_bowtie') {
      // 红色小领结
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.moveTo(-4, -1);
      ctx.lineTo(8, -1);
      ctx.lineTo(2, -4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawHat(ctx) {
    const hat = this.equippedOutfits.hat;
    if (!hat) {
      // 动态天气效果：雨天未戴帽子的小狗自动戴上明黄色小雨帽
      const isRainy = window.currentGame && window.currentGame.currentWeather === 'rainy';
      if (isRainy) {
        ctx.save();
        ctx.translate(2, -24);
        ctx.fillStyle = '#F1C40F';
        ctx.beginPath();
        ctx.arc(0, 0, 16, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#F39C12';
        ctx.fillRect(-18, -1, 36, 4);
        // 雨帽晶莹水珠高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(-5, -7, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // 若未佩戴时尚帽子且正在岗位工作，佩戴萌萌职业头饰/工作帽
      if (this.assignedFacility) {
        ctx.save();
        ctx.translate(2, -26);
        const st = this.assignedFacility;
        if (st === 'stew') {
          // 炖汤主厨：经典白色高筒厨师帽 + 汤勺小徽章
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(-9, -14, 18, 12, 3);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-6, -15, 4.5, 0, Math.PI * 2);
          ctx.arc(0, -17.5, 5.2, 0, Math.PI * 2);
          ctx.arc(6, -15, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#E8B4B8';
          ctx.fillRect(-10, -3, 20, 3);
          ctx.fillStyle = '#D35400';
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🥄', 0, -8);
        } else if (st === 'bbq') {
          // 烧烤主厨：红白格纹头巾 + 炭火小徽章
          ctx.fillStyle = '#E74C3C';
          ctx.beginPath();
          ctx.arc(0, -1, 14, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(-15, -2, 30, 4);
          // 格纹
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 1.4;
          for (let i = -10; i <= 10; i += 7) {
            ctx.beginPath();
            ctx.moveTo(i, -14);
            ctx.lineTo(i + 4, -2);
            ctx.stroke();
          }
          // 头巾结
          ctx.fillStyle = '#C0392B';
          ctx.beginPath();
          ctx.arc(-14, -3, 3.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (st === 'bake') {
          // 甜品主厨：蓬松奶油泡芙高帽 + 粉边
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(-6, -6, 5, 0, Math.PI * 2);
          ctx.arc(0, -9.5, 6, 0, Math.PI * 2);
          ctx.arc(6, -6, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FADBD8';
          ctx.fillRect(-9, -2, 18, 3.4);
          ctx.fillStyle = '#FF8FAB';
          ctx.beginPath();
          ctx.arc(0, -14, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (st === 'hotpot') {
          // 火锅领班：黑色包头巾 + 铜锅小徽章
          ctx.fillStyle = '#2C3E50';
          ctx.beginPath();
          ctx.arc(0, -1, 14, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(-15, -2, 30, 4);
          ctx.strokeStyle = '#5D6D7E';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, -2, 10, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
          ctx.fillStyle = '#B9770E';
          ctx.beginPath();
          ctx.ellipse(0, -8, 5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(0, -10, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (st === 'jerky') {
          // 风干主厨：暖橙毛线帽 + 绒球
          ctx.fillStyle = '#E67E22';
          ctx.beginPath();
          ctx.arc(0, -1, 14, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(-15, -2, 30, 6);
          ctx.fillStyle = '#D35400';
          ctx.fillRect(-15, 1, 30, 3);
          // 绒球
          ctx.fillStyle = '#FAD7A0';
          ctx.beginPath();
          ctx.arc(0, -16, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      return;
    }

    ctx.save();
    ctx.translate(2, -28);

    if (hat.render === 'chef_toque') {
      // 经典高筒大主厨帽
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#D5D8DC';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-10, 2, 20, 5, 2); // 帽檐
      ctx.fill();
      ctx.stroke();
      // 帽顶蓬松
      ctx.beginPath();
      ctx.arc(-6, -6, 6, 0, Math.PI * 2);
      ctx.arc(0, -9, 8, 0, Math.PI * 2);
      ctx.arc(6, -6, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat.render === 'egg_beret') {
      // 荷包蛋贝雷帽
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, 3, 14, 6, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // 金黄蛋黄
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(2, 1, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat.render === 'gold_crown') {
      // 闪耀黄金王冠
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.moveTo(-10, 4);
      ctx.lineTo(-10, -6);
      ctx.lineTo(-5, 0);
      ctx.lineTo(0, -9);
      ctx.lineTo(5, 0);
      ctx.lineTo(10, -6);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();
      // 宝石红点
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.arc(0, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat.render === 'party_cone') {
      // 缤纷派对帽
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.moveTo(-7, 4);
      ctx.lineTo(0, -16);
      ctx.lineTo(7, 4);
      ctx.closePath();
      ctx.fill();
      // 顶端小绒球
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(0, -17, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 默认小草帽
      ctx.fillStyle = '#F9E79F';
      ctx.beginPath();
      ctx.ellipse(0, 3, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(0, 0, 7, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  // 渲染头顶 UI（好感度徽章、体力值条、互动气泡、飘字）
  drawOverheadUI(ctx) {
    ctx.save();

    // 1. 头顶好感度等级徽章 (小粉心 + Lv)
    const badgeX = this.x;
    const badgeY = this.y - 48 + this.bobOffset + this.playJumpY;

    // 体力值迷你指示条 (在好感度徽章上方)
    const staminaBarW = 34;
    const staminaBarH = 5;
    const staminaY = badgeY - 12;
    const staminaPercent = Math.max(0, Math.min(1, this.stamina / this.maxStamina));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(badgeX - staminaBarW / 2, staminaY, staminaBarW, staminaBarH, 2.5);
    ctx.fill();

    let staminaColor = '#2ECC71'; // 充足绿
    if (this.stamina <= 20) {
      staminaColor = '#E74C3C'; // 危险红
    } else if (this.stamina <= 50) {
      staminaColor = '#F39C12'; // 疲惫黄
    }

    ctx.fillStyle = staminaColor;
    ctx.beginPath();
    ctx.roundRect(badgeX - staminaBarW / 2, staminaY, staminaBarW * staminaPercent, staminaBarH, 2.5);
    ctx.fill();

    // 闪电小标志
    ctx.fillStyle = '#F1C40F';
    ctx.font = '8px sans-serif';
    ctx.fillText('⚡', badgeX - staminaBarW / 2 - 5, staminaY + 5);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#F1948A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(badgeX - 18, badgeY - 6, 36, 15, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E74C3C';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`♥ Lv.${this.affectionLevel}`, badgeX, badgeY + 2);

    // 2. 气泡提示 (当有剧情/自言自语/提示时)
    if (this.bubble) {
      const bubbleY = badgeY - 24;
      ctx.font = '12px -apple-system, sans-serif';
      const textMetrics = ctx.measureText(this.bubble.text);
      const bubbleW = Math.max(50, textMetrics.width + 16);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = '#BDC3C7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(badgeX - bubbleW / 2, bubbleY - 10, bubbleW, 20, 10);
      ctx.fill();
      ctx.stroke();

      // 小尖角
      ctx.beginPath();
      ctx.moveTo(badgeX - 4, bubbleY + 10);
      ctx.lineTo(badgeX, bubbleY + 15);
      ctx.lineTo(badgeX + 4, bubbleY + 10);
      ctx.fill();

      ctx.fillStyle = '#2C3E50';
      ctx.fillText(this.bubble.text, badgeX, bubbleY);
    }

    // 3. 飘字动画
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = '#E74C3C';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
    // 特殊微动作头顶视觉：哈士奇看天发呆时的牛排白日梦云朵 💭 🥩
    if (this.isLookingAtSky || this.routineState === 'look_sky') {
      const dreamX = badgeX + (this.facing > 0 ? 32 : -32);
      const dreamY = badgeY - 32;
      ctx.save();
      // 小泡泡联接线
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(badgeX + (this.facing > 0 ? 10 : -10), badgeY - 10, 3, 0, Math.PI * 2);
      ctx.arc(badgeX + (this.facing > 0 ? 18 : -18), badgeY - 18, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 梦想大云朵
      ctx.beginPath();
      ctx.arc(dreamX, dreamY, 15, 0, Math.PI * 2);
      ctx.arc(dreamX - 10, dreamY + 2, 10, 0, Math.PI * 2);
      ctx.arc(dreamX + 10, dreamY + 2, 10, 0, Math.PI * 2);
      ctx.arc(dreamX - 5, dreamY - 9, 10, 0, Math.PI * 2);
      ctx.arc(dreamX + 5, dreamY - 9, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#90CAF9';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 梦想中的美味大牛排 🥩
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.ellipse(dreamX, dreamY, 9, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // 牛排T骨白芯
      ctx.fillStyle = '#FDFEFE';
      ctx.beginPath();
      ctx.arc(dreamX - 2, dreamY - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // 闪闪发光
      ctx.fillStyle = '#F1C40F';
      ctx.font = '10px sans-serif';
      ctx.fillText('✨', dreamX + 10, dreamY - 10);
      ctx.restore();
    }

    // 疲惫或跑错方向时的晶莹飞溅汗珠 💦
    if (this.routineState === 'tired' || this.routineState === 'run_wrong_way') {
      ctx.save();
      const sweatY = badgeY + 14 + Math.sin(this.animTime * 14) * 2;
      const sweatX = badgeX + (this.facing > 0 ? 18 : -18);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(sweatX, sweatY - 6);
      ctx.quadraticCurveTo(sweatX + 4, sweatY, sweatX, sweatY + 5);
      ctx.quadraticCurveTo(sweatX - 4, sweatY, sweatX, sweatY - 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sweatX - 1, sweatY + 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

if (typeof window !== "undefined") {
  window.DogChef = DogChef;
}
