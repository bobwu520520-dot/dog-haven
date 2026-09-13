/**
 * 《汪汪小馆》- ASMR 烹饪音效与吉他 BGM 引擎 (Web Audio API)
 * 纯算法程序化合成，无需下载外部音频包，零延迟、高保真、治愈放松
 */

class WangwangAudio {
  constructor() {
    this.ctx = null;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.muted = false;
    this.sfxVolume = 0.6;
    this.bgmVolume = 0.25;
    this.noiseBuffer = null;
  }

  // 用户点击后激活 AudioContext (遵循现代浏览器自动播放策略)
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.buildNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 生成白噪声缓冲区用于滋滋烤肉和蒸汽合成
  buildNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgmPlaying) {
      this.pauseBGM();
    } else if (!this.muted && !this.bgmPlaying) {
      this.startBGM();
    }
    return this.muted;
  }

  // =================== ASMR 烹饪音效区 ===================

  // 1. 烤肉 "滋滋" 声 (ASMR: 白噪声经过带通滤波与不规则微爆音)
  playGrillSizzle() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 白噪声源
    if (!this.noiseBuffer) this.buildNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.18 * this.sfxVolume, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 1.25);
  }

  // 2. 炒菜 "哗啦颠锅" 声 (低频共鸣 + 快速连续翻炒摩擦)
  playWokStir() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 铁锅共鸣
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // 滋啦翻菜摩擦
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.5);
    }
  }

  // 3. 榨汁机 "嗡嗡" 声 (调制马达蜂鸣)
  playJuicer() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.3);
    osc.frequency.linearRampToValueAtTime(180, now + 0.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15 * this.sfxVolume, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  // 4. 蒸笼 "呼哧" 蒸汽哨声
  playSteamer() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    if (!this.noiseBuffer) this.buildNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(6.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12 * this.sfxVolume, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.95);
  }

  // 5. 烤箱 "清脆叮咚" 铃声
  playOvenDing() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    [1760, 2637].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 1.3);
    });
  }

  // =================== 互动与货币音效 ===================

  // 金币收取清脆 "叮" 连续跳跃音
  playCoin() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    const notes = [987.77, 1318.51, 1567.98]; // B5, E6, G6
    const pitch = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.05, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // 设施升级上扬和弦
  playUpgrade() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.55);
    });
  }

  // 狗狗快乐萌叫/摇尾巴
  playBark(breed = 'shiba') {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 不同犬种音调各异（柯基清脆，哈士奇低沉，萨摩耶治愈）
    let baseFreq = 480;
    if (breed === 'corgi') baseFreq = 620;
    else if (breed === 'husky') baseFreq = 340;
    else if (breed === 'golden') baseFreq = 380;
    else if (breed === 'frenchie') baseFreq = 320;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.35, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 抚摸心动音效
  playPetHeart() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); // A5

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // 飞盘破空呼啸声 (快速扫频带通白噪声)
  playFrisbeeWhoosh() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    if (!this.noiseBuffer) this.buildNoiseBuffer();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.55);
    filter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22 * this.sfxVolume, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.6);
  }

  // 狂热刨地泥土飞溅声 (低频快速连续摩擦爆破音)
  playDigging() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    if (!this.noiseBuffer) this.buildNoiseBuffer();

    for (let i = 0; i < 4; i++) {
      const burstTime = now + i * 0.08;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380 + Math.random() * 180, burstTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, burstTime);
      gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.07);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(burstTime);
      noise.stop(burstTime + 0.08);
    }
  }

  // 治愈小雨 ASMR 柔和雨滴声 (柔和粉红滤波噪声与轻点水滴)
  playRainDrop() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const f = 1200 + Math.random() * 800;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 小院木门开启与欢快欢迎和弦
  playGateWelcome() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 温馨迎门和弦 C大调 (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.16 * this.sfxVolume, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.65);
    });

    // 随后一声亲切金毛欢吠
    setTimeout(() => {
      this.playBark('golden');
    }, 280);
  }

  // =================== 治愈木吉他循环 BGM ===================
  // 简雅温馨的指弹分解和弦 (C - G/B - Am - F)
  startBGM() {
    if (this.bgmPlaying || this.muted) return;
    this.init();
    this.bgmPlaying = true;

    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C
      [246.94, 293.66, 392.00, 493.88], // G/B
      [220.00, 261.63, 329.63, 440.00], // Am
      [174.61, 261.63, 349.23, 440.00]  // F
    ];

    let chordIdx = 0;
    let noteIdx = 0;

    const playGuitarPluck = () => {
      if (!this.bgmPlaying || this.muted) return;

      const currentChord = chords[chordIdx];
      const freq = currentChord[noteIdx];
      const now = this.ctx.currentTime;

      // 模拟尼龙吉他弦软音
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.07 * this.bgmVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      // 低通温润滤波器
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.0);

      // 琶音步进 (4拍轮转)
      noteIdx = (noteIdx + 1) % 4;
      if (noteIdx === 0) {
        chordIdx = (chordIdx + 1) % chords.length;
      }

      this.bgmTimer = setTimeout(playGuitarPluck, 450);
    };

    playGuitarPluck();
  }

  pauseBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// 挂载全局单例
window.wangwangAudio = new WangwangAudio();
