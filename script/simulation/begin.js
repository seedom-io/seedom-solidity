const deploy = require('./deploy');
const begin = require('../begin');

module.exports.run = async (state) => {

    await deploy.run(state);
    await begin.run(state);

}