const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const end = require('../stage/end');

suite('end', (state) => {

    test("should choose a winner", async () => {

        const stage = state.stage;
        const participantsCount = (state.accountAddresses.length - 2);
        // set stage to reveal only half the participants
        stage.revealersCount = Math.floor(participantsCount / 2);

        // first end
        await end.stage(state);
        
        const winner = stage.winner;

        let foundWinner = false;
        for (let revealer of stage.revealers) {
            if (revealer == winner.toLowerCase()) {
                foundWinner = true;
            }
        }

        assert.isOk(foundWinner, "one of the participants that revealed should have won");

        // currently all participant funds are distributed equally along splits
        // perhaps we should send forfeitures (participant didn't reveal) to the charity only?
        // 500 added in to winner for refunds for partial tickets
        const charityBalance = 10 * stage.participantsCount * stage.valuePerEntry * stage.charitySplit / 100;
        const winnerBalance = 10 * stage.participantsCount * stage.valuePerEntry * stage.winnerSplit / 100 + 500;
        const ownerBalance = 10 * stage.participantsCount * stage.valuePerEntry * stage.ownerSplit / 100;

        assert.equal(stage.charityBalance, charityBalance, "charity balance incorrect");
        assert.equal(stage.winnerBalance, winnerBalance, "winner balance incorrect");
        assert.equal(stage.ownerBalance, ownerBalance, "owner balance incorrect");

    });

});