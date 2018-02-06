const BigNumber = require('bignumber.js');
const chrono = require('chrono-node');
const h = require('./helper');
const cli = require('./cli');

module.exports.parseTime = (string) => {
    const results = chrono.parse(string);
    const date = results[0].start.date();
    return h.timestamp(date);
}

module.exports.parseUint256 = (value) => {
    return this.parseBigNumber(value);
}

module.exports.parseBigNumber = (value) => {
    return new BigNumber(value);
}

module.exports.getOptions = (definitions) => {

    const options = [];
    for (let definition of definitions) {
        options.push(this.getOption(definition));
    }
    return options;

};

module.exports.getOption = (definition) => {

    let name;
    let required;
    let type;
    let desc;

    if (definition.length === 0) {
        throw new Error('name required');
    }

    if (definition.length > 0) {
        name = definition[0];
        if (definition.length > 1) {
            required = definition[1];
            if (definition.length > 2) {
                type = definition[2];
                if (definition.length > 3) {
                    desc = definition[3];
                }
            }
        }
    }

    if (name === '') {
        name = 'value';
    } else if (name.startsWith('_')) {
        name = name.substr(1);
    }

    let parser;
    let arg = '--' + name;

    if (type !== 'bool') {

        arg += ' <value>';

        // get parser from name first
        parser = this.getParserFromName(name);
        // then fall to type
        if (!parser && type) {
            parser = this.getParserFromType(type);
        }

    }

    return {
        name,
        required,
        parser,
        commander: [ arg, desc ]
    };

};

module.exports.getParserFromName = (name) => {

    if (name.endsWith('Time')) {
        return this.parseTime;
    }

};

module.exports.getParserFromType = (type) => {

    const name = 'parse' + type.charAt(0).toUpperCase() + type.slice(1);
    if (name in this) {
        return this[name];
    }

    return null;

};

module.exports.getValues = (obj, options) => {

    const result = {};

    // move arguments out
    for (let option of options) {

        if (option.name in obj) {

            let value = obj[option.name];
            // make sure value exists in obj
            if (value !== null) {
                // do we have a parser?
                if (option.parser) {
                    value = option.parser(value);
                }

                result[option.name] = value;
            }

        } else if (option.required) {
            cli.error(`missing --${option.name}`);
            return null;
        }

    }

    return result;

};