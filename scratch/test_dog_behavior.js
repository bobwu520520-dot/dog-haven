const fs = require('fs');

// Mock browser globals
global.window = {};
global.Image = class {};
global.WangwangFormulas = {
  getDogAffectionRequiredExp: () => 100,
  getDogAffectionMultiplier: () => 1
};

const vm = require('vm');
const configCode = fs.readFileSync('js/config.js', 'utf8');
const dogCode = fs.readFileSync('js/dog.js', 'utf8');
vm.runInThisContext(configCode);
vm.runInThisContext(dogCode);

console.log('Testing Golden Retriever sequence...');
const golden = new DogChef('golden', DOG_BREEDS_CONFIG.golden, true);
golden.startNextBehaviorRoutine();
console.log('Initial routineState:', golden.routineState); // should be 'tired'
if (golden.routineState !== 'tired') throw new Error('Golden should start with tired');

golden.routineTimer = 0;
golden.update(0.1, null);
console.log('Step 2:', golden.routineState); // should be 'sit'
if (golden.routineState !== 'sit') throw new Error('Expected sit');

golden.routineTimer = 0;
golden.update(0.1, null);
console.log('Step 3:', golden.routineState); // should be 'pant'
if (golden.routineState !== 'pant' || !golden.isPantingTongue) throw new Error('Expected pant with tongue');

golden.routineTimer = 0;
golden.update(0.1, null);
console.log('Step 4:', golden.routineState); // should be 'spot_player'
if (golden.routineState !== 'spot_player' || !golden.isNoticingPlayer) throw new Error('Expected spot_player');

golden.routineTimer = 0;
golden.update(0.1, null);
console.log('Step 5:', golden.routineState); // should be 'wag_tail'
if (golden.routineState !== 'wag_tail' || !golden.isTailWaggingFast) throw new Error('Expected wag_tail with fast wag');

golden.routineTimer = 0;
golden.update(0.1, null);
console.log('Step 6:', golden.routineState); // should be 'resume_work'
if (golden.routineState !== 'resume_work') throw new Error('Expected resume_work');

console.log('Testing Shiba Inu sequence...');
const shiba = new DogChef('shiba', DOG_BREEDS_CONFIG.shiba, true);
shiba.startNextBehaviorRoutine();
console.log('Shiba Step 1:', shiba.routineState); // spot_box
if (shiba.routineState !== 'spot_box') throw new Error('Expected spot_box');

shiba.routineTimer = 0;
shiba.update(0.1, null);
console.log('Shiba Step 2:', shiba.routineState); // pick_box
if (shiba.routineState !== 'pick_box' || !shiba.holdsBox) throw new Error('Expected pick_box');

shiba.routineTimer = 0;
shiba.update(0.1, null);
console.log('Shiba Step 3:', shiba.routineState, 'facing:', shiba.facing); // run_wrong_way, facing: -1
if (shiba.routineState !== 'run_wrong_way' || shiba.facing !== -1) throw new Error('Expected run_wrong_way with facing -1');

shiba.routineTimer = 0;
shiba.update(0.1, null);
console.log('Shiba Step 4:', shiba.routineState, 'facing:', shiba.facing); // turn_back, facing: 1
if (shiba.routineState !== 'turn_back' || shiba.facing !== 1) throw new Error('Expected turn_back with facing 1');

console.log('Testing Husky sequence...');
const husky = new DogChef('husky', DOG_BREEDS_CONFIG.husky, true);
husky.startNextBehaviorRoutine();
console.log('Husky Step 1:', husky.routineState); // sudden_stop
if (husky.routineState !== 'sudden_stop') throw new Error('Expected sudden_stop');

husky.routineTimer = 0;
husky.update(0.1, null);
console.log('Husky Step 2:', husky.routineState, 'isLookingAtSky:', husky.isLookingAtSky); // look_sky
if (husky.routineState !== 'look_sky' || !husky.isLookingAtSky) throw new Error('Expected look_sky');

husky.routineTimer = 0;
husky.update(0.1, null);
console.log('Husky Step 3:', husky.routineState, 'hasButterfly:', !!husky.routineProp); // chase_butterfly
if (husky.routineState !== 'chase_butterfly' || !husky.routineProp || husky.routineProp.type !== 'butterfly') throw new Error('Expected chase_butterfly');

husky.routineTimer = 0;
husky.update(0.1, null);
console.log('Husky Step 4:', husky.routineState); // return_mine
if (husky.routineState !== 'return_mine') throw new Error('Expected return_mine');

console.log('All dog behavior sequences passed with flying colors!');
