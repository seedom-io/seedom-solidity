const h = require('./helper');

module.exports.options = [
    ['to'],
    ['cause', true],
    ['causeMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.causeMessage = env.causeMessage ? env.causeMessage : (
        env.causeMessageString ? h.hexMessage(env.causeMessageString) : h.messageHex()
    );
    
    env.causeSecret = env.causeSecret ? env.causeSecret : h.hashMessage(env.causeMessage, env.cause);
    
    const to = env.to ? env.to : 'fundraiser';

    env.beginReceipt = await (await state.interfaces[to]).begin({
        secret: env.causeSecret
    }, {
        from: env.cause,
        transact: true
    });

}