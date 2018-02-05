const compile = require('./compile');
const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const parsers = require('./parsers');
const path = require('path');
const network = require('./network');

module.exports.save = async (state) => {
    await h.writeDeployment(state.networkName, state.deployment);
};

module.exports.main = async (state) => {

    // first network
    await network.main(state);

    // now interface
    cli.section("Interface");

    // track deployments
    state.deployment = await getDeployment(state.networkName);

    // set up receipt catching
    state.receipts = {};

    // set up instances proxy
    state.instances = new Proxy({}, {
        get: async (target, name) => {
            return await resolveInstance(target, name, state);
        }
    });

    // check for a contract & method
    if (state.contractName && state.methodName) {

        const instance = await state.instances[state.contractName];
        const method = await instance[state.methodName];
        const result = await method(
            state.methodArgs,
            state.methodOptions
        );

        if (state.methodName !== 'deploy') {
            cli.json(result, "result");
        }

        await this.save(state);
        network.destroyWeb3(state);
    }

};

const getDeployment = async (networkName) => {

    const deployment = await h.readDeployment(networkName);
    if (deployment) {
        return deployment;
    }

    // default deployment object
    return {
        addresses: {},
        releases: {}
    };


};

const resolveInstance = async (instances, name, state) => {

    // if we have the instance, just return it
    if (name in instances) {
        return instances[name];
    }

    // if we have a contract name or address, look up the deployment
    const instance = await resolveStringInstance(name, state);
    instances[name] = instance;
    return instance;

};

const resolveStringInstance = async (name, state) => {

    const isAddress = name.startsWith('0x');
    const { contractName, deploymentRelease } = resolveContractNameAndDeploymentRelease(name, isAddress, state);
    // verify we at least have a contract name
    if (!contractName) {
        return null;
    }

    const contract = await resolveContract(contractName, deploymentRelease, state);
    // verify we found the proper contract
    if (!contract) {
        return null;
    }

    const web3Instance = await resolveWeb3Instance(contract, deploymentRelease, state);
    // get proxy instance
    return getInstance(web3Instance, contract, state);

};

const resolveContractNameAndDeploymentRelease = (name, isAddress, state) => {

    const result = {
        contractName: null,
        deploymentRelease: null
    };

    // address mode?
    if (isAddress) {

        if (!(name in state.deployment.addresses)) {
            return result;
        }

        // find this deployed address
        result.contractName = state.deployment.addresses[name];
        // now find the deployment releases
        if (!(result.contractName in state.deployment.releases)) {
            return result;
        }

        const releases = state.deployment.releases[contractName];
        // now search for the deployment release
        for (let release of releases) {
            if (release.address === address) {
                result.deploymentRelease = release;
            }
        }

    } else {

        result.contractName = name;
        // see if we have any releases for the this contract
        if (!(name in state.deployment.releases)) {
            return result;
        }

        // set latest release
        const releases = state.deployment.releases[name];
        result.deploymentRelease = releases[0];

    }

    return result;

};

const resolveContract = async (contractName, deploymentRelease, state) => {

    // get latest contract
    let contract = state.contracts[contractName];
    // if no release or the release hash matches the latest contract hash, return the contract
    if (!deploymentRelease || (deploymentRelease.hash === contract.hash)) {
        return contract;
    }

    // release is using an old contract; let's find it
    const output = await h.readOutput(deploymentRelease.hash);
    if (!output) {
        return null;
    }

    // resurrect release contract
    contract = {
        name: contractName,
        hash: deploymentRelease.hash,
        ...output
    };

    // save contract
    state.contracts[deploymentRelease.hash] = contract;
    return contract;

};

const resolveWeb3Instance = async (contract, deploymentRelease, state) => {

    if (deploymentRelease) {

        // resurrect deployment receipt
        if (deploymentRelease.transactionHash) {
            state.receipts[deploymentRelease.transactionHash]
                = await state.web3.eth.getTransactionReceipt(deploymentRelease.transactionHash);
        }

        // get web3 attached to addy
        return new state.web3.eth.Contract(contract.abi, deploymentRelease.address);

    }

    // get web3
    return new state.web3.eth.Contract(contract.abi);

};

