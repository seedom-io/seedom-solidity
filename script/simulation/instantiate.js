const ch = require('../../chronicle/helper');

module.exports.run = async (state) => {

    const { env } = state;

    env.owner = state.accountAddresses[0];
    env.charity = state.accountAddresses[1];
    env.charitySplit = 600;
    env.winnerSplit = 350;
    env.ownerSplit = 50;
    env.valuePerEntry = 1000;
    env.participantsCount = state.accountAddresses.length - 3;
    env.maxParticipants = env.participantsCount;

    const now = ch.timestamp();
    // FIXME: triple the parity send delay to get overall transaction duration
    const transactionDuration = Math.round((state.network.sendDelay / 1000) * 2);
    // instantiate phase has two initial transactions: deploy and seed
    // and then two transactions per participant: participate and raise
    const instantiateDuration = (transactionDuration * 2) + (env.participantsCount * transactionDuration * 2);
    env.revealTime = now + instantiateDuration;
    // reveal phase has max one transactions per participant: reveal
    const revealDuration = env.participantsCount * transactionDuration;
    env.endTime = env.revealTime + revealDuration;
    // end phase has one of only two possible transactions: end or cancel
    const endDuration = transactionDuration;
    env.expireTime = env.endTime + endDuration;
    // expire phase has only one possible transaction: cancel
    const expireDuration = transactionDuration;
    env.destructTime = env.expireTime + expireDuration;

    // deploy seedom
    env.seedom = await (await state.interfaces.seedom).deploy({
        charity: env.charity,
        charitySplit: env.charitySplit,
        winnerSplit: env.winnerSplit,
        ownerSplit: env.ownerSplit,
        valuePerEntry: env.valuePerEntry,
        revealTime: env.revealTime,
        endTime: env.endTime,
        expireTime: env.expireTime,
        destructTime: env.destructTime,
        maxParticipants: env.maxParticipants
    }, {
        from: env.owner
    });

    // save receipt
    env.deployReceipt = env.seedom.receipt;
    
};
