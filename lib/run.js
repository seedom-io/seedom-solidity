const Web3 = require('web3');
const h = require('./helpers');
const cli = require('./cli');
const deploy = require('./deploy');

module.exports = async () => {

    // first deploy
    const previous = await deploy(null, false, true);

    cli.section('run');

    cli.success('running');

    cli.important('press ctl-c to end');

    // wait for ctl-c or for something to die on its own
    await previous.closed;

}