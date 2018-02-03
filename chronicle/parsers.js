const BigNumber = require('bignumber.js');

module.exports.parseDate = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return this.timestamp(date);
}

module.exports.parseBigNumber = (value) => {
    return new BigNumber(value);
}