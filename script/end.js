const h = require('./helper');

module.exports.options = [
    ['to'],
    ['owner', true],
    ['ownerMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.ownerMessage = env.ownerMessage ? env.ownerMessage : h.hexMessage(env.ownerMessageString);

    const to = env.to ? env.to : 'fundraiser';

    // only the owner can select in the fundraiser
    env.endReceipt = await (await state.interfaces[to]).end({
        message: env.ownerMessage
    }, { from: env.owner, transact: true });

}