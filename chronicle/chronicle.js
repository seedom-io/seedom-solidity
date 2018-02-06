#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');
const compile = require('./compile');
const script = require('./script');
const network = require('./network');
const interface = require('./interface');
const wtfnode = require('wtfnode');

// print out anything hanging after ctrl-c
wtfnode.init();

// don't judge an app by it's logo
cli.logo('chronicle');

// end with new line
process.on('exit', () => {
    cli.nl();
});

// always trace warnings
process.on('warning', (warning) => {
    console.log(warning.name);
    console.log(warning.message);
    console.log(warning.stack);
});

const main = async (name, state) => {
    await require('./' + name).main(state);
    network.destroyWeb3(state);
}

const state = {};

compile.prepare(program, state).then(() => {

    program
        .command('parity')
        .alias('p')
        .description("start parity")
        .option('--fresh', "fresh start")
        .option('--kill', "kill parity")
        .action((options) => {
            main('parity', Object.assign(state, {
                fresh: options.fresh ? true : false,
                kill: options.kill ? true : false
            }));
        });

    program
        .command('test [suites...]')
        .alias('t')
        .description("run tests")
        .action((suites) => {
            main('test', Object.assign(state, {
                suiteNames: suites
            }));
        });

    interface.prepare(program, state).then(() => {
        script.prepare(program, state).then(() => {
            program.parse(process.argv);
        });
    });

});