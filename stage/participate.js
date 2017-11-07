const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const seed = require('./seed');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return seed.optionize(command)
        .option("--participationFunds <number>", "initial participant funds", parseInt);
}

module.exports.stage = async (state) => {

    // first seed
    await seed.stage(state);

    const stage = state.stage;

    stage.participationFunds = stage.participationFunds ? stage.participationFunds : 0;
    stage.participationReceipts = [];
    stage.participants = [];
    
    // start after charity
    for (let i = 0; i < stage.participantsCount; i++) {

        const address = state.accountAddresses[i + 2];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const method = stage.instances.charity.methods.participate(hashedRandom);
        const receipt = await parity.sendMethod(method, { from: address, value: stage.participationFunds });

        cli.info("staged participant %s with %d wei", address, stage.participationFunds);

        stage.participationReceipts.push(receipt);

        stage.participants.push({
            address: address,
            random: random,
            hashedRandom: hashedRandom
        });

    }

    return state;

}