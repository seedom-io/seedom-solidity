const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const helpers = require('../helpers');

const configDirPath = 'config';
const networksConfigFilePath = path.join(configDirPath, 'networks.json');
const deployConfigFilePath = path.join(configDirPath, 'deploy.json');
const addressesConfigFilePath = path.join(configDirPath, 'addresses.json');
const iAmCompletelySure = 'I AM COMPLETELY SURE';

module.exports = async (network) => {
    
    console.log('deploying contracts...');

    // if we have no env, test for local
    if (!network) {
        console.log('no network specified, defaulting to local');
        network = 'local';
    }

    if (network == "main") {
        if (!(await verifyMainDeployment())) {
            return;
        }
    }

    let networksConfig = await helpers.getConfigFromFile(networksConfigFilePath);

    let web3 = getWeb3(network, networksConfig);
    if (!web3) {
        return;
    }

    const deployConfig = await helpers.getConfigFromFile(deployConfigFilePath);
    helpers.printLines(deployConfig.contracts);

}

let getWeb3 = async (network, networksConfig) => {

    console.log('detecting ' + network + ' network...');

    let networkConfig = networksConfig[network];
    let web3 = createWeb3(networkConfig);
    if (await testWeb3(web3)) {
        console.log('detected ' + network + ' network');
        return web3;
    }

    console.log('failed to detect ' + network + ' network, aborting');
    return null;

}

let verifyMainDeployment = async () => {

    console.log('deploying to main network!');

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
      
    let answer = await rl.question('type ' + iAmCompletelySure + ' if you are sure: ');
    rl.close();

    let sure = (answer === iAmCompletelySure);
    if (!sure) {
        console.log('main network deployment aborted');
    }

    return sure;

}

let createWeb3 = (networkConfig) => {
    return new Web3(new Web3.providers.HttpProvider(networkConfig.url));
}

let testWeb3 = async (web3) => {
    try {
        return await web3.eth.net.isListening();
    } catch (error) {
        return false;
    }
}

/*
var getDeployedHashes = async (contracts) => {

    

}

var deployContracts = async (contracts) => {
    var MyContract = web3.eth.contract(abiArray);
    
    // instantiate by address
    var contractInstance = MyContract.at(address);
    
    // deploy new contract
    var contractInstance = MyContract.new([constructorParam1] [, constructorParam2], {data: '0x12345...', from: myAccount, gas: 1000000});
    
    // Get the data to deploy the contract manually
    var contractData = MyContract.new.getData([constructorParam1] [, constructorParam2], {data: '0x12345...'});
    // contractData = '0x12345643213456000000000023434234'
}*/