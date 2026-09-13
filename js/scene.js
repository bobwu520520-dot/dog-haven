// ============================================================================
// ⚠️ 已废弃 · 未被任何文件引用（历史遗留，保留仅供查阅，请勿删除前先确认）
// ----------------------------------------------------------------------------
// 本文件实现的是早期「狗狗小屋」版本的全景四区域场景（小花园 / 小院草坪 /
// 温馨客厅 / 狗窝角），由 HavenScene 类渲染。
// 当前线上实际渲染由 js/kitchen.js 的 RestaurantKitchen.draw() 全权承担
// （阳光公园草地 + 5 大料理工位 + 中央喷泉 + 底部出餐木托盘）。
// index.html 未引入本文件，全局也搜不到 HavenScene 的任何调用点。
// 如需复用其中的「后院」场景元素，请先阅读 docs/第1章实现核对报告.md 的遗留事项章节。
// ============================================================================

// 狗狗小屋 (Doggy House) - 全景四大区域场景渲染器 (1920px 全景)
class HavenScene {
  constructor() {
    this.width = CONFIG.SCENE.WIDTH;
    this.height = CONFIG.SCENE.HEIGHT;
    this.timeMode = 'day'; // 'day' | 'sunset' | 'night'

    // 镜头平滑视口滚动
    this.cameraX = 400; // 默认聚焦小院草坪与客厅入口
    this.targetCameraX = 400;
    this.viewportWidth = 1280;

    // 漂浮粒子与小动物
    this.ambientParticles = [];
    this.initAmbientParticles();

    this.butterflies = [
      { x: 180, y: 380, targetX: 260, targetY: 340, color: '#FFB5D0', wingAngle: 0, speed: 0.8 },
      { x: 380, y: 360, targetX: 440, targetY: 410, color: '#FFF3A8', wingAngle: 0, speed: 0.7 },
      { x: 820, y: 370, targetX: 720, targetY: 420, color: '#A0E7E5', wingAngle: 0, speed: 0.6 }
    ];

    // 草丛摆动
    this.grassBands = [];
    for (let i = 0; i < 50; i++) {
      this.grassBands.push({
        x: 40 + Math.random() * 1020, // 花园与小院草地
        y: CONFIG.SCENE.GROUND_Y_MIN + Math.random() * (CONFIG.SCENE.GROUND_Y_MAX - CONFIG.SCENE.GROUND_Y_MIN - 20),
        height: 12 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 40; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0.3 + Math.random() * 0.5,
        vy: 0.2 + Math.random() * 0.4,
        size: 4 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        type: Math.random() > 0.5 ? 'petal' : 'leaf',
        alpha: 0.6 + Math.random() * 0.35
      });
    }
  }

  // 视角对焦指定区域
  focusArea(areaId) {
    const area = CONFIG.SCENE.AREAS[areaId];
    if (area) {
      this.targetCameraX = Math.max(0, Math.min(this.width - this.viewportWidth, area.focusX - this.viewportWidth / 2));
    }
  }

  update(dt, time) {
    // 镜头平滑线性插值
    const diff = this.targetCameraX - this.cameraX;
    if (Math.abs(diff) > 0.5) {
      this.cameraX += diff * Math.min(1.0, dt * 6);
    } else {
      this.cameraX = this.targetCameraX;
    }

    // 粒子漂浮
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(time * 0.002 + p.x * 0.01) * 0.2;
      p.rotation += p.rotSpeed;

      if (p.x > this.width + 20) p.x = -20;
      if (p.y > this.height + 20) p.y = -20;
    }

