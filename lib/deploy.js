const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helpers');
const compile = require('./compile');
const cli = require('./cli');
const network = require('./network');
const parity = require('./parity');

const iAmCompletelySure = 'I AM COMPLETELY SURE';

const deployDefaults = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports.network = async (networkName, force, persist) => {

    const state = {};
    
    // compile first
    state.compile = await compile();

    // now deploy
    cli.section('deploy');
    
    // if no network specified, default to test
    if (!networkName) {
        cli.info('"%s" network chosen as no network specified', h.testNetworkName);
        networkName = h.testNetworkName
    }

    // save network name to state
    state.networkName = networkName;
    // get network and deployment config
    const contractConfig = await h.loadJsonFile(h.contractConfigFile);
    const deploymentFile = h.getDeploymentFile(networkName);
    const deployment = await getDeployment(deploymentFile);
    // get contract hashes & legacy names
    state.contractHashes = await getContractHashes(contractConfig);
    state.legacyContractNames = await getLegacyContractNames(state.contractHashes, deployment, force);
    // see if we have anything to deploy
    if (h.objLength(state.legacyContractNames) == 0) {
        cli.success('everything is already deployed');
    } else {

        // perform upgrade
        Object.assign(state, await upgrade(
            state.legacyContractNames,
            state.contractHashes,
            contractConfig,
            networkName,
            deployment,
            deploymentFile
        ));
    
    }

    // shut down?
    if (!persist) {
        if (state.parity) {
            state.parity.execution.process.kill();
        }
    }

    return state;

}

const getDeployment = async (deploymentFile) => {
    try {
        return await h.loadJsonFile(deploymentFile);
    } catch (error) {
        return {};
    }
}

const getContractHashes = async (contractConfig) => {

    const contractHashes = {};
    for (let contractName in contractConfig) {
        const contractHash = await h.getContractHash(contractName);
        contractHashes[contractName] = contractHash;
    }

    return contractHashes;

}

const getLegacyContractNames = async (contractHashes, deployment, force) => {

    const legacyContractNames = [];

    for (let contractName in contractHashes) {

        const contractHash = contractHashes[contractName];
        const latestContractDeploy = getLatestContractDeployment(contractName, deployment);
        if (!force && latestContractDeploy && (latestContractDeploy.hash == contractHash)) {
            continue;
        }

        cli.info('"%s" needs to be upgraded', contractName);
        legacyContractNames.push(contractName);

    }

    return legacyContractNames;

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

const upgrade = async (
    contractNames,
    contractHashes,
    contractConfig,
    networkName,
    deployment,
    deploymentFile
) => {

    let state;
    // get base state for upgrade
    if (networkName == h.testNetworkName) {
        state = await getParityState();
    } else {
        state = await getNetworkState(networkName);
    }

    if (!state) {
        return null;
    }

    cli.section('deploy upgrade');

    // ask user for verification (optional)
    if (state.network.verify) {
        cli.important('"%s" network requires verification', networkName);
        if (!(await verify(networkName))) {
            cli.success('"%s" network upgrade aborted', networkName);
            return null;
        }
    }

    // save deployment account in state
    state.deployAccountAddress = state.accountAddresses[0];

    state.contractDeployments = {};
    // deploy contracts one at a time
    for (let contractName of contractNames) {
        
        // deploy contract
        const web3Instance = await this.contract(
            contractName,
            contractConfig,
            state.deployAccountAddress,
            state.network,
            state.web3
        );

        state.contractDeployments[contractName] = {
            deployed: h.now(),
            address: web3Instance.options.address,
            hash: contractHashes[contractName]
        }

    }

    // add deployment data to deploy logs
    logContractDeployments(state.contractDeployments, deployment);
    await h.writeJsonFile(deploymentFile, deployment);
    cli.success('contract deployments written');

    // done
    cli.success('network upgrades complete');

    return state;

}

const getParityState = async () => {

    const state = {};

    state.parity = await parity.start(false, true);
    state.network = state.parity.network;
    state.web3 = state.parity.web3;
    state.accountAddresses = state.parity.accountAddresses;

    return state;

}

const getNetworkState = async (networkName) => {

    const state = {};

    // load configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    state.network = network.get(networkName, networkConfig);

    // get web3 instance
    state.web3 = await network.getWeb3(networkParams);
    if (!web3) {
        return null;
    }

    state.accountAddresses = await web3.eth.getAccounts();
    if (accounts.length == 0) {
        cli.error('"%s" network contains no accounts', networkName);
        return null;
    }

    return state;

}

const verify = async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('type ' + iAmCompletelySure + ' if you are sure: ');
    rl.close();
    return (answer === iAmCompletelySure);
}

module.exports.contract = async (
    contractName,
    contractConfig,
    deployAccountAddress,
    deployNetwork,
    web3
) => {

    // make sure we have an understanding of this contract
    if (!(contractName in contractConfig)) {
        cli.error('"%s" contract not found in contract config', contractName);
        return null;
    }

    const deployContract = contractConfig[contractName];
    const abiFile = h.getAbiFile(contractName);
    const bytecodeFile = h.getBytecodeFile(contractName);
    const abi = await h.loadJsonFile(abiFile);
    const bytecode = await h.readFile(bytecodeFile);
    const web3Contract = new web3.eth.Contract(abi);

    const web3Transaction = web3Contract.deploy({
        data: bytecode,
        arguments: deployContract.args
    });

    const gas = getDeployProperty('gas', deployContract, deployNetwork);
    const gasPrice = getDeployProperty('gasPrice', deployContract, deployNetwork);
    const web3Instance = await web3Transaction.send({
        from: deployAccountAddress,
        gas: gas,
        gasPrice: gasPrice
    });

    const contractAddress = web3Instance.options.address;
    cli.success('"%s" contract deployed to %s', contractName, contractAddress);
    return web3Instance;

}

const getDeployProperty = (property, deployContract, deployNetwork) => {

    if (property in deployContract) {
        return deployContract[property];
    }

    if (property in deployNetwork) {
        return deployNetwork[property];
    }

    if (property in deployDefaults) {
        return deployDefaults[property];
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

        const contractDeployment = contractDeployments[contractName];
        deployment[contractName].unshift(contractDeployment);

    }

}