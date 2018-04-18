const ch = require('../../chronicle/helper');
const h = require('../helper');
const deploy = require('../deploy');

const txnsPerSecond = 25;
const defaultDuration = 2;

module.exports.run = async (state) => {

    const { env } = state;

    env.owner = state.accountAddresses[0];
    env.cause = state.accountAddresses[1];
    env.causeSplit = 600;
    env.participantSplit = 350;
    env.ownerSplit = 50;
    env.ownerMessage = h.messageHex();
    env.ownerSecret = h.hashMessage(env.ownerMessage, env.owner);
    env.valuePerEntry = 1000;
    env.participantsCount = state.accountAddresses.length - 2;
    env.entropy = 8;
    env.maxScore = 10;

    const now = ch.timestamp();
    let participationDuration = Math.floor(env.participantsCount / txnsPerSecond);
    participationDuration = participationDuration > 0 ? participationDuration : defaultDuration;
    env.endTime = now + participationDuration;
    const endDuration = defaultDuration;
    env.expireTime = env.endTime + endDuration;
    const expireDuration = defaultDuration;
    env.destructTime = env.expireTime + expireDuration;

    await deploy.run(state);
    
};
