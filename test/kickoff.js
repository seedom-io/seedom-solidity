const th = require('./helpers');
const parity = require('../lib/parity');

suite('kickoff', (accounts) => {

    var validOwner = accounts[0];
    var validCharity = accounts[1];
    var validParticipant = accounts[2];
    var validParticipant2 = accounts[3];
    var validParticipant3 = accounts[4];
    var validParticipant4 = accounts[5];
    var validCharitySplit = 49;
    var validWinnerSplit = 49;
    var validOwnerSplit = 2;
    var validValuePerEntry = 1000;

    test("should kickoff properly", async (contracts, web3) => {

        var actualWinner = await contracts.charity.methods.winner().call({ from: validOwner });
        var actualCancelled = await contracts.charity.methods.cancelled().call({ from: validOwner });
        var actualTotalEntries = await contracts.charity.methods.totalEntries().call({ from: validOwner });
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed().call({ from: validOwner });
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants().call({ from: validOwner });
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers().call({ from: validOwner });

        assert.equal(actualWinner, 0, "winner zero");
        assert.isOk(actualCancelled, "initially cancelled");
        assert.equal(actualTotalEntries, 0, "total entries zero");
        assert.equal(actualTotalRevealed, 0, "total revealed zero");
        assert.equal(actualTotalParticipants, 0, "total participants zero");
        assert.equal(actualTotalRevealers, 0, "total revealers zero");

        var now = th.now();
        var validStartTime = now + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        await parity.send(web3, contracts.charity.methods.kickoff(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime
        ).send({ from: validOwner }));

        var actualKickoff = await contracts.charity.methods.currentKick().call({ from: validOwner });
        var actualKickTimeDifference = actualKickoff._kickTime - now;

        assert.equalIgnoreCase(actualKickoff._charity, validCharity, "charity does not match");
        assert.equal(actualKickoff._charitySplit, validCharitySplit, "charity split does not match");
        assert.equal(actualKickoff._winnerSplit, validWinnerSplit, "winner split does not match");
        assert.equal(actualKickoff._ownerSplit, validOwnerSplit, "validOwner split does not match");
        assert.equal(actualKickoff._valuePerEntry, validValuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualKickTimeDifference, 5, "wei per entry does not match");
        assert.equal(actualKickoff._startTime, validStartTime, "start time does not match");
        assert.equal(actualKickoff._revealTime, validRevealTime, "reveal time does not match");
        assert.equal(actualKickoff._endTime, validEndTime, "end time does not match");

    });

    test("should fail to kickoff with invalid data", async (contracts, web3) => {

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;     
        
        var testData = [

            [0, 49, 49, 2, 1000, validStartTime, validRevealTime, validEndTime],
            [validCharity, 0, 49, 2, 1000, validStartTime, validRevealTime, validEndTime],
            [validCharity, 49, 0, 2, 1000, validStartTime, validRevealTime, validEndTime],
            [validCharity, 49, 49, 0, 1000, validStartTime, validRevealTime, validEndTime],
            [validCharity, 49, 49, 2, 0, validStartTime, validRevealTime, validEndTime],
            [validCharity, 49, 49, 2, 1000, 0, validRevealTime, validEndTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, 0, validEndTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, 0]

        ];
        
        for (let testArgs of testData) {
            await assert.isRejected(
                parity.send(web3, contracts.charity.methods.kickoff.apply(null, testArgs).send({ from: validOwner })),
                parity.SomethingThrownException,
                null,
                testArgs
            );
        }

    });

    /*
    test("should fail to kickoff with invalid dates", async (contracts) => {

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var oldStartTime = th.now() - (th.timeInterval * 3);
        var oldRevealTime = oldStartTime + th.timeInterval;
        var oldEndTime = oldRevealTime + th.timeInterval;

        var promises = [];

        [
            // old dates
            [validCharity, 49, 49, 2, 1000, oldStartTime, validRevealTime, validEndTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, oldRevealTime, validEndTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, oldEndTime],
            // equal dates
            [validCharity, 49, 49, 2, 1000, validStartTime, validStartTime, validStartTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, validStartTime, validEndTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, validRevealTime],
            // out of order dates
            [validCharity, 49, 49, 2, 1000, validRevealTime, validStartTime, validEndTime],
            [validCharity, 49, 49, 2, 1000, validStartTime, validEndTime, validRevealTime]

        ].forEach(args => {
            promises.push(
                assert.isRejected(
                    contracts.charity.methods.kickoff.apply(null, args).send({ from: validOwner })
                )
            );
        });

        return Promise.all(promises);

    });*/

});