const getInstance = (web3Instance, contract, state) => {
    // create instance proxy
    return new Proxy(web3Instance, {
        get: async (target, name) => {

            // ignore cascading desires to fufill proxy
            if (name === 'then') {
                return this;
            }

            const isDeploy = (name === 'deploy');
            return await resolveInstanceMethod(name, isDeploy, target, contract, state);

        }
    });
};

const resolveInstanceMethod = async (methodName, isDeploy, web3Instance, contract, state) => {

    // if we are deploying, override contract to latest (ignoring releases)
    if (isDeploy) {
        contract = state.contracts[contract.name];
    }

    // how we finish this
    const finish = async (args, options) => {
        return await runWeb3Method(methodName, args, options, web3Instance, contract, state);
    }

    // see if we have middleware (through interfaces)
    const interface = state.interfaces[contract.name];
    // check for the method in middleware
    if (interface && (methodName in interface)) {

        const method = interface[methodName];
        // check for a method interface action
        if (typeof method === 'function') {
            return await method(contract, finish);
        } else if (typeof method === 'object') {
            return await method.action(contract, finish);
        }

    }

    // fall to web3 method
    return await finish;

}


const runWeb3Method = async (
    methodName,
    args,
    options,
    web3Instance,
    contract,
    state
) => {

    // see if we transact and then delete this non-standard option
    const transact = options.transact;
    delete options.transact;
    // massage the args
    const contractArgs = contract.methods[methodName];
    const web3Args = getWeb3Args(args, contractArgs);

    // run proper web3 method
    if (methodName == 'deploy') {
        return await runWeb3Deploy(contract, web3Args, options, web3Instance, state);
    } else if (transact) {
        return await runWeb3Transaction(methodName, web3Args, options, web3Instance, state);
    } else {
        return await runWeb3Call(methodName, web3Args, options, web3Instance);
    }

};

const getWeb3Args = (methodArgs, contractArgs) => {
    const preparedArgs = [];
    for (let contractArg of contractArgs) {
        const methodArg = contractArg.substr(1);
        preparedArgs.push(methodArgs[methodArg]);
    }
    return preparedArgs;
};

const runWeb3Deploy = async (
    contract,
    web3Args,
    options,
    web3Instance,
    state
) => {

    // network deploy
    const web3Result = await network.deploy(contract, web3Args, options, web3Instance, state);
    // save the receipt
    state.receipts[web3Result.receipt.transactionHash] = web3Result.receipt;
    const contractAddress = web3Result.instance.options.address;
    // save to addresses as well (for easy lookup)
    state.deployment.addresses[contractAddress] = contract.name;

    let contractReleases;
    // add releases array for this contract if we don't have one
    if (!(contract.name in state.deployment.releases)) {
        contractReleases = [];
        state.deployment.releases[contract.name] = contractReleases;
    } else {
        contractReleases = state.deployment.releases[contract.name];
    }

    // save deployment release
    state.deployment.releases[contract.name].unshift({
        deployed: h.timestamp(),
        address: contractAddress,
        transactionHash: web3Result.receipt.transactionHash,
        hash: contract.hash
    });

    // super weird, but because we have to return a proxy in a proxy to
    // override the parent proxy (trust me)
    return new Proxy(web3Result.instance, {
        get: async (target, name) => {

            // ignore cascading desires to fufill proxy
            if (name === 'then') {
                return this;
            }

            return await resolveInstanceMethod(name, target, instance, contract, state);

        }
    });

};

const runWeb3Transaction = async (methodName, web3Args, options, web3Instance, state) => {

    // transaction
    const web3Receipt = await network.sendMethod(
        web3Instance.methods[methodName].apply(null, web3Args),
        options,
        state
    );

    // save & return receipt
    state.receipts[web3Receipt.transactionHash] = web3Receipt;
    return web3Receipt;

}

const runWeb3Call = async (methodName, web3Args, options, web3Instance) => {
    const web3Result = await web3Instance.methods[methodName].apply(null, web3Args).call(options);
    return getResult(web3Result);
};

const getResult = (web3Result) => {
    const result = {};
    for (let name in web3Result) {
        if (name.startsWith('_')) {
            result[name.substr(1)] = web3Result[name];
        }
    }
    return result;
};

