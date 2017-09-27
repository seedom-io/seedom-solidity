pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Charity.sol";

contract TestCharity {

    function testOwnerSet() {
        Charity charity = Charity(DeployedAddresses.Charity());
        Assert.equal(charity.getOwner(), tx.origin, "Owner should be us");
    }

}