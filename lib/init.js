const cli = require('./cli');
const h = require('./helpers');
const parity = require('./parity');

module.exports.initialize = async (force, persist) => {

    cli.section('initialize');

    // initialize parity
    const parityClosed = await parity.initialize(force);

    if (!persist) {
        this.shutdown();
    }

    return {
        closed: Promise.race([
            parityClosed
        ])
    }

};

module.exports.shutdown = () => {

    // stop parity
    parity.stop();

}