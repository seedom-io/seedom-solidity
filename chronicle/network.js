const Web3 = require('web3');
const cli = require('./cli');
const net = require('net');
const h = require('./helper');
const parity = require('./parity');

const defaults = {
    jsonrpc: "2.0",
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports.main = async (state) => {

    cli.section("Network");

    // if no network specified, default to localhost
    if (!state.networkName) {
        cli.info(`${h.localNetworkName} network chosen as no network specified`);
        state.networkName = h.localNetworkName;
    }

    // either setup parity network or another
    const result = (state.networkName == h.localNetworkName)
        ? await parity.main(state)
        : await network(state);

}

const network = async (state) => {

    state.network = await h.readNetwork(state.networkName);
    // set web3 instance
    if (!await this.setWeb3(state)) {
        return;
    }

    state.accountAddresses = await state.web3.eth.getAccounts();
    if (state.accountAddresses.length == 0) {
        cli.error(`${networkName} network contains no accounts`);
        return;
    }

};

module.exports.setWeb3 = async (state) => {

    state.web3 = createWeb3(state.network);
    if (!(await testWeb3(state.web3))) {
        return false;
    }

    return true;

}

const createWeb3 = (network) => {

    let provider;

    if ('wsUrl' in network) {
         // use websocket; the next best thing to IPC
         provider = new Web3.providers.WebsocketProvider(network.wsUrl);
    } else if ('rpcUrl' in network) {
        // use rpc (http)
        provider = new Web3.providers.HttpProvider(network.rpcUrl);
    } else {
        // assume local test; create web3 ipc provider (parity)
        provider = createParityProvider(network);
    }

    return new Web3(provider);

}

const createParityProvider = (network) => {
    return new Web3.providers.IpcProvider(h.parityIpcFile, net);
}

const testWeb3 = async (web3) => {
    try {
        return await web3.eth.net.isListening();
    } catch (error) {
        return false;
    }
}

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

    const web3Instance = new state.web3.eth.Contract(contract.abi);

    const web3Transaction = web3Instance.deploy({
        data: '0x' + contract.evm.bytecode.object,
        arguments: args
    });

    const web3Result = await this.sendMethod(web3Transaction, options, state);
    web3Result.instance.setProvider(state.web3.currentProvider);

    const contractAddress = web3Result.instance.options.address;
    cli.info(`${contract.name} contract deployed to ${contractAddress}`);
    return web3Result;

}

module.exports.sendMethod = (method, options, state) => {
    setStandardOptions(options, state);
    return verifySend(method.send(options));
};

module.exports.sendFallback = (instance, options, state) => {
    setStandardOptions(options, state);
    options.to = instance.options.address;
    return verifySend(state.web3.eth.sendTransaction(options));
};

const setStandardOptions = (options, state) => {
    options.from = options.from ? options.from : state.accountAddresses[0];
    options.gas = getOption('gas', options, state.network);
    options.gasPrice = getOption('gasPrice', options, state.network);
}

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

const verifySend = (call) => {

    return new Promise((accept, reject) => {
        
        let receipt;

        call.once('receipt', (data) => {
            // capture receipt
            receipt = data;
            cli.info(`gas used: ${receipt.gasUsed}`);
        }).then((result) => {

            // triage result type
            if (!result.options) {
                // check for standard transaction result
                if (!result.status || result.status === "0x0") {
                    cli.json(result);
                    reject(new Error("Something Thrown"));
                    return;
                }

                // accept result (receipt only)
                accept(result);

            } else {
                // accept result (instance) and receipt
                accept({
                    instance: result,
                    receipt
                });
            }

        }).catch ((error) => {
            reject(new Error("Something Caught"));
        });

    });

}