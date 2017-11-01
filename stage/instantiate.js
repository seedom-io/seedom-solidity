const ch = require('../chronicle/helper');

module.exports.optionize = (command) => {
    return command;
}

module.exports.stage = async (state) => {
    state.stage.owner = state.accountAddresses[0];
    return state;
}