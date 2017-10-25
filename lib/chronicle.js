#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');

cli.logo('chronicle');

process.on('exit', () => {
    cli.log('\n');
});


program
    .command('init')
    .alias('i')
    .description('init chronicle')
    .option('-f, --force', 'force initialization')
    .action((options) => {
        const force = options ? options.force : false;
        require('./init').initialize(force);
    });

program
    .command('compile')
    .alias('c')
    .description('compile chronicle')
    .option('-f, --force', 'force compilation')
    .action((options) => {
        const force = options ? options.force : false;
        require('./compile')(force);
    });

program
    .command('deploy [network]')
    .alias('d')
    .description('deploy chronicle')
    .option('-f, --force', 'force deployment')
    .action((network, options) => {
        const force = options ? options.force : false;
        require('./deploy')(force);
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