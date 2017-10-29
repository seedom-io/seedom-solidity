#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');
const stager = require('./stager');

cli.logo('chronicle');

process.on('exit', () => {
    cli.nl();
});


program
    .command('compile')
    .alias('c')
    .description("compile contracts")
    .option('-f, --force', "force compilation")
    .action((options) => {
        const force = options ? options.force : false;
        require('./compiler')(force);
    });

program
    .command('parity')
    .alias('p')
    .description("start parity")
    .option('-f, --fresh', "fresh start")
    .action((options) => {
        const fresh = options ? options.fresh : false;
        require('./parity').start(fresh);
    });

program
    .command('deploy [network]')
    .alias('d')
    .description("deploy chronicle")
    .option('-f, --force', "force deployment")
    .action((network, options) => {
        const force = options ? options.force : false;
        require('./deployer').all(network, force);
    });

program
    .command('run')
    .alias('r')
    .description("run chronicle")
    .action(() => {
        require('./runner')();
    });

program
    .command('test [suites...]')
    .alias('t')
    .description("test chronicle")
    .action((suites) => {
        require('./tester')(suites);
    });

stager.prepare(program).then(() => {
    program.parse(process.argv);
});