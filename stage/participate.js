const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const seed = require('./seed');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return seed.optionize(command)
        .option("--paricipantFunds <number>", "initial participant funds", parseInt)
}

module.exports.stage = async (state) => {

    // first seed
    await seed.stage(state);

    const stage = state.stage;
    const startTime = stage.startTime;
    const kick = await state.web3Instances.charity.methods.currentKick().call({ from: stage.owner });
    await cli.progress("waiting for start phase", startTime - kick._kickTime);

    stage.participantFunds = stage.participantFunds ? stage.participantFunds : 0;

    stage.participants = [];
    // start after charity
    for (let i = 2; i < state.accountAddresses.length; i++) {

        const address = state.accountAddresses[i];
        const random = h.random();
        const hashedRandom = h.hashedRandom(random, address);

        const transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await parity.sendAndCheck(state.web3, transaction, { from: address, value: stage.participantFunds });

        cli.info("staged participant %s", address);

        stage.participants.push({
            address: address,
            random: random,
            hashedRandom: hashedRandom
        });

    }

    return state;

}