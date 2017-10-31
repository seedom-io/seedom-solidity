const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const instantiate = require('./instantiate');

module.exports.optionize = (command) => {
    return instantiate.optionize(command)
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

    // first instantiate
    await instantiate.stage(state, stage);
    
    itemize('charity', state.accountAddresses[1], state, stage);
    itemize('charitySplit', 49, state, stage);
    itemize('winnerSplit', 49, state, stage);
    itemize('ownerSplit', 2, state, stage);
    itemize('valuePerEntry', 1000, state, stage);
    itemize('startTime', ch.now() + h.timeInterval, state, stage);
    itemize('revealTime', stage.startTime + h.timeInterval, state, stage);
    itemize('endTime', stage.revealTime + h.timeInterval, state, stage);

    await parity.send(state.web3, state.web3Instances.charity.methods.kickoff(
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.startTime,
        stage.revealTime,
        stage.endTime
    ), { from: stage.owner });

}