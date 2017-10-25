const Web3 = require('web3');
const cli = require('./cli');

const jsonrpc = "2.0";

module.exports.getWeb3 = async (networkParams) => {

    cli.info('connecting to network %s:%d', networkParams.host, networkParams.port);

    const web3 = createWeb3(networkParams);
    if (await testWeb3(web3)) {
        cli.success('connected to network');
        return web3;
    }

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
        cli.error('network could not be reached');
        return false;
    }
}

module.exports.getParams = (networkName, networkConfig) => {

    if (!(networkName in networkConfig)) {
        cli.error('unable to find network name in network config');
        return null;
    }

    return networkConfig[networkName];

}

module.exports.callWeb3 = async (web3, method, args) => {

    const request = {
        jsonrpc: jsonrpc,
        method: method,
        id: new Date().getTime(),
        params: args
    };

    const result = await promiseCall(web3, request);
    return result.result;

};

const promiseCall = (web3, request) => {
    return new Promise((fulfill, reject) => {
        web3.currentProvider.send(request, (error, result) => {
            if (error) reject(error)
            else fulfill(result);
        });
    });
}
