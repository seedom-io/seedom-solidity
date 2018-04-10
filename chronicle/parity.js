const cli = require('./cli');
const h = require('./helper');
const network = require('./network');
const fs = require('mz/fs');
const fse = require('fs-extra');
const childProcess = require("child_process");
const commandExists = require('command-exists');
const mkdirp = require('mz-modules/mkdirp');
const path = require("path");
const dir = require('node-dir');

const pollDelay = 5;
const killDelay = 5;
const maxDelay = 60;

module.exports.main = async (state) => {

    cli.section("Parity");

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
    try {
        const items = await fs.readdir(h.parityDir);
        return items.length > 0;
    } catch (error) {
        return false;
    }
}

const launch = async (state, pid) => {
    
    // get parity chain data
    const parityChain = await h.readJsonFile(h.parityChainFile);
    // get account addresses
    state.accountAddresses = getChainAccountAddresses(parityChain.accounts);

    if (pid) {
        // set web3
        if (!await network.setWeb3(state)) {
            return false;
        }
    } else {
        // execute parity
        await execute(true, state);
    }
    
    // get authorization token
    state.authorizationToken = await getLastAuthorizationToken();
    cli.success("parity launched");
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

const execute = async (detached, state) => {

    const args = [
        '--config',
        h.parityTomlFile
    ];

    let options = {};
    // launch detached?
    if (detached) {
        options = {
            detached: true,
            stdio: 'ignore'
        }
    };

    let process = childProcess.spawn('parity', args, options);
    let pid = process.pid;
    process.unref();

    // write the pid file if detached
    if (detached) {
        await h.writeFile(h.parityPidFile, pid);
    }
    
    let delay = 0;
    // wait for parity to start by setting web3
    while (!await network.setWeb3(state)) {
        await cli.progress("waiting for parity to start", pollDelay);
        delay += pollDelay;
        if (delay > maxDelay) {
            return null;
        }
    }

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

    // mkdir
    mkdirp(h.parityDir);
    // deinitialize
    await fse.emptyDir(h.parityDir);

    // save parity toml
    await writeToml(state.network.toml);
    cli.success("initial parity toml file written");
    // write initial chain
    await h.writeJsonFile(h.parityChainFile, state.network.chain);
    cli.success("initial parity chain file written");

    // run parity to open rpc for account creation
    pid = await execute(false, state);
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
    // write the final toml file
    await writeToml(state.network.toml, state.accountAddresses);
    cli.success("final parity toml file written with accounts");
    // write password file
    await writePasswordFile(state.network.password, state.accountAddresses.length);
    cli.success("parity password file written");
    // delete chain db data
    await fse.emptyDir(h.parityDbDir);
    cli.success("initial chain database cleared for new genesis");


    // run and stop parity (genesis)
    await execute(true, state);
    cli.success("parity initialized");
    return true;

}

const writePasswordFile = async (password, count) => {
    let data = '';
    for (let i = 0; i < count; i++) {
        data += `${password}\n`;
    }
    await h.writeFile(h.parityPasswordFile, data);
};

const writeToml = async (networkToml, unlockAddresses) => {

    // copy network toml
    const toml = { ...networkToml };
    // base toml data
    toml.parity.base_path = h.parityDir;
    toml.parity.chain = h.parityChainFile;
    toml.parity.db_path = h.parityDbDir;
    toml.parity.keys_path = h.parityKeysDir;
    toml.ipc.path = h.parityIpcFile;
    toml.dapps.path = h.parityDappsDir;
    toml.secretstore.path = h.paritySecretstoreDir;
    toml.ui.path = h.paritySignerDir;
    toml.misc.log_file = h.parityLogFile;

    // set up accounts to unlock
    if (unlockAddresses) {
        toml.account.password = [h.parityPasswordFile];
        toml.account.unlock = unlockAddresses;
    }

    let data = '';
    // write sections
    for (let sectionName in toml) {
        // write [section]
        data += `[${sectionName}]\n`;
        const section = toml[sectionName];
        // write parameters
        for (let parameterName in section) {
            const value = section[parameterName];
            data += `${parameterName} = ${JSON.stringify(value)}\n`;
        }
    }

    await h.writeFile(h.parityTomlFile, data);

};

const logAccounts = (state) => {
    for (let accountAddress of state.accountAddresses) {
        state.network.chain.accounts[accountAddress] = {
            balance: state.network.balance
        }
    }
};

const createAccounts = async (state) => {
    
    const addresses = [];
    for (let i = 0; i < state.network.accounts; i++) {

        const recovery = state.network.password + i;
        const address = await network.callProvider('parity_newAccountFromPhrase', [
            recovery, state.network.password
        ], state);

        cli.success(`created network account ${address}`);
        addresses.push(address);

    }

    return addresses;

};

const createAuthorizationToken = async (state) => {
    const authorizationToken = await network.callProvider('signer_generateAuthorizationToken', [], state);
    cli.success(`created authorization token ${authorizationToken}`);
    return authorizationToken;
};