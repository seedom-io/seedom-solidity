const ch = require('../../chronicle/helper');
const h = require('../helper');
const cli = require('../../chronicle/cli');
const instantiate = require('./instantiate');
const seed = require('./seed');

module.exports.run = async (state) => {

    // seed first
    await seed.run(state);

    const { env } = state;

    const raise = env.participateRaise ? env.participateRaise : 0;
    
    env.participants = [];
    for (let i = 0; i < env.participantsCount; i++) {

        const address = state.accountAddresses[i + 2];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const receipt = await (await state.interfaces.seedom).participate({
            hashedRandom
        }, { from: address, value: raise, transact: true });

        cli.info(`created participant ${address} with ${raise} wei`);

        // save actual participant
        env.participants.push({
            address,
            random,
            hashedRandom,
            participateReceipt: receipt
        });

    }

}