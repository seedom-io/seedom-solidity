const h = require('./helper');

module.exports.options = [
    ['to'],
    ['charity', true],
    ['charityRandomString']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.charityRandom = env.charityRandom ? env.charityRandom : (
        env.charityRandomString ? h.hexRandom(env.charityRandomString) : h.randomHex()
    );
    
    env.charityHashedRandom = h.hashRandom(env.charityRandom, env.charity);
    const to = env.to ? env.to : 'seedom';

    env.seedReceipt = await (await state.interfaces[to]).seed({
        charityHashedRandom: env.charityHashedRandom
    }, {
        from: env.charity,
        transact: true
    });

}