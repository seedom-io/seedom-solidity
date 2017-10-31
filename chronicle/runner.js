const Web3 = require('web3');
const h = require('./helper');
const cli = require('./cli');
const deployer = require('./deployer');
const parity = require('./parity');

module.exports.main = async (state) => {
    
    // first deploy (test network, no force, yes forget, and yes persist)
    state.deployer = await deployer.main({
        force: false,
        forget: true,
        persist: true
    });

    // make sure parity is running
    if ('parity' in state.deployer) {
        state.parity = state.deployer.parity;
    } else {
        state.parity = await parity.main({
            fresh: false,
            persist: true
        });
    }

    cli.section("runner");

    cli.important("press ctl-c to end");

    // wait for ctl-c or for something to die on its own
    await state.parity.execution.closed;

    return state;

}