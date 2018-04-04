const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const begin = require('../script/simulation/begin');
const participate = require('../script/simulation/participate');
const end = require('../script/simulation/end');

suite('polling', (state) => {

    test("should reject add cause before participation", async () => {

        await begin.run(state);

        const { env } = state;
        const causeName = sh.hexMessage("TEST CAUSE");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            (await state.interfaces.polling).voteName({
                causeName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add empty cause (name) after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const causeName = sh.hexMessage("");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            (await state.interfaces.polling).voteName({
                causeName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add cause score above max after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const causeName = sh.hexMessage("TEST CAUSE1");
        const participant = state.accountAddresses[2];
        const score = 15;

        await assert.isRejected(
            (await state.interfaces.polling).voteName({
                causeName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add cause and destroy after end", async () => {

        await end.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName = sh.hexMessage("TEST CAUSE1");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            polling.voteName({
                causeName,
                score
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
        await cli.progress("waiting for destruct time", env.destructTime - now);

        const polling = await state.interfaces.polling;
        const participant = state.accountAddresses[2];

        await assert.isRejected(
            polling.destroy({ from: participant, transact: true })
        );

        await assert.isFulfilled(
            polling.destroy({ from: env.owner, transact: true })
        );

    });

    test("should reject vote score above max after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName = sh.hexMessage("TEST CAUSE1");
        const participant1 = state.accountAddresses[2];
        const score1 = 10;

        await assert.isFulfilled(
            polling.voteName({
                causeName,
                score: score1
            }, { from: participant1, transact: true })
        );

        const participant2 = state.accountAddresses[3];
        const score2 = 15;

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

    });

    test("should reject duplicate causes after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName = sh.hexMessage("TEST CAUSE1");
        const participant1 = state.accountAddresses[2];
        const score = 10;

        await assert.isFulfilled(
            polling.voteName({
                causeName,
                score: score
            }, { from: participant1, transact: true })
        );

        const participant2 = state.accountAddresses[3];

        await assert.isRejected(
            polling.voteName({
                causeName,
                score: score
            }, { from: participant2, transact: true })
        );

    });

    test("should add new causes after participation and reject votes for non-causes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const participant3 = state.accountAddresses[4];
        const participant4 = state.accountAddresses[5];
        const score3 = 5;
        const score4 = 7;

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 2,
                score: score3
            }, { from: participant3, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 3,
                score: score4
            }, { from: participant4, transact: true })
        );

    });

    test("should allow new causes after participation and manage votes correctly", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const participant3 = state.accountAddresses[4];
        const participant4 = state.accountAddresses[5];
        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: score3
            }, { from: participant3, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 1,
                score: score4
            }, { from: participant4, transact: true })
        );

        const actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.totalScores[0], score1 + score3, "cause score wrong");
        assert.equal(actualCauses.totalVotes[0], 2, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.totalScores[1], score2 + score4, "cause score wrong");
        assert.equal(actualCauses.totalVotes[1], 2, "cause total votes wrong");

        const actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong (1)");
        assert.equal(actualVotes1.scores[0], score1, "cause score wrong (1)");

        const actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong (2)");
        assert.equal(actualVotes2.scores[0], score2, "cause score wrong (2)");

        const actualVotes3 = await polling.votes({ from: participant3 });
        assert.equal(actualVotes3[0][0], 0, "cause index wrong (3)");
        assert.equal(actualVotes3[1][0], score3, "cause score wrong (3)");

        const actualVotes4 = await polling.votes({ from: participant4 });
        assert.equal(actualVotes4[0][0], 1, "cause index wrong (4)");
        assert.equal(actualVotes4[1][0], score4, "cause score wrong (4)");

    });

    test("should allow new causes after participation and reject additional causes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.totalScores[0], score1, "cause score wrong");
        assert.equal(actualCauses.totalVotes[0], 1, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.totalScores[1], score2, "cause score wrong");
        assert.equal(actualCauses.totalVotes[1], 1, "cause total votes wrong");

        const actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes1.scores[0], score1, "cause score wrong");

        const actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong");
        assert.equal(actualVotes2.scores[0], score2, "cause score wrong");

        const causeName3 = sh.hexMessage("TEST CAUSE3");
        const causeName4 = sh.hexMessage("TEST CAUSE4");

        await assert.isRejected(
            polling.voteName({
                causeName: causeName3,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            polling.voteName({
                causeName: causeName4,
                score: score2
            }, { from: participant2, transact: true })
        );

    });

    test("should allow new causes after participation and reject cross votes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

    });

    test("should allow new causes after participation and allow re-votes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: score3
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 1,
                score: score4
            }, { from: participant2, transact: true })
        );

        const actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.totalScores[0], score3, "cause score wrong");
        assert.equal(actualCauses.totalVotes[0], 1, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.totalScores[1], score4, "cause score wrong");
        assert.equal(actualCauses.totalVotes[1], 1, "cause total votes wrong");

        const actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes1.scores[0], score3, "cause score wrong");

        const actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong");
        assert.equal(actualVotes2.scores[0], score4, "cause score wrong");

    });

    test("should allow new causes after participation and allow de-voting and re-voting", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: 0
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 1,
                score: 0
            }, { from: participant2, transact: true })
        );

        let actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.totalScores[0], 0, "cause score wrong");
        assert.equal(actualCauses.totalVotes[0], 0, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.totalScores[1], 0, "cause score wrong");
        assert.equal(actualCauses.totalVotes[1], 0, "cause total votes wrong");

        let actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes1.scores[0], 0, "cause score wrong");

        let actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong");
        assert.equal(actualVotes2.scores[0], 0, "cause score wrong");

        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: score3
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 1,
                score: score4
            }, { from: participant2, transact: true })
        );

        actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.totalScores[0], score3, "cause score wrong");
        assert.equal(actualCauses.totalVotes[0], 1, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.totalScores[1], score4, "cause score wrong");
        assert.equal(actualCauses.totalVotes[1], 1, "cause total votes wrong");

        actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes1.scores[0], score3, "cause score wrong");

        actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong");
        assert.equal(actualVotes2.scores[0], score4, "cause score wrong");

    });

    test("should allow a new cause, a vote, a de-vote, and another new cause", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: 0
            }, { from: participant2, transact: true })
        );

        let actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes.length, 0, "cause indexes length wrong");
        assert.equal(actualVotes2.scores.length, 0, "scores length wrong");

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        let actualCauses = await polling.causes({ from: participant1 });
        assert.equal(actualCauses.names[0], causeName1, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[0], participant1, "cause caster wrong");
        assert.equal(actualCauses.totalScores[0], score1, "cause score wrong");
        assert.equal(actualCauses.totalVotes[0], 1, "cause total votes wrong");
        assert.equal(actualCauses.names[1], causeName2, "cause name wrong");
        assert.equalIgnoreCase(actualCauses.casters[1], participant2, "cause caster wrong");
        assert.equal(actualCauses.totalScores[1], score2, "cause score wrong");
        assert.equal(actualCauses.totalVotes[1], 1, "cause total votes wrong");

        let actualVotes1 = await polling.votes({ from: participant1 });
        assert.equal(actualVotes1.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes1.scores[0], score1, "cause score wrong");

        actualVotes2 = await polling.votes({ from: participant2 });
        assert.equal(actualVotes2.causeIndexes[0], 1, "cause index wrong");
        assert.equal(actualVotes2.scores[0], score2, "cause score wrong");

    });

    test("should allow a new cause, a de-vote, and reject a new cause and other votes", async () => {

        await participate.run(state);

        const { env } = state;
        const polling = await state.interfaces.polling;
        const causeName1 = sh.hexMessage("TEST CAUSE1");
        const causeName2 = sh.hexMessage("TEST CAUSE2");
        const causeName3 = sh.hexMessage("TEST CAUSE3");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score = 10;

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName1,
                score
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            polling.voteName({
                causeName: causeName2,
                score
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            polling.voteIndex({
                causeIndex: 0,
                score: 0
            }, { from: participant1, transact: true })
        );

        let actualVotes = await polling.votes({ from: participant1 });
        assert.equal(actualVotes.causeIndexes[0], 0, "cause index wrong");
        assert.equal(actualVotes.scores[0], 0, "cause score wrong");

        await assert.isRejected(
            polling.voteName({
                causeName: causeName3,
                score
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            polling.voteIndex({
                causeIndex: 1,
                score
            }, { from: participant1, transact: true })
        );

    });

});