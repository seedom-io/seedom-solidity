const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const seed = require('../script/simulation/seed');
const participate = require('../script/simulation/participate');
const network = require('../chronicle/network');

suite('suggest', (state) => {

    test("should reject add charity before participation", async () => {

        await seed.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName = sh.hexMessage("TEST CHARITY");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            suggest.addCharity({
                charityName,
                score
            }, { from: participant, transact: true })
        );

    });

    test("should reject add empty charity (name) after participation", async () => {

        await participate.run(state);

        const { env } = state;
        const suggest = await state.interfaces.suggest;
        const charityName = sh.hexMessage("");
        const participant = state.accountAddresses[2];
        const score = 10;

        await assert.isRejected(
            suggest.addCharity({
                charityName,
                score
            }, { from: participant, transact: true })
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
            suggest.addCharity({
                charityName,
                score: score
            }, { from: participant1, transact: true })
        );

        const participant2 = state.accountAddresses[3];

        await assert.isRejected(
            suggest.addCharity({
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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const participant3 = state.accountAddresses[4];
        const participant4 = state.accountAddresses[5];
        const score3 = 5;
        const score4 = 7;

        await assert.isRejected(
            suggest.vote({
                charityIndex: 2,
                score: score3
            }, { from: participant3, transact: true })
        );

        await assert.isRejected(
            suggest.vote({
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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const participant3 = state.accountAddresses[4];
        const participant4 = state.accountAddresses[5];
        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 0,
                score: score3
            }, { from: participant3, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 1,
                score: score4
            }, { from: participant4, transact: true })
        );

        const actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities[0][0], charityName1, "charity name wrong");
        assert.equal(actualCharities[1][0], score1 + score3, "charity score wrong");
        assert.equal(actualCharities[2][0], 2, "charity total votes wrong");
        assert.equal(actualCharities[0][1], charityName2, "charity name wrong");
        assert.equal(actualCharities[1][1], score2 + score4, "charity score wrong");
        assert.equal(actualCharities[2][1], 2, "charity total votes wrong");

        const actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1[0], score1, "charity vote score wrong");
        assert.equal(actualVotes1[1], 0, "charity vote score wrong");

        const actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2[0], 0, "charity vote score wrong");
        assert.equal(actualVotes2[1], score2, "charity vote score wrong");

        const actualVotes3 = await suggest.getVotes({ from: participant3 });
        assert.equal(actualVotes3[0], score3, "charity vote score wrong");
        assert.equal(actualVotes3[1], 0, "charity vote score wrong");

        const actualVotes4 = await suggest.getVotes({ from: participant4 });
        assert.equal(actualVotes4[0], 0, "charity vote score wrong");
        assert.equal(actualVotes4[1], score4, "charity vote score wrong");

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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities[0][0], charityName1, "charity name wrong");
        assert.equal(actualCharities[1][0], score1, "charity score wrong");
        assert.equal(actualCharities[2][0], 1, "charity total votes wrong");
        assert.equal(actualCharities[0][1], charityName2, "charity name wrong");
        assert.equal(actualCharities[1][1], score2, "charity score wrong");
        assert.equal(actualCharities[2][1], 1, "charity total votes wrong");

        const actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1[0], score1, "charity vote score wrong");
        assert.equal(actualVotes1[1], 0, "charity vote score wrong");

        const actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2[0], 0, "charity vote score wrong");
        assert.equal(actualVotes2[1], score2, "charity vote score wrong");

        const charityName3 = sh.hexMessage("TEST CHARITY3");
        const charityName4 = sh.hexMessage("TEST CHARITY4");

        await assert.isRejected(
            suggest.addCharity({
                charityName: charityName3,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            suggest.addCharity({
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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isRejected(
            suggest.vote({
                charityIndex: 1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isRejected(
            suggest.vote({
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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 0,
                score: score3
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 1,
                score: score4
            }, { from: participant2, transact: true })
        );

        const actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities[0][0], charityName1, "charity name wrong");
        assert.equal(actualCharities[1][0], score3, "charity score wrong");
        assert.equal(actualCharities[2][0], 1, "charity total votes wrong");
        assert.equal(actualCharities[0][1], charityName2, "charity name wrong");
        assert.equal(actualCharities[1][1], score4, "charity score wrong");
        assert.equal(actualCharities[2][1], 1, "charity total votes wrong");

        const actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1[0], score3, "charity vote score wrong");
        assert.equal(actualVotes1[1], 0, "charity vote score wrong");

        const actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2[0], 0, "charity vote score wrong");
        assert.equal(actualVotes2[1], score4, "charity vote score wrong");

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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 0,
                score: 0
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 1,
                score: 0
            }, { from: participant2, transact: true })
        );

        let actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities[0][0], charityName1, "charity name wrong");
        assert.equal(actualCharities[1][0], 0, "charity score wrong");
        assert.equal(actualCharities[2][0], 0, "charity total votes wrong");
        assert.equal(actualCharities[0][1], charityName2, "charity name wrong");
        assert.equal(actualCharities[1][1], 0, "charity score wrong");
        assert.equal(actualCharities[2][1], 0, "charity total votes wrong");

        let actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1[0], 0, "charity vote score wrong");
        assert.equal(actualVotes1[1], 0, "charity vote score wrong");

        let actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2[0], 0, "charity vote score wrong");
        assert.equal(actualVotes2[1], 0, "charity vote score wrong");

        const score3 = 5;
        const score4 = 7;

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 0,
                score: score3
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 1,
                score: score4
            }, { from: participant2, transact: true })
        );

        actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities[0][0], charityName1, "charity name wrong");
        assert.equal(actualCharities[1][0], score3, "charity score wrong");
        assert.equal(actualCharities[2][0], 1, "charity total votes wrong");
        assert.equal(actualCharities[0][1], charityName2, "charity name wrong");
        assert.equal(actualCharities[1][1], score4, "charity score wrong");
        assert.equal(actualCharities[2][1], 1, "charity total votes wrong");

        actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1[0], score3, "charity vote score wrong");
        assert.equal(actualVotes1[1], 0, "charity vote score wrong");

        actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2[0], 0, "charity vote score wrong");
        assert.equal(actualVotes2[1], score4, "charity vote score wrong");

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
        const score2 = 15;

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName1,
                score: score1
            }, { from: participant1, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 0,
                score: score2
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            suggest.vote({
                charityIndex: 0,
                score: 0
            }, { from: participant2, transact: true })
        );

        await assert.isFulfilled(
            suggest.addCharity({
                charityName: charityName2,
                score: score2
            }, { from: participant2, transact: true })
        );

        let actualCharities = await suggest.getCharities({ from: participant1 });
        assert.equal(actualCharities[0][0], charityName1, "charity name wrong");
        assert.equal(actualCharities[1][0], score1, "charity score wrong");
        assert.equal(actualCharities[2][0], 1, "charity total votes wrong");
        assert.equal(actualCharities[0][1], charityName2, "charity name wrong");
        assert.equal(actualCharities[1][1], score2, "charity score wrong");
        assert.equal(actualCharities[2][1], 1, "charity total votes wrong");

        let actualVotes1 = await suggest.getVotes({ from: participant1 });
        assert.equal(actualVotes1[0], score1, "charity vote score wrong");
        assert.equal(actualVotes1[1], 0, "charity vote score wrong");

        let actualVotes2 = await suggest.getVotes({ from: participant2 });
        assert.equal(actualVotes2[0], 0, "charity vote score wrong");
        assert.equal(actualVotes2[1], score2, "charity vote score wrong");

    });

});