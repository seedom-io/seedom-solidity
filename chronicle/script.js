const util = require('util');
const Web3 = require('web3');
const Web3EthContract = require('../node_modules/web3/node_modules/web3-eth-contract');
const path = require('path');
const fs = require('mz/fs');
const h = require('./helper');
const interface = require('./interface');
const cli = require('./cli');
const network = require('./network');
const parser = require('./parser');
const dir = require('node-dir');

module.exports.main = async (state) => {

    cli.info(`running script ${state.scriptName}`);
    // make sure env supplied (no missing args)
    if (!state.env) {
        return;
    }
    
    // first interface
    await interface.main(state);

    // now script
    cli.section("Script");

    // now run through requested script
    await state.scripts[state.scriptName].run(state);
    
    // print out env for all to see
    if (state.print) {
        printEnv(state.env);
    }

    cli.success(`${state.scriptName} script complete`);

    // log deployment information to network file if we want to
    if (!state.forget) {
        await interface.save(state);
    }

}

const printEnv = (env) => {
    const printableEnv = {};
    for (let name in env) {
        if (!(env[name] instanceof Web3EthContract)) {
            printableEnv[name] = env[name];
        }
    }
    cli.json(printableEnv, "final env data");
}

module.exports.prepare = async (program, state) => {
    state.scripts = await getScripts();
    prepareCommands(program, state);
};

const getScripts = async () => {

    const scripts = {};
    const scriptFiles = await getScriptFiles();
    for (let scriptFile of scriptFiles) {

        const relativeScriptFile = path.relative(h.scriptDir, scriptFile);
        const relativeScriptFileExtIndex = relativeScriptFile.indexOf('.' + h.jsExt);
        const scriptName = relativeScriptFile.substr(0, relativeScriptFileExtIndex);
        const requireScriptFile = path.join('../', scriptFile);
        const script = require(requireScriptFile);

        if (!('options' in script)) {
            continue;
        }

        if (!('run' in script)) {
            continue;
        }

        script.name = scriptName;
        scripts[scriptName] = script;
        
    }

    return scripts;

};

const getScriptFiles = async () => {
    const scriptFiles = await dir.promiseFiles(h.scriptDir);
    return scriptFiles.filter(file => path.extname(file) == '.' + h.jsExt);
}

const prepareCommands = (program, state) => {
    for (let scriptName in state.scripts) {
        const script = state.scripts[scriptName];
        prepareCommand(program, script, state);
    }
};

const prepareCommand = (program, script, state) => {

    const command = program
        .command(`script:${script.name} [network]`)
        .option('--forget', "forget network deployment")
        .option('--print', "print environment data");

    // get script options
    const scriptOptions = parser.getOptions(script.options);
    prepareCommandOptions(command, scriptOptions);

    // action
    command.action((networkName, options, commander) => {
        cli.section("Script");
        // begin script
        this.main(Object.assign(state, {
            networkName,
            scriptName: script.name,
            env: parser.getValues(options, scriptOptions),
            forget: options.forget ? true : false,
            print: options.print ? true : false
        })).then(() => {
            // kill web 3
            network.destroyWeb3(state);
        });
    });

};

const prepareCommandOptions = (command, options) => {
    for (let option of options) {
        command.option.apply(command, option.commander);
    }
}