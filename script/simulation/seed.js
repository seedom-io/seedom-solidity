const deploy = require('./deploy');
const seed = require('../seed');

module.exports.run = async (state) => {

    await deploy.run(state);
    await seed.run(state);

}