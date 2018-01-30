const cli = require('./cli');
const h = require('./helper');
const networks = require('./networks');
const fs = require('mz/fs');
const fse = require('fs-extra');
const childProcess = require("child_process");
const commandExists = require('command-exists');
const mkdirp = require('mz-modules/mkdirp');
const path = require("path");
const dir = require('node-dir');

const startupDelay = 5;
const killDelay = 5;

module.exports.main = async (state) => {

    cli.section("parity");

    // ensure parity installed
    if (!(await getInstalled())) {
        cli.error("parity does not exist in path, please install (https://parity.io)");
        return state;
    }

    // see if parity running
    const pid = await getPid();
    // kill if we are told to do so
    if (pid) {
        // do we kill?
        if (state.kill) {
            await kill(pid);
            return state;
        }
    }

    state.network = await h.readNetwork(h.localNetworkName);
    const prepared = await getInitialized();

    // if dirs are prepped and we aren't forced, run parity
    if (prepared && !state.fresh) {
        return await launch(state, pid);
    } else {
        return await initialize(state, pid);
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

const launch = async (state, pid) => {
    
    // get parity chain data
    const parityChain = await h.readJsonFile(h.parityChainFile);
    // get account addresses
    state.accountAddresses = getChainAccountAddresses(parityChain.accounts);

    // execute parity
    if (!pid) {
        await executeUnlocked(state.accountAddresses);
    }

    // set web3
    if (!await networks.setWeb3(state)) {
        return false;
    }
    
    // get authorization token
    state.authorizationToken = await getLastAuthorizationToken();
    return true;

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
    await execute([
        '--unlock',
        accountAddresses.join(),
        '--password',
        h.parityPasswordFile
    ], true);
}

const execute = async (args, detached) => {

    let actualArgs = [
        '--config',
        h.parityTomlFile
    ];

    if (args) {
        actualArgs = actualArgs.concat(args);
    }

    let options = {};
    // launch detached?
    if (detached) {
        options = {
            detached: true,
            stdio: 'ignore'
        }
    };

    let process = childProcess.spawn('parity', actualArgs, options);
    let pid = process.pid;
    process.unref();

    // write the pid file if detached
    if (detached) {
        await h.writeFile(h.parityPidFile, pid);
    }

    await cli.progress("parity starting", startupDelay);

    return pid;

}

const getPid = async () => {
    
    let pid;
    // check for chronicle parity pid
    try {
        pid = await h.readFile(h.parityPidFile);
    } catch (error) {
        return null;
    }

    // no pid, done
    if (!pid) {
        return null;
    }

    let running;

    try {
        running = process.kill(pid, 0);
    }
    catch (error) {
        running = error.code === 'EPERM'
    }

    if (running) {
        return pid;
    }

    return null;

}

const kill = async (pid) => {

    let progress = cli.progress("killing parity", killDelay);

    try {
        process.kill(pid);
    } catch (error) {
    }

    await progress;
}

const getLastAuthorizationToken = async () => {
    const authCodes = await h.readFile(h.paritySignerAuthCodesFile);
    const authCodeLines = authCodes.trim().split('\n');
    const lastAuthCodeLine = authCodeLines.slice(-1)[0];
    const lastAuthCodeLineParts = lastAuthCodeLine.split(';');
    return lastAuthCodeLineParts[0];
}

const initialize = async (state, pid) => {

    cli.info("initializing parity");

    // if we received a pid, kill it
    if (pid) {
        await kill(pid);
    }

    // deinitialize
    await fse.emptyDir(h.parityDir);
    // populate network configuration
    populateToml(state.network.toml);
    // save network toml
    await writeToml(state.network.toml);
    // write initial chain
    await h.writeJsonFile(h.parityChainFile, state.network.chain);
    cli.success("initial parity chain file written");
    // write password file
    await h.writeFile(h.parityPasswordFile, state.network.password);

    // run parity to open rpc for account creation
    pid = await execute();
    // set web3
    if (!await networks.setWeb3(state)) {
        return false;
    }
    
    // create accounts from network
    state.accountAddresses = await createAccounts(state);
    // generate authorization token
    state.authorizationToken = await createAuthorizationToken(state);
    // close parity
    await kill(pid);

    // log accounts to the chain
    await logAccounts(state);
    // write the chain file with accounts now added
    await h.writeJsonFile(h.parityChainFile, state.network.chain);
    cli.success("final parity chain file written with accounts");
    // delete chain db data
    await fse.emptyDir(h.parityDbDir);
    cli.success("initial chain database cleared for new genesis");

    // run and stop parity (genesis)
    await executeUnlocked(state.accountAddresses);
    return true;

}

const populateToml = (toml) => {
    toml.parity.base_path = h.parityDir;
    toml.parity.chain = h.parityChainFile;
    toml.parity.db_path = h.parityDbDir;
    toml.parity.keys_path = h.parityKeysDir;
    toml.ipc.path = h.parityIpcFile;
    toml.dapps.path = h.parityDappsDir;
    toml.secretstore.path = h.paritySecretstoreDir;
    toml.ui.path = h.paritySignerDir;
    toml.misc.log_file = h.parityLogFile;
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
    cli.success("parity toml configuration written");

}

const logAccounts = (state) => {
    for (let accountAddress of state.accountAddresses) {
        state.network.chain.accounts[accountAddress] = {
            balance: state.network.balance
        }
    }
}

const createAccounts = async (state) => {
    
    const addresses = [];

    for (let i = 0; i < state.network.accounts; i++) {

        const recovery = state.network.password + i;
        const address = await networks.callProvider('parity_newAccountFromPhrase', [
            recovery, state.network.password
        ], state);

        cli.success("created network account %s", address);
        addresses.push(address);

    }

    cli.success("all network accounts created");
    return addresses;

}

const createAuthorizationToken = async (state) => {
    const authorizationToken = await networks.callProvider('signer_generateAuthorizationToken', [], state);
    cli.success("created authorization token %s", authorizationToken);
    return authorizationToken;
}
