#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');

cli.logo('chronicle');

const action = (action) => {
    return require('./actions/' + action + '.js');
};

program
    .command('compile')
    .alias('c')
    .description('compile charity')
    .option('-f, --force', 'force compilation')
    .action((options) => action('compile')(options));

program
    .command('deploy [network]')
    .alias('d')
    .description('deploy charity')
    .option('-f, --force', 'force deployment')
    .action((network, options) => action('deploy')(network, options));

program
    .command('simulate')
    .alias('s')
    .description('simulate charity')
    .action(() => action('simulate')());

program
    .command('test [suites...]')
    .alias('t')
    .description('test charity')
    .action((suites) => action('test')(suites));

program.parse(process.argv);

process.on('exit', () => {
    cli.log('\n');
});
