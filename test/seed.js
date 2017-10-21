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

    it("should seed properly from charity", async () => {

        var instance = await artifact.new();

        var validCharityRandom = helpers.random();
        var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validCharity);

        var validStartTime = helpers.now() + helpers.timeInterval;
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

        await instance.seed(
            validCharityHashedRandom,
            { from: validCharity }
        );

        var actualCharityHashedRandom = await instance.charityHashedRandom.call({ from: validParticipant });

        assert.equal(actualCharityHashedRandom, validCharityHashedRandom, "charity's hashed random does not match");

    });

    it("should reject seed from owner", async () => {
        
        var instance = await artifact.new();

        var validCharityRandom = helpers.random();
        var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validCharity);

        var validStartTime = helpers.now() + helpers.timeInterval;
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

        assert.isRejected(instance.seed(
            validCharityHashedRandom,
            { from: validOwner }
        ));

    });

    it("should reject seed from participant", async () => {
        
        var instance = await artifact.new();

        var validCharityRandom = helpers.random();
        var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validCharity);

        var validStartTime = helpers.now() + helpers.timeInterval;
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

        assert.isRejected(instance.seed(
            validCharityHashedRandom,
            { from: validParticipant }
        ));

    });

}