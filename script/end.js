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

    const to = env.to ? env.to : 'seedom';

    // only the charity can end the ether-raiser
    env.endReceipt = await (await state.interfaces[to]).end({
        charityRandom: env.charityRandom
    }, { from: env.charity, transact: true });

}