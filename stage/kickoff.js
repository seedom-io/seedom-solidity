const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const networks = require('../chronicle/networks');
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
    
    const stage = state.stage;
    const now = await h.timestamp(stage.instances.charity);

    stage.charity = stage.charity ? stage.charity : state.accountAddresses[1];
    stage.charitySplit = stage.charitySplit ? stage.charitySplit : 49;
    stage.winnerSplit = stage.winnerSplit ? stage.winnerSplit : 49;
    stage.ownerSplit = stage.ownerSplit ? stage.ownerSplit : 2;
    stage.valuePerEntry = stage.valuePerEntry ? stage.valuePerEntry : 1000;

    stage.participantsCount = state.accountAddresses.length - 2;
    // double the parity send delay to get overall transaction duration
    stage.transactionDuration = Math.floor(networks.paritySendDelay / 1000) * 2;
    // kick phase has max two transactions: kickoff and seed
    stage.kickDuration = stage.transactionDuration * 2;
    stage.startTime = stage.startTime ? stage.startTime : now + stage.kickDuration;
    // start phase has max two transactions per participant
    stage.startDuration = stage.participantsCount * stage.transactionDuration * 2;
    stage.revealTime = stage.revealTime ? stage.revealTime : stage.startTime + stage.startDuration;
    // reveal phase has max one transactions per participant
    stage.revealDuration = stage.participantsCount * stage.transactionDuration;
    stage.endTime = stage.endTime ? stage.endTime : stage.revealTime + stage.revealDuration;
    
    const method = stage.instances.charity.methods.kickoff(
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.startTime,
        stage.revealTime,
        stage.endTime
    );

    await parity.sendMethod(method, { from: stage.owner });

    return state;

}