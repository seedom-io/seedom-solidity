const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const path = require("path");
const deployer = require('./deployer');

module.exports.stage = async (stageName, dependentStageModules, options, persist) => {

    const state = {};
    
    // do a first deploy (test network, yes force, yes forget, and yes persist)
    state.deployer = await deployer.all(null, true, true, true);
    // get parity as a force deployment will have started it
    state.parity = state.deployer.parity;

    // now stage
    cli.section("stager");

    const stage = {
        web3: state.parity.web3,
        accountAddresses: state.parity.accountAddresses,
        deploymentPlans: state.deployer.deploymentPlans,
        web3Instances: state.deployer.web3Instances,
        options: options
    }

    // run modules in order
    for (let dependentStageModule of dependentStageModules) {
        dependentStageModule.module.stage(stage);
        cli.success("%s stage done", dependentStageModule.name);
    }

    cli.success("staging complete");
    
    // kill parity
    if (!persist) {
        state.parity.execution.process.kill();
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

        if ('options' in stageModule) {
            for (let option of stageModule.options) {
                command = command.option(option[0], option[1]);
            }
        }

        let dependentStageModules = [{
            name: stageName,
            module: stageModule
        }];

        let currentStageModule = stageModule;
        // add required stage modules in order
        while ('dependent' in currentStageModule) {

            const dependentStageName = currentStageModule.dependent;
            currentStageModule = stageModules[dependentStageName];

            dependentStageModules.unshift({
                name: dependentStageName,
                module: currentStageModule
            });

        };
        
        command.action((options) => {
            this.stage(stageName, dependentStageModules, options);
        });

    }

}