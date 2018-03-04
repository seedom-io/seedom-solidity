const h = require('./helper');

module.exports.options = [
    ['to'],
    ['charity', true],
    ['charityMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.charityMessage = env.charityMessage ? env.charityMessage : (
        env.charityMessageString ? h.hexMessage(env.charityMessageString) : h.messageHex()
    );
    
    env.charitySecret = h.hashMessage(env.charityMessage, env.charity);
    
    const to = env.to ? env.to : 'seedom';

    env.seedReceipt = await (await state.interfaces[to]).seed({
        secret: env.charitySecret
    }, {
        from: env.charity,
        transact: true
    });

}