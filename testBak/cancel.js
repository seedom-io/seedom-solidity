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

    test("should reject cancel before first construct", async () => {
        var instance = await artifact.new();
        assert.isRejected(contracts.charity.methods.cancel({ from: validOwner }));
    });

    test("should cancel (by owner) after construct", async () => {

        var instance = await artifact.new();

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        await contracts.charity.methods.cancel({ from: validOwner });

        var actualCancelled = contracts.charity.methods.cancelled, );
        assert.isOk(actualCancelled);

    });

    test("should cancel (by charity) after construct", async () => {

        var instance = await artifact.new();

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        await contracts.charity.methods.cancel({ from: validCharity });

        var actualCancelled = contracts.charity.methods.cancelled, );
        assert.isOk(actualCancelled);

    });

    test("should reject cancel from participant", async () => {

        var instance = await artifact.new();

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        assert.isRejected(contracts.charity.methods.cancel({ from: validParticipant }));

    });

    test("should cancel after seed", async () => {

        var instance = await artifact.new();

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        await contracts.charity.methods.cancel({ from: validOwner });

        var actualCancelled = contracts.charity.methods.cancelled, );
        assert.isOk(actualCancelled);

    });

    test("should refund after funding", async () => {

        var instance = await artifact.new();

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

        await contracts.charity.methods.cancel({ from: validOwner });

        var actualCancelled = contracts.charity.methods.cancelled, );
        assert.isOk(actualCancelled);

        var actualParticipantBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        var actualParticipant2Balance = await contracts.charity.methods.balance, validParticipant2, { from: validParticipant });
        var actualParticipant3Balance = await contracts.charity.methods.balance, validParticipant3, { from: validParticipant });
        var actualParticipant4Balance = await contracts.charity.methods.balance, validParticipant4, { from: validParticipant });

        assert.equal(actualParticipantBalance, 10000, "refund balance incorrect");
        assert.equal(actualParticipant2Balance, 15000, "refund balance 2 incorrect");
        assert.equal(actualParticipant3Balance, 20000, "refund balance 3 incorrect");
        assert.equal(actualParticipant4Balance, 25000, "refund balance 4 incorrect");

    });

    test("should refund after revelation", async () => {

        var instance = await artifact.new();

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

        await contracts.charity.methods.cancel({ from: validOwner });

        var actualCancelled = contracts.charity.methods.cancelled, );
        assert.isOk(actualCancelled);

        var actualParticipantBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        var actualParticipant2Balance = await contracts.charity.methods.balance, validParticipant2, { from: validParticipant });
        var actualParticipant3Balance = await contracts.charity.methods.balance, validParticipant3, { from: validParticipant });
        var actualParticipant4Balance = await contracts.charity.methods.balance, validParticipant4, { from: validParticipant });

        assert.equal(actualParticipantBalance, 10000, "refund balance incorrect");
        assert.equal(actualParticipant2Balance, 15000, "refund balance 2 incorrect");
        assert.equal(actualParticipant3Balance, 20000, "refund balance 3 incorrect");
        assert.equal(actualParticipant4Balance, 25000, "refund balance 4 incorrect");

    });

    test("should reject cancel after end", async () => {

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

        await th.sleep(th.timeInterval);

        // first participant should be allowed to end the charity
        await contracts.charity.methods.end(validCharityRandom, { from: validCharity });

        var winner = await contracts.charity.methods.winner, );
        assert.isOk(
            (winner == validParticipant)
            || (winner == validParticipant2)
            || (winner == validParticipant3)
            , "one participant that revealed should have won");

        assert.isRejected(contracts.charity.methods.cancel({ from: validOwner }));
        
    });

}
