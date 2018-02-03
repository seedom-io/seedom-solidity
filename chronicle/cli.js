const clc = require('cli-color');
const figlet = require('figlet');
const ls = require('log-symbols');
const f = require('figures');
const columnify = require('columnify');
const Progress = require('progress');
const readline = require('mz/readline');

const normalize = (params) => {
    if (Array.isArray(params) && (params.length == 1) && Array.isArray(params[0])) {
        return params[0];
    }
    return params;
}

const tab = '  ';

let section = false;
let subsection = false;

module.exports.log = (text, ...params) => {
    params = normalize(params);
    let args = params ? [text].concat(params) : [text];
    console.log.apply(null, args);
}

module.exports.logo = (text, ...params) => {
    this.log(figlet.textSync(text), normalize(params));
}

module.exports.section = (text, ...params) => {
    this.log((section ? '\n' : '') + tab + text + ':' + '\n', normalize(params));
    section = true;
}

module.exports.subsection = (text, ...params) => {
    this.log((subsection ? '\n' : '') + tab + clc.underline(text) + '\n', normalize(params));
    subsection = true;
}

module.exports.item = (symbol, text, ...params) => {
    this.log(tab + tab + symbol + tab + text, normalize(params));
}

module.exports.subitem = (text, ...params) => {
    this.log(tab + tab + ' ' + tab + text, normalize(params));
}

module.exports.message = (text, ...params) => {
    this.log(tab + text, normalize(params));
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

module.exports.pass = (name) => {
    this.success(name);
}

module.exports.suite = (name) => {
    this.subsection("suite:%s", name);
}

module.exports.fail = (name, error) => {
    this.item(ls.error, clc.underline.red(name));
    this.subitem(clc.red(error));
}

module.exports.nl = () => {
    this.log('');
}

module.exports.progress = (text, seconds) => {

    const total = seconds * 10;
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

module.exports.json = (obj, text, ...params) => {
    this.info(clc.underline(text), normalize(params));
    this.log('\n' + clc.yellow(JSON.stringify(obj, null, 4)) + '\n');
}

module.exports.question = async (question, answer) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    question = tab + tab + ls.warning + tab + question + ' [' + answer + ']: ';
    const response = await rl.question(question);
    rl.close();
    return (response === answer);
}