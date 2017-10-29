const ch = require('../chronicle/helper');

module.exports.stage = async (stage) => {
    stage.owner = stage.accountAddresses[0];
    stage.now = ch.now();
}