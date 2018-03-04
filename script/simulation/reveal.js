const raise = require('./raise');
const reveal = require('../reveal');
const ch = require('../../chronicle/helper');
const cli = require('../../chronicle/cli');

module.exports.run = async (state) => {

    await raise.run(state);

    const { env } = state;
    const now = ch.timestamp();
    await cli.progress("waiting for end phase", env.endTime - now);

    await reveal.run(state);

}