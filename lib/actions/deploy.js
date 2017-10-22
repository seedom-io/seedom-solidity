const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('../helpers');
const compile = require('./compile');
const cli = require('../cli');

const defaultNetworkName = 'local';
const iAmCompletelySure = 'I AM COMPLETELY SURE';

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (networkName, options) => {

    // first compile
    await compile();
    // now deploy
    cli.section('deploy');
    // load configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    networkName = getNetworkName(networkName, networkConfig);
    const contractConfig = await h.loadJsonFile(h.contractConfigFile);
    const deploymentFile = h.getDeploymentFile(networkName);
    const deployment = await h.loadJsonFile(deploymentFile);
    const networkParams = getNetworkParams(networkName, networkConfig);
    const force = options ? options.force : false;

    // get contracts requiring upgrades
    const contractUpgrades = await getContractUpgrades(contractConfig, deployment, force);
    if (h.objLength(contractUpgrades) == 0) {
        cli.success('everything is already deployed\n');
        return;
    }

    // ask user for verification (optional)
    if (!(await verify(networkName, networkParams))) {
        cli.success('"%s" network deployment aborted\n', networkName);
        return;
    }

    // get web3 instance
    const web3 = await getWeb3(networkName, networkParams);
    if (!web3) {
        cli.error('"%s" network could not be reached\n', networkName);
        return;
    }

    // get deployment data for upgraded contracts
    const contractDeployments = await deploy(contractUpgrades, networkParams, web3);
    // add deployment data to deploy logs
    await logContractDeployments(contractDeployments, deployment);
    // write deploy logs
    await h.writeJsonFile(deployment, deploymentFile);
    // done
    cli.success('deployment upgrades complete\n');

    return {
        web3: web3
    };

}

const getNetworkName = (networkName, networkConfig) => {
    
    // if no network specified, default to local
    if (!networkName) {
        cli.info('"%s" network chosen as no network specified', defaultNetworkName);
        return defaultNetworkName;
    }

    return networkName;

}

const getNetworkParams = (networkName, networkConfig) => {

    if (!(networkName in networkConfig)) {
        cli.error('unable to find network name in network config');
        return null;
    }

    return networkConfig[networkName];

}

const getContractUpgrades = async (contractConfig, deployment, force) => {

    const contractUpgrade = {};

    for (let contractName in contractConfig) {

        const contractParams = contractConfig[contractName];
        const contractHash = await h.getHash(contractName);
        const latestContractDeploy = getLatestContractDeployment(contractName, deployment);

        if (!force && latestContractDeploy && (latestContractDeploy.hash == contractHash)) {
            continue;
        }

        cli.info('"%s" needs to be upgraded', contractName);

        contractUpgrade[contractName] = {
            params: contractParams,
            hash: contractHash
        };

    }

    return contractUpgrade;

}

const getLatestContractDeployment = (contractName, deployment) => {

    if (!(contractName in deployment)) {
        return null;
    }

    const contractDeployments = deployment[contractName];
    if (contractDeployments.length == 0) {
        return null;
    }

    return contractDeployments[0];

}

const getWeb3 = async (networkName, networkParams) => {

    const web3 = createWeb3(networkParams);
    if (await testWeb3(web3)) {
        cli.success('"%s" network is connected', networkName);
        return web3;
    }

    return null;

}

const verify = async (networkName, networkParams) => {

    if (!networkParams.verify) {
        return true;
    }

    cli.important('"%s" network requires verification', networkName);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('type ' + iAmCompletelySure + ' if you are sure: ');
    rl.close();

    return (answer === iAmCompletelySure);

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

const deploy = async (contractUpgrades, networkParams, web3) => {

    const contractDeployments = {};

    for (let contractName in contractUpgrades) {

        const contractUpgrade = contractUpgrades[contractName];
        const contractParams = contractUpgrade.params;
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

        const contractAddress = result.options.address;
        cli.success('"%s" contract deployed to %s', contractName, contractAddress);

        contractDeployments[contractName] = {
            address: contractAddress,
            deployed: h.now(),
            hash: contractUpgrade.hash
        };

    }

    return contractDeployments;

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

const logContractDeployments = (contractDeployments, deployment) => {

    if (!deployment) {
        deployment = {};
    }

    for (let contractName in contractDeployments) {

        if (!(contractName in deployment)) {
            deployment[contractName] = [];
        }

        let contractDeployment = contractDeployments[contractName];
        deployment[contractName].unshift(contractDeployments);

    }

}