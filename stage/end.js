const ch = require('../chronicle/helper');
const h = require('./helper');
const networks = require('../chronicle/networks');
const reveal = require('./reveal');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return reveal.optionize(command);
}

module.exports.stage = async (state) => {

    // first reveal
    await reveal.stage(state);
    
    const stage = state.stage;
    const now = h.timestamp();
    const endTime = stage.endTime;
    await cli.progress("waiting for end phase", endTime - now);

    // only the charity can end the ether-raiser
    const method = stage.seedom.methods.end(stage.charityRandom);
    stage.endReceipt = await networks.sendMethod(method, {
        from: stage.charity
    }, state);

    const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
    // set the winner
    stage.winner = actualState._winner;
    // set balances
    stage.charityBalance = await stage.seedom.methods.balancesMapping(stage.charity).call({ from: stage.owner });
    stage.winnerBalance = await stage.seedom.methods.balancesMapping(stage.winner).call({ from: stage.owner });
    stage.ownerBalance = await stage.seedom.methods.balancesMapping(stage.owner).call({ from: stage.owner });

}