pragma solidity ^0.4.4;

contract Charity {

    address public owner;

    function Charity() {
        owner = msg.sender;
    }

    function getOwner() returns (address) {
        return owner;
    }

}