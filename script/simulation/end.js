const reveal = require('./reveal');
const end = require('../end');
const ch = require('../../chronicle/helper');
const cli = require('../../chronicle/cli');

module.exports.run = async (state) => {

    await reveal.run(state);

    const { env } = state;
    const now = ch.timestamp();
    await cli.progress("waiting for end phase", env.endTime - now);

    await end.run(state);

    const actualState = await (await state.interfaces.seedom).state({ from: env.owner });
    // set the winner
    env.winner = actualState.winner;

}