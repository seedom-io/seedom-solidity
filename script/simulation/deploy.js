const ch = require('../../chronicle/helper');
const h = require('../helper');
const deploy = require('../deploy');
const m = require('../../../seedom-crypter/messages');

const txnsPerSecond = 25;
const defaultDuration = 2;

module.exports.run = async (state) => {

    const { env } = state;
    
    env.cause = state.network.keys[0].address;
    env.causeWallet = state.network.keys[1].address;
    env.causeSplit = 600;
    env.participantSplit = 350;
    env.owner = state.network.keys[2].address;
    env.ownerWallet = state.network.keys[3].address;
    env.ownerSplit = 50;
    env.ownerMessage = m.random();
    env.ownerSecret = m.hash(env.ownerMessage, env.owner);
    env.valuePerEntry = 1000;
    // owner, ownerWallet, cause, causeWallet == 4 total
    env.participantsCount = state.network.keys.length - 4;
    env.goal = 10000;

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
