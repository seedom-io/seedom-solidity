const ch = require('../chronicle/helper');
const h = require('./helper');
const instantiate = require('./instantiate');
const networks = require('../chronicle/networks');

module.exports.optionize = (command) => {
    return instantiate.optionize(command)
        .option("--charityRandom <number>", "charity random")
}

module.exports.stage = async (state) => {

    // first instantiate
    await instantiate.stage(state);

    const stage = state.stage;
    
    stage.charityRandom = stage.charityRandom ? stage.charityRandom : h.random();
    stage.charityHashedRandom = h.hashedRandom(stage.charityRandom, stage.charity);

    const method = stage.seedom.methods.seed(stage.charityHashedRandom);
    stage.seedReceipt = await networks.sendMethod(method, {
        from: stage.charity
    }, state);

}