const Web3 = require('web3');
const h = require('./helpers');
const cli = require('./cli');
const deploy = require('./deploy');
const parity = require('./parity');

module.exports = async () => {

    const state = {};
    
    // first deploy
    state.deploy = await deploy.network(null, false, true);

    // make sure parity is running
    if ('parity' in state.deploy) {
        state.parity = state.deploy.parity;
    } else {
        state.parity = await parity.start();
    }

    cli.section('run');
    cli.important('press ctl-c to end');

    // wait for ctl-c or for something to die on its own
    await state.parity.execution.closed;

}