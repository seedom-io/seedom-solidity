const h = require('./helper');
const m = require('../../seedom-crypter/messages');

module.exports.options = [
    ['to'],
    ['cause', true],
    ['causeMessageString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.causeMessage = env.causeMessage ? env.causeMessage : (
        env.causeMessageString ? m.hex(env.causeMessageString) : m.random()
    );
    
    env.causeSecret = env.causeSecret ? env.causeSecret : m.hash(env.causeMessage, env.cause);
    
    const to = env.to ? env.to : 'fundraiser';

    env.beginReceipt = await (await state.interfaces[to]).begin({
        secret: env.causeSecret
    }, {
        from: env.cause,
        transact: true
    });

}