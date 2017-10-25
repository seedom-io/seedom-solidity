const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helpers');
const compile = require('./compile');
const cli = require('./cli');
const network = require('./network');
const init = require('./init');

const defaultNetworkName = 'test';
const iAmCompletelySure = 'I AM COMPLETELY SURE';

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (networkName, force, persist) => {

    // first compile
    const previous = await compile(false, true);
    // now deploy
    cli.section('deploy');

    // load configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    // if no network specified, default to test
    networkName = getNetworkName(networkName, networkConfig);
    const contractConfig = await h.loadJsonFile(h.contractConfigFile);
    const deploymentFile = h.getDeploymentFile(networkName);
    const deployment = await getDeployment(deploymentFile);
    const networkParams = network.getParams(networkName, networkConfig);

    // get contracts requiring upgrades
    const contractUpgrades = await getContractUpgrades(contractConfig, deployment, force);
    if (h.objLength(contractUpgrades) == 0) {
        cli.success('everything is already deployed');
        return;
    }

    // ask user for verification (optional)
    if (!(await verify(networkName, networkParams))) {
        cli.success('"%s" network deployment aborted', networkName);
        return;
    }

    // get web3 instance
    const web3 = await network.getWeb3(networkParams);
    if (!web3) {
        return;
    }

    // get deployment data for upgraded contracts
    const contractDeployments = await deploy(contractUpgrades, networkParams, web3);
    // add deployment data to deploy logs
    logContractDeployments(contractDeployments, deployment);
    // write deploy logs
    await h.writeJsonFile(deploymentFile, deployment);

    // done
    cli.success('deployment upgrades complete');

    // shut down?
    if (!persist) {
        init.shutdown();
    }

    return Object.assign({
        contractDeployments: contractDeployments,
        web3: web3
    }, previous);

}

const getNetworkName = (networkName, networkConfig) => {
    
    // if no network specified, default to local
    if (!networkName) {
        cli.info('"%s" network chosen as no network specified', defaultNetworkName);
        return defaultNetworkName;
    }

    return networkName;

}

const getDeployment = async (deploymentFile) => {
    try {
        return await h.loadJsonFile(deploymentFile);
    } catch (error) {
        return {};
    }
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