const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const end = require('./end');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return end.optionize(command);
}

module.exports.stage = async (state) => {

    // first end
    await end.stage(state);
    
    const stage = state.stage;
    
    const method = stage.instances.seedom.methods.withdraw();

    stage.charityWithdrawReceipt = await parity.sendMethod(method, { from: stage.charity });
    stage.winnerWithdrawReceipt = await parity.sendMethod(method, { from: stage.winner });
    stage.ownerWithdrawReceipt = await parity.sendMethod(method, { from: stage.owner });

    return state;

}