const parsers = require('../chronicle/parsers');
const interface = require('../chronicle/interface');

module.exports = {

    deploy: (contract, finish) => async (args, options) => {

        const finalArgs = {
            ...args,
            revealTime: parsers.parseDate(args.revealTime),
            endTime: parsers.parseDate(args.endTime),
            expireTime: parsers.parseDate(args.expireTime),
            destructTime: parsers.parseDate(args.destructTime)
        };

        return await finish(finalArgs, options);

    }

}