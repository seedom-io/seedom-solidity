const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const instantiate = require('./instantiate');

module.exports.optionize = (command) => {
    return instantiate.optionize(command)
        .option("--charitySplit <number>", "charity split", parseInt)
        .option("--winnerSplit <number>", "winner split", parseInt)
        .option("--ownerSplit <number>", "owner split", parseInt)
        .option("--valuePerEntry <string>", "value per entry", parseInt)
        .option("--startTime <time>", "start time", parseDate)
        .option("--revealTime <time>", "reveal time", parseDate)
        .option("--endTime <time>", "end time", parseDate);
}

module.exports.stage = async (state) => {

    // first instantiate
    await instantiate.stage(state);
    
    const now = ch.now();
    const stage = state.stage;

    stage.charity = stage.charity ? stage.charity : state.accountAddresses[1];
    stage.charitySplit = stage.charitySplit ? stage.charitySplit : 49;
    stage.winnerSplit = stage.winnerSplit ? stage.winnerSplit : 49;
    stage.ownerSplit = stage.ownerSplit ? stage.ownerSplit : 2;
    stage.valuePerEntry = stage.valuePerEntry ? stage.valuePerEntry : 1000;
    stage.startTime = stage.startTime ? stage.startTime : now + h.timeInterval;
    stage.revealTime = stage.revealTime ? stage.revealTime : stage.startTime + h.timeInterval;
    stage.endTime = stage.endTime ? stage.endTime : stage.revealTime + h.timeInterval;

    const transaction = state.web3Instances.charity.methods.kickoff(
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.startTime,
        stage.revealTime,
        stage.endTime
    );

    await parity.sendAndCheck(state.web3, transaction, { from: stage.owner });

    return state;

}