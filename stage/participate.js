const ch = require('../chronicle/helper');
const h = require('./helper');
const cli = require('../chronicle/cli');
const network = require('../chronicle/network');

module.exports.previous = 'seed';

module.exports.options = [
    ['participantAddress', 'address', "participant address"],
    ['participantRaise', 'number', "initial participant wei"],
    ['participantRandom', 'string', "initial participant wei contributed"]
];

module.exports.run = async (options, state) => {

    const { stage } = state;
    const { participantAddress, participantRaise, participantRaise } = options;

    const participateHashedRandom = h.hashedRandom(random, address);
    const method = stage.instances.seedom.methods.participate(participateHashedRandom);
    const participateReceipt = await network.sendMethod(method, {
        from: participantAddress,
        value: participantRaise
    }, state);

    cli.info("staged participant %s with %d wei", participantAddress, participantRaise);

    return {
        participateHashedRandom,
        participateReceipt
    };

}

module.exports.pseudos = [
    ['participantRaise', 'number', "initial participant wei"]
]

module.exports.demo = async (state) => {

    const { raise, stage } = state;
    
    const participants = [];
    // start after charity seed
    for (let i = 0; i < stage.participantsCount; i++) {

        const address = state.accountAddresses[i + 2];
        const random = h.random();
        const options = {
            address: address,
            random: random,
            hashedRandom: hashedRandom,
            raise: raise ? raise : 0
        };

        const participant = {
            ...options,
            ...await this.run(options, state)
        };

        // save actual participant
        participants.push(participant);

    }

    return {
        participants
    };

}