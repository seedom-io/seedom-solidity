var Charity = artifacts.require("./Charity.sol");

module.exports = function(deployer) {
  deployer.deploy(Charity);
};
