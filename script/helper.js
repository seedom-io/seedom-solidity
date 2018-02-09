const crypto = require('crypto');
const cli = require('../chronicle/cli');
const BigNumber = require('bignumber.js');
const keccak256 = require('js-sha3').keccak256;

module.exports.randomHex = () => {
    const buffer = Buffer.alloc(32);
    crypto.randomFillSync(buffer, 0, 32);
    return `0x${buffer.toString('hex')}`;
};

module.exports.hexRandom = (random) => {
    const buffer = Buffer.alloc(32);
    buffer.write(random);
    return `0x${buffer.toString('hex')}`;
};

module.exports.hashRandom = (randomHex, participant) => {

    const hasher = new keccak256.create(256);

    // remove 0x
    randomHex = randomHex.substr(2);
    const randomBuffer = new Buffer(randomHex, 'hex');
    hasher.update(randomBuffer);

    // remove 0x
    const participantHex = participant.substr(2);
    const participantBuffer = new Buffer(participantHex, 'hex');
    hasher.update(participantBuffer);

    return `0x${hasher.hex()}`;

}

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