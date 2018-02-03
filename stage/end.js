const ch = require('../chronicle/helper');
const h = require('./helper');
const network = require('../chronicle/network');
const reveal = require('./reveal');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return reveal.optionize(command);
}

module.exports.dependency = 'reveal';

module.exports.stage = async (state) => {
    
    const stage = state.stage;
    const now = ch.timestamp();
    const endTime = stage.endTime;
    await cli.progress("waiting for end phase", endTime - now);

    // only the charity can end the ether-raiser
    const method = stage.seedom.methods.end(stage.charityRandom);
    stage.endReceipt = await network.sendMethod(method, {
        from: stage.charity
    }, state);

    const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
    // set the winner
    stage.winner = actualState._winner;

}