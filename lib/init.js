const cli = require('./cli');
const h = require('./helpers');
const parity = require('./parity');

module.exports = async (force) => {
    cli.section('initialize');
    await parity.initialize();
};
