const compile = require('./compile');
const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const parser = require('./parser');
const path = require('path');
const network = require('./network');

const methodOptionOptions = parser.getOptions([
    ['from'],
    ['to'],
    ['value'],
    ['gas'],
    ['gasPrice'],
    ['transact', false, 'bool']
]);

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

    // set up interfaces proxy
    state.interfaces = new Proxy({}, {
        get: async (target, name) => {
            return await resolveInterface(target, name, state);
        }
    });

    cli.success("interfaces prepared");

    // check for a contract & method
    if (state.methodName) {

        // to is either the contract addy or name
        const to = state.methodOptions.to ? state.methodOptions.to : state.contractName;

        cli.info(`running ${to}.${state.methodName}`);

        const interface = await state.interfaces[to];
        if (!interface) {

            cli.error(`contract ${to} not found`);
            
        } else {

            const method = await interface[state.methodName];
            const result = await method(
                state.methodArgs,
                state.methodOptions
            );

            if (state.methodName !== 'deploy') {
                cli.json(result, "result");
            }

            await this.save(state);

        }

        
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

const resolveInterface = async (interfaces, name, state) => {

    // if we have the interface, just return it
    if (name in interfaces) {
        return interfaces[name];
    }

    // if we have a contract name or address, look up the deployment
    return await resolveStringInterface(name, state);

};

const resolveStringInterface = async (name, state) => {

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

    const web3Result = await resolveWeb3Result(contract, deploymentRelease, state);
    // get proxy interface
    return getInterface(name, web3Result, contract, state);

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

const resolveWeb3Result = async (contract, deploymentRelease, state) => {

    const web3Result = {};

    if (deploymentRelease) {

        // resurrect deployment receipt
        if (deploymentRelease.transactionHash) {
            web3Result.receipt = await state.web3.eth.getTransactionReceipt(deploymentRelease.transactionHash);
        }

        // get web3 attached to addy
        web3Result.instance = new state.web3.eth.Contract(contract.abi, deploymentRelease.address);

    } else {

        web3Result.instance = new state.web3.eth.Contract(contract.abi);

    }
    
    return web3Result;

};

const getInterface = (interfaceName, web3Result, contract, state) => {
    
    // create interface proxy
    const interface = new Proxy(web3Result, {
        get: (target, name) => {

            // ignore cascading desires to fulfill proxy
            if (name === 'then') {
                return this;
            }

            // if asking for receipt, return it
            if (name === 'receipt') {
                return web3Result.receipt;
            }

            return resolveInterfaceMethod(name, target.instance, contract, state);

        }
    });

    // cache the interface
    state.interfaces[interfaceName] = interface;
    return interface;

};

const resolveInterfaceMethod = (methodName, web3Instance, contract, state) => {

    const isConstructor = methodName === 'deploy';
    const isFallback = methodName === 'fallback';
    // if we are deploying, override contract to latest (ignoring releases)
    if (isConstructor) {
        contract = state.contracts[contract.name];
    }

    return async (methodArgs, methodOptions) => {

        if (!methodOptions) {
            methodOptions = methodArgs;
        }

        // see if we transact and then delete this non-standard option
        const transact = methodOptions.transact;
        delete methodOptions.transact;
        
        // massage the args
        const contractArgs = contract.methods[methodName];
        const web3Args = getWeb3Args(methodArgs, contractArgs);

        // run proper web3 method
        if (isConstructor) {
            return await runWeb3Deploy(contract, web3Args, methodOptions, web3Instance, state);
        } else if (isFallback) {
            return await runWeb3Fallback(web3Args, methodOptions, web3Instance, state);
        } else if (transact) {
            return await runWeb3Transaction(methodName, web3Args, methodOptions, web3Instance, state);
        } else {
            return await runWeb3Call(methodName, web3Args, methodOptions, web3Instance);
        }

    }

}

const getWeb3Args = (methodArgs, contractArgs) => {

    // if we only have a single contract arg,
    // return the first element of method args
    if (contractArgs.length == 1) {
        const name = Object.keys(methodArgs)[0];
        return [ methodArgs[name] ];
    }

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
    // get contract addy
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
    return getInterface(contract.name, web3Result, contract, state);

};

const runWeb3Fallback = async (web3Args, options, web3Instance, state) => {

    // fallback transaction
    const web3Receipt = await network.sendFallback(
        web3Instance,
        options,
        state
    );

    return web3Receipt;

}

const runWeb3Transaction = async (methodName, web3Args, options, web3Instance, state) => {

    // transaction
    const web3Receipt = await network.sendMethod(
        web3Instance.methods[methodName].apply(null, web3Args),
        options,
        state
    );

    return web3Receipt;

};

const runWeb3Call = async (methodName, web3Args, options, web3Instance) => {
    const web3Return = await web3Instance.methods[methodName].apply(null, web3Args).call(options);
    return getReturn(web3Return);
};

const getReturn = (web3Return) => {
    const result = {};
    for (let name in web3Return) {
        if (name.startsWith('_')) {
            result[name.substr(1)] = web3Return[name];
        }
    }
    return result;
};

module.exports.prepare = async (program, state) => {
    for (let contractName in state.contracts) {
        const contract = state.contracts[contractName];
        prepareCommand(program, contract, state)
    }
};

const prepareCommand = (program, contract, state) => {

    for (let component of contract.abi) {

        const isFunction = component.type === 'function';
        const isConstructor = component.type === 'constructor';
        const isFallback = component.type === 'fallback';
        // skip non-functions and non-constructors and non-fallbacks
        if (!isFunction && !isConstructor && !isFallback) {
            continue;
        }

        let methodName;
        if (isFunction) {
            methodName = component.name;
        } else if (isConstructor) {
            methodName = 'deploy';
        } else {
            methodName = 'fallback';
        }

        // set up command
        const command = program.command(`${contract.name}:${methodName} [network]`);

        // add standard options
        prepareCommandOptions(command, methodOptionOptions);

        // add method arg options
        const methodArgDefinitions = getMethodArgDefinitions(component.inputs);
        const methodArgOptions = parser.getOptions(methodArgDefinitions);
        prepareCommandOptions(command, methodArgOptions);

        // prepare action
        command.action((network, options, commander) => {
            this.main(Object.assign(state, {
                networkName: network,
                contractName: contract.name,
                methodName,
                methodArgs: parser.getValues(options, methodArgOptions),
                methodOptions: parser.getValues(options, methodOptionOptions)
            }));
        });

    }

};

const prepareCommandOptions = (command, options) => {
    for (let option of options) {
        command.option.apply(command, option.commander);
    }
}

const getMethodArgDefinitions = (inputs) => {

    if (!inputs) {
        return [];
    }

    let definitions = [];
    // add abi inputs
    for (let input of inputs) {
        definitions.push([ input.name, true, input.type ]);
    }

    return definitions;

}