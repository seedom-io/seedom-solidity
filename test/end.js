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

    });

});