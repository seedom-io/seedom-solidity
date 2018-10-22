const Web3 = require('web3');
const dir = require('node-dir');
const path = require("path");
const WebsocketProvider = require('./ws');
const https = require('https');
const keythereum = require('keythereum');
const cli = require('./cli');
const net = require('net');
const h = require('./helper');
const parity = require('./parity');

const defaults = {
    jsonrpc: "2.0",
    gas: 1500000,
    gasPrice: 30000000000000
};

module.exports.main = async (state) => {

    cli.section("Network");

    // if no network specified, default to localhost
    if (!state.networkName) {
        cli.info(`${h.localNetworkName} network chosen as no network specified`);
        state.networkName = h.localNetworkName;
    }

    // set up parity first?
    if (state.networkName == h.localNetworkName) {
        if (!(await parity.main(state))) {
            return;
        }
    }

    // setup network
    await network(state);

}

const network = async (state) => {

    // read network into state if not already loaded
    if (!('network' in state)) {
        state.network = await h.readNetwork(state.networkName);
    }

    // ask for password
    if (!('password' in state.network)) {
        state.network.password = await cli.question("What is your account password?");
    }

    // ensure we have a directory for keys
    if (!('keysDir' in state.network)) {
        cli.error(`${state.networkName} network does not specify a keys directory`);
        return;
    }

    state.network.keys = await getKeys(state.network.keysDir, state.network.password);
    // load all keys from keys directory and get private keys from password
    if (h.objLength(state.network.keys) == 0) {
        cli.warning("no network keys found");
        return;
    }

    // convert to object for easy finding of address key
    state.network.addresses = getAddresses(state.network.keys);

    // set web3 instance
    if (!await this.setWeb3(state)) {
        return;
    }

    // set nonces
    state.network.nonces = await getNonces(state.network.keys, state);

};

const getKeys = async (keysDir, password) => {

    const keys = [];
    const keyFiles = await dir.promiseFiles(keysDir);
    for (let keyFile of keyFiles) {

        // only no extension files (UTC...)
        if  (path.extname(keyFile) != '') {
            continue;
        }

        const key = await h.readJsonFile(keyFile);
        key.address = '0x' + key.address;
        key.privateKey = '0x' + keythereum.recover(password, key).toString('hex');
        keys.push(key);

    }

    return keys;

};

const getAddresses = (keys) => {

    const addresses = {};
    for (let key of keys) {
        addresses[key.address] = key;
    }
    return addresses;

};

const getNonces = async (keys, state) => {

    const nonces = {};
    // get nonces
    for (let key of keys) {
        nonces[key.address] = await state.web3.eth.getTransactionCount(key.address);
    }

    return nonces;

};

module.exports.setWeb3 = async (state) => {

    state.web3 = await createWeb3(state.network);
    if (!(await testWeb3(state.web3))) {
        return false;
    }

    return true;

}

const createWeb3 = async (network) => {

    let provider;

    if ('wsUrl' in network) {
        // use websocket; the next best thing to IPC
        provider = await createWsProvider(network);
    } else if ('rpcUrl' in network) {
        // use rpc (http)
        provider = new Web3.providers.HttpProvider(network.rpcUrl);
    } else {
        // assume local test; create web3 ipc provider (parity)
        provider = createParityProvider(network);
    }

    return new Web3(provider);

};

const createWsProvider = async (network) => {
    return new WebsocketProvider(network.wsUrl);
};

const createParityProvider = (network) => {
    return new Web3.providers.IpcProvider(h.parityIpcFile, net);
};

const testWeb3 = async (web3) => {
    try {
        return await web3.eth.net.isListening();
    } catch (error) {
        return false;
    }
};

module.exports.destroyWeb3 = (state) => {
    
    if (!state.web3) {
        return;
    }

    if ('destroy' in state.web3.currentProvider.connection) {
        // ipc destroy
        state.web3.currentProvider.connection.destroy();
    } else {
        // websocket close
        state.web3.currentProvider.connection.close();
    }
    
}

module.exports.callProvider = async (method, args, state) => {

    const request = {
        jsonrpc: defaults.jsonrpc,
        method: method,
        id: new Date().getTime(),
        params: args
    };

    const result = await new Promise((accept, reject) => {
        state.web3.currentProvider.send(request, (error, result) => {
            if (error) {
                reject(error);
            } else {
                accept(result);
            }
        });
    });

    return result.result;

};

module.exports.deploy = async (contract, args, options, state) => {

    const instance = new state.web3.eth.Contract(contract.abi);

    const method = instance.deploy({
        data: '0x' + contract.evm.bytecode.object,
        arguments: args
    });

    const receipt = await this.sendMethod(method, options, state);
    // set up existing instance
    instance.options.address = receipt.contractAddress;
    instance.setProvider(state.web3.currentProvider);
    cli.info(`${contract.name} contract deployed to ${receipt.contractAddress}`);

    return {
        instance,
        receipt
    };

};

module.exports.sendMethod = (method, options, state) => {

    const transaction = { data: method.encodeABI() };
    const massagedTransaction = massageTransaction(transaction, options, state);

    if (method._parent.options.address) {
        massagedTransaction.to = method._parent.options.address;
    }

    return sendTransaction(massagedTransaction, options, state);

};

module.exports.sendFallback = (instance, options, state) => {

    const massagedTransaction = massageTransaction({
        to: instance.options.address,
    }, options, state);

    return sendTransaction(massagedTransaction, options, state);

};

const massageTransaction = (transaction, options, state) => {

    const massagedTransaction = {
        ...transaction,
        gas: getOption('gas', options, state.network),
        gasPrice: getOption('gasPrice', options, state.network)
    };

    if ('value' in options) {
        massagedTransaction.value = options.value;
    }

    return massagedTransaction;
        
};

const getOption = (name, options, network) => {

    if (name in options) {
        return options[name];
    }

    if (name in network) {
        return network[name];
    }

    if (name in defaults) {
        return defaults[name];
    }

}

const sendTransaction = (transaction, options, state) => {

    // get from and private key
    const from = options.from ? options.from.toLowerCase() : state.network.keys[0].address;
    const privateKey = state.network.addresses[from].privateKey;
    // manage the nonce
    const nonce = state.network.nonces[from];
    state.network.nonces[from] += 1;
    transaction.nonce = nonce;

    return new Promise((accept, reject) => {

        // sign transaction and send it off to the ethers
        state.web3.eth.accounts.signTransaction(transaction, privateKey).then((signedTransaction) => {
            state.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction).then((receipt) => {

                cli.info(`gas used: ${receipt.gasUsed}`);
                // check for standard transaction result
                if (!receipt.status || receipt.status === "0x0") {
                    cli.json(receipt);
                    reject(new Error("Something Thrown"));
                    return;
                }
    
                // accept receipt (receipt only)
                accept(receipt);
    
            }).catch ((error) => {

                reject(error);

            });
        });
    });

}