const h = require('./helper');

module.exports.options = [
    ['to'],
    ['cause', true],
    ['causeMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.causeMessage = env.causeMessage ? env.causeMessage : h.hexMessage(env.causeMessageString);

    const to = env.to ? env.to : 'fundraiser';

    // only the cause can reveal their secret message
    env.revealReceipt = await (await state.interfaces[to]).reveal({
        message: env.causeMessage
    }, { from: env.cause, transact: true });

}