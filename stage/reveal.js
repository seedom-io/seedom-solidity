const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const raise = require('./raise');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return raise.optionize(command)
        .option("--revealersCount <number>", "number of participants to reveal", parseInt);
}

module.exports.stage = async (state) => {

    // first raise
    await raise.stage(state);

    const stage = state.stage;

    stage.revealersCount = stage.revealersCount ? stage.revealersCount : stage.participantsCount;

    const now = await h.timestamp(stage.instances.seedom);
    const revealTime = stage.revealTime;
    await cli.progress("waiting for reveal phase", revealTime - now);

    stage.revealers = [];
    stage.revealReceipts = [];

    // reveal original participants with their randoms
    for (let i = 0; i < stage.revealersCount; i++) {
        let participant = stage.participants[i];
        const method = stage.instances.seedom.methods.reveal(participant.random);
        const receipt = await parity.sendMethod(method, { from: participant.address });
        cli.info("revealed participant %s", participant.address);
        stage.revealReceipts.push(receipt);
        stage.revealers.push(participant.address);
    }

    return state;

}