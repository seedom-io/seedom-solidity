const ch = require('../chronicle/helper');
const h = require('./helper');
const networks = require('../chronicle/networks');
const end = require('./end');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return end.optionize(command);
}

module.exports.stage = async (state) => {

    // first end
    await end.stage(state);
    
    const stage = state.stage;
    
    const method = stage.seedom.methods.withdraw();

    stage.charityWithdrawReceipt = await networks.sendMethod(method, {
        from: stage.charity
    }, state);

    stage.winnerWithdrawReceipt = await networks.sendMethod(method, {
        from: stage.winner
    }, state);

    stage.ownerWithdrawReceipt = await networks.sendMethod(method, {
        from: stage.owner
    }, state);

}