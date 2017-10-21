#!/usr/bin/env node

const program = require('commander');

const action = (action) => {
    return require('./actions/' + action + '.js');
};

program
    .command('compile')
    .alias('c')
    .description('compile charity')
    .action(async () => await action('compile')());

program
    .command('deploy [network]')
    .alias('d')
    .description('deploy charity')
    .option('-f, --force', 'force deployment')
    .action(async (network, options) => await action('deploy')(network, options));

program
    .command('test [suite]')
    .alias('t')
    .description('test charity')
    .action(async (suite) => await action('deploy')(suite));

program.parse(process.argv);