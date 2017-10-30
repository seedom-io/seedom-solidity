const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const path = require("path");
const deployer = require('./deployer');
const chrono = require('chrono-node');

module.exports.main = async (state) => {
    
    // do a first deploy (test network, yes force, yes forget, and yes persist)
    state.deployer = await deployer.main({
        force: true,
        forget: true,
        persist: true
    });

    // now stage
    cli.section("stager");

    // setup state
    state.parity = state.deployer.parity;
    state.accountAddresses = state.parity.accountAddresses;
    state.deploymentPlans = state.deployer.deploymentPlans;
    state.web3Instances = state.deployer.web3Instances;
    state.web3 = state.parity.web3;

    // print out set options
    for (let option of state.options) {
        const name = option.name();
        const value = state[name];
        if (value) {
            cli.info("%s = %s", name, value);
        }
    }

    // stage with state and fresh stage
    state.stageModule.stage(state, {});

    cli.success("%s staging complete", state.stageName);
    
    // kill parity
    if (!state.persist) {
        state.parity.execution.process.kill();
    }

    return state;

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
        const stageName = relativeStageFile.substr(0, relativeStageFileExtIndex).replace(path.delimiter, ':');
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

        let command = program.command('stage:' + stageName);

        if ('optionize' in stageModule) {
            command = stageModule.optionize(command);
        }
        
        command.action((state) => {
            state.stageName = stageName;
            state.stageModule = stageModule;
            this.main(state);
        });

    }

}

global.parseDate = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return h.time(date);
}