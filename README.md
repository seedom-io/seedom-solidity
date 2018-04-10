## Dependencies
- NodeJS v8.6.0+
- Parity v1.11.0-unstable-0d75d01c8-20180409+ (https://parity.io)

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

## Seedom Script Examples
### Deployment
```
chronicle script:deploy \
    --owner 0x003b873f4443e727536391f9c27fedc65d17c5ff \
    --cause 0x003b873f4443e727536391f9c27fedc65d17c5ff \
    --causeSplit 500 \
    --participantSplit 500 \
    --ownerSplit 0 \
    --ownerMessageString 'HELLO SFT' \
    --valuePerEntry 100000000000000000 \
    --endTime 'in 60 minutes' \
    --expireTime 'in 120 minutes' \
    --destructTime 'in 240 minutes' \
    --maxParticipants 10 --maxScore 10
```
### Begin
```
chronicle script:begin \
    --cause 0x003b873f4443e727536391f9c27fedc65d17c5ff \
    --causeMessageString 'BONJOUR'
```