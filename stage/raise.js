const ch = require('../chronicle/helper');
const h = require('./helper');
const networks = require('../chronicle/networks');
const participate = require('./participate');
const cli = require('../chronicle/cli');

module.exports.optionize = (command) => {
    return participate.optionize(command)
        .option("--raiseWei <number>", "additional wei raised by each participant", parseInt);
}

module.exports.stage = async (state) => {

    // first participate
    await participate.stage(state);
    
    const stage = state.stage;

    stage.raiseWei = stage.raiseWei ? stage.raiseWei : 10500;
    stage.raiseReceipts = [];

    for (let participant of stage.participants) {
        const receipt = await networks.sendFallback(stage.seedom, {
            from: participant.address,
            value: stage.raiseWei
        }, state);

        cli.info("raised %d wei from participant %s", stage.raiseWei, participant.address);
        stage.raiseReceipts.push(receipt);
    }

}