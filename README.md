# TPT Charity

## Dependencies
- NodeJS (v7.10.1)
- Ethereum TestRPC `npm install -g ethereumjs-testrpc`

## Getting started 
- Clone this repo
- Run `npm install` to install node dependencies
- Run `npm link` to link chronicle
- Start Ethereum TestRPC `testrpc`

## Chronicle commands
### `chronicle c | compile -f | --force`
compiles everything
### `chronicle d | deploy [network=local] -f | --force`
deploys anything needed to the network specified
### `chronicle s | simulate`
runs a testrpc simulator and deploys
### `chronicle t | test [...suites]`
runs the test suites specified or all if none specified