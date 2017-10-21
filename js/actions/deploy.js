const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('../helpers');
const compile = require('./compile');

const defaultNetworkName = 'local';
const iAmCompletelySure = 'I AM COMPLETELY SURE';

const defaultConfig = {
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

    const contractsConfig = await h.loadJsonFile(h.contractsConfigPath);
    const deploymentsPath = h.getDeploymentsPath(networkName);
    const deployments = await h.loadJsonFile(deploymentsPath);
    const networksConfig = await h.loadJsonFile(h.networksConfigPath);
    const networkConfig = networksConfig[networkName];

    const upgrades = await getUpgrades(contractsConfig, deployments, options.force);
    if (h.objLength(upgrades) == 0) {
        console.log('everything is already deployed');
        return;
    }

    if (!(await verify(networkName, networkConfig))) {
        return;
    }

    const web3 = await getWeb3(networkName, networkConfig);
    if (!web3) {
        return;
    }

    await handleSnapshot(networkConfig, deployments, web3);

    const contracts = await deploy(upgrades, networkConfig, web3);

    await updateContracts(contracts, deployments, networkConfig.test);

    await h.writeJsonFile(deployments, deploymentsPath);

    console.log('deployment upgrades complete');

}

const getLatestContract = (contractName, deployments) => {

    if (!('contracts' in deployments)) {
        return null;
    }

    if (!(contractName in deployments.contracts)) {
        return null;
    }

    const contractDeployments = deployments.contracts[contractName];
    if (contractDeployments.length == 0) {
        return null;
    }

    return contractDeployments[0];

}

const getUpgrades = async (contractsConfig, deployments, force) => {

    const upgrades = {};

    for (let contractName in contractsConfig) {

        const contractConfig = contractsConfig[contractName];
        const hash = await h.getHash(contractName);
        const latestContract = getLatestContract(contractName, deployments);

        if (!force && latestContract && (latestContract.hash == hash)) {
            continue;
        }

        console.log('missing, legacy, or forced contract ' + contractName + ' needs to be deployed');
        
        const lastDeployed = latestContract ? latestContract.deployed : null;

        upgrades[contractName] = {
            config: contractConfig,
            lastDeployed: lastDeployed,
            hash: hash
        };

    }

    return upgrades;

}

const getWeb3 = async (networkName, networkConfig) => {

    console.log('detecting ' + networkName + ' network...');

    const web3 = createWeb3(networkConfig);
    if (await testWeb3(web3)) {
        console.log('detected ' + networkName + ' network');
        return web3;
    }

    console.log('failed to detect ' + networkName + ' network, aborting');
    return null;

}

const verify = async (networkName, networkConfig) => {

    if (!networkConfig.verify) {
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

const handleSnapshot = async (networkConfig, deployments, web3) => {

    const isSnapshot = 'snapshot' in deployments;

    if (!networkConfig.test) {

        if (isSnapshot) {
            delete deployments.snapshot;
        }

        return;
        
    }

    if (isSnapshot) {
        await revertTestRpc(web3, deployments.snapshot);
    }

    deployments.snapshot =  await snapshotTestRpc(web3);

}

const deploy = async (upgrades, networkConfig, web3) => {

    const contracts = {};

    for (let contractName in upgrades) {

        const upgrade = upgrades[contractName];
        const contractConfig = upgrade.config;
        const abiPath = h.getAbiPath(contractName);
        const bytecodePath = h.getBytecodePath(contractName);
        const abi = await h.loadJsonFile(abiPath);
        const bytecode = await h.readFile(bytecodePath);
        const contract = new web3.eth.Contract(abi);

        const transaction = contract.deploy({
            data: bytecode,
            arguments: contractConfig.args
        });

        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        const gas = getProperty('gas', contractConfig, networkConfig);
        const gasPrice = getProperty('gasPrice', contractConfig, networkConfig);

        const result = await transaction.send({
            from: account,
            gas: gas,
            gasPrice: gasPrice
        });

        const address = result.options.address;
        console.log('contract ' + contractName + ' deployed successfully to ' + address);

        contracts[contractName] = {
            address: address,
            deployed: h.now(),
            hash: upgrade.hash
        };

    }

    return contracts;

}

const getProperty = (property, contractConfig, networkConfig) => {

    if (property in contractConfig) {
        return contractConfig[property];
    }

    if (property in networkConfig) {
        return networkConfig[property];
    }

    if (property in defaultConfig) {
        return defaultConfig[property];
    }

}

const updateContracts = (contracts, deployments, test) => {

    if (!('contracts' in deployments) || test) {
        deployments.contracts = {};
    }

    for (let contractName in contracts) {

        let result = contracts[contractName];

        if (!(contractName in deployments.contracts)) {
            deployments.contracts[contractName] = [];
        }

        const deployment = {
            deployed: result.deployed,
            hash: result.hash,
            address: result.address
        }

        deployments.contracts[contractName].unshift(deployment);

    }

}


const snapshotTestRpc = async (web3) => {
    const result = await callTestRpc(web3, 'evm_snapshot');
    return result.result;
}

const revertTestRpc = async (web3, snapshot) => {
    return await callTestRpc(web3, 'evm_revert', [ snapshot ]);
}

const callTestRpc = async (web3, method, args) => {

    const request = {
        jsonrpc: "2.0",
        method: method,
        id: new Date().getTime(),
        params: args
    };

    return await promiseCallTestRpc(web3, request);

};

const promiseCallTestRpc = (web3, request) => {
    return new Promise((fulfill, reject) => {
        web3.currentProvider.send(request, (error, result) => {
            if (error) reject(error)
            else fulfill(result);
        });
    });
}