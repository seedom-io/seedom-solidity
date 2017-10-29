const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('kickoff', () => {

    test("should kickoff properly", async (stage) => {
        
        await instantiate.stage(stage);

        const actualWinner = await stage.contracts.charity.methods.winner().call({ from: stage.owner });
        const actualCancelled = await stage.contracts.charity.methods.cancelled().call({ from: stage.owner });
        const actualTotalEntries = await stage.contracts.charity.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.contracts.charity.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.contracts.charity.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.contracts.charity.methods.totalRevealers().call({ from: stage.owner });

        assert.equal(actualWinner, 0, "winner zero");
        assert.isOk(actualCancelled, "initially cancelled");
        assert.equal(actualTotalEntries, 0, "total entries zero");
        assert.equal(actualTotalRevealed, 0, "total revealed zero");
        assert.equal(actualTotalParticipants, 0, "total participants zero");
        assert.equal(actualTotalRevealers, 0, "total revealers zero");

        await kickoff.stage(stage);

        const actualKickoff = await stage.contracts.charity.methods.currentKick().call({ from: stage.owner });
        const actualKickTimeDifference = actualKickoff._kickTime - stage.now;

        assert.equalIgnoreCase(actualKickoff._charity, stage.charity, "charity does not match");
        assert.equal(actualKickoff._charitySplit, stage.charitySplit, "charity split does not match");
        assert.equal(actualKickoff._winnerSplit, stage.winnerSplit, "winner split does not match");
        assert.equal(actualKickoff._ownerSplit, stage.ownerSplit, "validOwner split does not match");
        assert.equal(actualKickoff._valuePerEntry, stage.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualKickTimeDifference, 5, "wei per entry does not match");
        assert.equal(actualKickoff._startTime, stage.startTime, "start time does not match");
        assert.equal(actualKickoff._revealTime, stage.revealTime, "reveal time does not match");
        assert.equal(actualKickoff._endTime, stage.endTime, "end time does not match");

    });

    test("should fail to kickoff with invalid data", async (stage) => {

        await instantiate.stage(stage);

        const charity = stage.accounts[1];
        const startTime = stage.now + sh.timeInterval;
        const revealTime = startTime + sh.timeInterval;
        const endTime = revealTime + sh.timeInterval;

        const testData = [
            [0, 49, 49, 2, 1000, startTime, revealTime, endTime],
            [charity, 0, 49, 2, 1000, startTime, revealTime, endTime],
            [charity, 49, 0, 2, 1000, startTime, revealTime, endTime],
            [charity, 49, 49, 0, 1000, startTime, revealTime, endTime],
            [charity, 49, 49, 2, 0, startTime, revealTime, endTime],
            [charity, 49, 49, 2, 1000, 0, revealTime, endTime],
            [charity, 49, 49, 2, 1000, startTime, 0, endTime],
            [charity, 49, 49, 2, 1000, startTime, revealTime, 0]
        ];
        
        for (let testArgs of testData) {
            await assert.isRejected(
                parity.send(stage.web3, stage.contracts.charity.methods.kickoff.apply(null, testArgs).send({ from: stage.owner })),
                parity.SomethingThrownException,
                null,
                testArgs
            );
        }

    });

    test("should fail to kickoff with invalid dates", async (stage) => {

        await instantiate.stage(stage);

        const charity = stage.accounts[1];

        const startTime = stage.now + sh.timeInterval;
        const revealTime = startTime + sh.timeInterval;
        const endTime = revealTime + sh.timeInterval;

        const oldStartTime = stage.now - (sh.timeInterval * 3);
        const oldRevealTime = oldStartTime + sh.timeInterval;
        const oldEndTime = oldRevealTime + sh.timeInterval;

        const testData = [
            // old dates
            [charity, 49, 49, 2, 1000, oldStartTime, revealTime, endTime],
            [charity, 49, 49, 2, 1000, startTime, oldRevealTime, endTime],
            [charity, 49, 49, 2, 1000, startTime, revealTime, oldEndTime],
            // equal dates
            [charity, 49, 49, 2, 1000, startTime, startTime, startTime],
            [charity, 49, 49, 2, 1000, startTime, startTime, endTime],
            [charity, 49, 49, 2, 1000, startTime, revealTime, revealTime],
            // out of order dates
            [charity, 49, 49, 2, 1000, revealTime, startTime, endTime],
            [charity, 49, 49, 2, 1000, startTime, endTime, revealTime]
        ];

        for (let testArgs of testData) {
            await assert.isRejected(
                parity.send(stage.web3, stage.contracts.charity.methods.kickoff.apply(null, testArgs).send({ from: stage.owner })),
                parity.SomethingThrownException,
                null,
                testArgs
            );
        }

    });

});