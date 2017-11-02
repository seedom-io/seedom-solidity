const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('kickoff', (state) => {

    test("should kickoff properly", async () => {

        await kickoff.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.charity);
        const actualKickoff = await stage.instances.charity.methods.currentKick().call({ from: stage.owner });
        const actualKickTimeDifference = actualKickoff._kickTime - now;

        assert.equalIgnoreCase(actualKickoff._charity, stage.charity, "charity does not match");
        assert.equal(actualKickoff._charitySplit, stage.charitySplit, "charity split does not match");
        assert.equal(actualKickoff._winnerSplit, stage.winnerSplit, "winner split does not match");
        assert.equal(actualKickoff._ownerSplit, stage.ownerSplit, "validOwner split does not match");
        assert.equal(actualKickoff._valuePerEntry, stage.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualKickTimeDifference, 2, "kick time delta too high");
        assert.equal(actualKickoff._startTime, stage.startTime, "start time does not match");
        assert.equal(actualKickoff._revealTime, stage.revealTime, "reveal time does not match");
        assert.equal(actualKickoff._endTime, stage.endTime, "end time does not match");

    });

    test("should fail to kickoff with invalid data", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.charity);
        const charity = state.accountAddresses[1];
        const startTime = now + sh.timeInterval;
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
            cli.info(testArgs);
            const method = stage.instances.charity.methods.kickoff.apply(null, testArgs);
            await assert.isRejected(
                parity.sendMethod(method, { from: stage.owner }),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

    test("should fail to kickoff with invalid dates", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.charity);
        const charity = state.accountAddresses[1];
        const startTime = now + sh.timeInterval;
        const revealTime = startTime + sh.timeInterval;
        const endTime = revealTime + sh.timeInterval;
        const oldStartTime = now - (sh.timeInterval * 3);
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
            cli.info(testArgs);
            const method = stage.instances.charity.methods.kickoff.apply(null, testArgs);
            await assert.isRejected(
                parity.sendMethod(method, { from: stage.owner }),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

});