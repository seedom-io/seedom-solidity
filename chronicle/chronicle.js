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
        require('./compiler').main({
            force: options.force ? true : false
        });
    });

program
    .command('parity')
    .alias('p')
    .description("start parity")
    .option('-f, --fresh', "fresh start")
    .action((options) => {
        require('./parity').main({
            fresh: options.fresh ? true : false
        });
    });

program
    .command('deploy [network]')
    .alias('d')
    .description("deploy chronicle")
    .option('-f, --force', "force deployment")
    .action((network, options) => {
        require('./deployer').main({
            networkName: network,
            force: options.force ? true : false
        });
    });

program
    .command('run')
    .alias('r')
    .description("run chronicle")
    .action(() => {
        require('./runner').main({});
    });

program
    .command('test [suites...]')
    .alias('t')
    .description("test chronicle")
    .action((suites) => {
        require('./tester').main({
            suiteNames: suites
        });
    });

stager.prepare(program).then(() => {
    program.parse(process.argv);
});