var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var helpers = require('../helpers');
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

    var validCharityRandom = helpers.random();
    var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validCharity);

    it("should choose a winner", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);
        var validRandom2 = helpers.random();
        var validHashedRandom2 = helpers.hashedRandom(validRandom2, validParticipant2);
        var validRandom3 = helpers.random();
        var validHashedRandom3 = helpers.hashedRandom(validRandom3, validParticipant3);
        var validRandom4 = helpers.random();
        var validHashedRandom4 = helpers.hashedRandom(validRandom4, validParticipant4);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.construct(
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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        await instance.participate(
            validHashedRandom2,
            { from: validParticipant2 }
        );

        await instance.participate(
            validHashedRandom3,
            { from: validParticipant3 }
        );

        await instance.participate(
            validHashedRandom4,
            { from: validParticipant4 }
        );

        // run fallback function
        await instance.sendTransaction({ from: validParticipant, value: 10000 });
        await instance.sendTransaction({ from: validParticipant2, value: 15000 });
        await instance.sendTransaction({ from: validParticipant3, value: 20000 });
        await instance.sendTransaction({ from: validParticipant4, value: 25000 });

        var actualTotalEntries = await instance.totalEntries.call();
        var actualTotalRevealed = await instance.totalRevealed.call();
        var actualTotalParticipants = await instance.totalParticipants.call();
        var actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries.toNumber(), 70, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 4, "total participants should be 4");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

        await helpers.sleep(helpers.timeInterval);

        await instance.reveal(
            validRandom,
            { from: validParticipant }
        );

        await instance.reveal(
            validRandom2,
            { from: validParticipant2 }
        );

        await instance.reveal(
            validRandom3,
            { from: validParticipant3 }
        );

        actualTotalEntries = await instance.totalEntries.call();
        actualTotalRevealed = await instance.totalRevealed.call();
        actualTotalParticipants = await instance.totalParticipants.call();
        actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries.toNumber(), 70, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 45, "total revealed should be 45");
        assert.equal(actualTotalParticipants.toNumber(), 4, "total participants should be 4");
        assert.equal(actualTotalRevealers.toNumber(), 3, "total revealers should be 3");

        mochaLogger.pending("participant 1: " + validParticipant + " entires: " + 10);
        mochaLogger.pending("participant 2: " + validParticipant2 + " entires: " + 15);
        mochaLogger.pending("participant 3: " + validParticipant3 + " entires: " + 20);

        await helpers.sleep(helpers.timeInterval);

        await instance.end(validCharityRandom, { from: validCharity });

        var winner = await instance.winner.call();
        mochaLogger.pending("winner: " + winner);
        assert.isOk(
            (winner == validParticipant)
            || (winner == validParticipant2)
            || (winner == validParticipant3)
            , "one participant that revealed should have won");

        var actualCharityBalance = await instance.balance.call(validCharity, { from: validParticipant });
        var actualWinnerBalance = await instance.balance.call(winner, { from: validParticipant });
        var actualOwnerBalance = await instance.balance.call(validOwner, { from: validParticipant });

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
