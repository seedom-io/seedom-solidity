const h = require('./helper');
const m = require('../../seedom-crypter/messages');

module.exports.options = [
    ['to'],
    ['cause', true],
    ['causeMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.causeMessage = env.causeMessage ? env.causeMessage : m.hex(env.causeMessageString);

    const to = env.to ? env.to : 'fundraiser';

    // only the owner can select in the fundraiser
    env.endReceipt = await (await state.interfaces[to]).end({
        message: env.causeMessage
    }, { from: env.cause, transact: true });

}