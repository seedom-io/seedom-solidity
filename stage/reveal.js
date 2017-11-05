const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const fund = require('./fund');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return fund.optionize(command)
        .option("--revealersCount <number>", "number of participants to reveal", parseInt);
}

module.exports.stage = async (state) => {

    // first fund
    await fund.stage(state);

    const stage = state.stage;

    stage.revealersCount = stage.revealersCount ? stage.revealersCount : stage.participantsCount;

    const now = await h.timestamp(stage.instances.charity);
    const revealTime = stage.revealTime;
    await cli.progress("waiting for reveal phase", revealTime - now);

    stage.revealers = [];
    // reveal original participants with their randoms
    for (let i = 0; i < stage.revealersCount; i++) {
        let participant = stage.participants[i];
        const method = stage.instances.charity.methods.reveal(participant.random);
        await parity.sendMethod(method, { from: participant.address });
        stage.revealers.push(participant.address);
        cli.info("revealed participant %s", participant.address);
    }

    return state;

}