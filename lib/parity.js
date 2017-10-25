const cli = require('./cli');
const h = require('./helpers');
const network = require('./network');
const fs = require('mz/fs');
const fse = require('fs-extra');
const childProcess = require("child_process");
const commandExists = require('command-exists');
const mkdirp = require('mz-modules/mkdirp');
const path = require("path");
const dir = require('node-dir');

const startupDelay = 8;

// singleton parity instance
let parity;

module.exports.initialize = async (force) => {

    // check for running
    if (parity) {
        cli.error('parity cannot be initialized while running');
        return false;
    }

    // ensure parity installed
    if (!(await getInstalled())) {
        cli.error('parity does not exist in path, please install (https://parity.io)');
        return;
    }

    const prepared = await getInitialized();
    // if dirs are prepped and we aren't forced, run parity
    if (prepared && !force) {
        cli.success('parity already initialized');
        return await this.startUnlocked();
    } else {
        return await reinitialize();
    }

}

const getInstalled = async () => {
    try {
        await commandExists('parity');
        return true;
    } catch (error) {
        return false;
    }
}

const getInitialized = async () => {
    const items = await fs.readdir(h.parityDir);
    return items.length > 0;
}

const reinitialize = async () => {

    // deinitialize
    await fse.emptyDir(h.parityDir);
    // get config
    const config = await getConfig();
    if (!config) {
        return;
    }

    await writeToml(config.toml);
    // write initial chain
    await h.writeJsonFile(h.parityChainFile, config.chain);
    cli.success('initial parity chain file written');
    // load network configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    const networkParams = network.getParams(h.testNetworkName, networkConfig);
    // write password file
    await h.writeFile(h.parityPasswordFile, networkParams.password);

    // run parity to open rpc for account creation
    await this.start();
    // get web3
    const web3 = await network.getWeb3(networkParams);
    // create accounts from network
    const accounts = await network.createAccounts(networkParams, web3);
    // generate authorization token
    await network.createAuthorizationToken(web3);
    // close parity
    this.stop();

    // log accounts to the chain
    await logAccounts(accounts, config.chain);
    // write the chain file with accounts now added
    await h.writeJsonFile(h.parityChainFile, config.chain);
    cli.success('final parity chain file written with accounts');

    // delete chain db data
    await fse.emptyDir(h.parityDbDir);
    cli.success('initial chain database cleared for new genesis');
    // run and stop parity (genesis)
    return await this.startUnlocked(accounts);

}

const getConfig = async () => {

    try {

        const config = await h.loadJsonFile(h.parityConfigFile);

        config.toml.parity.base_path = h.parityDir;
        config.toml.parity.chain = h.parityChainFile;
        config.toml.parity.db_path = h.parityDbDir;
        config.toml.parity.keys_path = h.parityKeysDir;
        config.toml.ipc.path = h.parityIpcFile;
        config.toml.dapps.path = h.parityDappsDir;
        config.toml.secretstore.path = h.paritySecretstoreDir;
        config.toml.ui.path = h.paritySignerDir;
        config.toml.misc.log_file = h.parityLogFile;

        return config;

    } catch (error) {
        cli.error('failed to parse parity config (' + error + ')');
        return null;
    }

}

const writeToml = async (toml) => {

    let data = '';
    // write sections
    for (let sectionName in toml) {
        // write [section]
        data += '[' + sectionName + ']\n';
        const section = toml[sectionName];
        // write parameters
        for (let parameterName in section) {
            const value = section[parameterName];
            data += parameterName + ' = ' + JSON.stringify(value) + '\n';
        }
    }

    await h.writeFile(h.parityTomlFile, data);
    cli.success('parity toml configuration written');

}

module.exports.start = async (args) => {

    if (parity) {
        cli.error('parity cannot be run multiple times');
        return null;
    }

    cli.info('starting parity...');

    let actualArgs = [
        '--config',
        h.parityTomlFile
    ];

    if (args) {
        actualArgs = actualArgs.concat(args);
    }

    parity = childProcess.spawn('parity', actualArgs);

    const closed = new Promise((fulfill, reject) => {
        parity.on('close', () => {
            console.log('closed');
            fulfill();
        })
    });

    await h.sleep(startupDelay);

    return {
        closed: closed
    }

}

module.exports.startUnlocked = async (accounts) => {

    // if no accounts passed in, use chain file accounts
    if (!accounts) {
        const parityChain = await h.loadJsonFile(h.parityChainFile);
        accounts = parityChain.accounts;
    }

    const addresses = [];
    // remove built in accounts
    for (let address in accounts) {
        const account = accounts[address];
        if (!('builtin' in account)) {
            addresses.push(address);
        }
    }

    return await this.start([
        '--unlock',
        addresses.join(),
        '--password',
        h.parityPasswordFile
    ]);

}

module.exports.stop = () => {

    if (!parity) {
        cli.error('parity not running to stop');
        return false;
    }

    parity.kill();
    parity = null;
    cli.success('parity stopped');
    return true;

}

const logAccounts = (accounts, chain) => {
    for (let address in accounts) {
        chain.accounts[address] = accounts[address];
    }
}

module.exports.snapshot = async (web3) => {
    return await network.callWeb3(web3, 'evm_snapshot');
}

module.exports.revert = async (snapshot, web3) => {
    return await network.callWeb3(web3, 'evm_revert', [snapshot]);
}