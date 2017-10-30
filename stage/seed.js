const ch = require('../chronicle/helper');
const h = require('./helper');
const parity = require('../chronicle/parity');
const kickoff = require('./kickoff');

module.exports.options = [
    [ "-c, --charity <address>", "charity" ],
    [ "-cs, --charitySplit <number>", "charity split" ],
    [ "-ws, --winnerSplit <number>", "winner split" ],
    [ "-ow, --ownerSplit <number>", "owner split" ],
    [ "-vpe, --valuePerEntry <string>", "value per entry" ],
    [ "-st, --startTime <time>", "start time" ],
    [ "-rt, --revealTime <time>", "reveal time" ],
    [ "-et, --endTime <time>", "end time" ]
];

module.exports.stage = async (stage) => {

    await kickoff.stage(stage);

    stage.charity = stage.charity ? stage.accountAddresses[stage.charity] : stage.accountAddresses[1];
    stage.charitySplit = stage.charitySplit ? stage.charitySplit : 49;
    stage.winnerSplit = stage.winnerSplit ? stage.winnerSplit : 49;
    stage.ownerSplit = stage.ownerSplit ? stage.ownerSplit : 2;
    stage.valuePerEntry = stage.valuePerEntry ? stage.valuePerEntry : 1000;
    stage.startTime = stage.startTime ? stage.startTime : stage.now + h.timeInterval;
    stage.revealTime = stage.revealTime ? stage.revealTime : stage.startTime + h.timeInterval;
    stage.endTime = stage.endTime ? stage.endTime : stage.revealTime + h.timeInterval;

    await parity.send(stage.web3, stage.web3Instances.charity.methods.kickoff(
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