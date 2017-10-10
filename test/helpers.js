var sha3 = require('sha3');

exports.now = function() {
  return Math.round((new Date()).getTime() / 1000);
}

exports.sleep = function(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

exports.random = function(min, max) {
  return Math.random() * (max - min) + min;
}

exports.hashedRandom = function(random) {
  var hasher = new sha3.SHA3Hash(256);
  hasher.update(random.toString());
  var hashedRandomString = "0x" + hasher.digest('hex');
  return hashedRandomString.valueOf();
}

exports.timeInterval = 3;

exports.advanceBlock = function() {
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