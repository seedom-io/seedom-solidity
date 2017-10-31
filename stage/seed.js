const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const kickoff = require('./kickoff');

module.exports.optionize = (command) => {
    return kickoff.optionize(command)
        .option("--charity <address>", "charity")
        .option("--charitySplit <number>", "charity split")
        .option("--winnerSplit <number>", "winner split")
        .option("--ownerSplit <number>", "owner split")
        .option("--valuePerEntry <string>", "value per entry")
        .option("--startTime <time>", "start time", parseDate)
        .option("--revealTime <time>", "reveal time", parseDate)
        .option("--endTime <time>", "end time", parseDate);
}

module.exports.stage = async (state, stage) => {

    // first kickoff
    await kickoff.stage(state, stage);

    itemize('charity', state.accountAddresses[1], state, stage);

}