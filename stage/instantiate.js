const ch = require('../chronicle/helper');
const h = require('./helper');
const network = require('../chronicle/network');
const instantiate = require('./instantiate');

module.exports.options = [
    ['owner', 'address', "owner address"],
    ['charity', 'address', "charity address"],
    ['charitySplit', 'number', "charity split", parseInt],
    ['winnerSplit', 'number', "winner split", parseInt],
    ['ownerSplit', 'number', "owner split", parseInt],
    ['valuePerEntry', 'number', "value per entry", parseInt],
    ['revealTime', 'time', "reveal time", ch.parseDate],
    ['endTime', 'time', "end time", ch.parseDate],
    ['expireTime', 'time', "expire time", ch.parseDate],
    ['destructTime', 'time', "expire time", ch.parseDate],
    ['maxParticipants', 'number', "max participants", parseInt]
];

module.exports.pseudos = [
    this.options,
    ...[]
];

module.exports.run = async (options, state) => {

    let result;

    if (state.initialize) {

         // deploy seedom
         result = await network.deploy('seedom', [
            options.charity,
            options.charitySplit,
            options.winnerSplit,
            options.ownerSplit,
            options.valuePerEntry,
            options.revealTime,
            options.endTime,
            options.expireTime,
            options.destructTime,
            options.maxParticipants
        ], { from: options.owner }, state);

    } else {

       // restore seedom contract & receipt from last deployment
       const deployment = state.deployment.seedom[0];
       const contract = state.contracts.seedom;

       result = {
           instance: new state.web3.eth.Contract(contract.abi, deployment.address),
           receipt: await state.web3.eth.getTransactionReceipt(deployment.transactionHash)
       };

    }

    return {
        seedom: result.instance,
        instantiateReciept: result.receipt
    };

}

module.exports.demo = (state) => {
    
    let options = {};

    if (state.initialize) {

        options.owner = state.owner ? state.owner : state.accountAddresses[0];
        options.charity = state.charity ? state.charity : state.accountAddresses[1];
        options.charitySplit = state.charitySplit ? state.charitySplit : 600;
        options.winnerSplit = state.winnerSplit ? state.winnerSplit : 350;
        options.ownerSplit = state.ownerSplit ? state.ownerSplit : 50;
        options.valuePerEntry = state.valuePerEntry ? state.valuePerEntry : 1000;
        options.participantsCount = state.participantsCount ? state.participantsCount : state.accountAddresses.length - 3;
        options.maxParticipants = state.maxParticipants ? state.maxParticipants : options.participantsCount;

        const now = ch.timestamp();
        // FIXME: triple the parity send delay to get overall transaction duration
        const transactionDuration = Math.round((state.network.sendDelay / 1000) * 2);
        // instantiate phase has two initial transactions: deploy and seed
        // and then two transactions per participant: participate and raise
        const instantiateDuration = (transactionDuration * 2) + (participantsCount * transactionDuration * 2)!!;
        options.revealTime = state.revealTime ? state.revealTime : now + instantiateDuration;
        // reveal phase has max one transactions per participant: reveal
        const revealDuration = participantsCount * transactionDuration;
        options.endTime = state.endTime ? state.endTime : options.revealTime + revealDuration;
        // end phase has one of only two possible transactions: end or cancel
        const endDuration = transactionDuration;
        options.expireTime = state.expireTime ? state.expireTime : options.endTime + endDuration;
        // expire phase has only one possible transaction: cancel
        const expireDuration = transactionDuration;
        options.destructTime = state.destructTime ? state.destructTime : options.expireTime + expireDuration;

    }

    return {
        ...options,
        ...await this.run(options, state)
    }

}