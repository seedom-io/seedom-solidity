var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var helpers = require('../helpers');

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

    it("should construct properly", async () => {

        var instance = await artifact.new();

        var actualWinner = await instance.winner.call({ from: validOwner });
        var actualCancelled = await instance.cancelled.call({ from: validOwner });
        var actualTotalEntries = await instance.totalEntries.call({ from: validOwner });
        var actualTotalRevealed = await instance.totalRevealed.call({ from: validOwner });
        var actualTotalParticipants = await instance.totalParticipants.call({ from: validOwner });
        var actualTotalRevealers = await instance.totalRevealers.call({ from: validOwner });

        assert.equal(actualWinner, 0, "winner zero");
        assert.isOk(actualCancelled, "initially cancelled");
        assert.equal(actualTotalEntries, 0, "total entries zero");
        assert.equal(actualTotalRevealed, 0, "total revealed zero");
        assert.equal(actualTotalParticipants, 0, "total participants zero");
        assert.equal(actualTotalRevealers, 0, "total revealers zero");

        var now = helpers.now();
        var validStartTime = now + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        await instance.kickoff(
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

        var actualKickoff = await instance.currentKick.call({ from: validOwner });
        var actualKickTimeDifference = actualKickoff[5] - now;

        assert.equal(actualKickoff[0], validCharity, "charity does not match");
        assert.equal(actualKickoff[1].toNumber(), validCharitySplit, "charity split does not match");
        assert.equal(actualKickoff[2].toNumber(), validWinnerSplit, "winner split does not match");
        assert.equal(actualKickoff[3].toNumber(), validOwnerSplit, "validOwner split does not match");
        assert.equal(actualKickoff[4].toNumber(), validValuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualKickTimeDifference, 1, "wei per entry does not match");
        assert.equal(actualKickoff[6].toNumber(), validStartTime, "start time does not match");
        assert.equal(actualKickoff[7].toNumber(), validRevealTime, "reveal time does not match");
        assert.equal(actualKickoff[8].toNumber(), validEndTime, "end time does not match");

    });

    it("should fail to construct with completely invalid data", async () => {

        var instance = await artifact.new();

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var promises = [];
        [[0, 49, 49, 2, 1000, validStartTime, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 0, 49, 2, 1000, validStartTime, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 0, 2, 1000, validStartTime, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 0, 1000, validStartTime, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 0, validStartTime, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, 0, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, 0, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, 0, { from: validOwner }]].forEach((args) => {
            promises.push(assert.isRejected(instance.seed.apply(this, args)));
        });

        return Promise.all(promises);

    });

    it("should fail to construct with invalid dates", async () => {

        var instance = await artifact.new();

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var oldStartTime = helpers.now() - (helpers.timeInterval * 3);
        var oldRevealTime = oldStartTime + helpers.timeInterval;
        var oldEndTime = oldRevealTime + helpers.timeInterval;

        var promises = [];
        // old dates
        [[validCharity, 49, 49, 2, 1000, oldStartTime, validRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, oldRevealTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, oldEndTime, { from: validOwner }],
        // equal dates
        [validCharity, 49, 49, 2, 1000, validStartTime, validStartTime, validStartTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, validStartTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, validRevealTime, { from: validOwner }],
        // out of order dates
        [validCharity, 49, 49, 2, 1000, validRevealTime, validStartTime, validEndTime, { from: validOwner }],
        [validCharity, 49, 49, 2, 1000, validStartTime, validEndTime, validRevealTime, { from: validOwner }]].forEach((args) => {
            promises.push(assert.isRejected(instance.seed.apply(this, args)));
        });

        return Promise.all(promises);

    });

}