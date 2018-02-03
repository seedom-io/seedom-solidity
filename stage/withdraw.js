const ch = require('../chronicle/helper');
const h = require('./helper');
const network = require('../chronicle/network');
const end = require('./end');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return end.optionize(command);
}

module.exports.dependency = 'end';

module.exports.stage = async (state) => {
    
    const stage = state.stage;
    
    const method = stage.seedom.methods.withdraw();

    stage.charityWithdrawReceipt = await network.sendMethod(method, {
        from: stage.charity
    }, state);

    stage.winnerWithdrawReceipt = await network.sendMethod(method, {
        from: stage.winner
    }, state);

    stage.ownerWithdrawReceipt = await network.sendMethod(method, {
        from: stage.owner
    }, state);

}