var crypto = require('crypto');
var keccak256 = require('js-sha3').keccak256;

module.exports.timeInterval = 10;

module.exports.now = function () {
    return Math.round((new Date()).getTime() / 1000);
}

module.exports.sleep = function (seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

var minFirstDecimal = 9;
var maxFirstDecimal = 255;
module.exports.random = function (firstDecimal) {

    const buffer = Buffer.alloc(32);

    // allow customization of first decimal
    if (!firstDecimal) {
        firstDecimal = Math.floor((Math.random() * (maxFirstDecimal - minFirstDecimal)) + minFirstDecimal);
    }

    buffer[0] = firstDecimal;
    crypto.randomFillSync(buffer, 1, 31);

    return '0x' + buffer.toString('hex');

}

module.exports.hashedRandom = function (random, participant) {

    var hasher = new keccak256.create(256);

    var randomHex = random.substr(2);
    var randomBuffer = new Buffer(randomHex, 'hex');
    hasher.update(randomBuffer);

    var participantHex = participant.substr(2);
    var participantBuffer = new Buffer(participantHex, 'hex');
    hasher.update(participantBuffer);

    return "0x" + hasher.hex();

}

module.exports.hexBigNumber = function(bigNumber) {
    return "0x" + bigNumber.toString(16);
}

module.exports.advanceBlock = function () {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: Date.now(),
        }, (err, res) => {
            return err ? reject(err) : resolve(res)
        })
    });
}