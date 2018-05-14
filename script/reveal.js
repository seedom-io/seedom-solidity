const h = require('./helper');
const m = require('../../seedom-crypter/messages');

module.exports.options = [
    ['to'],
    ['owner', true],
    ['ownerMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.ownerMessage = env.ownerMessage ? env.ownerMessage : m.hex(env.ownerMessageString);

    const to = env.to ? env.to : 'fundraiser';

    // only the owner can reveal their secret message
    env.revealReceipt = await (await state.interfaces[to]).reveal({
        message: env.ownerMessage
    }, { from: env.owner, transact: true });

}