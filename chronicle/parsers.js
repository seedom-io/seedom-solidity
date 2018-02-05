const BigNumber = require('bignumber.js');
const chrono = require('chrono-node');
const h = require('./helper');

module.exports.parseDate = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return h.timestamp(date);
}

module.exports.parseBigNumber = (value) => {
    return new BigNumber(value);
}