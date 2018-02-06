const instantiate = require('./instantiate');
const seed = require('../seed');

module.exports.run = async (state) => {

    await instantiate.run(state);
    await seed.run(state);

}