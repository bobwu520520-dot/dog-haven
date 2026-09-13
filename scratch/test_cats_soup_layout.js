// Node.js mock test to ensure full runtime compatibility of Cats & Soup layout
const fs = require('fs');
const path = require('path');

global.window = {
  innerWidth: 1000,
  innerHeight: 600,
  devicePixelRatio: 1,
  addEventListener: () => {}
};
global.window.AudioContext = class {
  createOscillator() {
    return {
      type: '',
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {}
    };
  }
  createBuffer() { return { getChannelData: () => new Float32Array(1000) }; }
  createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
  createBiquadFilter() {
    return {
      type: '',
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: () => {}
    };
  }
  get currentTime() { return 0; }
  get destination() { return {}; }
};
global.window.webkitAudioContext = global.window.AudioContext;
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => 1;
global.Image = class {
  constructor() {
    this.complete = true;
    this.width = 100;
    this.height = 100;
  }
};

const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  beginPath: () => {},
  closePath: () => {},
  arc: () => {},
  ellipse: () => {},
  roundRect: () => {},
  rect: () => {},
  fill: () => {},
  stroke: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  clearRect: () => {},
  drawImage: () => {},
  clip: () => {},
  moveTo: () => {},
  lineTo: () => {},
  quadraticCurveTo: () => {},
  bezierCurveTo: () => {},
  arcTo: () => {},
  setLineDash: () => {},
  getLineDash: () => [],
  fillText: () => {},
  strokeText: () => {},
  measureText: () => ({ width: 50 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  setTransform: () => {},
  resetTransform: () => {},
  getTransform: () => ({}),
  createPattern: () => null,
  lineWidth: 1,
  globalAlpha: 1
};

global.document = {
  getElementById: (id) => {
    if (id === 'game-canvas') {
      return {
        getContext: () => mockCtx,
        width: 1000,
        height: 600,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
        addEventListener: () => {}
      };
    }
    return {
      innerText: '',
      innerHTML: '',
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      addEventListener: () => {},
      appendChild: () => {},
      querySelectorAll: () => []
    };
  },
  querySelectorAll: () => [],
  createElement: () => ({
    innerText: '',
    innerHTML: '',
    className: '',
    style: {},
    appendChild: () => {},
    querySelectorAll: () => []
  }),
  body: {
    appendChild: () => {}
  }
};

// Load scripts in order
const basePath = path.join(__dirname, '..');
const scripts = [
  'js/config.js',
  'js/audio.js',
  'js/dog.js',
  'js/kitchen.js',
  'js/wardrobe.js',
  'js/gacha.js',
  'js/economy.js',
  'js/game.js'
];

const vm = require('vm');
for (const sc of scripts) {
  const code = fs.readFileSync(path.join(basePath, sc), 'utf8');
  vm.runInThisContext(code);
}

console.log('✅ All scripts loaded into memory successfully!');

// Test Game instantiation
const game = new WangwangGame();
console.log('✅ WangwangGame instantiated successfully!');
console.log(`- Stations: ${Object.keys(game.kitchen.stations).join(', ')}`);
console.log(`- Serving Tray Plates: ${game.kitchen.servingTray.plates.length}`);
console.log(`- Dogs: ${[...game.dogs.keys()].join(', ')}`);

// Test simulate a loop tick
game.gameLoop(100);
console.log('✅ gameLoop(100) executed with zero errors!');

// Test simulate dish completion & arrival at tray
const grill = game.kitchen.stations.bbq;
game.kitchen.onDishComplete(grill);
console.log(`- Flying dishes count: ${game.kitchen.flyingDishes.length}`);

// Update for 1.5s to let dish land on tray
game.kitchen.update(1.5);
console.log(`- Plate 0 dish:`, game.kitchen.servingTray.plates[0].dish?.name);

// Test clicking plate 0 to sell
const plate0 = game.kitchen.servingTray.plates[0];
game.handleCanvasClick(plate0.x, plate0.y);
console.log(`- Plate 0 dish after click sell:`, game.kitchen.servingTray.plates[0].dish);
console.log(`- Gold: ${game.economy.gold}`);

// Test clicking station
game.handleCanvasClick(grill.x, grill.y);
console.log(`- Selected station: ${game.selectedStationId}`);

// Test drawing frame
game.ctx = mockCtx;
game.kitchen.draw(mockCtx);
console.log('✅ Full frame draw executed with zero errors!');

console.log('\n🎉 ALL CATS & SOUP LAYOUT SIMULATION TESTS PASSED COMPLETELY!');
