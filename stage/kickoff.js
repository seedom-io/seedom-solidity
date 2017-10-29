const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const instantiate = require('./instantiate');

module.exports.dependent = 'instantiate';

module.exports.options = () => {
    return [
        [ "-c, --charity <address>", "charity" ],
        [ "-cs, --charitySplit <number>", "charity split" ],
        [ "-ws, --winnerSplit <number>", "winner split" ],
        [ "-ow, --ownerSplit <number>", "owner split" ],
        [ "-vpe, --valuePerEntry <string>", "value per entry" ],
        [ "-st, --startTime <time>", "start time" ],
        [ "-rt, --revealTime <time>", "reveal time" ],
        [ "-et, --endTime <time>", "end time" ]
    ];
}

module.exports.stage = async (stage) => {
    
    stage.charity = stage.options.charity ? stage.accounts[stage.options.charity] : stage.accounts[1];
    stage.charitySplit = stage.options.charitySplit ? stage.options.charitySplit : 49;
    stage.winnerSplit = stage.options.winnerSplit ? stage.options.winnerSplit : 49;
    stage.ownerSplit = stage.options.ownerSplit ? stage.options.ownerSplit : 2;
    stage.valuePerEntry = stage.options.valuePerEntry ? stage.options.valuePerEntry : 1000;
    stage.startTime = stage.options.startTime ? stage.options.startTime : stage.now + h.timeInterval;
    stage.revealTime = stage.options.revealTime ? stage.options.revealTime : stage.startTime + h.timeInterval;
    stage.endTime = stage.options.endTime ? stage.options.endTime : stage.revealTime + h.timeInterval;

    await parity.send(stage.web3, stage.contracts.charity.methods.kickoff(
        stage.charity,
        stage.charitySplit,
        stage.winnerSplit,
        stage.ownerSplit,
        stage.valuePerEntry,
        stage.startTime,
        stage.revealTime,
        stage.endTime
    ).send({ from: stage.owner }));

}