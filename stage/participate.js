const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const seed = require('./seed');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return seed.optionize(command)
        .option("--participantFunds <number>", "initial participant funds", parseInt)
}

module.exports.stage = async (state) => {

    // first seed
    await seed.stage(state);

    const stage = state.stage;
    const now = await h.timestamp(stage.instances.charity);
    const startTime = stage.startTime;
    await cli.progress("waiting for start phase", startTime - now);

    stage.participantFunds = stage.participantFunds ? stage.participantFunds : 0;
    stage.participants = [];
    
    // start after charity
    for (let i = 2; i < state.accountAddresses.length; i++) {

        const address = state.accountAddresses[i];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const method = stage.instances.charity.methods.participate(hashedRandom);
        await parity.sendMethod(method, { from: address, value: stage.participantFunds });

        cli.info("staged participant %s", address);

        stage.participants.push({
            address: address,
            random: random,
            hashedRandom: hashedRandom
        });

    }

    return state;

}