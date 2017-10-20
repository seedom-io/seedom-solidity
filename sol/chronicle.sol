pragma solidity ^0.4.4;

contract Chronicle {

    struct Version {
        uint256 created;
        address instance;
    }

    address public owner;
    Version[] public versions;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function Versions() public {
        owner = msg.sender;
    }

    function latest() view public returns (
        uint256 _created,
        address _instance
    ) {
        require (versions.length > 0);
        Version memory _version = versions[versions.length - 1];
        _created = _version.created;
        _instance = _version.instance;
    }

    function from(uint256 time) view public returns (
        uint256 _created,
        address _instance
    ) {
        Version memory _version = search(time);
        _created = _version.created;
        _instance = _version.instance;
    }

    function search(uint256 time) view internal returns (Version) {
        uint256 _leftIndex;
        uint256 _rightIndex;
        uint256 _midIndex;
        Version memory _midVersion;
        uint256 _nextIndex;
        Version memory _nextVersion;
        while (true) {

            // the winner is the last revealer!
            if (_leftIndex == _rightIndex) {
                return versions[_leftIndex];
            }

            _midIndex = _leftIndex + ((_rightIndex - _leftIndex) / 2);
            _nextIndex = _midIndex + 1;
            _midVersion = versions[_midIndex];
            _nextVersion = versions[_nextIndex];

            if (time >= _midVersion.created) {
                if (time < _nextVersion.created) {
                    // we are in range, version found
                    return _nextVersion;
                }
                // winner is greater, move right
                _leftIndex = _nextIndex;
            }
            // winner is less, move left
            _rightIndex = _midIndex;

        }
    }

    function upgrade(address instance) onlyOwner public {
        versions.push(Version(now, instance));
    }

}
