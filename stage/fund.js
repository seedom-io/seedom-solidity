const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const participate = require('./participate');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return participate.optionize(command)
        .option("--fundFunds <number>", "additional funds to each participant", parseInt);
}

module.exports.stage = async (state) => {

    // first participate
    await participate.stage(state);
    
    const stage = state.stage;

    stage.fundFunds = stage.fundFunds ? stage.fundFunds : 10500;

    for (let participant of stage.participants) {
        await parity.sendFallback(state.web3, stage.instances.charity, { from: participant.address, value: stage.fundFunds  });
        cli.info("funded participant %s with %d wei", participant.address, stage.fundFunds);
    }

    return state;

}