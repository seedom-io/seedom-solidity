const end = require('./end');
const cli = require('../../chronicle/cli');

module.exports.options = [
    ['runs', true]
];

module.exports.run = async (state) => {

    const { env } = state;

    const distribution = {};
    for (let i = 2; i < state.accountAddresses.length; i++) {
        const address = state.accountAddresses[i];
        distribution[address.toLowerCase()] = 0;
    }

    for (let run = 0; run < env.runs; run++) {
        await end.run(state);
        const actualState = await (await state.interfaces.fundraiser).state({ from: env.owner });
        distribution[actualState.participant.toLowerCase()]++;
    }

    cli.bars(distribution);

}

