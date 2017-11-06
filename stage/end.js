const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const reveal = require('./reveal');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return reveal.optionize(command);
}

module.exports.stage = async (state) => {

    // first reveal
    await reveal.stage(state);
    
    const stage = state.stage;
    const now = await h.timestamp(stage.instances.charity);
    const endTime = stage.endTime;
    await cli.progress("waiting for end phase", endTime - now);

    // only the charity can end everything
    const method = stage.instances.charity.methods.end(stage.charityRandom);
    stage.endReceipt = await parity.sendMethod(method, { from: stage.charity });

    // set the winner
    stage.winner = await stage.instances.charity.methods.winner().call({ from: stage.owner });
    // set balances
    stage.charityBalance = await stage.instances.charity.methods.balance(stage.charity).call({ from: stage.owner });
    stage.winnerBalance = await stage.instances.charity.methods.balance(stage.winner).call({ from: stage.owner });
    stage.ownerBalance = await stage.instances.charity.methods.balance(stage.owner).call({ from: stage.owner });

    return state;

}