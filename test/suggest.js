const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const seed = require('../script/simulation/seed');
const participate = require('../script/simulation/participate');
const select = require('../script/simulation/select');

suite('suggest', (state) => {

    test("should reject add charity before participation", async () => {

        await seed.run(state);

        const { env } = state;
        const charityName = sh.hexMessage("TEST CHARITY");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            (await state.interfaces.suggest).voteSuggest({
                charityName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add empty charity (name) after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const charityName = sh.hexMessage("");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            (await state.interfaces.suggest).voteSuggest({
                charityName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add charity score above max after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const charityName = sh.hexMessage("TEST CHARITY1");
        const participant = state.accountAddresses[2];
        const score = 15;

        await assert.isRejected(
            (await state.interfaces.suggest).voteSuggest({
                charityName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add charity and destroy after end", async () => {

        await select.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName = sh.hexMessage("TEST CHARITY1");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            suggest.voteSuggest({
                charityName,
                score
            }, { from: participant, transact: true })
        );

        await assert.isRejected(
            suggest.destroy({ from: env.owner, transact: true })
        );

    });

    test("should allow destroy from owner and reject from participant after destruct time", async () => {

        await select.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for destruct time", env.destructTime - now);

        const suggest = await state.interfaces.suggest;
        const participant = state.accountAddresses[2];

        await assert.isRejected(
            suggest.destroy({ from: participant, transact: true })
        );

        await assert.isFulfilled(
            suggest.destroy({ from: env.owner, transact: true })
        );

    });

    test("should reject vote score above max after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName = sh.hexMessage("TEST CHARITY1");
        const participant1 = state.accountAddresses[2];
        const score1 = 10;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName,
                score: score1
            }, { from: participant1, transact: true })
        );

        const participant2 = state.accountAddresses[3];
        const score2 = 15;

        await assert.isRejected(
            suggest.voteCharity({
                charityIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

    });

    test("should reject duplicate charities after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName = sh.hexMessage("TEST CHARITY1");
        const participant1 = state.accountAddresses[2];
        const score = 10;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName,
                score: score
            }, { from: participant1, transact: true })
        );

        const participant2 = state.accountAddresses[3];

        await assert.isRejected(
            suggest.voteSuggest({
                charityName,
                score: score
            }, { from: participant2, transact: true })
        );

    });

    test("should add new charities after participation and reject votes for non-charities", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const participant3 = state.accountAddresses[4];
        const participant4 = state.accountAddresses[5];
        const score3 = 5;
        const score4 = 7;

        await assert.isRejected(
            suggest.voteCharity({
                charityIndex: 2,
                score: score3
            }, { from: participant3, transact: true })
        );

        await assert.isRejected(
            suggest.voteCharity({
                charityIndex: 3,
                score: score4
            }, { from: participant4, transact: true })
        );

    });

    test("should allow new charities after participation and manage votes correctly", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const participant3 = state.accountAddresses[4];
        const participant4 = state.accountAddresses[5];
        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: score3
            }, { from: participant3, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 1,
                score: score4
            }, { from: participant4, transact: true })
        );

        const actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities.names[0], charityName1, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[0], participant1, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[0], score1 + score3, "charity score wrong");
        assert.equal(actualCharities.totalVotes[0], 2, "charity total votes wrong");
        assert.equal(actualCharities.names[1], charityName2, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[1], participant2, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[1], score2 + score4, "charity score wrong");
        assert.equal(actualCharities.totalVotes[1], 2, "charity total votes wrong");

        const actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1.charityIndexes[0], 0, "charity index wrong (1)");
        assert.equal(actualVotes1.scores[0], score1, "charity score wrong (1)");

        const actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes[0], 1, "charity index wrong (2)");
        assert.equal(actualVotes2.scores[0], score2, "charity score wrong (2)");

        const actualVotes3 = await suggest.getVotes({ from: participant3 });
        assert.equal(actualVotes3[0][0], 0, "charity index wrong (3)");
        assert.equal(actualVotes3[1][0], score3, "charity score wrong (3)");

        const actualVotes4 = await suggest.getVotes({ from: participant4 });
        assert.equal(actualVotes4[0][0], 1, "charity index wrong (4)");
        assert.equal(actualVotes4[1][0], score4, "charity score wrong (4)");

    });

    test("should allow new charities after participation and reject additional charities", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities.names[0], charityName1, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[0], participant1, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[0], score1, "charity score wrong");
        assert.equal(actualCharities.totalVotes[0], 1, "charity total votes wrong");
        assert.equal(actualCharities.names[1], charityName2, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[1], participant2, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[1], score2, "charity score wrong");
        assert.equal(actualCharities.totalVotes[1], 1, "charity total votes wrong");

        const actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1.charityIndexes[0], 0, "charity index wrong");
        assert.equal(actualVotes1.scores[0], score1, "charity score wrong");

        const actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes[0], 1, "charity index wrong");
        assert.equal(actualVotes2.scores[0], score2, "charity score wrong");

        const charityName3 = sh.hexMessage("TEST CHARITY3");
        const charityName4 = sh.hexMessage("TEST CHARITY4");

        await assert.isRejected(
            suggest.voteSuggest({
                charityName: charityName3,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            suggest.voteSuggest({
                charityName: charityName4,
                score: score2
            }, { from: participant2, transact: true })
        );

    });

    test("should allow new charities after participation and reject cross votes", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isRejected(
            suggest.voteCharity({
                charityIndex: 1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            suggest.voteCharity({
                charityIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

    });

    test("should allow new charities after participation and allow re-votes", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: score3
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 1,
                score: score4
            }, { from: participant2, transact: true })
        );

        const actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities.names[0], charityName1, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[0], participant1, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[0], score3, "charity score wrong");
        assert.equal(actualCharities.totalVotes[0], 1, "charity total votes wrong");
        assert.equal(actualCharities.names[1], charityName2, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[1], participant2, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[1], score4, "charity score wrong");
        assert.equal(actualCharities.totalVotes[1], 1, "charity total votes wrong");

        const actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1.charityIndexes[0], 0, "charity index wrong");
        assert.equal(actualVotes1.scores[0], score3, "charity score wrong");

        const actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes[0], 1, "charity index wrong");
        assert.equal(actualVotes2.scores[0], score4, "charity score wrong");

    });

    test("should allow new charities after participation and allow de-voting and re-voting", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: 0
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 1,
                score: 0
            }, { from: participant2, transact: true })
        );

        let actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities.names[0], charityName1, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[0], participant1, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[0], 0, "charity score wrong");
        assert.equal(actualCharities.totalVotes[0], 0, "charity total votes wrong");
        assert.equal(actualCharities.names[1], charityName2, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[1], participant2, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[1], 0, "charity score wrong");
        assert.equal(actualCharities.totalVotes[1], 0, "charity total votes wrong");

        let actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1.charityIndexes[0], 0, "charity index wrong");
        assert.equal(actualVotes1.scores[0], 0, "charity score wrong");

        let actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes[0], 1, "charity index wrong");
        assert.equal(actualVotes2.scores[0], 0, "charity score wrong");

        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: score3
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 1,
                score: score4
            }, { from: participant2, transact: true })
        );

        actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities.names[0], charityName1, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[0], participant1, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[0], score3, "charity score wrong");
        assert.equal(actualCharities.totalVotes[0], 1, "charity total votes wrong");
        assert.equal(actualCharities.names[1], charityName2, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[1], participant2, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[1], score4, "charity score wrong");
        assert.equal(actualCharities.totalVotes[1], 1, "charity total votes wrong");

        actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1.charityIndexes[0], 0, "charity index wrong");
        assert.equal(actualVotes1.scores[0], score3, "charity score wrong");

        actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes[0], 1, "charity index wrong");
        assert.equal(actualVotes2.scores[0], score4, "charity score wrong");

    });

    test("should allow a new charity, a vote, a de-vote, and another new charity", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score1 = 10;
        const score2 = 6;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: 0
            }, { from: participant2, transact: true })
        );

        let actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes.length, 0, "charity indexes length wrong");
        assert.equal(actualVotes2.scores.length, 0, "scores length wrong");

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        let actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities.names[0], charityName1, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[0], participant1, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[0], score1, "charity score wrong");
        assert.equal(actualCharities.totalVotes[0], 1, "charity total votes wrong");
        assert.equal(actualCharities.names[1], charityName2, "charity name wrong");
        assert.equalIgnoreCase(actualCharities.suggestors[1], participant2, "charity suggestor wrong");
        assert.equal(actualCharities.totalScores[1], score2, "charity score wrong");
        assert.equal(actualCharities.totalVotes[1], 1, "charity total votes wrong");

        let actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1.charityIndexes[0], 0, "charity index wrong");
        assert.equal(actualVotes1.scores[0], score1, "charity score wrong");

        actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2.charityIndexes[0], 1, "charity index wrong");
        assert.equal(actualVotes2.scores[0], score2, "charity score wrong");

    });

    test("should allow a new charity, a de-vote, and reject a new charity and other votes", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName1 = sh.hexMessage("TEST CHARITY1");
        const charityName2 = sh.hexMessage("TEST CHARITY2");
        const charityName3 = sh.hexMessage("TEST CHARITY3");
        const participant1 = state.accountAddresses[2];
        const participant2 = state.accountAddresses[3];
        const score = 10;

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName1,
                score
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteSuggest({
                charityName: charityName2,
                score
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            suggest.voteCharity({
                charityIndex: 0,
                score: 0
            }, { from: participant1, transact: true })
        );

        let actualVotes = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes.charityIndexes[0], 0, "charity index wrong");
        assert.equal(actualVotes.scores[0], 0, "charity score wrong");

        await assert.isRejected(
            suggest.voteSuggest({
                charityName: charityName3,
                score
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            suggest.voteCharity({
                charityIndex: 1,
                score
            }, { from: participant1, transact: true })
        );

    });

});