const ch = require('../../chronicle/helper');
const h = require('../helper');
const cli = require('../../chronicle/cli');
const raise = require('./raise');

module.exports.run = async (state) => {

    // raise before reveal
    await raise.run(state);

    const { env } = state;
    
    const now = ch.timestamp();
    await cli.progress("waiting for reveal phase", env.revealTime - now);

    // reveal original participants with their randoms
    for (let participant of env.participants) {

        participant.revealReceipt = await (await state.interfaces.seedom).reveal({
            random: participant.random
        }, { from: participant.address, transact: true });

        cli.info(`revealed participant ${participant.address}`);

    }

}