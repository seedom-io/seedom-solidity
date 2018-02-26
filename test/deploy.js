const sh = require('../script/helper');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const deploy = require('../script/simulation/deploy');

suite('deploy', (state) => {

    test("should have proper initial raiser and state", async () => {

        await deploy.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;
        const now = ch.timestamp();
        const actualRaiser = await seedom.raiser({ from: env.owner });
        const deployTimeDifference = actualRaiser.deployTime - now;

        assert.equalIgnoreCase(actualRaiser.owner, env.owner, "owner does not match");
        assert.equalIgnoreCase(actualRaiser.charity, env.charity, "charity does not match");
        assert.equal(actualRaiser.charitySplit, env.charitySplit, "charity split does not match");
        assert.equal(actualRaiser.winnerSplit, env.winnerSplit, "winner split does not match");
        assert.equal(actualRaiser.ownerSplit, env.ownerSplit, "owner split does not match");
        assert.equal(actualRaiser.ownerSecret, env.ownerSecret, "owner secret does not match");
        assert.equal(actualRaiser.valuePerEntry, env.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(deployTimeDifference, 2, "deploy time delta too high");
        assert.equal(actualRaiser.endTime, env.endTime, "end time does not match");
        assert.equal(actualRaiser.expireTime, env.expireTime, "expire time does not match");
        assert.equal(actualRaiser.destructTime, env.destructTime, "destruct time does not match");
        assert.equal(actualRaiser.maxParticipants, env.maxParticipants, "max participants does not match");

        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.charitySecret, 0, "charity secret zero");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, 0, "total participants zero");
        assert.equal(actualState.totalEntries, 0, "total entries zero");
    });

    test("should deploy properly with no owner split and no max participants", async () => {

        const { env } = state;
        let seedom = await state.interfaces.seedom;
        
        const charity = state.accountAddresses[1];
        const charitySplit = 500;
        const winnerSplit = 500;
        const owner = state.accountAddresses[0];
        const ownerSplit = 0;
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 0;

        seedom = await seedom.deploy({
            charity,
            charitySplit,
            winnerSplit,
            ownerSplit,
            ownerSecret,
            valuePerEntry,
            endTime,
            expireTime,
            destructTime,
            maxParticipants
        }, { from: owner });

        const actualRaiser = await seedom.raiser({ from: owner });
        const deployTimeDifference = actualRaiser.deployTime - now;

        assert.equalIgnoreCase(actualRaiser.owner, owner, "owner does not match");
        assert.equalIgnoreCase(actualRaiser.charity, charity, "charity does not match");
        assert.equal(actualRaiser.charitySplit, charitySplit, "charity split does not match");
        assert.equal(actualRaiser.winnerSplit, winnerSplit, "winner split does not match");
        assert.equal(actualRaiser.ownerSplit, ownerSplit, "owner split does not match");
        assert.equal(actualRaiser.ownerSecret, ownerSecret, "owner secret does not match");
        assert.equal(actualRaiser.valuePerEntry, valuePerEntry, "wei per entry does not match");
        assert.isAtMost(deployTimeDifference, 2, "deploy time delta too high");
        assert.equal(actualRaiser.endTime, endTime, "end time does not match");
        assert.equal(actualRaiser.expireTime, expireTime, "expire time does not match");
        assert.equal(actualRaiser.destructTime, destructTime, "destruct time does not match");
        assert.equal(actualRaiser.maxParticipants, maxParticipants, "max participants does not match");

    });

    test("should fail to deploy with zeroed data", async () => {

        const charity = state.accountAddresses[1];
        const charitySplit = 600;
        const winnerSplit = 350;
        const owner = state.accountAddresses[0];
        const ownerSplit = 50;
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 5;
        
        const testData = [
            {charity: 0, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 0, winnerSplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit: 0, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit: 0, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret: 0, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry: 0, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry, endTime: 0, expireTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime: 0, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime: 0, maxParticipants}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 10, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.seedom).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to deploy with splits that don't add to 1000", async () => {

        const charity = state.accountAddresses[1];
        const owner = state.accountAddresses[0];
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 5;
        const valuePerEntry = 1000;
        
        const testData = [
            {charity, charitySplit: 20, winnerSplit: 30, ownerSplit: 50, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 200, winnerSplit: 350, ownerSplit: 500, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 601, winnerSplit: 200, ownerSplit: 200, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 6000, winnerSplit: 2000, ownerSplit: 2000, ownerSecret, valuePerEntry, endTime, expireTime, destructTime, maxParticipants}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 10, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.seedom).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to deploy with invalid dates", async () => {

        const charity = state.accountAddresses[1];
        const charitySplit = 600;
        const winnerSplit = 350;
        const ownerSplit = 50;
        const valuePerEntry = 1000;
        const owner = state.accountAddresses[0];
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const oldEndTime = now - phaseDuration * 3;
        const oldExpireTime = oldEndTime + phaseDuration;
        const oldDestructTime = oldExpireTime + phaseDuration;
        const maxParticipants = 5;
        

        const testData = [
            // old dates
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime: oldEndTime,
                expireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: oldExpireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime,
                destructTime: oldDestructTime,
                maxParticipants},
            // equal dates
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: endTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime,
                destructTime: expireTime,
                maxParticipants},
            // out of order dates
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime: expireTime,
                expireTime: endTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: destructTime,
                destructTime: expireTime,
                maxParticipants}
        ];

        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 10, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.seedom).deploy(testArgs, { from: owner })
            );
        }

    });

});
