const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('../helpers');
const compile = require('./compile');
const testrpc = require('../testrpc');

const defaultNetworkName = 'local';
const iAmCompletelySure = 'I AM COMPLETELY SURE';

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (networkName, options) => {

    // first compile
    await compile();

    console.log('deploying contracts...');

    // if we have no env, test for local
    if (!networkName) {
        console.log('no network specified, defaulting to ' + defaultNetworkName);
        networkName = defaultNetworkName;
    }

    const contractConfig = await h.loadJsonFile(h.contractConfigFile);
    const deployFile = h.getDeployFile(networkName);
    const deployData = await h.loadJsonFile(deployFile);
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    const networkParams = networkConfig[networkName];
    const force = options ? options.force : false;

    const upgrades = await getUpgrades(contractConfig, deployData, force);
    if (h.objLength(upgrades) == 0) {
        console.log('everything is already deployed');
        return;
    }

    if (!(await verify(networkName, networkParams))) {
        return;
    }

    const web3 = await getWeb3(networkName, networkParams);
    if (!web3) {
        return;
    }

    await handleSnapshot(networkParams, deployData, web3);

    const contracts = await deploy(upgrades, networkParams, web3);

    await updateContracts(contracts, deployData, networkParams);

    await h.writeJsonFile(deployData, deployFile);

    console.log('deployment upgrades complete');

}

const getUpgrades = async (contractConfig, deployData, force) => {

    const upgrades = {};

    for (let contractName in contractConfig) {

        const contractParams = contractConfig[contractName];
        const contractHash = await h.getHash(contractName);
        const latestContractDeploy = getLatestContractDeploy(contractName, deployData);

        if (!force && latestContractDeploy && (latestContractDeploy.hash == contractHash)) {
            continue;
        }

        console.log('missing, legacy, or forced contract "' + contractName + '" needs to be deployed');
        
        const contractLastDeployed = latestContractDeploy ? latestContractDeploy.deployed : null;

        upgrades[contractName] = {
            contractParams: contractParams,
            contractLastDeployed: contractLastDeployed,
            contractHash: contractHash
        };

    }

    return upgrades;

}

const getLatestContractDeploy = (contractName, deployData) => {

    if (!('contracts' in deployData)) {
        return null;
    }

    if (!(contractName in deployData.contracts)) {
        return null;
    }

    const contractDeploys = deployData.contracts[contractName];
    if (contractDeploys.length == 0) {
        return null;
    }

    return contractDeploys[0];

}

const getWeb3 = async (networkName, networkParams) => {

    console.log('detecting ' + networkName + ' network...');

    const web3 = createWeb3(networkParams);
    if (await testWeb3(web3)) {
        console.log('detected ' + networkName + ' network');
        return web3;
    }

    console.log('failed to detect ' + networkName + ' network, aborting');
    return null;

}

const verify = async (networkName, networkParams) => {

    if (!networkParams.verify) {
        return true;
    }

    console.log('!!! deploying to ' + networkName + ' network !!!');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('type ' + iAmCompletelySure + ' if you are sure: ');
    rl.close();

    const sure = (answer === iAmCompletelySure);
    if (!sure) {
        console.log(networkName + ' network deployment aborted');
    }

    return sure;

}

let createWeb3 = (networkParams) => {
    return new Web3(new Web3.providers.HttpProvider(networkParams.url));
}

let testWeb3 = async (web3) => {
    try {
        return await web3.eth.net.isListening();
    } catch (error) {
        return false;
    }
}

const handleSnapshot = async (networkParams, deployData, web3) => {

    const isSnapshot = 'snapshot' in deployData;

    if (!networkParams.test) {

        if (isSnapshot) {
            delete deployData.snapshot;
        }

        return;
        
    }

    if (isSnapshot) {
        await testrpc.revert(web3, deployData.snapshot);
    }

    deployData.snapshot =  await testrpc.snapshot(web3);

}

const deploy = async (upgrades, networkParams, web3) => {

    const contracts = {};

    for (let contractName in upgrades) {

        const upgrade = upgrades[contractName];
        const contractParams = upgrade.contractParams;
        const abiFile = h.getAbiFile(contractName);
        const bytecodeFile = h.getBytecodeFile(contractName);
        const abi = await h.loadJsonFile(abiFile);
        const bytecode = await h.readFile(bytecodeFile);
        const contract = new web3.eth.Contract(abi);

        const transaction = contract.deploy({
            data: bytecode,
            arguments: contractParams.args
        });

        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        const gas = getProperty('gas', contractParams, networkParams);
        const gasPrice = getProperty('gasPrice', contractParams, networkParams);

        const result = await transaction.send({
            from: account,
            gas: gas,
            gasPrice: gasPrice
        });

        const address = result.options.address;
        console.log('contract "' + contractName + '" deployed successfully to ' + address);

        contracts[contractName] = {
            address: address,
            deployed: h.now(),
            hash: upgrade.contractHash
        };

    }

    return contracts;

}

const getProperty = (property, contractParams, networkParams) => {

    if (property in contractParams) {
        return contractParams[property];
    }

    if (property in networkParams) {
        return networkParams[property];
    }

    if (property in defaultParams) {
        return defaultParams[property];
    }

}

const updateContracts = (contracts, deployData, networkParams) => {

    if (!('contracts' in deployData) || networkParams.test) {
        deployData.contracts = {};
    }

    for (let contractName in contracts) {

        if (!(contractName in deployData.contracts)) {
            deployData.contracts[contractName] = [];
        }

        let contract = contracts[contractName];
        deployData.contracts[contractName].unshift(contract);

    }

}