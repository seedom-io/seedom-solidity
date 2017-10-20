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
    .action(async (network) => await action('deploy')(network));

program.parse(process.argv);