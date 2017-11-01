const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const path = require("path");
const deployer = require('./deployer');
const chrono = require('chrono-node');

module.exports.main = async (state) => {

    // now stage
    cli.section("stager");

    // if no network specified, default to test
    if (!state.networkName) {
        cli.info("'%s' network chosen as no network specified", h.testNetworkName);
        state.networkName = h.testNetworkName
    }

    // first deploy
    state.deployer = await getDeployer(state.networkName);

    // now stage
    cli.section("stager");

    // setup our state from the deployer's
    state.accountAddresses = state.deployer.accountAddresses;
    state.web3 = state.deployer.web3;
    // get all web 3 instances, including ones not deployed
    state.web3Instances = await getWeb3Instances(
        state.deployer.web3Instances,
        state.deployer.networkDeployment,
        state.web3
    );

    const stage = {};
    // stage with state and fresh stage
    await state.stageModule.stage(state, stage);

    // print out set options
    for (let stageItem in stage) {
        const stageValue = stage[stageItem];
        cli.info("%s = %s", stageItem, stageValue);
    }

    cli.success("%s staging complete", state.stageName);

    return state;

}

const getDeployer = async (networkName) => {

    if (networkName == h.testNetworkName) {
        // do a first deploy (test network, yes force, yes forget)
        return await deployer.main({
            force: true,
            forget: true
        });
    } else {
        // do a first deploy (other network, no force, no forget)
        return await deployer.main({
            force: false,
            forget: false
        });
    }

}

const getWeb3Instances = async (deployedWeb3Instances, networkDeployment, web3) => {

    const web3Instances = {};

    // look through all network deployments
    for (let contractName in networkDeployment) {
        if (contractName in deployedWeb3Instances) {
            // move over existing instances
            web3Instances[contractName] = deployedWeb3Instances[contractName];
        } else {
            // create missing ones
            const latestDeployment = deployer.getLatestDeployment(contractName, networkDeployment);
            const abiFile = h.getAbiFile(contractName);
            web3Instances[contractName] = new web3.eth.Contract(abiFile, latestDeployment.address);
        }
    }

    return web3Instances;

}

module.exports.prepare = async (program) => {
    const stageFiles = await getStageFiles();
    const stageModules = await getStageModules(stageFiles);
    command(program, stageModules);
}

const getStageFiles = async () => {
    const stageFiles = await dir.promiseFiles(h.stageDir);
    return stageFiles.filter(file => path.extname(file) == '.' + h.jsExt);
}

const getStageModules = async (stageFiles) => {

    const stageModules = {};

    for (let stageFile of stageFiles) {

        const relativeStageFile = path.relative(h.stageDir, stageFile);
        const relativeStageFileExtIndex = relativeStageFile.indexOf('.' + h.jsExt);
        const stageName = relativeStageFile.substr(0, relativeStageFileExtIndex);
        const requireStageFile = path.join('../', stageFile);
        const stageModule = require(requireStageFile);

        if (!('optionize' in stageModule)) {
            continue;
        }

        if (!('stage' in stageModule)) {
            continue;
        }

        stageModules[stageName] = stageModule;

    }

    return stageModules;

}

const command = (program, stageModules) => {

    for (let stageName in stageModules) {

        const stageModule = stageModules[stageName];

        let command = program.command('stage:' + stageName + ' [network]');

        if ('optionize' in stageModule) {
            command = stageModule.optionize(command);
        }

        command.action((network, commander) => {

            const state = {
                networkName: network,
                stageName: stageName,
                stageModule: stageModule
            };

            // copy options directly to state
            for (let option of commander.options) {
                const optionName = option.name();
                const optionValue = commander[optionName];
                if (optionValue) {
                    state[optionName] = optionValue;
                }
            }

            this.main(state);

        });

    }

}

global.parseDate = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return h.time(date);
}

global.itemize = (name, fallback, state, stage) => {

    if (name in stage) {
        return;
    }

    if (name in state) {
        stage[name] = state[name];
        return;
    }

    stage[name] = fallback;

}