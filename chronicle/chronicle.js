#!/usr/bin/env node

const program = require('commander');
const cli = require('./cli');
const compile = require('./compile');
const script = require('./script');
const network = require('./network');
const interface = require('./interface');
const parity = require('./parity');
const test = require('./test');
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

const state = {};

compile.prepare(program, state).then(() => {
    parity.prepare(program, state);
    test.prepare(program, state);
    interface.prepare(program, state).then(() => {
        script.prepare(program, state).then(() => {
            program.parse(process.argv);
        });
    });
});