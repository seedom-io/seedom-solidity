const crypto = require('crypto');
const keccak256 = require('js-sha3').keccak256;

module.exports.timestamp = async (contract) => {
    return parseInt(await contract.methods.timestamp().call());
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