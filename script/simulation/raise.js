const cli = require('../../chronicle/cli');
const participate = require('./participate');

module.exports.run = async (state) => {

    // participate before raise
    await participate.run(state);
    
    const { env } = state;
    const seedom = await state.interfaces.seedom;

    const raise = env.fallbackRaise ? env.fallbackRaise : 10500;

    for (let participant of env.participants) {

        participant.raiseReceipt = await seedom.fallback({
            from: participant.address, value: raise, transact: true
        });

        cli.info(`raised ${raise} wei for participant ${participant.address}`);
        
    }

}