const reveal = require('./reveal');
const select = require('../select');
const ch = require('../../chronicle/helper');
const cli = require('../../chronicle/cli');

module.exports.run = async (state) => {

    await reveal.run(state);
    await select.run(state);

}