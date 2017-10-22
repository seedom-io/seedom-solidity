const TestRpc = require("ethereumjs-testrpc");

module.exports.start = async (hostname, port) => {
    const simulation = TestRpc.server({
        host: hostname,
        port: port,
        network_id: 4447,
        mnemonic: "candy maple velvet cake sugar cream honey rich smooth crumble sweet treat",
        gasLimit: 0x47e7c4
    });
    await simulation.listen(port, hostname);
    return simulation;
}

module.exports.snapshot = async (web3) => {
    return await this.call(web3, 'evm_snapshot');
}

module.exports.revert = async (snapshot, web3) => {
    return await this.call(web3, 'evm_revert', [ snapshot ]);
}

module.exports.call = async (web3, method, args) => {

    const request = {
        jsonrpc: "2.0",
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