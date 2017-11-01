#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');
const stager = require('./stager');
const wtfnode = require('wtfnode');

// print out anything hanging after ctrl-c
wtfnode.init();

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
    .option('-k, --kill', "kill parity")
    .action((options) => {
        require('./parity').main({
            fresh: options.fresh ? true : false,
            kill: options.kill ? true : false
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