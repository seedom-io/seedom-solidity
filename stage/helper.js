const crypto = require('crypto');
const cli = require('../chronicle/cli');
const BigNumber = require('bignumber.js');
const keccak256 = require('js-sha3').keccak256;

module.exports.timestamp = async () => {
    return Math.round((new Date()).getTime() / 1000);
}

module.exports.random = () => {
    const buffer = Buffer.alloc(32);
    crypto.randomFillSync(buffer, 0, 32);
    return '0x' + buffer.toString('hex');
}

module.exports.hashedRandom = (random, participant) => {

    var hasher = new keccak256.create(256);

    var randomHex = random.substr(2);
    var randomBuffer = new Buffer(randomHex, 'hex');
    hasher.update(randomBuffer);

    var participantHex = participant.substr(2);
    var participantBuffer = new Buffer(participantHex, 'hex');
    hasher.update(participantBuffer);

    return "0x" + hasher.hex();

}

module.exports.hexBigNumber = (bigNumber) => {
    return "0x" + bigNumber.toString(16);
}

module.exports.getBalance = async (address, web3) => {
    const latestBlock = await web3.eth.getBlock('latest');
    const latestBlockNumber = latestBlock.number;
    const balance = await web3.eth.getBalance(address, latestBlockNumber);
    cli.info("%s has a balance of %s (block %d)", address, balance, latestBlockNumber);
    return new BigNumber(balance);
};

module.exports.getTransactionCost = async (gasUsed, web3) => {
    const gasPrice = await web3.eth.getGasPrice();
    const transactionCost = gasUsed * gasPrice;
    cli.info("gas used %d; gas price %d; transaction cost %d", gasUsed, gasPrice, transactionCost);
    return new BigNumber(transactionCost);
};