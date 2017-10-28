var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var th = require('./helpers');
var mochaLogger = require('mocha-logger');

module.exports = (artifact, accounts) => {

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

    var validCharityRandom = th.random();
    var validCharityHashedRandom = th.hashedRandom(validCharityRandom, validCharity);

    test("should choose a winner", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);
        var validRandom2 = th.random();
        var validHashedRandom2 = th.hashedRandom(validRandom2, validParticipant2);
        var validRandom3 = th.random();
        var validHashedRandom3 = th.hashedRandom(validRandom3, validParticipant3);
        var validRandom4 = th.random();
        var validHashedRandom4 = th.hashedRandom(validRandom4, validParticipant4);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        await contracts.charity.methods.kickoff(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        await contracts.charity.methods.participate(
            validHashedRandom2,
            { from: validParticipant2 }
        );

        await contracts.charity.methods.participate(
            validHashedRandom3,
            { from: validParticipant3 }
        );

        await contracts.charity.methods.participate(
            validHashedRandom4,
            { from: validParticipant4 }
        );

        // run fallback function
        await contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10000 });
        await contracts.charity.methods.sendTransaction({ from: validParticipant2, value: 15000 });
        await contracts.charity.methods.sendTransaction({ from: validParticipant3, value: 20000 });
        await contracts.charity.methods.sendTransaction({ from: validParticipant4, value: 25000 });

        var actualTotalEntries = await contracts.charity.methods.totalEntries, );
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 70, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 4, "total participants should be 4");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

        await th.sleep(th.timeInterval);

        await contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        );

        await contracts.charity.methods.reveal(
            validRandom2,
            { from: validParticipant2 }
        );

        await contracts.charity.methods.reveal(
            validRandom3,
            { from: validParticipant3 }
        );

        actualTotalEntries = await contracts.charity.methods.totalEntries, );
        actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 70, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 45, "total revealed should be 45");
        assert.equal(actualTotalParticipants.toNumber(), 4, "total participants should be 4");
        assert.equal(actualTotalRevealers.toNumber(), 3, "total revealers should be 3");

        mochaLogger.pending("participant 1: " + validParticipant + " entires: " + 10);
        mochaLogger.pending("participant 2: " + validParticipant2 + " entires: " + 15);
        mochaLogger.pending("participant 3: " + validParticipant3 + " entires: " + 20);

        await th.sleep(th.timeInterval);

        await contracts.charity.methods.end(validCharityRandom, { from: validCharity });

        var winner = await contracts.charity.methods.winner, );
        mochaLogger.pending("winner: " + winner);
        assert.isOk(
            (winner == validParticipant)
            || (winner == validParticipant2)
            || (winner == validParticipant3)
            , "one participant that revealed should have won");

        var actualCharityBalance = await contracts.charity.methods.balance, validCharity, { from: validParticipant });
        var actualWinnerBalance = await contracts.charity.methods.balance, winner, { from: validParticipant });
        var actualOwnerBalance = await contracts.charity.methods.balance, validOwner, { from: validParticipant });

        mochaLogger.pending("charity balance: " + actualCharityBalance.toNumber());
        mochaLogger.pending("winner balance: " + actualWinnerBalance.toNumber());
        mochaLogger.pending("owner balance: " + actualOwnerBalance.toNumber());

        var validCharityBalance = 70 * validValuePerEntry * validCharitySplit / 100;
        var validWinnerBalance = 70 * validValuePerEntry * validWinnerSplit / 100;
        var validOwnerBalance = 70 * validValuePerEntry * validOwnerSplit / 100;

        assert.equal(actualCharityBalance.toNumber(), validCharityBalance, "charity balance incorrect");
        assert.equal(actualWinnerBalance.toNumber(), validWinnerBalance, "winner balance incorrect");
        assert.equal(actualOwnerBalance.toNumber(), validOwnerBalance, "owner balance incorrect");

    });

}
