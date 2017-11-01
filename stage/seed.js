const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const kickoff = require('./kickoff');

module.exports.optionize = (command) => {
    return kickoff.optionize(command)
        .option("--charityRandom <number>", "charity random")
}

module.exports.stage = async (state) => {

    // first kickoff
    await kickoff.stage(state);

    const stage = state.stage;
    
    stage.charityRandom = stage.charityRandom ? stage.charityRandom : h.random();
    stage.charityHashedRandom = h.hashedRandom(stage.charityRandom, stage.charity);

    const transaction = state.web3Instances.charity.methods.seed(stage.charityHashedRandom);
    await parity.sendAndCheck(state.web3, transaction, { from: stage.charity });

    return state;

}