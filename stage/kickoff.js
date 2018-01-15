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
        .option("--revealTime <time>", "reveal time", parseDate)
        .option("--endTime <time>", "end time", parseDate)
        .option("--expireTime <time>", "expire time", parseDate)
        .option("--maxParticipants <number>", "max participants", parseInt);
}

module.exports.stage = async (state) => {

    // first instantiate
    await instantiate.stage(state);
    
    const stage = state.stage;
    const now = await h.timestamp(stage.instances.seedom);

    stage.charity = stage.charity ? stage.charity : state.accountAddresses[1];
    stage.charitySplit = stage.charitySplit ? stage.charitySplit : 600;
    stage.winnerSplit = stage.winnerSplit ? stage.winnerSplit : 350;
    stage.ownerSplit = stage.ownerSplit ? stage.ownerSplit : 50;
    stage.valuePerEntry = stage.valuePerEntry ? stage.valuePerEntry : 1000;

    stage.participantsCount = state.accountAddresses.length - 3;
    // double the parity send delay to get overall transaction duration
    stage.transactionDuration = Math.floor(networks.paritySendDelay / 1000) * 2;
    // kickoff phase has two initial transactions: kickoff and seed
    // and then two transactions per participant: participate and reveal (after seed)
    stage.kickoffDuration = (stage.transactionDuration * 2) + (stage.participantsCount * stage.transactionDuration * 2);
    stage.revealTime = stage.revealTime ? stage.revealTime : now + stage.kickoffDuration;
    // reveal phase has max one transactions per participant
    stage.revealDuration = stage.participantsCount * stage.transactionDuration;
    stage.endTime = stage.endTime ? stage.endTime : stage.revealTime + stage.revealDuration;
    // end phase has only one possible transaction: cancel
    stage.endDuration = stage.transactionDuration;
    stage.expireTime = stage.expireTime ? stage.expireTime : stage.endTime + stage.endDuration;
    
    stage.maxParticipants = stage.maxParticipants ? stage.maxParticipants : stage.participantsCount;
    
    const method = stage.instances.seedom.methods.kickoff(
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.revealTime,
        stage.endTime,
        stage.expireTime,
        stage.maxParticipants
    );

    stage.kickoffReceipt = await parity.sendMethod(method, { from: stage.owner });

    return state;

}