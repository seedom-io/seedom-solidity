const Web3 = require('web3');
const cli = require('./cli');
const net = require('net');
const h = require('./helper');

const defaults = {
    jsonrpc: "2.0",
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports.main = async (state) => {

    state.network = h.readNetwork(state.networkName);
    // set web3 instance
    if (!await this.setWeb3(state)) {
        return;
    }

    state.accountAddresses = await state.web3.eth.getAccounts();
    if (accountAddresses.length == 0) {
        cli.error("'%s' network contains no accounts", networkName);
        return;
    }

    // ask user for verification (optional)
    if (state.network.verify) {
        const question = "verification required!";
        if (!(await cli.question(question, iAmCompletelySure))) {
            cli.error("deployment aborted");
            return;
        }
    }

    // track deployments
    state.deployment = await h.readDeployment(state.networkName);

}

module.exports.setWeb3 = async (state) => {

    state.web3 = createWeb3(state.network);
    const name = state.network.ws ? state.network.ws : h.localNetworkName;
    if (!(await testWeb3(state.web3))) {
        cli.error("could not connect to %s network", name);
        return false;
    }

    cli.success("connected to %s network", name);
    return true;

}

const createWeb3 = (network) => {

    let provider;

    if (!('ws' in network)) {
        // assume local test; create web3 ipc provider (parity)
        provider = createParityProvider(network);
    } else {
        // use websocket; the next best thing to IPC (also http(s) is deprecated by web3)
        provider = new Web3.providers.WebsocketProvider('ws:\\\\' + network.ws);
    }

    return new Web3(provider);

}

const createParityProvider = (network) => {

    const provider = new Web3.providers.IpcProvider(h.parityIpcFile, net);
    // FIXME: parity cannot execute transactions as fast as we send them; we need a delay in between
    provider.send = (payload, callback) => {

        let delay = 0;
        if (payload.method == 'eth_sendTransaction' || payload.method == 'eth_sendRawTransaction') {
            delay = network.sendDelay;
        }

        setTimeout(() => {
            Object.getPrototypeOf(provider).send.call(provider, payload, callback);
        }, delay);

    };

    return provider;

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

    const result = await new Promise((fulfill, reject) => {
        state.web3.currentProvider.send(request, (error, result) => {
            if (error) reject(error)
            else fulfill(result);
        });
    });

    return result.result;

};

module.exports.deploy = (contractName, args, options, state) => {

    // find the compiled contract
    const contract = state.contracts[contractName];
    if (!contract) {
        cli.error('contract not found');
        return null;
    }

    const web3Contract = new web3.eth.Contract(contract.abi);
    const web3Transaction = web3Contract.deploy({
        data: contract.bytecode,
        arguments: args
    });

    const web3Instance = this.sendMethod(web3Transaction, options, state);

    const contractAddress = web3Instance.options.address;
    // save deployment
    if (state.deployment) {
        state.deployment[contractName].unshift({
            deployed: h.timestamp(),
            address: contractAddress
        });
    }

    cli.success("'%s' contract deployed to %s", contractName, contractAddress);
    return web3Instance;

}

module.exports.sendMethod = (method, options, state) => {
    setStandardOptions(options, state);
    return verifySend(method.send(options));
};

module.exports.sendFallback = (instance, options, state) => {
    setStandardOptions(options, state);
    options.to = instance.options.address;
    return verifySend(web3.eth.sendTransaction(options));
};

const setStandardOptions = (options, state) => {
    options.from = options.fromAddress ? options.fromAddress : state.accountAddresses[0];;
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

        call
    
        .on('error', (error) => {
            reject(error);
        })
        
        .then((result) => {

            // check for contract deployment
            if (!result.options) {
                // check for standard transaction result
                if (!result.status || result.status === "0x0") {
                    reject(this.SomethingThrown);
                    return;
                }
            }

            accept(receipt);
            
        });

    });

}