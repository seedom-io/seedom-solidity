## Dependencies
- NodeJS v8.6.0+
- Parity v1.8.7 (https://parity.io)

## Getting started
- Clone this repo
- Run `npm link` to install and link chronicle

## Chronicle commands
### `chronicle --help`
compile and display commands
### `chronicle p|parity --fresh --kill`
start parity indefinitely (do this first)
### `chronicle t|test [...suites]`
runs the test suites (or all if none specified)
### `chronicle <contract>:<method> [network]`
allows direct manipulation and deployment of contracts
### `chronicle script:<name> [network]`
run scripts on the chonicle platform