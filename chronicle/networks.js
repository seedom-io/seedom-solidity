const Web3 = require('web3');
const cli = require('./cli');

const jsonrpc = "2.0";

module.exports.getWeb3 = async (networkParams) => {

    const web3 = createWeb3(networkParams);
    if (await testWeb3(web3)) {
        cli.success("connected to network %s:%d", networkParams.host, networkParams.port);
        return web3;
    }

    cli.error("network %s:%d could not be reached", networkParams.host, networkParams.port);
    return null;

}

const createWeb3 = (networkParams) => {
    const url = 'http://' + networkParams.host + ':' + networkParams.port;
    return new Web3(new Web3.providers.HttpProvider(networkParams.url));
}

const testWeb3 = async (web3) => {
    try {
        return await web3.eth.net.isListening();
    } catch (error) {
        return false;
    }
}

module.exports.get = (networkName, networkConfig) => {

    if (!(networkName in networkConfig)) {
        cli.error("unable to find network name in network config");
        return null;
    }

    return networkConfig[networkName];

}

module.exports.providerCall = async (web3, method, args) => {

    const request = {
        jsonrpc: jsonrpc,
        method: method,
        id: new Date().getTime(),
        params: args
    };

    const result = await new Promise((fulfill, reject) => {
        web3.currentProvider.send(request, (error, result) => {
            if (error) reject(error)
            else fulfill(result);
        });
    });

    return result.result;

};