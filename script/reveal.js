const h = require('./helper');

module.exports.options = [
    ['to'],
    ['charity', true],
    ['charityMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.charityMessage = env.charityMessage ? env.charityMessage : h.hexMessage(env.charityMessageString);

    const to = env.to ? env.to : 'seedom';

    // only the charity can reveal their secret message
    env.revealReceipt = await (await state.interfaces[to]).reveal({
        message: env.charityMessage
    }, { from: env.charity, transact: true });

}