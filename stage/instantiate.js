const ch = require('../chronicle/helper');
const h = require('./helper');
const networks = require('../chronicle/networks');
const instantiate = require('./instantiate');

module.exports.optionize = (command) => {
    return command
        .option("--charitySplit <number>", "charity split", parseInt)
        .option("--winnerSplit <number>", "winner split", parseInt)
        .option("--ownerSplit <number>", "owner split", parseInt)
        .option("--valuePerEntry <number>", "value per entry", parseInt)
        .option("--revealTime <time>", "reveal time", parseDate)
        .option("--endTime <time>", "end time", parseDate)
        .option("--expireTime <time>", "expire time", parseDate)
        .option("--maxParticipants <number>", "max participants", parseInt);
}

module.exports.stage = async (state) => {

    const stage = state.stage;
    
    stage.owner = state.accountAddresses[0];
    stage.charity = stage.charity ? stage.charity : state.accountAddresses[1];
    stage.charitySplit = stage.charitySplit ? stage.charitySplit : 600;
    stage.winnerSplit = stage.winnerSplit ? stage.winnerSplit : 350;
    stage.ownerSplit = stage.ownerSplit ? stage.ownerSplit : 50;
    stage.valuePerEntry = stage.valuePerEntry ? stage.valuePerEntry : 1000;
    stage.participantsCount = state.accountAddresses.length - 3;
    stage.maxParticipants = stage.maxParticipants ? stage.maxParticipants : stage.participantsCount;

    const now = h.timestamp();
    // double the parity send delay to get overall transaction duration
    stage.transactionDuration = Math.floor(state.network.sendDelay / 1000) * 2;
    // instantiate phase has two initial transactions: deploy and seed
    // and then two transactions per participant: participate and raise
    stage.instantiateDuration = (stage.transactionDuration * 2) + (stage.participantsCount * stage.transactionDuration * 2);
    stage.revealTime = stage.revealTime ? stage.revealTime : now + stage.instantiateDuration;
    // reveal phase has max one transactions per participant: reveal
    stage.revealDuration = stage.participantsCount * stage.transactionDuration;
    stage.endTime = stage.endTime ? stage.endTime : stage.revealTime + stage.revealDuration;
    // end phase has one of only two possible transactions: end or cancel
    stage.endDuration = stage.transactionDuration;
    stage.expireTime = stage.expireTime ? stage.expireTime : stage.endTime + stage.endDuration;
    // expire phase has only one possible transaction: cancel
    stage.expireDuration = stage.transactionDuration;
    stage.destructTime = stage.destructTime ? stage.destructTime : stage.expireTime + stage.expireDuration;

    // deploy seedom
    stage.seedom = await networks.deploy('seedom', [
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.revealTime,
        stage.endTime,
        stage.expireTime,
        stage.destructTime,
        stage.maxParticipants
    ], {}, state);

}