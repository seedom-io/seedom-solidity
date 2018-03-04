const ch = require('../../chronicle/helper');
const h = require('../helper');
const deploy = require('../deploy');

module.exports.run = async (state) => {

    const { env } = state;

    env.owner = state.accountAddresses[0];
    env.charity = state.accountAddresses[1];
    env.charitySplit = 600;
    env.selectedSplit = 350;
    env.ownerSplit = 50;
    env.ownerMessage = h.messageHex();
    env.ownerSecret = h.hashMessage(env.ownerMessage, env.owner);
    env.valuePerEntry = 1000;
    env.participantsCount = state.accountAddresses.length - 3;
    env.maxParticipants = env.participantsCount;

    const now = ch.timestamp();
    // FIXME: triple the parity send delay to get overall transaction duration
    const transactionDuration = Math.round((state.network.sendDelay / 1000) * 2);
    // participation phase has two initial transactions: deploy and seed
    // and then two transactions per participant: participate and raise
    const participationDuration = (transactionDuration * 2) + (env.participantsCount * transactionDuration * 2);
    env.endTime = now + participationDuration;
    // end phase has (if not cancelled) two transactions: (charity) reveal and (owner) select
    const endDuration = transactionDuration * 2;
    env.expireTime = env.endTime + endDuration;
    // expire phase has only one possible transaction: cancel
    const expireDuration = transactionDuration;
    env.destructTime = env.expireTime + expireDuration;

    await deploy.run(state);
    
};
