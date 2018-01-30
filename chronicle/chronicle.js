#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');
const stager = require('./stager');
const networks = require('./networks');
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
    networks.destroyWeb3(state);
}

program
    .command('compile')
    .alias('c')
    .description("compile contracts")
    .option('-f, --force', "force compilation")
    .action((options) => {
        main('compiler', {
            force: options.force ? true : false
        });
    });

program
    .command('parity')
    .alias('p')
    .description("start parity")
    .option('-f, --fresh', "fresh start")
    .option('-k, --kill', "kill parity")
    .action((options) => {
        main('parity', {
            fresh: options.fresh ? true : false,
            kill: options.kill ? true : false
        });
    });

program
    .command('test [suites...]')
    .alias('t')
    .description("test chronicle")
    .action((suites) => {
        main('tester', {
            suiteNames: suites
        });
    });

stager.prepare(program).then(() => {
    program.parse(process.argv);
});