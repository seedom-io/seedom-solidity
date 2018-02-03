const ch = require('../chronicle/helper');
const h = require('./helper');
const network = require('../chronicle/network');
const raise = require('./raise');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return raise.optionize(command)
        .option("--revealersCount <number>", "number of participants to reveal", parseInt);
}

module.exports.dependency = 'raise';

module.exports.stage = async (state) => {

    const stage = state.stage;

    stage.revealersCount = stage.revealersCount ? stage.revealersCount : stage.participantsCount;

    const now = ch.timestamp();
    const revealTime = stage.revealTime;
    await cli.progress("waiting for reveal phase", revealTime - now);

    stage.revealers = [];
    stage.revealReceipts = [];

    // reveal original participants with their randoms
    for (let i = 0; i < stage.revealersCount; i++) {
        let participant = stage.participants[i];
        const method = stage.seedom.methods.reveal(participant.random);
        const receipt = await network.sendMethod(method, {
            from: participant.address
        }, state);

        cli.info("revealed participant %s", participant.address);
        stage.revealReceipts.push(receipt);
        stage.revealers.push(participant.address);
    }

}