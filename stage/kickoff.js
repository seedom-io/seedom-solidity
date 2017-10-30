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

    stage.charity = state.charity ? state.accountAddresses[state.charity] : state.accountAddresses[1];
    stage.charitySplit = state.charitySplit ? state.charitySplit : 49;
    stage.winnerSplit = state.winnerSplit ? state.winnerSplit : 49;
    stage.ownerSplit = state.ownerSplit ? state.ownerSplit : 2;
    stage.valuePerEntry = state.valuePerEntry ? state.valuePerEntry : 1000;
    stage.startTime = state.startTime ? state.startTime : stage.now + h.timeInterval;
    stage.revealTime = state.revealTime ? state.revealTime : stage.startTime + h.timeInterval;
    stage.endTime = state.endTime ? state.endTime : stage.revealTime + h.timeInterval;

    await parity.send(state.web3, state.web3Instances.charity.methods.kickoff(
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.startTime,
        stage.revealTime,
        stage.endTime
    ).send({ from: stage.owner }));

}