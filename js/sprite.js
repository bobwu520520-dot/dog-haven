/**
 * 《金毛和汤》- 写实立绘精灵加载器 (DogSpriteLoader)
 * ------------------------------------------------------------------
 * assets/art/*.jpg 是白底平面插画，没有透明通道，直接贴到草地上会是一个方块。
 * 本模块在运行时把它们处理成可用的透明立绘：
 *
 *  1. 抠背景：从图片四边向内做「洪水填充」，只把**与边界连通的近白像素**置透明。
 *     用连通区域而不是全局阈值，是为了保住狗狗身上本身的白色毛色（萨摩耶、柯基白胸等）。
 *  2. 羽化边缘：与透明区相邻的浅色像素按白度降低不透明度，消除抠图留下的白色描边。
 *  3. 量包围盒：统计 alpha 包围盒，供场景等比缩放定位与头像头部裁切使用。
 *
 * 结果按 src 缓存，8 个犬种共享同一份处理结果，只在首次加载时计算一次。
 */

const DogSpriteLoader = {
  /** src -> { canvas, bounds, ready } */
  _cache: new Map(),
  /** src -> [callback] 加载中的等待队列 */
  _pending: new Map(),

  /** 判定「近白背景」的亮度下限：RGB 三通道都要 >= 该值 */
  BG_MIN_LUM: 232,
  /** 允许的色偏：R/G/B 最大差值超过它就不算中性白（避免吃掉浅米色狗毛） */
  BG_MAX_CHROMA: 16,
  /** 羽化：亮度高于此值的边缘像素开始变透明 */
  FEATHER_START_LUM: 198,
  /** alpha 低于该值视为空像素（用于包围盒统计） */
  ALPHA_FLOOR: 16,

  /** 同步取已处理好的立绘，未就绪返回 null */
  get(src) {
    return (src && this._cache.get(src)) || null;
  },

  /**
   * 加载并处理立绘。
   * @param {string} src 图片路径
   * @param {(entry:object|null)=>void} [onReady] 就绪回调；entry 为 null 表示处理失败
   * @returns {object|null} 若已缓存则同步返回，否则返回 null 并在就绪后回调
   */
  load(src, onReady) {
    if (!src) { if (onReady) onReady(null); return null; }

    const cached = this._cache.get(src);
    if (cached) { if (onReady) onReady(cached); return cached; }

    if (this._pending.has(src)) {
      if (onReady) this._pending.get(src).push(onReady);
      return null;
    }
    this._pending.set(src, onReady ? [onReady] : []);

    if (typeof Image === 'undefined') { this._flush(src, null); return null; }

    const img = new Image();
    img.onload = () => this._flush(src, this._process(img));
    img.onerror = () => {
      console.warn('[DogSpriteLoader] 立绘加载失败:', src);
      this._flush(src, null);
    };
    img.src = src;
    return null;
  },

  _flush(src, entry) {
    if (entry) this._cache.set(src, entry);
    const callbacks = this._pending.get(src) || [];
    this._pending.delete(src);
    for (const cb of callbacks) {
      try { cb(entry); } catch (e) { console.warn('[DogSpriteLoader] 就绪回调异常:', src, e); }
    }
  },

  /** 把 Image 处理成 { canvas, bounds } */
  _process(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    if (typeof document === 'undefined' || !document.createElement) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, w, h);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
      // 跨域图片会污染画布，此时退化为「不抠底」的原始立绘
      console.warn('[DogSpriteLoader] 无法读取像素，跳过抠底:', e);
      return { canvas, bounds: { x: 0, y: 0, w, h }, ready: true, bgRemoved: false };
    }

    this._removeBackground(imageData.data, w, h);
    this._featherEdges(imageData.data, w, h);
    ctx.putImageData(imageData, 0, 0);

    return {
      canvas,
      bounds: this._alphaBounds(imageData.data, w, h),
      ready: true,
      bgRemoved: true
    };
  },

  _isNearWhite(data, idx) {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    if (r < this.BG_MIN_LUM || g < this.BG_MIN_LUM || b < this.BG_MIN_LUM) return false;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return (max - min) <= this.BG_MAX_CHROMA;
  },

  /** 从四边洪水填充，抠掉与边界连通的近白背景 */
  _removeBackground(data, w, h) {
    const total = w * h;
    // 入队时即标记，保证每个像素只进队一次，队列长度严格不超过总像素数。
    const queued = new Uint8Array(total);
    const queue = new Int32Array(total);
    let tail = 0;
    const push = (p) => {
      if (queued[p]) return;
      queued[p] = 1;
      queue[tail++] = p;
    };

    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

    let head = 0;
    while (head < tail) {
      const p = queue[head++];
      const idx = p * 4;
      if (!this._isNearWhite(data, idx)) continue;

      data[idx + 3] = 0;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
  },

  /** 与透明区相邻的浅色像素按白度淡出，消除白色描边 */
  _featherEdges(data, w, h) {
    const total = w * h;
    const alphaSnapshot = new Uint8Array(total);
    for (let i = 0; i < total; i++) alphaSnapshot[i] = data[i * 4 + 3];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (alphaSnapshot[p] === 0) continue;

        const touchesEmpty =
          (x > 0 && alphaSnapshot[p - 1] === 0) ||
          (x < w - 1 && alphaSnapshot[p + 1] === 0) ||
          (y > 0 && alphaSnapshot[p - w] === 0) ||
          (y < h - 1 && alphaSnapshot[p + w] === 0);
        if (!touchesEmpty) continue;

        const idx = p * 4;
        const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (lum <= this.FEATHER_START_LUM) continue;

        const t = Math.min(1, (lum - this.FEATHER_START_LUM) / (255 - this.FEATHER_START_LUM));
        data[idx + 3] = Math.round(data[idx + 3] * (1 - t));
      }
    }
  },

  /** 统计非透明像素的包围盒 */
  _alphaBounds(data, w, h) {
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (data[(row + x) * 4 + 3] > this.ALPHA_FLOOR) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return { x: 0, y: 0, w, h };
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }
};

if (typeof window !== 'undefined') {
  window.DogSpriteLoader = DogSpriteLoader;
}
