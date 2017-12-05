const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const seed = require('./seed');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return seed.optionize(command)
        .option("--participationEther <number>", "initial participant ether contributed", parseInt);
}

module.exports.stage = async (state) => {

    // first seed
    await seed.stage(state);

    const stage = state.stage;

    stage.participationEther = stage.participationEther ? stage.participationEther : 0;
    stage.participationReceipts = [];
    stage.participants = [];
    
    // start after charity seed
    for (let i = 0; i < stage.participantsCount; i++) {

        const address = state.accountAddresses[i + 2];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const method = stage.instances.seedom.methods.participate(hashedRandom);
        const receipt = await parity.sendMethod(method, { from: address, value: stage.participationEther });

        cli.info("staged participant %s with %d wei", address, stage.participationEther);

        stage.participationReceipts.push(receipt);

        stage.participants.push({
            address: address,
            random: random,
            hashedRandom: hashedRandom
        });

    }

    return state;

}