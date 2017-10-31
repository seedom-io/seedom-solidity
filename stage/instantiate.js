const ch = require('../chronicle/helper');

module.exports.optionize = (command) => {
    return command;
}

module.exports.stage = async (state, stage) => {
    itemize('owner', state.accountAddresses[0], state, stage);
}