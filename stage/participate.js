const ch = require('../chronicle/helper');
const h = require('./helper');
const seed = require('./seed');
const cli = require('../chronicle/cli');
const networks = require('../chronicle/networks');

module.exports.optionize = (command) => {
    return seed.optionize(command)
        .option("--participationWei <number>", "initial participant wei contributed", parseInt);
}

module.exports.stage = async (state) => {

    // first seed
    await seed.stage(state);

    const stage = state.stage;
    stage.participationWei = stage.participationWei ? stage.participationWei : 0;
    stage.participationReceipts = [];
    stage.participants = [];
    // start after charity seed
    for (let i = 0; i < stage.participantsCount; i++) {

        const address = state.accountAddresses[i + 2];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const method = stage.seedom.methods.participate(hashedRandom);
        const receipt = await networks.sendMethod(method, {
            from: address,
            value: stage.participationWei
        }, state);

        cli.info("staged participant %s with %d wei", address, stage.participationWei);

        stage.participationReceipts.push(receipt);

        stage.participants.push({
            address: address,
            random: random,
            hashedRandom: hashedRandom
        });

    }

}