const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const begin = require('../script/simulation/begin');
const participate = require('../script/simulation/participate');
const end = require('../script/simulation/end');
const m = require('../../seedom-crypter/messages');

suite('polling', (state) => {

    test("should reject add cause before participation", async () => {

        await begin.run(state);

        const { env } = state;
        const causeName = m.hex("TEST CAUSE");
        const participant = state.network.keys[4].address;

        await assert.isRejected(
            (await state.interfaces.polling).voteName({
                causeName,
                count: 1
            }, { from: participant, transact: true })
        );

    });

    test("should reject add empty cause (name) after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const causeName = m.hex("");
        const participant = state.network.keys[4].address;

        await assert.isRejected(
            (await state.interfaces.polling).voteName({
                causeName,
                count: 1
            }, { from: participant, transact: true })
        );

    });

    test("should reject add cause and destroy after end", async () => {

        await end.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName = m.hex("TEST CAUSE1");
        const participant = state.network.keys[4].address;

        await assert.isRejected(
            polling.voteName({
                causeName,
                count: 1
            }, { from: participant, transact: true })
        );

        await assert.isRejected(
            polling.destroy({ from: env.owner, transact: true })
        );

    });

    test("should allow destroy from owner and reject from participant after destruct time", async () => {

        await end.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for destruct time", env.destructTime - now, 1);

        const polling = await state.interfaces.polling;
        const participant = state.network.keys[4].address;

        await assert.isRejected(
            polling.destroy({ from: participant, transact: true })
        );

        await assert.isFulfilled(
            polling.destroy({ from: env.owner, transact: true })
        );

    });

    test("should reject duplicate causes after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName = m.hex("TEST CAUSE1");
        const participant1 = state.network.keys[4].address;

        await assert.isFulfilled(
            polling.voteName({
                causeName,
                count: 1
            }, { from: participant1, transact: true })
        );

        const participant2 = state.network.keys[5].address;

        await assert.isRejected(
            polling.voteName({
                causeName
            }, { from: participant2, transact: true })
        );

    });

    test("should add new causes after participation and reject votes for non-causes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = m.hex("TEST CAUSE1");
        const causeName2 = m.hex("TEST CAUSE2");
        const participant1 = state.network.keys[4].address;
        const participant2 = state.network.keys[5].address;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                count: 1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                count: 1
            }, { from: participant2, transact: true })
        );

        const participant3 = state.network.keys[6].address;
        const participant4 = state.network.keys[7].address;

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 2,
                count: 1
            }, { from: participant3, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 3,
                count: 1
            }, { from: participant4, transact: true })
        );

    });

    test("should allow new causes after participation and allow others to vote on them", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = m.hex("TEST CAUSE1");
        const causeName2 = m.hex("TEST CAUSE2");
        const participant1 = state.network.keys[4].address;
        const participant2 = state.network.keys[5].address;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                count: 1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                count: 1
            }, { from: participant2, transact: true })
        );

        const participant3 = state.network.keys[6].address;
        const participant4 = state.network.keys[7].address;

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                count: 1
            }, { from: participant3, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 1,
                count: 1
            }, { from: participant4, transact: true })
        );

        const actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.voteCounts[0], 2, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.voteCounts[1], 2, "cause total votes wrong");

        const actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong (1)");
        assert.equal(actualVotes1.counts[0], 1, "cause vote count wrong (1)");

        const actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong (2)");
        assert.equal(actualVotes2.counts[0], 1, "cause vote count wrong (2)");

        const actualVotes3 = await polling.votes({ from: participant3 });
        assert.equal(actualVotes3.causeIndexes[0], 0, "cause index wrong (3)");
        assert.equal(actualVotes3.counts[0], 1, "cause vote count wrong (3)");

        const actualVotes4 = await polling.votes({ from: participant4 });
        assert.equal(actualVotes4.causeIndexes[0], 1, "cause index wrong (4)");
        assert.equal(actualVotes4.counts[0], 1, "cause vote count wrong (4)");

    });

    test("should allow new causes after participation and reject additional causes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = m.hex("TEST CAUSE1");
        const causeName2 = m.hex("TEST CAUSE2");
        const participant1 = state.network.keys[4].address;
        const participant2 = state.network.keys[5].address;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                count: 1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                count: 1
            }, { from: participant2, transact: true })
        );

        const actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.voteCounts[0], 1, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.voteCounts[1], 1, "cause total votes wrong");

        const actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes1.counts[0], 1, "cause vote count wrong");

        const actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong");
        assert.equal(actualVotes2.counts[0], 1, "cause vote count wrong");

        const causeName3 = m.hex("TEST CAUSE3");
        const causeName4 = m.hex("TEST CAUSE4");

        await assert.isRejected(
            polling.voteName({
                causeName: causeName3,
                count: 1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            polling.voteName({
                causeName: causeName4,
                count: 1
            }, { from: participant2, transact: true })
        );

    });

    test("should allow new causes after participation and reject cross votes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = m.hex("TEST CAUSE1");
        const causeName2 = m.hex("TEST CAUSE2");
        const participant1 = state.network.keys[4].address;
        const participant2 = state.network.keys[5].address;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                count: 1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                count: 1
            }, { from: participant2, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 1,
                count: 1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 0,
                count: 1
            }, { from: participant2, transact: true })
        );

    });

});