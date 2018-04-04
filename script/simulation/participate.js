const ch = require('../../chronicle/helper');
const h = require('../helper');
const cli = require('../../chronicle/cli');
const deploy = require('./deploy');
const begin = require('./begin');

module.exports.run = async (state) => {
    
    await begin.run(state);

    const { env } = state;
    const fundraiser = await state.interfaces.fundraiser;

    const raise = env.participateRaise ? env.participateRaise : 10000;
    
    env.participants = [];
    for (let i = 0; i < env.participantsCount; i++) {

        const address = state.accountAddresses[i + 2];
        const message = h.messageHex();

        const receipt = await fundraiser.participate({
            message
        }, { from: address, value: raise, transact: true });

        cli.info(`created participant ${address} with ${raise} wei`);

        // save actual participant
        env.participants.push({
            address,
            message,
            participateReceipt: receipt
        });

    }

}