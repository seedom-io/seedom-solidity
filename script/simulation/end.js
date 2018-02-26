const reveal = require('./reveal');
const end = require('../end');
const ch = require('../../chronicle/helper');
const cli = require('../../chronicle/cli');

module.exports.run = async (state) => {

    await reveal.run(state);
    await end.run(state);

}