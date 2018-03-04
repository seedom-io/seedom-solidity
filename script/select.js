const h = require('./helper');

module.exports.options = [
    ['to'],
    ['owner', true],
    ['ownerMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.ownerMessage = env.ownerMessage ? env.ownerMessage : h.hexMessage(env.ownerMessageString);

    const to = env.to ? env.to : 'seedom';

    // only the owner can select in the ether-raiser
    env.endReceipt = await (await state.interfaces[to]).select({
        message: env.ownerMessage
    }, { from: env.owner, transact: true });

}