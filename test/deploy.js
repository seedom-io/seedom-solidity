const sh = require('../script/helper');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const deploy = require('../script/simulation/deploy');
const m = require('../../seedom-crypter/messages');

suite('deploy', (state) => {

    test("should have proper initial raiser and state", async () => {

        await deploy.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        const now = ch.timestamp();
        const actualDeployment = await fundraiser.deployment({ from: env.owner });
        const deployTimeDifference = actualDeployment.deployTime - now;

        assert.equalIgnoreCase(actualDeployment.cause, env.cause, "cause does not match");
        assert.equalIgnoreCase(actualDeployment.causeWallet, env.causeWallet, "cause wallet does not match");
        assert.equal(actualDeployment.causeSplit, env.causeSplit, "cause split does not match");
        assert.equal(actualDeployment.participantSplit, env.participantSplit, "selected split does not match");
        assert.equalIgnoreCase(actualDeployment.owner, env.owner, "owner does not match");
        assert.equalIgnoreCase(actualDeployment.ownerWallet, env.ownerWallet, "owner wallet does not match");
        assert.equal(actualDeployment.ownerSplit, env.ownerSplit, "owner split does not match");
        assert.equal(actualDeployment.ownerSecret, env.ownerSecret, "owner secret does not match");
        assert.equal(actualDeployment.valuePerEntry, env.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(deployTimeDifference, 2, "deploy time delta too high");
        assert.equal(actualDeployment.endTime, env.endTime, "end time does not match");
        assert.equal(actualDeployment.expireTime, env.expireTime, "expire time does not match");
        assert.equal(actualDeployment.destructTime, env.destructTime, "destruct time does not match");
        assert.equal(actualDeployment.goal, env.goal, "goal does not match");

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, 0, "cause secret zero");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, 0, "total participants zero");
        assert.equal(actualState.entries, 0, "total entries zero");
    });

    test("should deploy properly with no owner split", async () => {

        const { env } = state;
        let fundraiser = await state.interfaces.fundraiser;
        
        const cause = state.accountAddresses[0];
        const causeWallet = state.accountAddresses[1];
        const causeSplit = 500;
        const participantSplit = 500;
        const owner = state.accountAddresses[2];
        const ownerWallet = state.accountAddresses[3];
        const ownerSplit = 0;
        const ownerMessage = m.random();
        const ownerSecret = m.hash(ownerMessage, owner);
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const goal = 10000;

        fundraiser = await fundraiser.deploy({
            cause,
            causeWallet,
            causeSplit,
            participantSplit,
            ownerWallet,
            ownerSplit,
            ownerSecret,
            valuePerEntry,
            endTime,
            expireTime,
            destructTime,
            goal
        }, { from: owner });

        const actualDeployment = await fundraiser.deployment({ from: owner });
        const deployTimeDifference = actualDeployment.deployTime - now;

        assert.equalIgnoreCase(actualDeployment.cause, cause, "cause does not match");
        assert.equalIgnoreCase(actualDeployment.causeWallet, causeWallet, "cause wallet does not match");
        assert.equal(actualDeployment.causeSplit, causeSplit, "cause split does not match");
        assert.equal(actualDeployment.participantSplit, participantSplit, "selected split does not match");
        assert.equalIgnoreCase(actualDeployment.owner, owner, "owner does not match");
        assert.equalIgnoreCase(actualDeployment.ownerWallet, ownerWallet, "owner wallet does not match");
        assert.equal(actualDeployment.ownerSplit, ownerSplit, "owner split does not match");
        assert.equal(actualDeployment.ownerSecret, ownerSecret, "owner secret does not match");
        assert.equal(actualDeployment.valuePerEntry, valuePerEntry, "wei per entry does not match");
        assert.isAtMost(deployTimeDifference, 2, "deploy time delta too high");
        assert.equal(actualDeployment.endTime, endTime, "end time does not match");
        assert.equal(actualDeployment.expireTime, expireTime, "expire time does not match");
        assert.equal(actualDeployment.destructTime, destructTime, "destruct time does not match");
        assert.equal(actualDeployment.goal, goal, "goal does not match");

    });

    test("should fail to deploy with zeroed data", async () => {

        const cause = state.accountAddresses[0];
        const causeWallet = state.accountAddresses[1];
        const causeSplit = 600;
        const participantSplit = 350;
        const owner = state.accountAddresses[2];
        const ownerWallet = state.accountAddresses[3];
        const ownerSplit = 50;
        const ownerMessage = m.random();
        const ownerSecret = m.hash(ownerMessage, owner);
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const goal = 10000;
        
        const testData = [
            {cause: 0, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet: 0, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit: 0, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit: 0, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet: 0, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit: 0, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret: 0, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry: 0, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime: 0, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime: 0, destructTime, goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime: 0, goal}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 12, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.fundraiser).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to deploy with splits that don't add to 1000", async () => {

        const cause = state.accountAddresses[0];
        const causeWallet = state.accountAddresses[1];
        const owner = state.accountAddresses[2];
        const ownerWallet = state.accountAddresses[3];
        const ownerMessage = m.random();
        const ownerSecret = m.hash(ownerMessage, owner);
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const valuePerEntry = 1000;
        const goal = 10000;
        
        const testData = [
            {cause, causeWallet, causeSplit: 20, participantSplit: 30, ownerWallet, ownerSplit: 50, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit: 200, participantSplit: 350, ownerWallet, ownerSplit: 500, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit: 601, participantSplit: 200, ownerWallet, ownerSplit: 200, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal},
            {cause, causeWallet, causeSplit: 6000, participantSplit: 2000, ownerWallet, ownerSplit: 2000, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, goal}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 12, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.fundraiser).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to deploy with invalid dates", async () => {

        const cause = state.accountAddresses[0];
        const causeWallet = state.accountAddresses[1];
        const causeSplit = 600;
        const participantSplit = 350;
        const ownerSplit = 50;
        const valuePerEntry = 1000;
        const owner = state.accountAddresses[2];
        const ownerWallet = state.accountAddresses[3];
        const ownerMessage = m.random();
        const ownerSecret = m.hash(ownerMessage, owner);
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const oldEndTime = now - phaseDuration * 3;
        const oldExpireTime = oldEndTime + phaseDuration;
        const oldDestructTime = oldExpireTime + phaseDuration;
        const goal = 10000;

        const testData = [
            // old dates
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime: oldEndTime,
                expireTime,
                destructTime,
                goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: oldExpireTime,
                destructTime,
                goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime,
                destructTime: oldDestructTime,
                goal},
            // equal dates
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: endTime,
                destructTime,
                goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime,
                destructTime: expireTime,
                goal},
            // out of order dates
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime: expireTime,
                expireTime: endTime,
                destructTime,
                goal},
            {cause, causeWallet, causeSplit, participantSplit, ownerWallet, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: destructTime,
                destructTime: expireTime,
                goal},
        ];

        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 12, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.fundraiser).deploy(testArgs, { from: owner })
            );
        }

    });

});