module.exports.prepare = async (program, state) => {
    state.interfaces = await getInterfaces();
    prepareCommands(program, state);
};

const getInterfaces = async () => {

    const interfaces = [];
    const interfaceFiles = await getInterfaceFiles();
    for (let interfaceFile of interfaceFiles) {
        const relativeInterfaceFile = path.relative(h.interfaceDir, interfaceFile);
        const relativeInterfaceFileExtIndex = relativeInterfaceFile.indexOf('.' + h.jsExt);
        const interfaceName = relativeInterfaceFile.substr(0, relativeInterfaceFileExtIndex);
        const requireInterfaceFile = path.join('../', interfaceFile);
        const interface = require(requireInterfaceFile);
        interfaces[interfaceName] = interface;
    }

    return interfaces;

};

const getInterfaceFiles = async () => {
    const interfaceFiles = await dir.promiseFiles(h.interfaceDir);
    return interfaceFiles.filter(file => path.extname(file) == '.' + h.jsExt);
};

const prepareCommands = (program, state) => {
    for (let contractName in state.contracts) {
        const contract = state.contracts[contractName];
        const interface = state.interfaces[contractName];
        prepareCommand(program, contract, interface, state)
    }
};

const prepareCommand = (program, contract, interface, state) => {

    for (let methodName in contract.methods) {

        // set up command
        const command = program
            .command(contract.name + ':' + methodName  + ' [network]')
            .option('--from <value>', 'from address')
            .option('--to <value>', 'contract address')
            .option('--value <value>', 'value')
            .option('--gas <value>', 'gas')
            .option('--gasPrice <value>', 'gas price')
            .option('--transact', 'do a transaction');

        // get args
        const args = contract.methods[methodName];
        // see if we have an interface for this command
        const interfaceArgs = getInterfaceArgs(methodName, interface);
        // get command options
        const optionNames = prepareCommandOptions(command, args, interfaceArgs);
        // prepare action
        command.action((network, options, commander) => {
            this.main(Object.assign(state, {
                networkName: network,
                contractName: contract.name,
                methodName,
                methodArgs: getMethodArgs(options, optionNames),
                methodOptions: getMethodOptions(options)
            }));
        });

    }

};

const getInterfaceArgs = (methodName, interface) => {

    if (!interface) {
        return [];
    }

    const method = interface[methodName];
    if (!method) {
        return [];
    }

    if (typeof method === 'function') {
        return [];
    } else if (typeof method === 'object') {
        return method.args;
    }

    return [];

}

const prepareCommandOptions = (command, args, interfaceArgs) => {

    let propertyNames = [];

    // add abi inputs
    for (let arg of args) {
        propertyNames.push(getPropertyName(arg));
        command.option(getOptionName(arg));
    }

    // add additional interface args
    for (let interfaceArg of interfaceArgs) {
        // we support "name" and ["name", "description"]
        if (typeof interfaceArg === 'string') {
            propertyNames.push(getPropertyName(interfaceArg));
            command.option(getOptionName(interfaceArg));
        } else if (typeof interfaceArg === 'array') {
            propertyNames.push(getPropertyName(interfaceArg[0]));
            command.option(getOptionName(interfaceArg[0]), interfaceArg[1]);
        }
    }

    return propertyNames;

}

const getPropertyName = (arg) => {
    return arg.replace('_', '');
}

const getOptionName = (arg) => {
    return arg.replace('_', '--') + '  <value>';
}

const getMethodArgs = (options, optionNames) => {

    const args = {};
    // move arguments out
    for (let optionName of optionNames) {
        args[optionName] = options[optionName];
    }

    return args;

}

const getMethodOptions = (options) => {

    const methodOptions = {};

    if (options.from) {
        methodOptions.from = options.from;
    }

    if (options.to) {
        methodOptions.from = options.to;
    }

    if (options.value) {
        methodOptions.from = options.value;
    }

    if (options.gas) {
        methodOptions.from = options.gas;
    }

    if (options.gasPrice) {
        methodOptions.from = options.gasPrice;
    }

    if (options.transact) {
        methodOptions.transact = options.transact;
    }

    return methodOptions;

};