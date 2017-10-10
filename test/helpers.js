var sha3 = require('sha3');

module.exports.now = function() {
  return Math.round((new Date()).getTime() / 1000);
}

module.exports.sleep = function(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports.random = function(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

module.exports.hashedRandom = function(random, participant) {
  var hasher = new sha3.SHA3Hash(256);
  hasher.update(random.toString());
  console.log(typeof participant);
  hasher.update(participant);
  var hashedRandomString = "0x" + hasher.digest('hex');
  return hashedRandomString.valueOf();
}

module.exports.timeInterval = 3;

module.exports.advanceBlock = function() {
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