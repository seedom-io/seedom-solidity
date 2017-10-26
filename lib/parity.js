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

const startupDelay = 3;

module.exports.start = async (fresh, persist) => {

    cli.section('parity');

    // ensure parity installed
    if (!(await getInstalled())) {
        cli.error('parity does not exist in path, please install (https://parity.io)');
        return;
    }

    // load network configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    const testNetwork = network.get(h.testNetworkName, networkConfig);
    const prepared = await getInitialized();
    
    // if dirs are prepped and we aren't forced, run parity
    if (prepared && !fresh) {
        return await launch(testNetwork);
    } else {
        return await initialize(testNetwork);
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

const launch = async (testNetwork) => {
    
    // get parity chain data
    const parityChain = await h.loadJsonFile(h.parityChainFile);
    // get account addresses
    const accountAddresses = getChainAccountAddresses(parityChain.accounts);
    // execute parity
    const execution = await executeUnlocked(accountAddresses);
    // get web3
    const web3 = await network.getWeb3(testNetwork);
    // get authorization token
    const authorizationToken = await getLastAuthorizationToken();
    
    return {
        network: testNetwork,
        web3: web3,
        accountAddresses: accountAddresses,
        authorizationToken: authorizationToken,
        execution: execution
    }

}

const getChainAccountAddresses = (chainAccounts) => {

    const addresses = [];
    // remove built in accounts
    for (let address in chainAccounts) {
        const account = chainAccounts[address];
        if (!('builtin' in account)) {
            addresses.push(address);
        }
    }

    return addresses;

}

const executeUnlocked = async (accountAddresses) => {
    return await execute([
        '--unlock',
        accountAddresses.join(),
        '--password',
        h.parityPasswordFile
    ]);
}

const execute = async (args) => {

    cli.info('starting parity...');

    let actualArgs = [
        '--config',
        h.parityTomlFile
    ];

    if (args) {
        actualArgs = actualArgs.concat(args);
    }

    const process = childProcess.spawn('parity', actualArgs);

    const closed = new Promise((fulfill, reject) => {
        process.on('closed', () => {
            fulfill();
        })
    });

    await h.sleep(startupDelay);

    return {
        process: process,
        closed: closed
    }

}

const getLastAuthorizationToken = async () => {
    const authCodes = await h.readFile(h.paritySignerAuthCodesFile);
    const authCodeLines = authCodes.trim().split('\n');
    const lastAuthCodeLine = authCodeLines.slice(-1)[0];
    const lastAuthCodeLineParts = lastAuthCodeLine.split(';');
    return lastAuthCodeLineParts[0];
}

const initialize = async (testNetwork) => {

    cli.info('initializing parity');

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
    // write password file
    await h.writeFile(h.parityPasswordFile, testNetwork.password);

    // run parity to open rpc for account creation
    let execution = await execute();
    // get web3
    const web3 = await network.getWeb3(testNetwork);
    // create accounts from network
    const accountAddresses = await network.createAccounts(testNetwork, web3);
    // generate authorization token
    const authorizationToken = await network.createAuthorizationToken(web3);
    // close parity
    execution.process.kill();

    // log accounts to the chain
    await logAccounts(accountAddresses, testNetwork.balance, config.chain);
    // write the chain file with accounts now added
    await h.writeJsonFile(h.parityChainFile, config.chain);
    cli.success('final parity chain file written with accounts');
    // delete chain db data
    await fse.emptyDir(h.parityDbDir);
    cli.success('initial chain database cleared for new genesis');

    // run and stop parity (genesis)
    execution = await executeUnlocked(accountAddresses);

    return {
        network: testNetwork,
        web3: web3,
        accountAddresses: accountAddresses,
        authorizationToken: authorizationToken,
        execution: execution
    }

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

const logAccounts = (addresses, balance, chain) => {
    for (let address of addresses) {
        chain.accounts[address] = {
            balance: balance
        }
    }
}

module.exports.snapshot = async (web3) => {
    return await network.callWeb3(web3, 'evm_snapshot');
}

module.exports.revert = async (snapshot, web3) => {
    return await network.callWeb3(web3, 'evm_revert', [snapshot]);
}