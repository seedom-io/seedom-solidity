const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const participate = require('./participate');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return participate.optionize(command)
        .option("--raiseEther <number>", "additional ether raised by each participant", parseInt);
}

module.exports.stage = async (state) => {

    // first participate
    await participate.stage(state);
    
    const stage = state.stage;

    stage.raiseEther = stage.raiseEther ? stage.raiseEther : 10500;
    stage.raiseReceipts = [];

    for (let participant of stage.participants) {
        const receipt = await parity.sendFallback(state.web3, stage.instances.seedom, { from: participant.address, value: stage.raiseEther  });
        cli.info("raised %d wei from participant %s", stage.raiseEther, participant.address);
        stage.raiseReceipts.push(receipt);
    }

    return state;

}