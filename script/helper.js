const cli = require('../chronicle/cli');
const BigNumber = require('bignumber.js');

module.exports.hexBigNumber = (bigNumber) => {
    return "0x" + bigNumber.toString(16);
}

module.exports.getBalance = async (address, web3) => {
    const latestBlock = await web3.eth.getBlock('latest');
    const latestBlockNumber = latestBlock.number;
    const balance = await web3.eth.getBalance(address, latestBlockNumber);
    cli.info(`${address} has a balance of ${balance} (block ${latestBlockNumber})`);
    return new BigNumber(balance);
};

module.exports.getTransactionCost = async (gasUsed, web3) => {
    const gasPrice = await web3.eth.getGasPrice();
    const transactionCost = gasUsed * gasPrice;
    cli.info(`gas used ${gasUsed}; gas price ${gasPrice}; transaction cost ${transactionCost}`);
    return new BigNumber(transactionCost);
};