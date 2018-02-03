const util = require('util');
const Web3 = require('web3');
const Web3EthContract = require('../node_modules/web3/node_modules/web3-eth-contract');
const path = require('path');
const fs = require('mz/fs');
const h = require('./helper');
const cli = require('./cli');
const network = require('./network');
const dir = require('node-dir');

const iAmCompletelySure = "I AM COMPLETELY SURE";

module.exports.main = async (state) => {
    
    // now network
    await network.main(state);

    // now stage
    cli.section("stager");

    cli.info("staging %s", state.stageName);

    // first run through dependency stages
    if (state.initialize) {
        let stageModule = state.stageModule;
        while (stageModule.dependency) {
            stageModule = state.stageModules[stageModule.dependency];
            await stageModule.stage(state);
        }
    }

    // now run through requested stage
    await state.stageModule.stage(state);

    // log deployment information to network file if we want to
    if (!state.forget) {
        h.writeDeployment(networkName, state.deployment);
        cli.success("network deployment written");
    }
    
    // print out stage for all to see
    printStage(state.stage);

    cli.success("%s staging complete", state.stageName);

}

const printStage = (stage) => {
    const printableStage = {};
    for (let name in stage) {
        if (!(stage[name] instanceof Web3EthContract)) {
            printableStage[name] = stage[name];
        }
    }
    cli.json(printableStage, "final staging data");
}

module.exports.prepare = async (program) => {

    const stageModules = await getStageModules(stageFiles);

    for (let stageName in stageModules) {

        const stageModule = stageModules[stageName];

        let command = program
            // setup stage command
            .command('stage:' + stageName + ' [network]')
            // add forget option
            .option('-i, --initialize', "initialize from the beginning")
            .option('-f, --forget', "forget network deployment")
            // add action to command
            .action((network, options, commander) => {
                execute({
                    networkName: network,
                    stageName: stageName,
                    stageModule: stageModule,
                    stageModules: stageModules,
                    stage: {},
                    initialize: options.initialize ? true : false,
                    forget: options.forget ? true : false
                }, commander);
            });

        // add dynamic options to command from stage module
        stageModule.optionize(command);
        
    }

}

const getStageModules = async () => {

    const stageModules = {};
    const stageFiles = getStageFiles();
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

const getStageFiles = async () => {
    const stageFiles = await dir.promiseFiles(h.stageDir);
    return stageFiles.filter(file => path.extname(file) == '.' + h.jsExt);
}

const execute = async (state, commander) => {

    // copy options directly to stage
    for (let option of commander.options) {
        const optionName = option.name();
        const optionValue = commander[optionName];
        if (optionValue) {
            state.stage[optionName] = optionValue;
        }
    }

    // run stage module
    await this.main(state);
    // kill web3 if we have it
    network.destroyWeb3(state);

};