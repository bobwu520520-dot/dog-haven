// ============================================================================
// ⚠️ 已废弃 · 未被任何文件引用（历史遗留，保留仅供查阅，请勿删除前先确认）
// ----------------------------------------------------------------------------
// 本文件实现的是早期「狗狗小屋」版本的家具布置系统（FurnitureManager：
// 8 件家具、自由布置模式与专属渲染）。
// 当前线上游戏已改为「阳光公园 + 5 大料理工位」经营形态，家具布置玩法未接入。
// index.html 未引入本文件，全局也搜不到 FurnitureManager 的任何调用点。
// 如需复用其中的家具元素，请先阅读 docs/第1章实现核对报告.md 的遗留事项章节。
// ============================================================================

// 狗狗小屋 (Doggy House) - 家具管理、自由布置模式与专属渲染 (8件家具)
class FurnitureManager {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.warehouse = []; // 未摆放的仓库家具

    // 布置模式状态
    this.isLayoutMode = false;
    this.selectedItem = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.dragValid = true;

    this.initDefaultFurniture();
  }

  initDefaultFurniture() {
    // 默认赠送基础初始家具
    this.placeFurniture('dog_bed', CONFIG.FURNITURE.dog_bed.defaultPos.x, CONFIG.FURNITURE.dog_bed.defaultPos.y);
    this.placeFurniture('ball', CONFIG.FURNITURE.ball.defaultPos.x, CONFIG.FURNITURE.ball.defaultPos.y);
    this.placeFurniture('food_bowl', CONFIG.FURNITURE.food_bowl.defaultPos.x, CONFIG.FURNITURE.food_bowl.defaultPos.y);
    this.placeFurniture('flower_bed', CONFIG.FURNITURE.flower_bed.defaultPos.x, CONFIG.FURNITURE.flower_bed.defaultPos.y);
  }

  placeFurniture(id, x, y) {
    const proto = CONFIG.FURNITURE[id];
    if (!proto) return null;

    // 区域合法性校验
    const areaId = this.game.scene.getAreaAt(x);
    if (!proto.allowedAreas.includes(areaId)) {
      x = proto.defaultPos.x;
      y = proto.defaultPos.y;
    }

    const existing = this.items.find(item => item.id === id);
    if (existing) {
      existing.x = x;
      existing.y = y;
      return existing;
    }

    const item = {
      id: proto.id,
      name: proto.name,
      icon: proto.icon,
      allowedAreas: proto.allowedAreas,
      x: x,
      y: y,
      w: proto.size.w,
      h: proto.size.h,
      effect: proto.effect,
      ballBounce: 0
    };
    this.items.push(item);
    return item;
  }

  hasFurniture(id) {
    return this.items.some(it => it.id === id);
  }

  getFurniture(id) {
    return this.items.find(it => it.id === id);
  }

  // 校验当前位置区域是否合法
  checkAreaValid(item, x) {
    const areaId = this.game.scene.getAreaAt(x);
    return item.allowedAreas.includes(areaId);
  }

  update(dt, time) {
    const ball = this.items.find(it => it.id === 'ball');
    if (ball && ball.ballBounce > 0) {
      ball.ballBounce -= dt * 4;
      if (ball.ballBounce < 0) ball.ballBounce = 0;
    }
  }

  render(ctx, time) {
    // 按 Y 轴排序自然纵深遮挡
    const sorted = [...this.items].sort((a, b) => a.y - b.y);

    for (const item of sorted) {
      ctx.save();
      ctx.translate(item.x, item.y);

      // 布置模式高亮选框
      if (this.isLayoutMode) {
        const isSelected = (this.selectedItem === item);
        ctx.strokeStyle = isSelected ? (this.dragValid ? '#2ED573' : '#FF4757') : '#FFA502';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-item.w / 2 - 6, -item.h / 2 - 6, item.w + 12, item.h + 12);
        ctx.setLineDash([]);

        if (isSelected) {
          ctx.fillStyle = this.dragValid ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 71, 87, 0.2)';
          ctx.fillRect(-item.w / 2 - 6, -item.h / 2 - 6, item.w + 12, item.h + 12);
        }
      }

      switch (item.id) {
        case 'dog_bed': this.renderDogBed(ctx, item); break;
        case 'mat': this.renderMat(ctx, item); break;
        case 'food_bowl': this.renderFoodBowl(ctx, item); break;
        case 'ball': this.renderBall(ctx, item); break;
        case 'flower_bed': this.renderFlowerBed(ctx, item, time); break;
        case 'branch_pile': this.renderBranchPile(ctx, item); break;
        case 'pebble_bank': this.renderPebbleBank(ctx, item); break;
        case 'leaf_pile': this.renderLeafPile(ctx, item); break;
        default: break;
      }

      ctx.restore();
    }
  }

  // 1. 羊羔绒软垫狗窝
  renderDogBed(ctx, item) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(60, 40, 20, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.42, w * 0.52, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FCE3D2';
    ctx.strokeStyle = '#E8C2A8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFF5E4';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.38, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF99A8';
    ctx.beginPath();
    ctx.roundRect(-14, h * 0.26, 28, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐾 BONE', 0, h * 0.26 + 8);
  }

  // 2. 休闲编织软垫
  renderMat(ctx, item) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(60, 40, 20, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 4, w * 0.5, h * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EBD5BA';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.48, h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F7E9D7';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.4, h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. 双格陶瓷食水盆
  renderFoodBowl(ctx, item) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(60, 40, 20, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.38, w * 0.5, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#C2E3DC';
    ctx.strokeStyle = '#9EC9BF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.4, w, h * 0.8, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#77C9D4';
    ctx.beginPath();
    ctx.ellipse(-w * 0.23, 0, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9C6E43';
    ctx.beginPath();
    ctx.ellipse(w * 0.23, 0, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. 高弹绒毛网球
  renderBall(ctx, item) {
    const bounceY = -Math.sin(item.ballBounce * Math.PI) * 16;
    ctx.fillStyle = 'rgba(40, 70, 20, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 14 * (1 - item.ballBounce * 0.2), 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, bounceY);
    ctx.fillStyle = '#C6EB34';
    ctx.strokeStyle = '#9BBF1F';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-5, 0, 10, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5, 0, 10, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
  }

  // 5. 欧式彩绘花坛
  renderFlowerBed(ctx, item, time) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(40, 70, 20, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.4, w * 0.5, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#B07B4D';
    ctx.beginPath();
    ctx.roundRect(-w * 0.45, -h * 0.2, w * 0.9, h * 0.5, 8);
    ctx.fill();

    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15, w * 0.4, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const flowers = [
      { x: -34, y: -h * 0.3, color: '#FF7E95' },
      { x: -12, y: -h * 0.36, color: '#FFD147' },
      { x: 12, y: -h * 0.28, color: '#FF8A5B' },
      { x: 36, y: -h * 0.34, color: '#B57EDC' }
    ];
    for (const f of flowers) {
      const sway = Math.sin(time * 0.003 + f.x) * 3;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x + sway, f.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. 整理树枝堆
  renderBranchPile(ctx, item) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(60, 40, 20, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.35, w * 0.5, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // 堆叠原木
    const logs = [
      { x: -15, y: 0, r: 12, len: 45, angle: 0.1 },
      { x: 10, y: 2, r: 11, len: 44, angle: -0.08 },
      { x: -4, y: -12, r: 10, len: 40, angle: 0.05 }
    ];
    for (const log of logs) {
      ctx.save();
      ctx.translate(log.x, log.y);
      ctx.rotate(log.angle);
      // 木头截面
      ctx.fillStyle = '#C89360';
      ctx.beginPath();
      ctx.ellipse(-log.len / 2, 0, 8, log.r, 0, 0, Math.PI * 2);
      ctx.fill();
      // 木身
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(-log.len / 2, -log.r, log.len, log.r * 2);
      ctx.fillStyle = '#D2A06E';
      ctx.beginPath();
      ctx.ellipse(log.len / 2, 0, 8, log.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 7. 小石子景观滩
  renderPebbleBank(ctx, item) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(40, 60, 30, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 4, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const stones = [
      { x: -22, y: 4, rx: 14, ry: 9, c: '#C5D1D9' },
      { x: -5, y: -6, rx: 16, ry: 10, c: '#A2B4C2' },
      { x: 18, y: 2, rx: 15, ry: 10, c: '#E2D9CC' },
      { x: 4, y: 8, rx: 12, ry: 8, c: '#8E9EA8' }
    ];
    for (const st of stones) {
      ctx.fillStyle = st.c;
      ctx.beginPath();
      ctx.ellipse(st.x, st.y, st.rx, st.ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 8. 蓬松落叶小堆
  renderLeafPile(ctx, item) {
    const { w, h } = item;
    ctx.fillStyle = 'rgba(60, 40, 10, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 6, w * 0.5, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const leaves = [
      { x: -20, y: 2, r: 12, c: '#D47E28' },
      { x: -4, y: -4, r: 15, c: '#E8A338' },
      { x: 16, y: 1, r: 13, c: '#C56218' },
      { x: 6, y: 8, r: 11, c: '#F2BE42' }
    ];
    for (const lf of leaves) {
      ctx.fillStyle = lf.c;
      ctx.beginPath();
      ctx.arc(lf.x, lf.y, lf.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  hitTest(x, y) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const dx = Math.abs(x - item.x);
      const dy = Math.abs(y - item.y);
      if (dx < item.w * 0.5 && dy < item.h * 0.5) {
        return item;
      }
    }
    return null;
  }
}
