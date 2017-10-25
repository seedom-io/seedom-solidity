const Web3 = require('web3');
const cli = require('./cli');

const jsonrpc = "2.0";

module.exports.getWeb3 = async (networkParams) => {

    const web3 = createWeb3(networkParams);
    if (await testWeb3(web3)) {
        cli.success('connected to network %s:%d', networkParams.host, networkParams.port);
        return web3;
    }

    cli.error('network %s:%d could not be reached', networkParams.host, networkParams.port);
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

module.exports.getParams = (networkName, networkConfig) => {

    if (!(networkName in networkConfig)) {
        cli.error('unable to find network name in network config');
        return null;
    }

    return networkConfig[networkName];

}

module.exports.createAccounts = async (networkParams, web3) => {

    const accounts = {};

    for (let networkAccount of networkParams.accounts) {

        const address = await this.callWeb3(web3, 'parity_newAccountFromPhrase', [
            networkAccount.recovery, networkParams.password
        ]);

        cli.success('created network account %s', address);

        accounts[address] = {
            balance: networkAccount.balance
        };

    }

    cli.success('all network accounts generated');
    return accounts;

}

module.exports.createAuthorizationToken = async (web3) => {
    const authorizationToken = await this.callWeb3(web3, 'signer_generateAuthorizationToken');
    cli.success('created authorization token %s', authorizationToken);
    return authorizationToken;

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