module.exports.options = [
    ['to'],
    ['charity', true],
    ['charityRandom']
];

module.exports.run = async (state) => {

    const { env } = state;

    const to = env.to ? env.to : 'seedom';
    // only the charity can end the ether-raiser
    env.endReceipt = await (await state.interfaces[to]).end({
        charityRandom: env.charityRandom
    }, { from: env.charity, transact: true });

}