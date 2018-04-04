const cli = require('../../chronicle/cli');
const participate = require('./participate');

module.exports.run = async (state) => {

    // participate before raise
    await participate.run(state);
    
    const { env } = state;
    const fundraiser = await state.interfaces.fundraiser;

    const raise = env.fallbackRaise ? env.fallbackRaise : 10500;

    for (let participant of env.participants) {

        participant.raiseReceipt = await fundraiser.fallback({
            from: participant.address, value: raise, transact: true
        });

        cli.info(`raised ${raise} wei for participant ${participant.address}`);
        
    }

}