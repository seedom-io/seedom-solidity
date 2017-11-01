const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const seed = require('./seed');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return seed.optionize(command);
}

module.exports.stage = async (state) => {

    // first seed
    await seed.stage(state);

    const now = ch.now();
    const stage = state.stage;
    const startTime = stage.startTime;

    await cli.progress("waiting for start to happen", startTime - now);

    stage.participants = [];
    // as many address as we have minus owner and charity
    stage.participantsCount = state.accountAddresses.length - 2;
    // start after charity
    for (let i = 2; i < stage.participantsCount; i++) {

        const address = state.accountAddresses[i];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await parity.sendAndCheck(state.web3, transaction, { from: address });

        cli.info("staged participant %s", address);

        stage.participants.push({
            address: address,
            random: random,
            hashedRandom: hashedRandom
        });

    }

    return state;

}