/**
 * 《汪汪小馆 (Wangwang Diner)》- 游戏主控制器
 * 60FPS主循环、画布触控交互、UI弹窗抽屉管理、新手引导与存档持久化
 */

class WangwangGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 虚拟分辨率 (电脑宽屏黄金比例标准 1000 x 600)
    this.baseWidth = 1000;
    this.baseHeight = 600;

    // 全局实例指针
    if (typeof window !== 'undefined') {
      window.game = this;
      window.currentGame = this;
    }

    // 核心子系统初始化
    this.economy = new WangwangEconomy();

    // 初始化 8 大犬种
    this.dogs = new Map();
    for (const [id, config] of Object.entries(DOG_BREEDS_CONFIG)) {
      const isInitial = id === 'golden'; // 金毛暖心主厨初始免费拥有！
      const dog = new DogChef(id, config, isInitial);
      if (isInitial) {
        dog.assignedFacility = 'stew';
        dog.x = 428;
        dog.y = 156;
        dog.facing = 1;
      } else {
        // 未拥有的狗狗预备在森林草地各个清幽角落
        dog.x = 220 + Math.random() * 580;
        dog.y = 150 + Math.random() * 280;
      }
      this.dogs.set(id, dog);
    }

    // 初始化后厨设施、衣橱与 GDD 2.1 犬种抽卡
    this.kitchen = new RestaurantKitchen(this.economy, this.dogs);
    this.wardrobe = new WardrobeManager(this.economy, this.dogs);
    this.gacha = new DogGachaManager(this.economy, this.dogs, this.wardrobe);

    // 绑定经济系统引用
    this.economy.bindGameReferences(this.dogs, this.kitchen);

    // 新手引导状态 (0: 引导收金币, 1: 引导升熬汤锅, 2: 引导完成)
    this.tutorialStep = 0;

    // 选中的狗狗 (用于狗狗互动详情面板)
    this.selectedDogId = 'golden';
    this.selectedStationId = 'stew';
    this.lastDogClickTime = 0;
    this.lastDogClickedId = null;

    // 动态天气系统 (sunny / rainy / snowy)
    this.currentWeather = 'sunny';

    // 动画主循环
    this.lastTime = performance.now();
    this.saveIntervalTimer = 0;

    // 初始化事件绑定与视图
    this.initCanvasSize();
    this.initEventListeners();
    this.setupDogpediaTabs();
    this.setWeather('sunny', false);
    this.loadSaveData();
    // 读完存档后统一纠正岗位字段，清除可能残留的旧版工位 key
    this.normalizeDogAssignments();

    // 检查离线收益弹窗
    this.checkOfflineEarnings();

    // 启动主游戏循环
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // 自适应画布缩放，保持 430x780 清晰绘制比例
  initCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.baseWidth * dpr;
    this.canvas.height = this.baseHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  // 检查离线收益
  checkOfflineEarnings() {
    const offlineData = this.economy.calcOfflineEarnings();
    if (offlineData && offlineData.earnedGold > 0) {
      this.showOfflineModal(offlineData);
    }
  }

  showOfflineModal(data) {
    const modal = document.getElementById('offline-modal');
    if (!modal) return;

    const offlineSeconds = data ? (data.offlineSeconds ?? data.offlineSec ?? 0) : 0;
    const maxHours = data ? (data.maxHours ?? (this.economy ? this.economy.getOfflineLimitHours() : 8)) : 8;
    const goldPerSec = data ? (data.goldPerSec ?? (this.economy ? this.economy.calcGoldPerSecond() : 0)) : 0;
    const earnedGold = data ? (data.earnedGold ?? 0) : 0;

    const timeStr = this.formatDuration(offlineSeconds);
    document.getElementById('offline-time-text').innerText = timeStr;
    document.getElementById('offline-limit-text').innerText = `${maxHours}小时`;
    document.getElementById('offline-rate-text').innerText = `${goldPerSec} 🪙/秒`;
    document.getElementById('offline-gold-normal').innerText = `+${earnedGold.toLocaleString()} 金币`;
    document.getElementById('offline-gold-double').innerText = `+${(earnedGold * 2).toLocaleString()} 金币`;

    // 迎门守候仪式：金毛在木栅门守候并跳跃
    const golden = this.dogs.get('golden') || Array.from(this.dogs.values()).find(d => d.isOwned);
    if (golden) {
      golden.waitAtGate();
      const pedia = typeof DOGPEDIA_CONFIG !== 'undefined' ? DOGPEDIA_CONFIG[golden.id] : null;
      const quoteElem = document.getElementById('welcome-gate-quote');
      if (quoteElem && pedia) {
        quoteElem.innerText = pedia.welcomeQuote;
      }
      const titleElem = document.getElementById('welcome-modal-title');
      if (titleElem) {
        titleElem.innerText = `🏡 ${golden.name}在小院木门等您回家！`;
      }
      const iconElem = document.getElementById('welcome-gate-dog-icon');
      if (iconElem) {
        iconElem.innerText = golden.avatar || '🐕';
      }
    }
    if (window.wangwangAudio) {
      window.wangwangAudio.playGateWelcome();
    }

    // 绑定领取按钮
    const btnNormal = document.getElementById('btn-claim-offline-normal');
    const btnDouble = document.getElementById('btn-claim-offline-double');

    let claimed = false;
    const claimNormal = () => {
      if (claimed) return;
      claimed = true;
      this.economy.claimOfflineGold(false, data.earnedGold);
      modal.classList.add('hidden');
      if (golden) golden.welcomePlayerAtGate();
      this.showToast(`已领取小院守候经营金币 +${data.earnedGold.toLocaleString()} 🪙`);
      if (window.wangwangAudio) window.wangwangAudio.playCoin();
      this.updateHUD();
      this.saveGameData();
    };

    if (btnNormal) {
      btnNormal.onclick = claimNormal;
    }

    const closeBtn = modal.querySelector ? modal.querySelector('.modal-close') : null;
    if (closeBtn) {
      closeBtn.onclick = claimNormal;
    }

    if (btnDouble) {
      btnDouble.onclick = () => {
        if (claimed) return;
        claimed = true;
        btnDouble.innerText = '正在摸摸小狗头...';
        setTimeout(() => {
          const finalVal = this.economy.claimOfflineGold(true, data.earnedGold);
          modal.classList.add('hidden');
          btnDouble.innerText = '📺 摸头互动·双倍领取';
          if (golden) golden.welcomePlayerAtGate();
          this.economy.recordAction('watch_ad');
          this.showToast(`小狗开心翻肚皮！双倍离线金币入账！+${finalVal.toLocaleString()} 🪙✨`);
          if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
          this.updateHUD();
          this.saveGameData();
        }, 1000);
      };
    }

    modal.classList.remove('hidden');
  }

  formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}小时 ${mins}分`;
    if (mins > 0) return `${mins}分 ${secs}秒`;
    return `${secs}秒`;
  }

  // =================== 事件监听与触控交互 ===================
  initEventListeners() {
    window.addEventListener('resize', () => this.initCanvasSize());

    // 点击画布元素判定 (前台托盘、后厨岛台、小狗)
    const handlePointerDown = (e) => {
      // 唤醒全局 Web Audio
      if (window.wangwangAudio) {
        window.wangwangAudio.init();
        if (!window.wangwangAudio.bgmPlaying && !window.wangwangAudio.muted) {
          window.wangwangAudio.startBGM();
        }
      }

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.baseWidth / rect.width;
      const scaleY = this.baseHeight / rect.height;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      this.handleCanvasClick(x, y);
    };

    this.canvas.addEventListener('mousedown', handlePointerDown);
    this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });

    // 鼠标在画布上移动与悬停：狗狗察觉玩家目光，转向、歪头、摇尾巴打招呼
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.baseWidth / rect.width;
      const scaleY = this.baseHeight / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      for (const dog of this.dogs.values()) {
        if (!dog.isOwned) continue;
        const dist = Math.hypot(dog.x - mouseX, (dog.y - 10) - mouseY);
        if (dist <= 48) {
          if (!dog.routineState || dog.routineState === 'sit' || dog.routineState === 'pant') {
            dog.facing = mouseX >= dog.x ? 1 : -1;
          }
          dog.noticePlayer(false);
        }
      }
    });

    // 底部导航栏按钮切换
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        this.openTabModal(tab);
      });
    });

    // 顶部音效静音切换
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isMuted = window.wangwangAudio.toggleMute();
        btnAudio.innerText = isMuted ? '🔇' : '🎵';
        this.showToast(isMuted ? '音效与BGM已静音' : '音效与治愈BGM已开启');
        this.saveGameData();
      });
    }

    // 页面切出或关闭时自动保存存档
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', () => {
        this.saveGameData();
      });
      window.addEventListener('pagehide', () => {
        this.saveGameData();
      });
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.saveGameData();
        }
      });
    }

    // 顶部玩法手册 / GDD 说明按钮
    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        this.openModal('help-modal');
      });
    }

    // 重开新档按钮 (用于随时以暖心大金毛从头开荒体验完整核心循环)
    const resetHandler = () => {
      if (confirm('确定要重新开始经营汪汪小馆吗？\n将以【暖心大金毛】作为初始大厨从头开荒，完整体验“解狗→建营→做饭→赚钱→升级→拓镇”的7步放置经营闭环！')) {
        localStorage.removeItem('wangwang_diner_save');
        window.location.reload();
      }
    };
    const btnReset = document.getElementById('btn-reset-game');
    if (btnReset) btnReset.addEventListener('click', resetHandler);
    const btnResetModal = document.getElementById('btn-reset-game-modal');
    if (btnResetModal) btnResetModal.addEventListener('click', resetHandler);

    // 扩张小镇按钮点击
    const btnExpand = document.getElementById('btn-town-expand');
    if (btnExpand) {
      btnExpand.addEventListener('click', () => {
        this.showTownExpansionModal();
      });
    }

    // 扩张小镇确认按钮
    const btnConfirmExp = document.getElementById('btn-confirm-expansion');
    if (btnConfirmExp) {
      btnConfirmExp.addEventListener('click', () => {
        this.confirmTownExpansion();
      });
    }

    // 核心循环目标胶囊点击
    const loopObjPill = document.getElementById('loop-objective-pill');
    if (loopObjPill) {
      loopObjPill.addEventListener('click', () => {
        const obj = this.economy.getCurrentLoopObjective();
        if (obj.action === 'expand_town') {
          this.showTownExpansionModal();
        } else if (obj.action === 'upgrade_station') {
          this.openStationModal(obj.stationId || 'stew');
        } else if (obj.action === 'open_dogs_modal') {
          this.openTabModal('dogs');
        } else if (obj.action === 'unlock_station' || obj.action === 'open_facilities_modal') {
          this.openTabModal('facilities');
        } else if (obj.action === 'open_dog_profile') {
          this.openDogProfileModal(obj.dogId || 'shiba');
        } else {
          this.showToast(`当前目标：${obj.text}`);
        }
      });
    }

    // 动态天气切换按钮
    const btnWeather = document.getElementById('hud-weather-pill');
    if (btnWeather) {
      btnWeather.addEventListener('click', () => {
        this.cycleWeather(true);
      });
    }

    // 投掷高动能飞盘
    const btnFrisbee = document.getElementById('btn-throw-frisbee');
    if (btnFrisbee) {
      btnFrisbee.addEventListener('click', () => {
        this.throwFrisbee();
      });
    }

    // GDD 1.2 迷你游戏：公园散步
    const btnParkWalk = document.getElementById('btn-park-walk');
    if (btnParkWalk) {
      btnParkWalk.addEventListener('click', () => {
        const res = this.kitchen.startParkWalk();
        this.showToast(res.success
          ? `🚶 牵起【${res.dog.name}】一起去阳光公园散步啦！`
          : res.msg);
      });
    }

    // GDD 1.2 迷你游戏：水里捡球
    const btnWaterFetch = document.getElementById('btn-water-fetch');
    if (btnWaterFetch) {
      btnWaterFetch.addEventListener('click', () => {
        const res = this.kitchen.startWaterFetch();
        this.showToast(res.success
          ? `🎾 弹力球划入戏水池！【${res.dog.name}】纵身跃入水中叼球！`
          : res.msg);
      });
    }

    // 国民犬种与5大料理图鉴
    const btnDogpedia = document.getElementById('btn-dogpedia');
    if (btnDogpedia) {
      btnDogpedia.addEventListener('click', () => {
        this.openTabModal('dogpedia');
      });
    }

    // 关闭各类弹窗
    const syncNavTabsState = (closedOverlay) => {
      if (closedOverlay && closedOverlay.id === 'offline-modal') {
        const golden = this.dogs.get('golden');
        if (golden && golden.waitingAtGate) {
          golden.welcomePlayerAtGate();
        }
      }
      const hasOpenModal = Array.from(document.querySelectorAll('.modal-overlay')).some(m => !m.classList.contains('hidden'));
      if (!hasOpenModal) {
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      }
    };

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) overlay.classList.add('hidden');
        syncNavTabsState(overlay);
      });
    });

    // 点击遮罩层空白处关闭弹窗
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
          syncNavTabsState(overlay);
        }
      });
    });

    // 键盘 ESC 键关闭弹窗
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
        if (openModals.length > 0) {
          const topModal = openModals[openModals.length - 1];
          topModal.classList.add('hidden');
          syncNavTabsState(topModal);
        }
      }
    });
  }

  handleCanvasClick(x, y) {
    // 0. 检查点击草坪刨地挖掘出的神秘宝藏 (黄金大骨、大金币包、神秘宝箱)
    if (this.kitchen.dugTreasures && this.kitchen.dugTreasures.length > 0) {
      for (let i = this.kitchen.dugTreasures.length - 1; i >= 0; i--) {
        const treasure = this.kitchen.dugTreasures[i];
        const dist = Math.hypot(treasure.x - x, treasure.y - y);
        if (dist <= 30) {
          this.kitchen.collectDugTreasure(treasure, this.economy);
          return;
        }
      }
    }

    // 0.5 检查点击阳光后院木栅门 (位于左侧路口 x: 48, y: 390, width: 80, height: 70)
    if (this.kitchen.gardenGate) {
      const gate = this.kitchen.gardenGate;
      if (x >= gate.x - 20 && x <= gate.x + gate.width + 20 && y >= gate.y - 20 && y <= gate.y + gate.height + 20) {
        this.triggerGateWelcome();
        return;
      }
    }

    // 1. 检查点击《猫咪和汤》标志性【底部出餐木托盘栏】 (点击木盘菜品或金币气泡即可立即售出！)
    if (this.kitchen.servingTray) {
      for (let i = 0; i < this.kitchen.servingTray.plates.length; i++) {
        const plate = this.kitchen.servingTray.plates[i];
        const dist = Math.hypot(plate.x - x, plate.y - y);
        const onBubble = Math.abs(plate.x - x) <= 36 && (y >= plate.y - 50 && y <= plate.y + 25);
        if (dist <= plate.radius + 12 || onBubble) {
          if (plate.dish) {
            const res = this.kitchen.sellTrayPlate(i, true);
            this.showToast(`售出【${res.name}】！营业金币 +${res.price.toLocaleString()} 🪙！`);
            if (this.tutorialStep === 0) {
              this.tutorialStep = 1; // 引导推进
            }
            return;
          }
        }
      }
    }

    // 2. 检查点击小镇中央音乐喷泉 ⛲ (正中央 500, 295)
    if (this.kitchen.fountain) {
      const fDist = Math.hypot(this.kitchen.fountain.x - x, this.kitchen.fountain.y - y);
      if (fDist <= this.kitchen.fountain.radius + 10) {
        this.kitchen.triggerFountainClick(x, y);
        return;
      }
    }

    // 3. 检查点击 6 大自然圆形小镇设施营地 (阳光花园、快递驿站、甜品工坊、水晶矿洞等)
    for (const station of Object.values(this.kitchen.stations)) {
      const dist = Math.hypot(station.x - x, station.y - y);
      const r = station.radius || 52;
      const onBadge = Math.abs(station.x - x) <= 65 && Math.abs((station.y - r - 18) - y) <= 18;
      if (dist <= r + 8 || onBadge) {
        if (!station.unlocked) {
          // 检查小镇阶段是否允许解锁该设施
          if ((station.stage || 1) > this.economy.townStage) {
            this.showToast(`此地处于未开拓迷雾中，请先【扩张小镇】提升阶段！`);
            return;
          }
          // 点击未解锁营地 -> 尝试解锁
          if (this.economy.gold >= station.config.unlockCost) {
            this.kitchen.unlockStation(station.id);
            this.showToast(`🎉 成功解锁【${station.config.name}】！新营地就绪！`);
          } else {
            this.showToast(`金币不足！解锁【${station.config.name}】需要 ${station.config.unlockCost.toLocaleString()} 🪙`);
          }
        } else {
          // 点击已解锁营地 -> 打开设施升级与菜品详情抽屉
          this.selectedStationId = station.id;
          this.openStationModal(station.id);

          if (this.tutorialStep === 1 && station.id === 'stew') {
            this.tutorialStep = 2; // 引导完成
          }
        }
        return;
      }
    }

    // 3. 检查点击森林休憩玩耍设施 (蹦床、帐篷狗窝、温泉水池、草坪皮球)
    for (const toy of PLAY_TOYS_CONFIG) {
      const dist = Math.hypot(toy.x - x, toy.y - y);
      if (dist <= (toy.radius || 36) + 14) {
        let targetDog = null;
        let lowestStamina = 101;
        for (const dog of this.dogs.values()) {
          if (dog.isOwned && !dog.assignedFacility) {
            if (dog.stamina < lowestStamina) {
              lowestStamina = dog.stamina;
              targetDog = dog;
            }
          }
        }
        if (!targetDog) {
          for (const dog of this.dogs.values()) {
            if (dog.isOwned) {
              targetDog = dog;
              break;
            }
          }
        }

        if (targetDog) {
          targetDog.interactWithToy(toy);
          this.economy.recordAction('play_toy');
          this.showToast(`🐾 ${targetDog.name} 正在开心地体验【${toy.name}】！体力恢复加速！✨`);
          if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
        } else {
          this.showToast(`快去招募狗狗来【${toy.name}】玩耍吧！`);
        }
        return;
      }
    }

    // 4. 检查点击狗狗 (在岗掌勺或草地漫步)
    for (const dog of this.dogs.values()) {
      if (!dog.isOwned) continue;
      const dist = Math.hypot(dog.x - x, (dog.y - 10) - y);
      if (dist <= 36) {
        const now = Date.now();
        const isDoubleClick = (this.lastDogClickedId === dog.id && (now - this.lastDogClickTime) < 700);
        this.lastDogClickTime = now;
        this.lastDogClickedId = dog.id;

        if (isDoubleClick) {
          this.selectedDogId = dog.id;
          this.openDogProfileModal(dog.id);
        } else {
          // 单击直接触发治愈抚摸互动：高高起跳、高速螺旋甩尾、吐舌萌化与好感度+5
          dog.noticePlayer(true);
        }
        return;
      }
    }
  }

  // =================== 模态弹窗管理 ===================

  closeAllModals() {
    const offlineModal = document.getElementById('offline-modal');
    if (offlineModal && !offlineModal.classList.contains('hidden')) {
      const golden = this.dogs.get('golden');
      if (golden && golden.waitingAtGate) {
        golden.welcomePlayerAtGate();
      }
    }
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.add('hidden');
    });
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  openTabModal(tab) {
    this.closeAllModals();
    const tabBtn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    if (tab === 'facilities') {
      this.renderFacilitiesList();
      this.openModal('facilities-modal');
    } else if (tab === 'dogs') {
      this.renderDogsRoster();
      this.openModal('dogs-modal');
    } else if (tab === 'wardrobe') {
      this.renderWardrobeUI();
      this.openModal('wardrobe-modal');
    } else if (tab === 'tasks') {
      this.renderTasksUI();
      this.openModal('tasks-modal');
    } else if (tab === 'market') {
      this.renderMarketUI();
      this.openModal('market-modal');
    } else if (tab === 'dogpedia') {
      this.renderDogpediaModal();
      this.openModal('dogpedia-modal');
    }
  }

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('hidden');
  }

  // --- 森林小镇开荒与扩张弹窗 ---
  showTownExpansionModal() {
    const ready = this.economy.checkTownExpansionReady();
    if (!ready) {
      const progress = this.economy.getTownExpansionProgress();
      this.showToast(`小镇开荒要求：${progress.text}`);
      return;
    }

    const currentStage = this.economy.getTownStageConfig();
    const nextStage = TOWN_EXPANSION_STAGES[this.economy.townStage]; // 下一阶段配置
    if (!nextStage) return;

    const modal = document.getElementById('town-expansion-modal');
    if (!modal) return;

    const iconEl = document.getElementById('expansion-stage-icon');
    const nameEl = document.getElementById('expansion-stage-name');
    const descEl = document.getElementById('expansion-stage-desc');
    const unlocksList = document.getElementById('expansion-unlocks-list');
    const rewardBonesEl = document.getElementById('expansion-reward-bones');

    if (iconEl) iconEl.innerText = nextStage.icon;
    if (nameEl) nameEl.innerText = nextStage.name;
    if (descEl) descEl.innerText = nextStage.desc;
    if (rewardBonesEl) rewardBonesEl.innerText = currentStage.rewardBones || 20;

    if (unlocksList) {
      let unlocksHtml = '';
      if (nextStage.unlockedFacilities) {
        const facNames = nextStage.unlockedFacilities.map(f => FACILITIES_CONFIG[f]?.name || f).join('、');
        unlocksHtml += `<div>🍳 开放新设施营地：<b>${facNames}</b></div>`;
      }
      if (nextStage.unlockedDogs) {
        const dogNames = nextStage.unlockedDogs.map(d => DOG_BREEDS_CONFIG[d]?.name || d).join('、');
        unlocksHtml += `<div>🐶 开启明星狗狗招募：<b>${dogNames}</b></div>`;
      }
      unlocksList.innerHTML = unlocksHtml;
    }

    modal.classList.remove('hidden');
  }

  confirmTownExpansion() {
    const res = this.economy.expandTown();
    if (res && res.success) {
      const modal = document.getElementById('town-expansion-modal');
      if (modal) modal.classList.add('hidden');

      if (window.wangwangAudio) {
        window.wangwangAudio.playUpgrade();
      }
      this.kitchen.triggerTownExpansionCelebration(res.newStage.name);
      this.showToast(`🌟 成功开拓新林地【${res.newStage.name}】！获得 🦴+${res.rewardBones} 骨头！`);
      this.updateHUD();
      this.saveGameData();
    }
  }

  // --- 设施升级弹窗 ---
  openStationModal(stationId) {
    const station = this.kitchen.stations[stationId];
    if (!station) return;

    this.selectedStationId = stationId;
    const modal = document.getElementById('station-detail-modal');
    const titleEl = document.getElementById('station-modal-title');
    const dogEl = document.getElementById('station-modal-dog');
    const dishesContainer = document.getElementById('station-modal-dishes');
    const btnUpgrade = document.getElementById('btn-station-upgrade');
    const autoCollectBadge = document.getElementById('station-modal-autocollect');

    titleEl.innerText = `${station.config.icon} ${station.config.name} (Lv.${station.level})`;

    // 当前掌勺厨师
    if (station.assignedDogId) {
      const dog = this.dogs.get(station.assignedDogId);
      const dogAvatar = dog.config.image
        ? `<img src="${dog.config.image}" style="width:24px;height:24px;object-fit:cover;border-radius:50%;vertical-align:middle;margin-right:4px;" alt="${dog.name}" />`
        : dog.config.avatar;
      dogEl.innerHTML = `当前主厨：<b>${dogAvatar} ${dog.name}</b>（好感度 Lv.${dog.affectionLevel}，技能增强+${(dog.affectionLevel - 1) * 10}%）`;
    } else {
      dogEl.innerHTML = `当前主厨：<span style="color:#E74C3C">无人掌勺 (点击指派)</span>`;
    }

    // 自动收取提示 (20级)
    if (station.level >= 20) {
      autoCollectBadge.innerHTML = `<span class="badge badge-success">⚡ 已解锁全自动收取金币</span>`;
    } else {
      autoCollectBadge.innerHTML = `<span class="badge badge-warning">Lv.20 解锁自动收取（当前还需升 ${20 - station.level} 级）</span>`;
    }

    // 菜品阶梯展示
    dishesContainer.innerHTML = '';
    station.config.dishes.forEach((d, idx) => {
      const isUnlocked = station.level >= d.minLevel;
      const dishDiv = document.createElement('div');
      dishDiv.className = `dish-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      dishDiv.innerHTML = `
        <div class="dish-icon">${d.icon}</div>
        <div class="dish-info">
          <div class="dish-name">${d.name} ${isUnlocked ? '✅' : `(Lv.${d.minLevel} 解锁)`}</div>
          <div class="dish-desc">${d.desc}</div>
          <div class="dish-stats">基础制作: ${d.baseTime}s | 基础售价: 🪙${d.basePrice}</div>
        </div>
      `;
      dishesContainer.appendChild(dishDiv);
    });

    // 升级按钮
    const cost = this.economy.getFacilityUpgradeCost(stationId, station.level);
    btnUpgrade.innerHTML = `升级到 Lv.${station.level + 1} (花费 🪙${cost.toLocaleString()})`;
    btnUpgrade.disabled = this.economy.gold < cost || station.level >= 50;
    btnUpgrade.onclick = () => {
      if (this.kitchen.upgradeStation(stationId)) {
        this.openStationModal(stationId); // 刷新
        this.updateHUD();
        this.saveGameData();
        this.showToast(`升级成功！制作提速 -4%，菜品售价提升！`);
      } else {
        this.showToast('金币不足！');
      }
    };

    modal.classList.remove('hidden');
  }

  // --- 设施全列表抽屉 ---
  renderFacilitiesList() {
    const list = document.getElementById('facilities-list-container');
    list.innerHTML = '';

    for (const station of Object.values(this.kitchen.stations)) {
      const cost = this.economy.getFacilityUpgradeCost(station.id, station.level);
      const card = document.createElement('div');
      card.className = `facility-item-card ${station.unlocked ? '' : 'locked'}`;

      let content = `
        <div class="fac-header">
          <span class="fac-title">${station.config.icon} ${station.config.name} ${station.unlocked ? `Lv.${station.level}` : '(未解锁)'}</span>
          ${station.unlocked ? `<span class="fac-tag">${station.level >= 20 ? '全自动 ⚡' : '制作中'}</span>` : ''}
        </div>
        <div class="fac-body">
      `;

      if (station.unlocked) {
        const dish = this.kitchen.getCurrentDish(station);
        const actualPrice = this.kitchen.calcActualDishPrice(station);
        const actualTime = this.kitchen.calcActualCookTime(station);
        content += `
          <div>当前制作：${dish.icon} ${dish.name} (🪙${actualPrice} / ${actualTime.toFixed(1)}s)</div>
          <div>在岗厨师：${station.assignedDogId ? this.dogs.get(station.assignedDogId).name : '无人掌勺'}</div>
          <button class="btn btn-primary btn-sm btn-upgrade-fac" data-id="${station.id}">
            升级 Lv.${station.level + 1} (🪙${cost.toLocaleString()})
          </button>
        `;
      } else {
        content += `
          <div>需要金币：🪙 ${station.config.unlockCost.toLocaleString()}</div>
          <button class="btn btn-success btn-sm btn-unlock-fac" data-id="${station.id}" ${this.economy.gold < station.config.unlockCost ? 'disabled' : ''}>
            立即解锁 (🪙${station.config.unlockCost.toLocaleString()})
          </button>
        `;
      }

      content += `</div>`;
      card.innerHTML = content;
      list.appendChild(card);
    }

    // 绑定升级/解锁事件
    list.querySelectorAll('.btn-upgrade-fac').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (this.kitchen.upgradeStation(id)) {
          this.renderFacilitiesList();
          this.updateHUD();
          this.saveGameData();
          this.showToast('升级成功！');
        } else {
          this.showToast('金币不足！');
        }
      };
    });

    list.querySelectorAll('.btn-unlock-fac').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (this.kitchen.unlockStation(id)) {
          this.renderFacilitiesList();
          this.updateHUD();
          this.saveGameData();
          this.showToast('设施解锁成功！新狗狗已就位！');
        } else {
          this.showToast('金币不足！');
        }
      };
    });
  }

  // --- 狗狗档案与互动弹窗 ---
  openDogProfileModal(dogId) {
    const dog = this.dogs.get(dogId);
    if (!dog) return;
    if (!dog.isOwned) {
      this.openTabModal('dogs');
      this.showToast(`尚未招募【${dog.name}】，请先在居民名册中招募入驻！`);
      return;
    }

    this.selectedDogId = dogId;
    const modal = document.getElementById('dog-profile-modal');
    const avatarContainer = document.getElementById('dog-modal-avatar');
    const portraitUrl = typeof dog.createPortraitDataURL === 'function' ? dog.createPortraitDataURL(68) : null;
    if (portraitUrl) {
      avatarContainer.innerHTML = `<img src="${portraitUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:16px;" alt="${dog.name}" />`;
    } else {
      avatarContainer.innerText = dog.avatar;
    }
    document.getElementById('dog-modal-name').innerText = `${dog.name} - ${dog.title}`;
    document.getElementById('dog-modal-desc').innerText = dog.config.personality;

    // 技能详情
    const skillMultiplier = dog.getSkillMultiplier();
    document.getElementById('dog-modal-skill').innerHTML = `
      <b>【${dog.config.skillName}】</b>: ${dog.config.skillDesc}
      <br><span style="color:#27AE60">当前好感度等级加成：+${Math.round((skillMultiplier - 1) * 100)}% 效果</span>
    `;

    // 好感度经验条
    const reqExp = dog.getRequiredExp();
    const percent = dog.affectionLevel >= 10 ? 100 : Math.min(100, Math.floor((dog.affectionExp / reqExp) * 100));
    document.getElementById('dog-modal-affection-level').innerText = `好感度等级 Lv.${dog.affectionLevel} / 10`;
    document.getElementById('dog-modal-exp-bar').style.width = `${percent}%`;
    document.getElementById('dog-modal-exp-text').innerText = dog.affectionLevel >= 10 ? 'MAX 满级' : `${Math.floor(dog.affectionExp)} / ${reqExp} EXP`;

    // 体力值状态更新
    const staminaTextEl = document.getElementById('dog-modal-stamina-text');
    const staminaBarEl = document.getElementById('dog-modal-stamina-bar');
    const staminaStateEl = document.getElementById('dog-modal-stamina-state');
    if (staminaTextEl) {
      staminaTextEl.innerText = `${Math.round(dog.stamina)} / 100`;
      staminaBarEl.style.width = `${Math.max(0, Math.min(100, dog.stamina))}%`;
      if (dog.isTired) {
        staminaStateEl.className = 'badge badge-warning';
        staminaStateEl.innerText = '😴 疲惫中 (去乐园休息)';
        staminaBarEl.style.background = 'linear-gradient(90deg, #F39C12, #E74C3C)';
      } else {
        staminaStateEl.className = 'badge badge-success';
        staminaStateEl.innerText = '⚡ 精力充沛';
        staminaBarEl.style.background = 'linear-gradient(90deg, #2ECC71, #27AE60)';
      }
    }

    // 岗位指派下拉
    const stationSelect = document.getElementById('dog-modal-station-select');
    stationSelect.innerHTML = `<option value="rest">在乐园玩耍与休息 💤 (+2.5体力/s)</option>`;
    for (const st of Object.values(this.kitchen.stations)) {
      if (st.unlocked) {
        const isCurrent = dog.assignedFacility === st.id;
        stationSelect.innerHTML += `<option value="${st.id}" ${isCurrent ? 'selected' : ''}>在岗掌勺：${st.config.icon} ${st.config.name} (-0.35体力/s)</option>`;
      }
    }

    stationSelect.onchange = (e) => {
      const val = e.target.value;
      if (val === 'rest') {
        this.kitchen.sendDogToRest(dog.id);
      } else {
        this.kitchen.assignDogToStation(dog.id, val);
      }
      this.updateHUD();
      this.saveGameData();
      this.openDogProfileModal(dog.id);
    };

    // 互动按钮：抚摸 (CD 30s)
    const btnPet = document.getElementById('btn-dog-pet');
    const now = Date.now();
    const remainPetCd = Math.max(0, Math.ceil((30 * 1000 - (now - dog.lastPetTime)) / 1000));
    if (remainPetCd > 0) {
      btnPet.innerHTML = `🐾 抚摸小狗 (+5好感, 需等${remainPetCd}秒)`;
      btnPet.disabled = true;
    } else {
      btnPet.innerHTML = `🐾 抚摸小狗 (+5好感, CD 30秒)`;
      btnPet.disabled = false;
    }
    btnPet.onclick = () => {
      if (dog.pet()) {
        this.economy.recordAction('pet_dog');
        this.updateHUD();
        this.saveGameData();
        this.openDogProfileModal(dog.id);
      } else {
        this.showToast('小狗刚刚被摸过，还在回味呢，等会儿再来吧~');
      }
    };

    // 互动按钮：喂食肉干 (+30 好感)
    const btnFeed = document.getElementById('btn-dog-feed');
    if (dog.affectionLevel >= 10) {
      btnFeed.innerHTML = `🥩 好感度已满级 (MAX)`;
      btnFeed.disabled = true;
    } else {
      btnFeed.innerHTML = `🥩 喂食肉干零食 (+30好感, 剩余: ${this.economy.snacks}包)`;
      btnFeed.disabled = this.economy.snacks <= 0;
    }
    btnFeed.onclick = () => {
      if (this.economy.spendSnack()) {
        dog.feedSnack();
        this.updateHUD();
        this.saveGameData();
        this.openDogProfileModal(dog.id);
      } else {
        this.showToast('背包里没有肉干零食啦，可以在集市购买哦！');
      }
    };

    modal.classList.remove('hidden');
  }

  // 取狗狗在岗文案。
  // 必须容错：assignedFacility 可能残留**旧版工位 key**（如 6 工坊时代的 'garden'），
  // 直接 stations[x].config 会在渲染名册时抛异常、整块名册渲染失败。
  // 遇到无效 key 时按「休息中」展示，并把该狗狗的岗位字段纠正为 null。
  getDutyLabel(dog) {
    const facId = dog.assignedFacility;
    if (!facId) return '乐园休息中 💤';
    const st = this.kitchen && this.kitchen.stations ? this.kitchen.stations[facId] : null;
    if (!st || !st.config) {
      // 顺手纠偏：清掉无效岗位，避免这个脏值继续影响渲染与存档
      dog.assignedFacility = null;
      return '乐园休息中 💤';
    }
    return `在岗：${st.config.name} 🍳`;
  }

  // 全量纠正狗狗岗位字段：把旧工位 key 迁移到新工位，无效 key 直接清空。
  // 在读完存档后调用，保证内存里不会存在「指向不存在工位」的脏数据。
  normalizeDogAssignments() {
    if (!this.kitchen || !this.kitchen.stations) return 0;
    let fixed = 0;
    for (const dog of this.dogs.values()) {
      const facId = dog.assignedFacility;
      if (!facId) continue;
      if (this.kitchen.stations[facId]) continue;

      const migrated = (typeof LEGACY_FACILITY_MIGRATION !== 'undefined' && LEGACY_FACILITY_MIGRATION[facId])
        ? LEGACY_FACILITY_MIGRATION[facId]
        : null;
      if (migrated && this.kitchen.stations[migrated]) {
        dog.assignedFacility = migrated;
      } else {
        dog.assignedFacility = null;
      }
      fixed++;
    }
    return fixed;
  }

  // --- 8大狗狗员工全名册 ---
  renderDogsRoster() {
    const container = document.getElementById('dogs-roster-container');
    container.innerHTML = '';

    for (const dog of this.dogs.values()) {
      const card = document.createElement('div');
      card.className = `dog-roster-card ${dog.isOwned ? 'owned' : 'unrecruited'}`;

      const portraitUrl = typeof dog.createPortraitDataURL === 'function' ? dog.createPortraitDataURL(46) : null;
      const avatarHtml = portraitUrl
        ? `<img src="${portraitUrl}" style="width:46px;height:46px;object-fit:contain;border-radius:12px;background:#FAF5EF;border:2px solid #F39C12;" alt="${dog.name}" />`
        : `<span class="dog-avatar-icon">${dog.avatar}</span>`;

      // GDD 2.1 稀有度标签 + 天赋被动
      const cardCfg = (typeof DOG_CARDS_CONFIG !== 'undefined') ? DOG_CARDS_CONFIG[dog.id] : null;
      const rc = (cardCfg && typeof RARITY_CONFIG !== 'undefined') ? RARITY_CONFIG[cardCfg.rarity] : null;
      const rarityHtml = rc
        ? `<span class="rarity-badge" style="background:${rc.color};">${rc.name} ${'★'.repeat(rc.stars)}</span>`
        : '';
      const passiveHtml = (cardCfg && cardCfg.passive)
        ? `<div class="dog-skill-txt" style="color:#8E44AD;"><b>【${cardCfg.passive.name}】</b>: ${cardCfg.passive.desc} <span style="color:#95A5A6;">(天赋·拥有即生效)</span></div>`
        : '';

      let html = `
        <div class="dog-roster-header">
          ${avatarHtml}
          <div>
            <div class="dog-roster-name">${dog.name} - ${dog.title} ${rarityHtml}</div>
            <div class="dog-roster-status">${dog.isOwned ? (this.getDutyLabel(dog)) : '待招募'}</div>
            ${dog.isOwned ? `<div style="font-size:11px; color:#27AE60; font-weight:600; margin-top:2px;">⚡ 体力: ${Math.round(dog.stamina)}% ${dog.isTired ? '😴疲惫需休息' : '✨'}</div>` : ''}
          </div>
          ${dog.isOwned ? `<span class="badge badge-pink">♥ Lv.${dog.affectionLevel}</span>` : ''}
        </div>
        <div class="dog-roster-body">
          <div class="dog-skill-txt"><b>【${dog.config.skillName}】</b>: ${dog.config.skillDesc}</div>
          ${passiveHtml}
      `;

      if (dog.isOwned) {
        html += `
          <button class="btn btn-secondary btn-sm btn-manage-dog" data-id="${dog.id}">互动 / 调配岗位</button>
        `;
      } else {
        html += `
          <button class="btn btn-success btn-sm btn-recruit-dog" data-id="${dog.id}" ${this.economy.gold < dog.config.recruitCost ? 'disabled' : ''}>
            招募入职 (🪙${dog.config.recruitCost.toLocaleString()})
          </button>
        `;
      }

      html += `</div>`;
      card.innerHTML = html;
      container.appendChild(card);
    }

    // 绑定事件
    container.querySelectorAll('.btn-manage-dog').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('dogs-modal').classList.add('hidden');
        this.openDogProfileModal(btn.dataset.id);
      };
    });

    container.querySelectorAll('.btn-recruit-dog').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const dog = this.dogs.get(id);
        if (this.economy.spendGold(dog.config.recruitCost)) {
          dog.isOwned = true;
          this.economy.recordAction('recruit_dog');
          if (dog.config && dog.config.targetFacility) {
            const st = this.kitchen.stations[dog.config.targetFacility];
            if (st && st.unlocked && !st.assignedDogId) {
              this.kitchen.assignDogToStation(dog.id, dog.config.targetFacility);
            }
          }
          if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
          this.renderDogsRoster();
          this.updateHUD();
          this.saveGameData();
          this.showToast(`🎉 欢迎【${dog.name}】加入汪汪小馆！全局技能已生效！`);
        } else {
          this.showToast('金币不足，还不能招募这只小狗哦！');
        }
      };
    });
  }

  // --- 衣橱与服装抽取 UI ---
  renderWardrobeUI() {
    const tabsContainer = document.getElementById('wardrobe-tabs');
    const itemsContainer = document.getElementById('wardrobe-items-container');
    const dogSelect = document.getElementById('wardrobe-dog-select');

    // 填充当前换装狗狗选择
    dogSelect.innerHTML = '';
    for (const d of this.dogs.values()) {
      if (d.isOwned) {
        dogSelect.innerHTML += `<option value="${d.id}" ${d.id === this.selectedDogId ? 'selected' : ''}>${d.avatar} ${d.name}</option>`;
      }
    }
    dogSelect.onchange = (e) => {
      this.selectedDogId = e.target.value;
      this.renderWardrobeUI();
    };

    // 分类展示 (帽子 / 衣服 / 配饰)
    let currentCategory = 'hat';
    tabsContainer.querySelectorAll('.sub-tab').forEach(btn => {
      if (btn.classList.contains('active')) currentCategory = btn.dataset.cat;
      btn.onclick = () => {
        tabsContainer.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderWardrobeItems(btn.dataset.cat);
      };
    });

    this.renderWardrobeItems(currentCategory);
  }

  renderWardrobeItems(cat) {
    const itemsContainer = document.getElementById('wardrobe-items-container');
    itemsContainer.innerHTML = '';

    const curDog = this.dogs.get(this.selectedDogId);

    // GDD 1.2 收集亮点：犬种 × 毛色 × 饰品 —— 毛色收集页签
    if (cat === 'coat') {
      this.renderCoatColorItems(itemsContainer, curDog);
      return;
    }

    const list = this.wardrobe.getOutfitsByCategory(cat);

    list.forEach(item => {
      const isOwned = this.wardrobe.isOwned(item.id);
      const isEquipped = curDog && curDog.equippedOutfits[item.type] && curDog.equippedOutfits[item.type].id === item.id;

      const card = document.createElement('div');
      card.className = `outfit-card ${isOwned ? 'owned' : 'unowned'} ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="outfit-icon">${item.icon}</div>
        <div class="outfit-name">${item.name}</div>
        <div class="outfit-desc">${item.desc}</div>
        <div class="outfit-footer">
          ${isEquipped ? `<button class="btn btn-sm btn-secondary btn-unequip-outfit" data-type="${item.type}">卸下</button>` :
            (isOwned ? `<button class="btn btn-sm btn-primary btn-equip" data-id="${item.id}">穿戴</button>` :
              `<button class="btn btn-sm btn-outline btn-buy-outfit" data-id="${item.id}">
                ${item.costType === 'gold' ? `🪙${item.cost}` : `🦴${item.cost}`} 购买
               </button>`
            )
          }
        </div>
      `;
      itemsContainer.appendChild(card);
    });

    // 卸下
    itemsContainer.querySelectorAll('.btn-unequip-outfit').forEach(btn => {
      btn.onclick = () => {
        this.wardrobe.unequipSlot(this.selectedDogId, btn.dataset.type);
        this.renderWardrobeItems(cat);
        this.updateHUD();
        this.saveGameData();
        this.showToast('已卸下服装！');
      };
    });

    // 穿戴
    itemsContainer.querySelectorAll('.btn-equip').forEach(btn => {
      btn.onclick = () => {
        this.wardrobe.equipOutfit(this.selectedDogId, btn.dataset.id);
        this.renderWardrobeItems(cat);
        this.updateHUD();
        this.saveGameData();
        this.showToast('换装成功！形象已实时更新！');
      };
    });

    // 购买
    itemsContainer.querySelectorAll('.btn-buy-outfit').forEach(btn => {
      btn.onclick = () => {
        const res = this.wardrobe.buyOutfit(btn.dataset.id);
        if (res.success) {
          this.renderWardrobeItems(cat);
          this.updateHUD();
          this.saveGameData();
          this.showToast(res.msg);
        } else {
          this.showToast(res.msg);
        }
      };
    });
  }

  // GDD 1.2 收集亮点：毛色收集与染色 UI
  renderCoatColorItems(container, curDog) {
    if (!curDog) return;
    const coats = this.wardrobe.getCoatColors(curDog.id);
    if (!coats || coats.length === 0) {
      container.innerHTML = '<div class="modal-tip">该犬种暂无可解锁毛色。</div>';
      return;
    }

    // 原生毛色还原卡
    const isNative = curDog.coatColorId === 'default';
    const nativeCard = document.createElement('div');
    nativeCard.className = `outfit-card owned ${isNative ? 'equipped' : ''}`;
    nativeCard.innerHTML = `
      <div class="outfit-icon" style="border-radius:50%; background:${curDog.config.colors.body}">🐾</div>
      <div class="outfit-name">原生毛色</div>
      <div class="outfit-desc">恢复【${curDog.name}】与生俱来的标准毛色。</div>
      <div class="outfit-footer">
        ${isNative ? '<span class="badge badge-success">使用中</span>' :
          '<button class="btn btn-sm btn-primary btn-equip-coat" data-id="default">恢复原生</button>'}
      </div>
    `;
    container.appendChild(nativeCard);

    coats.forEach(coat => {
      const isOwned = this.wardrobe.isCoatOwned(coat.id);
      const isEquipped = curDog.coatColorId === coat.id;

      const card = document.createElement('div');
      card.className = `outfit-card ${isOwned ? 'owned' : 'unowned'} ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="outfit-icon" style="border-radius:50%; background:${coat.colors.body}; border:2px solid ${coat.colors.innerEar}">🎨</div>
        <div class="outfit-name">${coat.name}</div>
        <div class="outfit-desc">${coat.desc}</div>
        <div class="outfit-footer">
          ${isEquipped ? '<span class="badge badge-success">使用中</span>' :
            (isOwned ? `<button class="btn btn-sm btn-primary btn-equip-coat" data-id="${coat.id}">换上</button>` :
              `<button class="btn btn-sm btn-outline btn-buy-coat" data-id="${coat.id}">
                ${coat.costType === 'gold' ? `🪙${coat.cost.toLocaleString()}` : `🦴${coat.cost}`} 解锁
               </button>`)}
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-equip-coat').forEach(btn => {
      btn.onclick = () => {
        const res = this.wardrobe.equipCoatColor(this.selectedDogId, btn.dataset.id);
        this.renderWardrobeItems('coat');
        this.updateHUD();
        this.saveGameData();
        this.showToast(res.msg);
      };
    });

    container.querySelectorAll('.btn-buy-coat').forEach(btn => {
      btn.onclick = () => {
        const res = this.wardrobe.buyCoatColor(this.selectedDogId, btn.dataset.id);
        this.showToast(res.msg);
        if (res.success) {
          this.wardrobe.equipCoatColor(this.selectedDogId, btn.dataset.id);
          this.renderWardrobeItems('coat');
          this.updateHUD();
          this.saveGameData();
        }
      };
    });
  }

  // --- 每日任务与成就 UI ---
  renderTasksUI() {
    this.economy.checkDailyReset();
    const dailyContainer = document.getElementById('daily-tasks-list');
    const achContainer = document.getElementById('achievements-list');

    dailyContainer.innerHTML = '';
    achContainer.innerHTML = '';

    // 每日任务
    DAILY_TASKS_CONFIG.forEach(task => {
      const cur = this.economy.dailyTaskProgress[task.action] || 0;
      const isClaimed = this.economy.claimedTasks.has(task.id);
      const isReady = cur >= task.target;

      const div = document.createElement('div');
      div.className = 'task-row';
      div.innerHTML = `
        <div class="task-info">
          <div class="task-name">${task.name} (${cur}/${task.target})</div>
          <div class="task-desc">${task.desc}</div>
        </div>
        <div class="task-reward">
          <span class="badge badge-bone">🦴 +${task.rewardBones}</span>
          <button class="btn btn-sm ${isClaimed ? 'btn-disabled' : (isReady ? 'btn-success' : 'btn-outline')} btn-claim-task" data-id="${task.id}" ${!isReady || isClaimed ? 'disabled' : ''}>
            ${isClaimed ? '已领取' : (isReady ? '领取奖励' : '进行中')}
          </button>
        </div>
      `;
      dailyContainer.appendChild(div);
    });

    dailyContainer.querySelectorAll('.btn-claim-task').forEach(btn => {
      btn.onclick = () => {
        if (this.economy.claimDailyTask(btn.dataset.id)) {
          this.renderTasksUI();
          this.updateHUD();
          this.saveGameData();
          this.showToast('骨头奖励已领取！🦴');
        }
      };
    });

    // 永久成就
    ACHIEVEMENTS_CONFIG.forEach(ach => {
      const isUnlocked = this.economy.unlockedAchievements.has(ach.id);
      const isClaimed = this.economy.claimedAchievements.has(ach.id);

      const div = document.createElement('div');
      div.className = 'task-row';
      div.innerHTML = `
        <div class="task-info">
          <div class="task-name">🏆 ${ach.name}</div>
          <div class="task-desc">${ach.desc}</div>
        </div>
        <div class="task-reward">
          <span class="badge badge-bone">🦴 +${ach.rewardBones}</span>
          <button class="btn btn-sm ${isClaimed ? 'btn-disabled' : (isUnlocked ? 'btn-success' : 'btn-outline')} btn-claim-ach" data-id="${ach.id}" ${!isUnlocked || isClaimed ? 'disabled' : ''}>
            ${isClaimed ? '已达成' : (isUnlocked ? '领取' : '未解锁')}
          </button>
        </div>
      `;
      achContainer.appendChild(div);
    });

    achContainer.querySelectorAll('.btn-claim-ach').forEach(btn => {
      btn.onclick = () => {
        if (this.economy.claimAchievement(btn.dataset.id)) {
          this.renderTasksUI();
          this.updateHUD();
          this.saveGameData();
          this.showToast('成就骨头奖励已领取！🦴✨');
        }
      };
    });
  }

  // --- 集市与盲盒抽卡 UI ---
  renderMarketUI() {
    const btnSingle = document.getElementById('btn-gacha-single');
    const btnTen = document.getElementById('btn-gacha-ten');
    const btnBuySnack = document.getElementById('btn-buy-snack');
    const btnAdSpeed = document.getElementById('btn-ad-speed');
    const btnAdBones = document.getElementById('btn-ad-bones');

    // GDD 2.1 犬种召唤（钻石抽卡）
    const btnDogSingle = document.getElementById('btn-dog-gacha-single');
    const btnDogTen = document.getElementById('btn-dog-gacha-ten');
    if (btnDogSingle) {
      btnDogSingle.onclick = () => this.runDogGacha(1);
    }
    if (btnDogTen) {
      btnDogTen.onclick = () => this.runDogGacha(10);
    }
    this.updateGachaPityUI();

    btnSingle.onclick = () => {
      const res = this.wardrobe.drawSingle();
      if (res.success) {
        this.showGachaResults(res.items);
        this.updateHUD();
        this.saveGameData();
      } else {
        this.showToast(res.msg);
      }
    };

    btnTen.onclick = () => {
      const res = this.wardrobe.drawTen();
      if (res.success) {
        this.showGachaResults(res.items);
        this.updateHUD();
        this.saveGameData();
      } else {
        this.showToast(res.msg);
      }
    };

    btnBuySnack.onclick = () => {
      if (this.economy.spendGold(1500)) {
        this.economy.addSnacks(1);
        this.updateHUD();
        this.saveGameData();
        this.showToast('成功购买 1 包肉干零食！可投喂狗狗增加好感度！🥩');
      } else {
        this.showToast('金币不足（需1500金币/包）！');
      }
    };

    btnAdSpeed.onclick = () => {
      btnAdSpeed.innerText = '正在观看宣传广告...';
      setTimeout(() => {
        btnAdSpeed.innerText = '⚡ 2分钟双倍制作加速 (免费观看)';
        this.economy.activateSpeedBoost(120);
        this.economy.recordAction('watch_ad');
        this.updateHUD();
        this.saveGameData();
        this.showToast('🚀 双倍制作速度已激活！持续 2 分钟！');
        if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
      }, 1000);
    };

    btnAdBones.onclick = () => {
      btnAdBones.innerText = '正在观看宣传广告...';
      setTimeout(() => {
        btnAdBones.innerText = '🦴 免费领取 5 骨头 (每日可看3次)';
        this.economy.addBones(5);
        this.economy.recordAction('watch_ad');
        this.updateHUD();
        this.saveGameData();
        this.showToast('🎁 获得 5 根骨头！🦴');
        if (window.wangwangAudio) window.wangwangAudio.playCoin();
      }, 1000);
    };
  }

  // 展示盲盒抽取动画与卡片
  showGachaResults(items) {
    const modal = document.getElementById('gacha-result-modal');
    const container = document.getElementById('gacha-cards-container');
    const titleEl = modal.querySelector('.modal-header h3');
    const footerBtn = modal.querySelector('.modal-footer .btn');
    if (titleEl) titleEl.innerText = '🎉 盲盒抽取结果';
    if (footerBtn) footerBtn.innerText = '太棒啦！收下服装';
    container.innerHTML = '';

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = `gacha-result-card ${it.isNew ? 'is-new' : 'is-dup'}`;
      card.innerHTML = `
        <div class="gacha-icon">${it.outfit.icon}</div>
        <div class="gacha-name">${it.outfit.name}</div>
        <div class="gacha-tag">${it.isNew ? '✨ NEW 新获得!' : '重复: 返还2骨头+1肉干'}</div>
      `;
      container.appendChild(card);
    });

    modal.classList.remove('hidden');
  }

  // ==================== GDD 2.1 犬种召唤 UI ====================

  // 执行一次犬种抽卡（count = 1 或 10）
  runDogGacha(count) {
    const res = this.gacha.draw(count);
    if (!res.success) {
      this.showToast(res.msg);
      return;
    }
    // 检查新招募的狗狗是否可直接填补已解锁且空缺的专属岗位
    for (const r of res.results) {
      if (r.isNew && r.entry.kind === 'dog') {
        const d = this.dogs.get(r.entry.id);
        if (d && d.config && d.config.targetFacility) {
          const st = this.kitchen.stations[d.config.targetFacility];
          if (st && st.unlocked && !st.assignedDogId) {
            this.kitchen.assignDogToStation(d.id, d.config.targetFacility);
          }
        }
      }
    }
    this.showDogGachaResults(res.results);
    this.renderDogsRoster();
    this.renderMarketUI();
    this.updateHUD();
    this.saveGameData();
  }

  // 刷新保底进度文案
  updateGachaPityUI() {
    const st = this.gacha.getPityStatus();
    if (!st) return;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = String(val);
    };
    set('gacha-pity-legendary', st.untilLegendary);
    set('gacha-pity-epic', st.untilEpic);
    set('gacha-pity-rare', st.untilRare);
    set('gacha-total-draws', st.totalDraws);
  }

  // 展示犬种抽取结果
  showDogGachaResults(results) {
    const modal = document.getElementById('gacha-result-modal');
    const container = document.getElementById('gacha-cards-container');
    const titleEl = modal.querySelector('.modal-header h3');
    const footerBtn = modal.querySelector('.modal-footer .btn');
    if (titleEl) titleEl.innerText = '🐶 犬种召唤结果';
    if (footerBtn) footerBtn.innerText = '太棒啦！收下狗狗';

    container.innerHTML = '';
    results.forEach(r => {
      const d = this.gacha.describe(r.entry);
      const card = document.createElement('div');
      card.className = `gacha-result-card ${r.isNew ? 'is-new' : 'is-dup'} ${d.rarity}`;
      card.innerHTML = `
        <div style="margin-bottom:4px;">
          <span class="rarity-badge" style="background:${d.rarityColor};">${d.rarityName} ${'★'.repeat(d.stars)}</span>
        </div>
        <div class="gacha-icon">${d.icon}</div>
        <div class="gacha-name">${d.name}</div>
        <div style="font-size:11px; color:#7F8C8D; margin-bottom:4px;">${d.passiveDesc || ''}</div>
        <div class="gacha-tag">${r.isNew
          ? (d.kind === 'variant' ? `✨ 传说降临！解锁毛色【${d.coatName}】` : '✨ NEW 新伙伴加入!')
          : `重复: 返还 💎${r.refundDiamonds}`}</div>
      `;
      container.appendChild(card);
    });

    modal.classList.remove('hidden');

    // 有传说出货时额外提示
    const gotLegendary = results.some(r => r.isNew && r.entry.rarity === 'legendary');
    if (gotLegendary) {
      const v = results.find(r => r.isNew && r.entry.rarity === 'legendary');
      const d = this.gacha.describe(v.entry);
      this.showToast(`🌈 传说变体【${d.name}】降临小馆！专属毛色已解锁！`);
      if (window.wangwangAudio) window.wangwangAudio.playUpgrade();
    }
  }

  // 提示条
  showToast(text) {
    let toast = document.getElementById('game-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'game-toast';
      const container = document.getElementById('mobile-frame') || document.body;
      if (container && container.appendChild) container.appendChild(toast);
    }
    if (toast) {
      toast.innerText = text;
      toast.className = 'toast show';
    }
    if (typeof clearTimeout !== 'undefined' && this._toastTimer) {
      clearTimeout(this._toastTimer);
    }
    if (typeof setTimeout !== 'undefined') {
      this._toastTimer = setTimeout(() => {
        if (toast) toast.className = 'toast';
        this._toastTimer = null;
      }, 2400);
    }
  }

  // =================== 主游戏循环 (60FPS) ===================
  gameLoop(time) {
    // 首帧 rAF 时间戳可能早于构造函数中记录的 performance.now()，需夹紧为非负
    const dt = Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000));
    this.lastTime = time;

    // 1. 更新后厨运作与出餐动画
    this.kitchen.update(dt);

    // 2. 更新自由狗狗在整片童话森林草地间的惬意漫步与游玩
    const loungeBounds = { minX: 80, maxX: 920, minY: 90, maxY: 480 };
    for (const dog of this.dogs.values()) {
      dog.update(dt, loungeBounds);
    }

    // 3. 画布清空与重绘
    this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);

    // 绘制童话森林与后厨营地场景
    this.kitchen.draw(this.ctx);

    // 绘制在草地漫步/休憩的自由狗狗
    for (const dog of this.dogs.values()) {
      if (dog.isOwned && !dog.assignedFacility) {
        dog.draw(this.ctx);
      }
    }

    // 绘制在各个圆形烹饪营地掌勺的狗狗厨师
    for (const dog of this.dogs.values()) {
      if (dog.isOwned && dog.assignedFacility) {
        dog.draw(this.ctx);
      }
    }

    // 在小狗与营地上方叠加渲染高真实度天气沉浸层 (飘落细雨丝、落雪、暖阳光斑)
    if (this.kitchen && this.kitchen.drawWeatherEffects) {
      this.kitchen.drawWeatherEffects(this.ctx);
    }

    // 绘制新手引导光标
    this.drawTutorial(this.ctx);

    // 4. 更新顶部 HUD 货币展示与加速倒计时
    this.updateHUD();

    // 5. 定时自动存档 (每15秒)
    this.saveIntervalTimer += dt;
    if (this.saveIntervalTimer >= 15) {
      this.saveIntervalTimer = 0;
      this.saveGameData();
    }

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // =================== 动态天气系统与微玩法 ===================
  cycleWeather(manual = true) {
    const order = ['sunny', 'rainy', 'snowy'];
    const nextIdx = (order.indexOf(this.currentWeather) + 1) % order.length;
    this.setWeather(order[nextIdx], manual);
  }

  setWeather(weatherKey, notify = false) {
    this.currentWeather = weatherKey;
    if (this.kitchen) {
      this.kitchen.setWeather(weatherKey);
    }
    const cfg = typeof WEATHER_CONFIG !== 'undefined' ? (WEATHER_CONFIG[weatherKey] || WEATHER_CONFIG.sunny) : { icon: '☀️', name: '晴空暖阳', desc: '阳光灿烂' };
    const pill = document.getElementById('hud-weather-pill');
    if (pill) {
      pill.innerHTML = `${cfg.icon} ${cfg.name}`;
      pill.title = `${cfg.name}：${cfg.desc} (点击切换天气)`;
    }
    if (notify) {
      this.showToast(`${cfg.icon} 天气变更为【${cfg.name}】！${cfg.desc}`);
      if (weatherKey === 'rainy' && window.wangwangAudio) {
        window.wangwangAudio.playRainDrop();
      } else if (window.wangwangAudio) {
        window.wangwangAudio.playSparkle();
      }
    }
  }

  // 投掷高动能飞盘
  throwFrisbee() {
    let candidateDog = null;
    const golden = this.dogs.get('golden');
    if (golden && golden.isOwned && golden.routineState !== 'chase_frisbee' && golden.routineState !== 'bring_back_frisbee') {
      candidateDog = golden;
    } else {
      for (const dog of this.dogs.values()) {
        if (dog.isOwned && dog.routineState !== 'chase_frisbee' && dog.routineState !== 'bring_back_frisbee') {
          candidateDog = dog;
          break;
        }
      }
    }

    if (!candidateDog) {
      this.showToast('小狗们都在忙着追逐飞盘或烹饪，稍等片刻再扔吧！');
      return;
    }

    const frisbee = this.kitchen.throwFrisbee();
    candidateDog.fetchFrisbee(frisbee);
    this.showToast(`🥏 飞盘划出优美弧线！【${candidateDog.name}】兴奋飞奔扑咬！✨`);
    if (window.wangwangAudio) window.wangwangAudio.playFrisbeeWhoosh();
    this.economy.recordAction('play_frisbee');
  }

  // 木栅门守候与迎门仪式
  triggerGateWelcome() {
    let welcomingDog = this.dogs.get('golden');
    if (!welcomingDog || !welcomingDog.isOwned) {
      for (const dog of this.dogs.values()) {
        if (dog.isOwned) {
          welcomingDog = dog;
          break;
        }
      }
    }
    if (welcomingDog) {
      welcomingDog.welcomePlayerAtGate();
      if (window.wangwangAudio) window.wangwangAudio.playGateWelcome();
      const quote = (typeof DOGPEDIA_CONFIG !== 'undefined' && DOGPEDIA_CONFIG[welcomingDog.id])
        ? DOGPEDIA_CONFIG[welcomingDog.id].welcomeQuote
        : "“汪！推门声一响，我就知道是世界上最喜欢的主人回来啦！”";
      this.showToast(`🏡 ${welcomingDog.name} 欢快摇尾迎接：${quote}`);
    }
  }

  // 国民犬种图鉴与5大料理标签切换
  setupDogpediaTabs() {
    const btnDogs = document.getElementById('btn-tab-dogpedia-dogs');
    const btnCuisines = document.getElementById('btn-tab-dogpedia-cuisines');
    const contentDogs = document.getElementById('tab-dogpedia-dogs-content');
    const contentCuisines = document.getElementById('tab-dogpedia-cuisines-content');

    if (btnDogs && btnCuisines && contentDogs && contentCuisines) {
      btnDogs.onclick = () => {
        btnDogs.className = 'btn btn-primary btn-sm';
        btnCuisines.className = 'btn btn-outline btn-sm';
        contentDogs.classList.remove('hidden');
        contentCuisines.classList.add('hidden');
      };
      btnCuisines.onclick = () => {
        btnCuisines.className = 'btn btn-primary btn-sm';
        btnDogs.className = 'btn btn-outline btn-sm';
        contentCuisines.classList.remove('hidden');
        contentDogs.classList.add('hidden');
      };
    }
  }

  // 渲染国民犬种图鉴 (8大国民犬种 + 5大专属料理)
  renderDogpediaModal() {
    // 1. 渲染 8 大国民犬种
    const dogListContainer = document.getElementById('dogpedia-list-container');
    if (dogListContainer && typeof DOGPEDIA_CONFIG !== 'undefined') {
      dogListContainer.innerHTML = '';
      for (const [id, pedia] of Object.entries(DOGPEDIA_CONFIG)) {
        const dog = this.dogs.get(id);
        const breedCfg = typeof DOG_BREEDS_CONFIG !== 'undefined' ? DOG_BREEDS_CONFIG[id] : null;
        const isOwned = dog ? dog.isOwned : false;

        const card = document.createElement('div');
        card.className = `dogpedia-item ${isOwned ? 'owned' : ''}`;

        // 头像改用与场景完全同款的矢量小狗（复用 DogChef 的绘制管线生成）
        const portraitUrl = (dog && typeof dog.createPortraitDataURL === 'function')
          ? dog.createPortraitDataURL(46)
          : null;
        const avatarHtml = portraitUrl
          ? `<img src="${portraitUrl}" style="width:100%;height:100%;object-fit:contain;" alt="${pedia.name}"/>`
          : `<span style="font-size:24px;">${breedCfg ? (breedCfg.avatar || '🐕') : '🐕'}</span>`;

        card.innerHTML = `
          <div class="dogpedia-header-row">
            <div class="dogpedia-avatar">${avatarHtml}</div>
            <div class="dogpedia-titles">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="dogpedia-name">${pedia.name}</span>
                <span class="dogpedia-badge">${isOwned ? '已入驻 🐾' : '待邂逅 🔒'}</span>
              </div>
              <div style="font-size:11px; color:#E67E22; font-weight:700;">${pedia.alias || ''} · ${pedia.badge || ''}</div>
            </div>
          </div>
          <div class="dogpedia-meta-line"><b>🌍 原产地:</b> ${pedia.origin}</div>
          <div class="dogpedia-meta-line"><b>🎨 毛色库:</b> ${pedia.colors ? pedia.colors.join('、') : ''}</div>
          <div class="dogpedia-meta-line"><b>🐾 性格特质:</b> ${pedia.temperament || ''}</div>
          <div class="dogpedia-meta-line"><b>🍲 喜好料理:</b> <span style="color:#D35400; font-weight:bold;">${pedia.favoriteDish || ''}</span></div>
          <div class="dogpedia-meta-line"><b>✨ 专属小动作:</b> ${pedia.quirk || ''}</div>
          <div class="dogpedia-quote-box">
            <b>迎门语:</b> “${pedia.welcomeQuote}”
          </div>
        `;
        dogListContainer.appendChild(card);
      }
    }

    // 2. 渲染 5 大狗狗专属料理
    const cuisinesContainer = document.getElementById('dogpedia-cuisines-container');
    if (cuisinesContainer && typeof DOG_CUISINES_CONFIG !== 'undefined') {
      cuisinesContainer.innerHTML = '';
      for (const [id, cuisine] of Object.entries(DOG_CUISINES_CONFIG)) {
        const box = document.createElement('div');
        box.className = 'cuisine-box';

        let dishesHtml = '';
        for (const dish of cuisine.dishes) {
          dishesHtml += `
            <div class="cuisine-dish-card">
              <span class="dish-icon">${dish.icon}</span>
              <span class="dish-name">${dish.name}</span>
              <span class="dish-price">🪙 ${(dish.basePrice || dish.price || 0).toLocaleString()}</span>
              <span style="font-size:9px; color:#95A5A6; line-height:1.2;">${dish.ingredients}</span>
            </div>
          `;
        }

        const recipeLvl = this.economy.getRecipeLevel(id);
        const maxLvl = RECIPE_UPGRADE_CONFIG.maxLevel;
        const recipeCost = this.economy.getRecipeUpgradeCost(id);
        const cuisineUnlocked = this.economy.isRecipeCuisineUnlocked(id);
        const priceBonusPct = Math.round((recipeLvl - 1) * RECIPE_UPGRADE_CONFIG.priceBonusPerLevel * 100);
        const isMax = recipeLvl >= maxLvl;
        const canAfford = this.economy.gold >= recipeCost;

        let recipeBtnHtml = '';
        if (!cuisineUnlocked) {
          recipeBtnHtml = `<button class="btn btn-sm btn-outline" disabled>小镇 Lv.${cuisine.stage} 解锁食谱</button>`;
        } else if (isMax) {
          recipeBtnHtml = `<span class="badge badge-success">食谱已满级 Lv.${maxLvl} 👑</span>`;
        } else {
          recipeBtnHtml = `<button class="btn btn-sm ${canAfford ? 'btn-primary' : 'btn-disabled'} btn-upgrade-recipe" data-cuisine="${id}">
            ⬆️ 升级食谱 Lv.${recipeLvl}→${recipeLvl + 1} (🪙${recipeCost.toLocaleString()})
          </button>`;
        }

        box.innerHTML = `
          <div class="cuisine-header">
            <div class="cuisine-title-group">
              <span class="cuisine-icon">${cuisine.icon}</span>
              <span class="cuisine-name">${cuisine.name}</span>
              <span class="cuisine-tag">${cuisine.tag}</span>
            </div>
            <span style="font-size:11px; color:#27AE60; font-weight:700;">${FACILITIES_CONFIG[cuisine.facilityId] ? FACILITIES_CONFIG[cuisine.facilityId].icon + ' ' + FACILITIES_CONFIG[cuisine.facilityId].name : ''} · 小镇 Lv.${cuisine.stage} 解锁</span>
          </div>
          <div class="cuisine-desc">${cuisine.desc}</div>
          <div class="recipe-row" style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:#FFF8E1; border:1.5px solid #FFE082; border-radius:10px; padding:8px 10px; margin:8px 0;">
            <div style="font-size:11px; color:#8D6E63; line-height:1.45;">
              <b style="color:#E65100;">📜 食谱等级 Lv.${recipeLvl}/${maxLvl}</b><br>
              所属设施售价加成 <b style="color:#D35400;">+${priceBonusPct}%</b>
            </div>
            ${recipeBtnHtml}
          </div>
          <div class="cuisine-dishes-row">
            ${dishesHtml}
          </div>
        `;
        cuisinesContainer.appendChild(box);
      }

      // 绑定食谱升级按钮
      cuisinesContainer.querySelectorAll('.btn-upgrade-recipe').forEach(btn => {
        btn.onclick = () => {
          const res = this.economy.upgradeRecipe(btn.dataset.cuisine);
          this.showToast(res.msg);
          if (res.success) {
            this.renderDogpediaModal();
            this.updateHUD();
          }
        };
      });
    }
  }

  // 绘制新手引导提示 (手指指向与高亮提示胶囊)
  drawTutorial(ctx) {
    if (this.tutorialStep === 0) {
      // 引导收取底部出餐木托盘上的第一道美味佳肴
      const plate = this.kitchen.servingTray ? this.kitchen.servingTray.plates[0] : null;
      if (plate) {
        const fingerY = plate.y - 38 + Math.sin(Date.now() / 150) * 6;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '26px sans-serif';
        ctx.fillText('👇', plate.x, fingerY);

        const tipText = '第一步：点击底部木托盘出餐，收取金币！';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        const tw = ctx.measureText(tipText).width;
        const tipY = fingerY - 20;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.92)';
        ctx.beginPath();
        ctx.roundRect(plate.x + 80 - tw / 2 - 10, tipY - 12, tw + 20, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tipText, plate.x + 80, tipY);
        ctx.restore();
      }
    } else if (this.tutorialStep === 1) {
      // 引导升级鲜美炖汤锅营地
      const stewpot = this.kitchen.stations.stew;
      if (stewpot) {
        const fingerY = stewpot.y - stewpot.radius - 22 + Math.sin(Date.now() / 150) * 6;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '26px sans-serif';
        ctx.fillText('👇', stewpot.x, fingerY);

        const tipText = '第二步：点击鲜美炖汤锅升级，文火慢熬出好汤！';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        const tw = ctx.measureText(tipText).width;
        const tipY = fingerY - 20;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.92)';
        ctx.beginPath();
        ctx.roundRect(stewpot.x + 80 - tw / 2 - 10, tipY - 12, tw + 20, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tipText, stewpot.x + 80, tipY);
        ctx.restore();
      }
    }
  }

  // 更新顶部 HUD 与核心循环指引条
  updateHUD() {
    const goldEl = document.getElementById('hud-gold');
    const boneEl = document.getElementById('hud-bones');
    const diamondEl = document.getElementById('hud-diamonds');
    const rateEl = document.getElementById('hud-gps');
    const boostEl = document.getElementById('hud-boost-timer');

    if (goldEl) goldEl.innerText = this.economy.gold.toLocaleString();
    if (boneEl) boneEl.innerText = this.economy.bones.toLocaleString();
    if (diamondEl) diamondEl.innerText = this.economy.diamonds.toLocaleString();
    if (rateEl) rateEl.innerText = `${this.economy.calcGoldPerSecond()} 🪙/秒`;

    this.updateGachaPityUI();

    if (boostEl) {
      if (this.economy.isSpeedBoostActive()) {
        const remain = Math.max(0, Math.ceil((this.economy.speedBoostEndTime - Date.now()) / 1000));
        boostEl.innerText = `⚡ 2倍加速中 (${remain}s)`;
        boostEl.classList.remove('hidden');
      } else {
        boostEl.classList.add('hidden');
      }
    }

    // 更新核心循环与小镇阶段 HUD
    const townCfg = this.economy.getTownStageConfig();
    const stageIconEl = document.getElementById('town-stage-icon');
    const stageNameEl = document.getElementById('town-stage-name');
    const objTextEl = document.getElementById('loop-objective-text');
    const btnExpand = document.getElementById('btn-town-expand');
    const expandBadge = document.getElementById('town-expand-badge');

    if (stageIconEl) stageIconEl.innerText = townCfg.icon;
    if (stageNameEl) stageNameEl.innerText = townCfg.title;

    const currentObjective = this.economy.getCurrentLoopObjective();
    if (objTextEl) {
      objTextEl.innerText = `${currentObjective.icon} ${currentObjective.text}`;
    }

    const isExpandReady = this.economy.checkTownExpansionReady();
    if (btnExpand) {
      if (isExpandReady) {
        btnExpand.classList.remove('locked');
        btnExpand.classList.add('ready');
      } else {
        btnExpand.classList.remove('ready');
        btnExpand.classList.add('locked');
      }
    }
    if (expandBadge) {
      if (isExpandReady) {
        expandBadge.classList.remove('hidden');
      } else {
        expandBadge.classList.add('hidden');
      }
    }
  }

  // =================== 存档持久化 (localStorage) ===================
  saveGameData() {
    try {
      const stationsData = {};
      for (const [k, st] of Object.entries(this.kitchen.stations)) {
        stationsData[k] = {
          unlocked: st.unlocked,
          level: st.level,
          assignedDogId: st.assignedDogId
        };
      }

      const dogsData = {};
      for (const [id, dog] of this.dogs.entries()) {
        dogsData[id] = {
          isOwned: dog.isOwned,
          affectionLevel: dog.affectionLevel,
          affectionExp: dog.affectionExp,
          stamina: dog.stamina,
          equippedOutfits: {
            hat: dog.equippedOutfits.hat ? dog.equippedOutfits.hat.id : null,
            cloth: dog.equippedOutfits.cloth ? dog.equippedOutfits.cloth.id : null,
            acc: dog.equippedOutfits.acc ? dog.equippedOutfits.acc.id : null
          },
          wornOutfitIds: Array.from(dog.wornOutfitIds),
          coatColorId: dog.coatColorId || 'default'
        };
      }

      const saveData = {
        version: '2.1',
        townStage: this.economy.townStage,
        gold: this.economy.gold,
        bones: this.economy.bones,
        snacks: this.economy.snacks,
        // GDD 2.3 钻石（稀缺货币）
        diamonds: this.economy.diamonds,
        totalGoldEarned: this.economy.totalGoldEarned,
        lastSavedTimestamp: Date.now(),
        tutorialStep: this.tutorialStep,
        stations: stationsData,
        dogs: dogsData,
        ownedOutfits: Array.from(this.wardrobe.ownedOutfitIds),
        ownedCoatIds: Array.from(this.wardrobe.ownedCoatIds),
        recipeLevels: this.economy.recipeLevels,
        dailyTaskProgress: this.economy.dailyTaskProgress,
        claimedTasks: Array.from(this.economy.claimedTasks),
        lastDailyResetDate: this.economy.lastDailyResetDate,
        unlockedAchievements: Array.from(this.economy.unlockedAchievements),
        claimedAchievements: Array.from(this.economy.claimedAchievements),
        // GDD 2.1 抽卡状态：传说变体拥有 + 保底计数 + 统计
        ownedVariantIds: Array.from(this.economy.ownedVariantIds),
        gachaPity: this.economy.gachaPity,
        gachaStats: this.economy.gachaStats,
        // 音频与加速状态持久化
        audioMuted: window.wangwangAudio ? !!window.wangwangAudio.muted : false,
        speedBoostEndTime: this.economy.speedBoostEndTime || 0
      };

      localStorage.setItem('wangwang_diner_save', JSON.stringify(saveData));
    } catch (e) {
      console.warn('Failed to save game data:', e);
    }
  }

  loadSaveData() {
    try {
      const raw = localStorage.getItem('wangwang_diner_save');
      if (!raw) return;
      const data = JSON.parse(raw);

      this.economy.gold = data.gold || 100;
      this.economy.bones = data.bones || 20;
      this.economy.snacks = data.snacks !== undefined ? data.snacks : 3;
      // 老存档没有 diamonds 字段 → 回退到开局赠送值，不会因为缺字段变成 0
      this.economy.diamonds = (data.diamonds !== undefined && data.diamonds !== null) ? data.diamonds : 60;
      this.economy.totalGoldEarned = data.totalGoldEarned || this.economy.gold;
      this.economy.lastSavedTimestamp = data.lastSavedTimestamp || Date.now();
      this.tutorialStep = data.tutorialStep !== undefined ? data.tutorialStep : 0;
      this.economy.townStage = data.townStage || 1;

      // 恢复音频静音状态与制作加速
      if (data.audioMuted !== undefined && window.wangwangAudio) {
        window.wangwangAudio.muted = !!data.audioMuted;
        const btnAudio = document.getElementById('btn-audio-toggle');
        if (btnAudio) {
          btnAudio.innerText = window.wangwangAudio.muted ? '🔇' : '🎵';
        }
      }
      if (data.speedBoostEndTime && data.speedBoostEndTime > Date.now()) {
        this.economy.speedBoostEndTime = data.speedBoostEndTime;
      }

      // 恢复每日任务重置日期并立即执行跨天检测
      if (data.lastDailyResetDate) {
        this.economy.lastDailyResetDate = data.lastDailyResetDate;
      }
      this.economy.checkDailyReset();

      // GDD 2.1 抽卡状态恢复（老存档缺字段时保持默认，不会清空）
      if (Array.isArray(data.ownedVariantIds)) {
        this.economy.ownedVariantIds = new Set(data.ownedVariantIds);
      }
      if (data.gachaPity && typeof data.gachaPity === 'object') {
        Object.assign(this.economy.gachaPity, data.gachaPity);
      }
      if (data.gachaStats && typeof data.gachaStats === 'object') {
        Object.assign(this.economy.gachaStats, data.gachaStats);
        if (!this.economy.gachaStats.byRarity) {
          this.economy.gachaStats.byRarity = { common: 0, rare: 0, epic: 0, legendary: 0 };
        }
      }

      // 恢复设施并把老存档的 6 工坊 key 迁移到新 5 大料理工位
      if (data.stations) {
        const migrated = {};
        for (const [oldKey, sData] of Object.entries(data.stations)) {
          const newKey = (typeof LEGACY_FACILITY_MIGRATION !== 'undefined' && LEGACY_FACILITY_MIGRATION[oldKey])
            ? LEGACY_FACILITY_MIGRATION[oldKey]
            : oldKey;
          if (!this.kitchen.stations[newKey]) continue;
          if (!migrated[newKey]) {
            migrated[newKey] = {
              unlocked: !!sData.unlocked,
              level: sData.level || 1,
              assignedDogId: sData.assignedDogId || null
            };
          } else {
            // 多个旧工位合并到同一新料理工位：任一解锁即解锁，等级取最高
            migrated[newKey].unlocked = migrated[newKey].unlocked || !!sData.unlocked;
            migrated[newKey].level = Math.max(migrated[newKey].level, sData.level || 1);
            migrated[newKey].assignedDogId = migrated[newKey].assignedDogId || sData.assignedDogId || null;
          }
        }
        for (const [k, sData] of Object.entries(migrated)) {
          this.kitchen.stations[k].unlocked = sData.unlocked;
          this.kitchen.stations[k].level = sData.level;
          this.kitchen.stations[k].assignedDogId = sData.assignedDogId;
        }
      }

      // 恢复服装
      if (data.ownedOutfits) {
        this.wardrobe.ownedOutfitIds = new Set(data.ownedOutfits);
      }

      // 恢复毛色收集与食谱等级 (GDD 1.2 / 1.3)
      if (data.ownedCoatIds) {
        this.wardrobe.ownedCoatIds = new Set(data.ownedCoatIds);
      }
      if (data.recipeLevels) {
        this.economy.recipeLevels = Object.assign(
          { stew: 1, bbq: 1, bakery: 1, hotpot: 1, jerky: 1 },
          data.recipeLevels
        );
      }

      // 恢复狗狗
      if (data.dogs) {
        for (const [id, dData] of Object.entries(data.dogs)) {
          const dog = this.dogs.get(id);
          if (dog) {
            dog.isOwned = dData.isOwned;
            dog.affectionLevel = dData.affectionLevel || 1;
            dog.affectionExp = dData.affectionExp || 0;
            if (dData.stamina !== undefined) dog.stamina = dData.stamina;
            if (dData.wornOutfitIds) dog.wornOutfitIds = new Set(dData.wornOutfitIds);

            // 毛色还原 (GDD 1.2 收集亮点)
            if (dData.coatColorId && dData.coatColorId !== 'default') {
              const coat = this.wardrobe.findCoatColor(dData.coatColorId);
              if (coat) dog.setCoatColor(dData.coatColorId, coat);
            }

            // 穿戴服装还原
            if (dData.equippedOutfits) {
              for (const [slot, outId] of Object.entries(dData.equippedOutfits)) {
                if (outId) {
                  const outObj = OUTFITS_CONFIG.find(o => o.id === outId);
                  if (outObj) dog.equippedOutfits[slot] = outObj;
                }
              }
            }
          }
        }
      }

      // 恢复任务与成就
      if (data.dailyTaskProgress) this.economy.dailyTaskProgress = data.dailyTaskProgress;
      if (data.claimedTasks) this.economy.claimedTasks = new Set(data.claimedTasks);
      if (data.unlockedAchievements) this.economy.unlockedAchievements = new Set(data.unlockedAchievements);
      if (data.claimedAchievements) this.economy.claimedAchievements = new Set(data.claimedAchievements);

      // 迁移与纠偏：确保金毛、柴犬、萨摩耶、哈士奇等小狗正确定位在各自职业岗位上
      const golden = this.dogs.get('golden');
      const shiba = this.dogs.get('shiba');
      const samoyed = this.dogs.get('samoyed');
      const husky = this.dogs.get('husky');
      const corgi = this.dogs.get('corgi');
      const borderCollie = this.dogs.get('border_collie');

      const stewpot = this.kitchen.stations.stew;
      const bbqgrill = this.kitchen.stations.bbq;
      const bakehouse = this.kitchen.stations.bake;
      const hotpotbar = this.kitchen.stations.hotpot;
      const jerkyhouse = this.kitchen.stations.jerky;

      // 金毛炖汤主厨必保拥有，且初始坐镇鲜美炖汤锅
      if (golden) {
        golden.isOwned = true;
      }
      if (stewpot) {
        stewpot.unlocked = true;
        stewpot.assignedDogId = 'golden';
        if (golden) {
          golden.assignedFacility = 'stew';
          this.kitchen.assignDogToStation(golden.id, 'stew');
        }
      }

      // 柴犬 · 慢烤烧烤架
      if (shiba && bbqgrill) {
        if (bbqgrill.unlocked && shiba.isOwned) {
          bbqgrill.assignedDogId = 'shiba';
          shiba.assignedFacility = 'bbq';
          this.kitchen.assignDogToStation(shiba.id, 'bbq');
        } else {
          // 工位未解锁、或狗狗尚未招募 —— 两种情况都要清掉在岗标记。
          // 早期实现只在「工位未解锁」时清理，于是「工位已解锁但狗还没招募」这条路径
          // 谁都不走，会残留上一次的 assignedFacility，出现「人在休息区却显示在岗」。
          bbqgrill.assignedDogId = null;
          shiba.assignedFacility = null;
        }
      }

      // 萨摩耶 · 甜品烘焙屋
      if (samoyed && bakehouse) {
        if (bakehouse.unlocked && samoyed.isOwned) {
          bakehouse.assignedDogId = 'samoyed';
          samoyed.assignedFacility = 'bake';
          this.kitchen.assignDogToStation(samoyed.id, 'bake');
        } else {
          bakehouse.assignedDogId = null;
          samoyed.assignedFacility = null;
        }
      }

      // 哈士奇 · 肉干风干窖
      if (husky && jerkyhouse) {
        if (jerkyhouse.unlocked && husky.isOwned) {
          jerkyhouse.assignedDogId = 'husky';
          husky.assignedFacility = 'jerky';
          this.kitchen.assignDogToStation(husky.id, 'jerky');
        } else {
          jerkyhouse.assignedDogId = null;
          husky.assignedFacility = null;
        }
      }

      // 边牧 · 狗狗火锅台
      if (borderCollie && hotpotbar) {
        if (hotpotbar.unlocked && borderCollie.isOwned) {
          hotpotbar.assignedDogId = 'border_collie';
          borderCollie.assignedFacility = 'hotpot';
          this.kitchen.assignDogToStation(borderCollie.id, 'hotpot');
        } else {
          hotpotbar.assignedDogId = null;
          borderCollie.assignedFacility = null;
        }
      }

      // 柯基为全局跑堂（自动收取），不绑定单一工位
      if (corgi) {
        corgi.assignedFacility = null;
      }

    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
  }
}

// 页面加载完成后自动启动
window.addEventListener('DOMContentLoaded', () => {
  window.game = new WangwangGame();
});
