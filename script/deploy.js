const h = require('./helper');
const m = require('../../seedom-crypter/messages');

module.exports.options = [
    ['cause', true],
    ['causeWallet', true],
    ['causeSplit', true],
    ['participantSplit', true],
    ['owner', true],
    ['ownerWallet', true],
    ['ownerSplit', true],
    ['ownerMessageString', true],
    ['valuePerEntry', true],
    ['endTime', true],
    ['expireTime', true],
    ['destructTime', true],
    ['goal', true]
];

module.exports.run = async (state) => {

    const { env } = state;

    env.ownerMessage = env.ownerMessage ? env.ownerMessage : (
        env.ownerMessageString ? m.hex(env.ownerMessageString) : m.random()
    );
    
    env.ownerSecret = env.ownerSecret ? env.ownerSecret : m.hash(env.ownerMessage, env.owner);

    // deploy fundraiser
    const fundraiser = await (await state.interfaces.fundraiser).deploy({
        cause: env.cause,
        causeWallet: env.causeWallet,
        causeSplit: env.causeSplit,
        participantSplit: env.participantSplit,
        ownerWallet: env.ownerWallet,
        ownerSplit: env.ownerSplit,
        ownerSecret: env.ownerSecret,
        valuePerEntry: env.valuePerEntry,
        endTime: env.endTime,
        expireTime: env.expireTime,
        destructTime: env.destructTime,
        goal: env.goal
    }, {
        from: env.owner
    });

    // save receipt
    env.fundraiserReceipt = fundraiser.receipt;

    // deploy polling
    const polling = await (await state.interfaces.polling).deploy({
        fundraiser: fundraiser.receipt.contractAddress
    }, {
        from: env.owner
    });

    // save receipt
    env.pollingReceipt = polling.receipt;

}