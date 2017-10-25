const Web3 = require('web3');
const h = require('./helpers');
const cli = require('./cli');
const deploy = require('./deploy');

module.exports = async (test) => {

    // first deploy
    const result = await deploy();

    cli.section('run');

    cli.success('running');

    if (!test) {
        cli.important('press ctl-c to end');
    }

    return {
        web3: result.web3
    };

}