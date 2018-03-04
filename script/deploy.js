const h = require('./helper');

module.exports.options = [
    ['charity', true],
    ['charitySplit', true],
    ['selectedSplit', true],
    ['owner', true],
    ['ownerSplit', true],
    ['ownerMessageString', true],
    ['valuePerEntry', true],
    ['endTime', true],
    ['expireTime', true],
    ['destructTime', true],
    ['maxParticipants', true]
];

module.exports.run = async (state) => {

    const { env } = state;

    env.ownerMessage = env.ownerMessage ? env.ownerMessage : (
        env.ownerMessageString ? h.hexMessage(env.ownerMessageString) : h.messageHex()
    );
    
    env.ownerSecret = h.hashMessage(env.ownerMessage, env.owner);

    env.ownerSecret = env.ownerSecret ? env.ownerSecret : h.hexMessage(env.ownerMessageString);

    // deploy seedom
    env.seedom = await (await state.interfaces.seedom).deploy({
        charity: env.charity,
        charitySplit: env.charitySplit,
        selectedSplit: env.selectedSplit,
        ownerSplit: env.ownerSplit,
        ownerSecret: env.ownerSecret,
        valuePerEntry: env.valuePerEntry,
        endTime: env.endTime,
        expireTime: env.expireTime,
        destructTime: env.destructTime,
        maxParticipants: env.maxParticipants
    }, {
        from: env.owner
    });

    // save receipt
    env.deployReceipt = env.seedom.receipt;

}