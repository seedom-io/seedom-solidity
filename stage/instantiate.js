const ch = require('../chronicle/helper');

module.exports.optionize = (command) => {
    return command;
}

module.exports.stage = async (state, stage) => {
    stage.owner = state.accountAddresses[0];
    stage.now = ch.now();
}