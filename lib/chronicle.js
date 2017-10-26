#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');

cli.logo('chronicle');

process.on('exit', () => {
    cli.log('\n');
});


program
    .command('compile')
    .alias('c')
    .description('compile contracts')
    .option('-f, --force', 'force compilation')
    .action((options) => {
        const force = options ? options.force : false;
        require('./compile')(force);
    });

program
    .command('parity')
    .alias('p')
    .description('start parity')
    .option('-f, --fresh', 'fresh start')
    .action((options) => {
        const fresh = options ? options.fresh : false;
        require('./parity').start(fresh);
    });

program
    .command('deploy [network]')
    .alias('d')
    .description('deploy chronicle')
    .option('-f, --force', 'force deployment')
    .action((network, options) => {
        const force = options ? options.force : false;
        require('./deploy').network(network, force);
    });

program
    .command('run')
    .alias('r')
    .description('run chronicle')
    .action(() => {
        require('./run')();
    });

program
    .command('test [suites...]')
    .alias('t')
    .description('test chronicle')
    .action((suites) => {
        require('./test')(suites);
    });

program.parse(process.argv);