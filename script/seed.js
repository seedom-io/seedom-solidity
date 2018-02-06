const h = require('./helper');

module.exports.options = [
    ['to'],
    ['charity', true],
    ['charityRandom']
];

module.exports.run = async (state) => {

    const { env } = state;

    env.charityRandom = env.charityRandom ? env.charityRandom : h.random();
    env.charityHashedRandom = h.hashedRandom(env.charityRandom, env.charity);
    const to = env.to ? env.to : 'seedom';

    env.seedReceipt = await (await state.interfaces[to]).seed({
        charityHashedRandom: env.charityHashedRandom
    }, {
        from: env.charity,
        transact: true
    });

}