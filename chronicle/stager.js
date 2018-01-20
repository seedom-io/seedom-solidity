const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const path = require("path");
const deployer = require('./deployer');
const networks = require('./networks');
const chrono = require('chrono-node');

module.exports.main = async (state) => {

    // now stage
    cli.section("stager");

    // if no network specified, default to test
    if (!state.networkName) {
        cli.info("'%s' network chosen as no network specified", h.localNetworkName);
        state.networkName = h.localNetworkName
    }

    // first deploy
    state.deployer = await getDeployer(state.networkName);

    // now stage
    cli.section("stager");

    // setup our state from the deployer's
    state.accountAddresses = state.deployer.accountAddresses;
    state.web3 = state.deployer.web3;
    // get all web 3 instances, including ones not deployed
    const instances = await getInstances(
        state.deployer.contractConfig,
        state.deployer.instances,
        state.deployer.networkDeployment,
        state.web3
    );

    // something bad happened
    if (!instances) {
        cli.error("'%s' contract is missing from deployment", contractName);
        return state;
    }

    // set stage instances
    state.stage.instances = instances;

    cli.info("staging %s", state.stageName);

    // stage with state and fresh stage
    await state.stageModule.stage(state);
    
    // print out stage for all to see
    printStage(state.stage);

    cli.success("%s staging complete", state.stageName);

    return state;

}

const getDeployer = async (networkName) => {

    if (networkName == h.localNetworkName) {
        // do a first deploy (test network, yes force, no forget)
        return await deployer.main({
            force: true,
            forget: false
        });
    } else {
        // do a first deploy (other network, no force, no forget)
        return await deployer.main({
            force: false,
            forget: false
        });
    }

}

const getInstances = async (
    contractConfig,
    deployedinstances,
    networkDeployment,
    web3
) => {

    const instances = {};

    // the contract config is the source of truth
    for (let contractName in contractConfig) {

        // first check existing deployed web3 instances for this contract
        if (contractName in deployedinstances) {
            instances[contractName] = deployedinstances[contractName];
            continue;
        }

        // we didn't find it there, let's check for latest deployments
        const latestDeployment = deployer.getLatestDeployment(contractName, networkDeployment);
        if (!latestDeployment) {
            return null;
        }

        // we found a latest deployment! let's hook up a new web3 instance
        const abiFile = h.getAbiFile(contractName);
        instances[contractName] = new web3.eth.Contract(abiFile, latestDeployment.address);

    }

    return instances;

}

const printStage = (stage) => {
    const instancelessStage = Object.assign({}, stage);
    delete instancelessStage.instances;
    cli.json(instancelessStage, "final staging data");
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

        command.action(async (network, commander) => {

            const state = {
                networkName: network,
                stageName: stageName,
                stageModule: stageModule,
                stage: {}
            };

            // copy options directly to stage
            for (let option of commander.options) {
                const optionName = option.name();
                const optionValue = commander[optionName];
                if (optionValue) {
                    state.stage[optionName] = optionValue;
                }
            }

            await this.main(state);
            // kill web3 if we have it
            if (state.web3) {
                networks.destroyWeb3(state.web3);
            }

        });

    }

}

global.parseDate = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return h.timestamp(date);
}