# TPT Charity

## Dependencies
- NodeJS v8.6.0
- Parity v1.8.1 (https://parity.io)

## Getting started
- Clone this repo
- Run `npm install` to install node dependencies
- Run `npm link` to link chronicle

## Chronicle commands
### `chronicle c | compile -f | --force`
compiles everything
### `chronicle d | deploy [network=local] -f | --force`
deploys anything needed to the network specified
### `chronicle s | simulate`
runs a testrpc simulator and deploys
### `chronicle t | test [...suites]`
runs the test suites specified or all if none specified

## Mocha steps
https://github.com/rprieto/mocha-steps