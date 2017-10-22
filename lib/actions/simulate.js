const Web3 = require('web3');
const h = require('../helpers');
const simulator = require('../simulator');
const cli = require('../cli');
const deploy = require('./deploy');

module.exports = async (test) => {

    cli.section('simulate');

    const simulatorConfig = await h.loadJsonFile(h.simulatorConfigFile);
    const hostname = simulatorConfig.hostname;
    const port = simulatorConfig.port;

    // start testrpc simulator
    const simulation = await simulator.start(hostname, port);

    cli.success('testrpc simulator started at %s:%d\n', hostname, port);

    // finally deploy
    const deployResult = await deploy();

    if (!test) {
        cli.important('press ctl-c to end simulator');
    }

    return {
        web3: deployResult.web3,
        simulation: simulation
    };

}