    // 蝴蝶
    for (const b of this.butterflies) {
      b.wingAngle = Math.sin(time * 0.015) * 0.9;
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        b.targetX = 60 + Math.random() * 980;
        b.targetY = 330 + Math.random() * 200;
      } else {
        b.x += (dx / dist) * b.speed;
        b.y += (dy / dist) * b.speed;
      }
    }
  }

  render(ctx, time) {
    ctx.save();

    // 1. 天空与远景山峦
    this.renderSkyAndFarMountains(ctx);

    // 2. 区域 1：小花园 (0 ~ 460)
    this.renderGarden(ctx, time);

    // 3. 区域 2：小院草坪与大树 (460 ~ 1080)
    this.renderCourtyard(ctx, time);

    // 4. 区域 3：温馨客厅 (1080 ~ 1560)
    this.renderLivingRoom(ctx, time);

    // 5. 区域 4：狗窝角 (1560 ~ 1920)
    this.renderDogCorner(ctx, time);

    // 6. 门廊与过渡隔断
    this.renderTransitions(ctx);

    // 7. 草丛、蝴蝶、漂浮花瓣与光影覆盖
    this.renderGrassDetails(ctx, time);
    this.renderButterflies(ctx);
    this.renderAmbientParticles(ctx);
    this.renderLightingOverlay(ctx, time);

    ctx.restore();
  }

  renderSkyAndFarMountains(ctx) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
    if (this.timeMode === 'day') {
      skyGrad.addColorStop(0, '#B8E3F8');
      skyGrad.addColorStop(0.7, '#E4F4FD');
      skyGrad.addColorStop(1, '#FFF9EB');
    } else if (this.timeMode === 'sunset') {
      skyGrad.addColorStop(0, '#FFA185');
      skyGrad.addColorStop(0.6, '#FFD19D');
      skyGrad.addColorStop(1, '#FFECCF');
    } else {
      skyGrad.addColorStop(0, '#192237');
      skyGrad.addColorStop(0.7, '#2C3A5A');
      skyGrad.addColorStop(1, '#47587B');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, 360);

    // 远山轮廓
    ctx.fillStyle = this.timeMode === 'night' ? '#202B43' : '#9DC79B';
    ctx.beginPath();
    ctx.moveTo(0, 270);
    ctx.bezierCurveTo(200, 220, 420, 280, 680, 230);
    ctx.bezierCurveTo(860, 210, 1020, 260, 1140, 230);
    ctx.lineTo(1140, 360);
    ctx.lineTo(0, 360);
    ctx.fill();

    // 近景深绿树丛
    ctx.fillStyle = this.timeMode === 'night' ? '#162134' : '#78A46E';
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.bezierCurveTo(160, 260, 340, 310, 520, 270);
    ctx.bezierCurveTo(740, 250, 920, 310, 1120, 275);
    ctx.lineTo(1120, 360);
    ctx.lineTo(0, 360);
    ctx.fill();
  }

  // 区域 1：小花园 (0 ~ 460)
  renderGarden(ctx, time) {
    // 地面花草绿坪
    const lawnGrad = ctx.createLinearGradient(0, 320, 0, 640);
    lawnGrad.addColorStop(0, this.timeMode === 'night' ? '#2F4238' : '#9AC967');
    lawnGrad.addColorStop(1, this.timeMode === 'night' ? '#1E2C25' : '#74A43F');
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(0, 320, 460, 320);

    // 花园石径小路
    ctx.fillStyle = '#E8DDCE';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(80 + i * 54, 460 + (i % 2) * 16, 26, 15, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 花架拱门与爬藤
    ctx.fillStyle = this.timeMode === 'night' ? '#4A3728' : '#D19C64';
    ctx.beginPath();
    ctx.roundRect(16, 180, 18, 160, 4);
    ctx.roundRect(420, 180, 18, 160, 4);
    ctx.roundRect(10, 170, 434, 16, 6);
    ctx.fill();

    // 拱门藤蔓绿意
    ctx.fillStyle = this.timeMode === 'night' ? '#27382B' : '#689B48';
    for (let x = 24; x <= 420; x += 36) {
      ctx.beginPath();
      ctx.arc(x, 178 + Math.sin(x) * 4, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // 区域木标牌
    this.renderAreaSign(ctx, 230, 200, '🌸 小花园');
  }

  // 区域 2：小院草坪与大树 (460 ~ 1080)
  renderCourtyard(ctx, time) {
    const lawnGrad = ctx.createLinearGradient(460, 320, 460, 640);
    lawnGrad.addColorStop(0, this.timeMode === 'night' ? '#33473D' : '#A3CE6E');
    lawnGrad.addColorStop(1, this.timeMode === 'night' ? '#1F2F28' : '#79AB44');
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(460, 320, 620, 320);

    // 院落木栅栏
    ctx.fillStyle = this.timeMode === 'night' ? '#4D3A2C' : '#E5B57E';
    for (let x = 470; x < 1070; x += 44) {
      ctx.beginPath();
      ctx.roundRect(x, 266, 16, 70, [6, 6, 0, 0]);
      ctx.fill();
    }
    ctx.fillStyle = this.timeMode === 'night' ? '#402F23' : '#D3A16A';
    ctx.fillRect(460, 282, 610, 10);
    ctx.fillRect(460, 308, 610, 10);

    // 大树 (位于小院左上方 520, 240)
    ctx.fillStyle = this.timeMode === 'night' ? '#3A281E' : '#8A5A36';
    ctx.beginPath();
    ctx.roundRect(500, 150, 36, 180, 8);
    ctx.fill();
    // 树冠 (蓬松绿云)
    ctx.fillStyle = this.timeMode === 'night' ? '#26372A' : '#77A855';
    ctx.beginPath();
    ctx.arc(518, 110, 70, 0, Math.PI * 2);
    ctx.arc(470, 140, 50, 0, Math.PI * 2);
    ctx.arc(566, 140, 52, 0, Math.PI * 2);
    ctx.fill();

    // 树荫
    ctx.fillStyle = 'rgba(40, 60, 20, 0.15)';
    ctx.beginPath();
    ctx.ellipse(518, 350, 85, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // 区域木标牌
    this.renderAreaSign(ctx, 770, 230, '🌳 小院草坪');
  }

  // 区域 3：温馨客厅 (1080 ~ 1560)
  renderLivingRoom(ctx, time) {
    const cx = 1080;
    const cw = 480;

    // 墙面
    const wallGrad = ctx.createLinearGradient(cx, 0, cx + cw, 0);
    wallGrad.addColorStop(0, this.timeMode === 'night' ? '#3C3340' : '#FFF5E8');
    wallGrad.addColorStop(1, this.timeMode === 'night' ? '#2D2530' : '#F6E4D1');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(cx, 0, cw, 330);

    // 踢脚线
    ctx.fillStyle = this.timeMode === 'night' ? '#523E2F' : '#CC9867';
    ctx.fillRect(cx, 318, cw, 14);

    // 大采光飘窗
    this.renderWindow(ctx, 1220, 60, 200, 160);

    // 木地板
    this.renderWoodFloor(ctx, cx, 330, cw, this.height - 330);

    // 区域木标牌
    this.renderAreaSign(ctx, 1320, 30, '🛋️ 温馨客厅');
  }

  // 区域 4：狗窝角 (1560 ~ 1920)
  renderDogCorner(ctx, time) {
    const cx = 1560;
    const cw = this.width - cx;

    // 柔和暗光舒适墙面
    ctx.fillStyle = this.timeMode === 'night' ? '#2B2332' : '#F2DECC';
    ctx.fillRect(cx, 0, cw, 330);

    // 踢脚线
    ctx.fillStyle = this.timeMode === 'night' ? '#483526' : '#C28E5D';
    ctx.fillRect(cx, 318, cw, 14);

    // 静谧星空小圆窗
    const winX = 1720;
    const winY = 120;
    ctx.fillStyle = '#C89360';
    ctx.beginPath();
    ctx.arc(winX, winY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.timeMode === 'night' ? '#141C2E' : '#BFE3FA';
    ctx.beginPath();
    ctx.arc(winX, winY, 44, 0, Math.PI * 2);
    ctx.fill();
    if (this.timeMode === 'night') {
      ctx.fillStyle = '#FFEB99';
      ctx.beginPath();
      ctx.arc(winX + 12, winY - 8, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // 地板与睡眠软毯铺底
    this.renderWoodFloor(ctx, cx, 330, cw, this.height - 330);

    // 区域木标牌
    this.renderAreaSign(ctx, 1720, 30, '🛏️ 狗窝角');
  }

  renderTransitions(ctx) {
    // 门廊过渡 (1080 处)
    const px = 1080;
    ctx.fillStyle = this.timeMode === 'night' ? '#3E2D22' : '#BE854F';
    ctx.fillRect(px - 14, 0, 28, 330);
    ctx.fillRect(px - 26, 0, 52, 24);

    // 门廊踏垫
    ctx.fillStyle = '#D9822B';
    ctx.beginPath();
    ctx.roundRect(px - 36, 324, 72, 14, [4, 4, 0, 0]);
    ctx.fill();
  }

  renderWindow(ctx, winX, winY, winW, winH) {
    ctx.fillStyle = '#C89360';
    ctx.beginPath();
    ctx.roundRect(winX, winY, winW, winH, 12);
    ctx.fill();

    ctx.fillStyle = this.timeMode === 'night' ? '#172033' : '#CBEBFC';
    ctx.beginPath();
    ctx.roundRect(winX + 10, winY + 10, winW - 20, winH - 20, 8);
    ctx.fill();

    // 十字窗格
    ctx.fillStyle = '#C89360';
    ctx.fillRect(winX + winW / 2 - 4, winY + 10, 8, winH - 20);
    ctx.fillRect(winX + 10, winY + winH / 2 - 4, winW - 20, 8);
  }

  renderWoodFloor(ctx, x, y, w, h) {
    ctx.fillStyle = this.timeMode === 'night' ? '#4A3424' : '#E3B480';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = this.timeMode === 'night' ? '#392618' : '#CF9C65';
    ctx.lineWidth = 2;
    const plankH = 34;
    for (let py = y; py < y + h; py += plankH) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();

      const offset = (Math.floor(py / plankH) % 2) * 110;
      for (let px = x + offset; px < x + w; px += 220) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + plankH);
        ctx.stroke();
      }
    }
  }

  renderAreaSign(ctx, x, y, title) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 250, 240, 0.9)';
    ctx.strokeStyle = '#9C6639';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 60, y, 120, 32, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7C4A21';
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x, y + 16);
    ctx.restore();
  }

  renderGrassDetails(ctx, time) {
    ctx.strokeStyle = this.timeMode === 'night' ? '#2B3F33' : '#6FA334';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    for (const g of this.grassBands) {
      const sway = Math.sin(time * 0.003 + g.phase) * 6;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.quadraticCurveTo(g.x + sway * 0.5, g.y - g.height * 0.6, g.x + sway, g.y - g.height);
      ctx.stroke();
    }
  }

  renderButterflies(ctx) {
    for (const b of this.butterflies) {
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(-6 * Math.cos(b.wingAngle), -4, 9 * Math.cos(b.wingAngle), 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(6 * Math.cos(b.wingAngle), -4, 9 * Math.cos(b.wingAngle), 6, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5A4638';
      ctx.beginPath();
      ctx.ellipse(0, -2, 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  renderAmbientParticles(ctx) {
    for (const p of this.ambientParticles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;

      if (p.type === 'petal') {
        ctx.fillStyle = '#FFAEC0';
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size, -p.size * 0.3, 0, p.size);
        ctx.quadraticCurveTo(-p.size, -p.size * 0.3, 0, -p.size);
        ctx.fill();
      } else {
        ctx.fillStyle = '#E5A044';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  renderLightingOverlay(ctx, time) {
    if (this.timeMode === 'sunset') {
      ctx.fillStyle = 'rgba(255, 110, 50, 0.1)';
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (this.timeMode === 'night') {
      ctx.fillStyle = 'rgba(12, 20, 42, 0.3)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  clampPosition(x, y) {
    const minX = 50;
    const maxX = this.width - 60;
    const minY = CONFIG.SCENE.GROUND_Y_MIN;
    const maxY = CONFIG.SCENE.GROUND_Y_MAX;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  getAreaAt(x) {
    for (const [id, area] of Object.entries(CONFIG.SCENE.AREAS)) {
      if (x >= area.minX && x < area.maxX) {
        return id;
      }
    }
    return 'yard';
  }
}
