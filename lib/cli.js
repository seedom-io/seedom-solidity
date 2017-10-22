const clc = require('cli-color');
const figlet = require('figlet');
const ls = require('log-symbols');

const normalize = (params) => {
    if (Array.isArray(params) && (params.length == 1) && Array.isArray(params[0])) {
        return params[0];
    }
    return params;
}

const tab = '  ';

module.exports.log = (text, ...params) => {
    params = normalize(params);
    let args = params ? [text].concat(params) : [text];
    console.log.apply(null, args);
}

module.exports.logo = (text, ...params) => {
    this.log(figlet.textSync(text) + '\n', normalize(params));
}

module.exports.section = (text, ...params) => {
    this.log(tab + clc.bold.underline(text) + '\n', normalize(params));
}

module.exports.item = (symbol, text, ...params) => {
    this.log(tab + tab + symbol + tab + text, normalize(params));
}

module.exports.message = (text, ...params) => {
    this.log(tab + text  + '\n', normalize(params));
}

module.exports.success = (text, ...params) => {
    this.item(ls.success, clc.green(text), normalize(params));
}

module.exports.warning = (text, ...params) => {
    this.item(ls.warning, clc.yellow(text), normalize(params));
}

module.exports.info = (text, ...params) => {
    this.item(ls.info, clc.yellow(text), normalize(params));
}

module.exports.error = (text, ...params) => {
    this.item(ls.error, clc.red(text), normalize(params));
}

module.exports.important = (text, ...params) => {
    this.message(clc.bold.blue.bgRed(text), normalize(params));
}