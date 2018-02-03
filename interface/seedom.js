const parsers = require('../chronicle/parsers');
const ch = require('../chronicle/helper');

 const interface = (contract, web3Instance) => {

    deploy: (args) => {

        const arrayArgs = ch.arrayArgs({
            ...args,
            _revealTime: parsers.parseDate(args._revealTime),
            _endTime: parsers.parseDate(args._endTime),
            _expireTime: parsers.parseDate(args._expireTime),
            _destructTime: parsers.parseDate(args._destructTime),
        }, contract.methods.deploy);

        return web3Instance.deploy({
            data: contract.bytecode,
            arguments: arrayArgs
        });

    }

}

module.exports.interface = interface;