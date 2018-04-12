const clc = require('cli-color');
const figlet = require('figlet');
const ls = require('log-symbols');
const f = require('figures');
const columnify = require('columnify');
const Progress = require('progress');
const readline = require('mz/readline');
const chalkline = require('chalkline');
const prettyjson = require('prettyjson');

const normalize = (params) => {
    if (Array.isArray(params) && (params.length == 1) && Array.isArray(params[0])) {
        return params[0];
    }
    return params;
}

const tab = '  ';

let section = false;
let subsection = false;

module.exports.log = (text) => {
    console.log(text);
}

module.exports.logo = (text) => {
    this.log(figlet.textSync(text));
}

module.exports.section = (text) => {
    this.log((section ? '\n' : '') + tab + text + ':' + '\n');
    section = true;
}

module.exports.subsection = (text) => {
    this.log((subsection ? '\n' : '') + tab + clc.underline(text) + '\n');
    subsection = true;
}

module.exports.item = (symbol, text) => {
    this.log(tab + tab + symbol + tab + text);
}

module.exports.subitem = (text) => {
    this.log(tab + tab + ' ' + tab + text);
}

module.exports.message = (text) => {
    this.log(tab + text);
}

module.exports.success = (text) => {
    this.item(ls.success, clc.green(text));
}

module.exports.warning = (text) => {
    this.item(ls.warning, clc.yellow(text));
}

module.exports.info = (text) => {
    this.item(ls.info, clc.yellow(text));
}

module.exports.error = (text) => {
    this.item(ls.error, clc.red(text));
}

module.exports.important = (text) => {
    this.message(clc.bold.blue.bgRed(text));
}

module.exports.pass = (name) => {
    this.success(name);
}

module.exports.suite = (name) => {
    this.subsection(`suite:${name}`);
}

module.exports.fail = (name, error) => {
    this.item(ls.error, clc.underline.red(name));
    this.subitem(clc.red(error));
}

module.exports.nl = () => {
    this.log('');
}

module.exports.progress = (text, seconds, delay) => {

    const total = (delay ? seconds + delay : seconds) * 10;
    const progress = new Progress(tab + tab + ls.info + tab + clc.yellow(text + tab + '[:bar]'), { total: total });

    return new Promise(resolve => {
        const timer = setInterval(function () {
            progress.tick();
            if (progress.complete) {
                clearInterval(timer);
                resolve();
            }
        }, 100);
    });

}

module.exports.json = (obj, text) => {
    this.log(prettyjson.render({"": obj}, { defaultIndentation: 7 }));
    this.log('');
}

module.exports.question = async (question, answer) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    question = tab + tab + ls.warning + tab + question + ' [' + answer + ']: ';
    const response = await rl.question(question);
    rl.close();
    return (response === answer);
}