const ch = require('../chronicle/helper');
const h = require('./helper');
const instantiate = require('./instantiate');
const network = require('../chronicle/network');

module.exports.previous = 'instantiate';

module.exports.options = [
    ['charityRandom', 'number', "charity random"]
];

module.exports.run = async (options, state) => {

    const { stage } = state;
    
    const charityRandom = options.charityRandom ? options.charityRandom : h.random();
    const charityHashedRandom = h.hashedRandom(charityRandom, stage.charity);

    const method = stage.seedom.methods.seed(charityHashedRandom);
    const seedReceipt = await network.sendMethod(method, {
        from: stage.charity
    }, state);

    return {
        charityRandom,
        charityHashedRandom
    }

}

module.exports.restore = async (state) => {
    seed(state);
}

const seed = (state) => {

    

}