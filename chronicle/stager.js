const util = require('util');
const Web3 = require('web3');
const path = require('path');
const fs = require('mz/fs');
const h = require('./helper');
const compiler = require('./compiler');
const cli = require('./cli');
const networks = require('./networks');
const parity = require('./parity');
const dir = require('node-dir');

const iAmCompletelySure = "I AM COMPLETELY SURE";

module.exports.main = async (state) => {

    // compile first
    Object.assign(state, await compiler.main({}));

    // now stage
    cli.section("stager");

    // if no network specified, default to localhost
    if (!state.networkName) {
        cli.info("'%s' network chosen as no network specified", h.localNetworkName);
        state.networkName = h.localNetworkName;
    }

    const networkState = (networkName == h.localNetworkName)
        ? await parity.main({ fresh: false })
        : await networks.main();

    if (!networkState) {
        return false;
    }

    Object.assign(state, networkState);

    cli.info("staging %s", state.stageName);
    // stage with state and fresh stage
    await state.stageModule.stage(state);
    // log deployment information to network file if we want to
    if (state.deployment) {
        h.writeDeployment(networkName, state.deployment);
        cli.success("deployments written");
    }
    
    // print out stage for all to see
    printStage(state.stage);

    cli.success("%s staging complete", state.stageName);

}


const getDeployment = async (deploymentFile) => {
    try {
        return await h.readJsonFile(deploymentFile);
    } catch (error) {
        return {};
    }
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
            networks.destroyWeb3(state);

        });

    }

}

global.parseDate = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return h.timestamp(date);
}