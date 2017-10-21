module.exports.snapshot = async (web3) => {
    return await this.call(web3, 'evm_snapshot');
}

module.exports.revert = async (web3, snapshot) => {
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