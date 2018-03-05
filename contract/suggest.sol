pragma solidity ^0.4.19;

import "seedom.sol";

contract Suggest {

    event Vote(address indexed _address, uint256 indexed _charityId, uint256 _score);

    struct Charity {
        bytes32 _name;
        uint256 _totalScores;
        uint256 _totalVotes;
        mapping (address => uint256) _votes;
    }

    modifier isOpen() {
        require(now < endTime);
        _;
    }

    modifier isEnded() {
        require(now >= endTime);
        _;
    }

    address owner;
    uint256 public endTime;
    Charity[] charities;
    Seedom seedom;

    function Suggest(
        uint256 _endTime,
        address _seedomAddress
    ) public {
        require(_endTime > now);
        owner = msg.sender;
        endTime = _endTime;
        seedom = Seedom(_seedomAddress);
    }

    function getCharities() public view returns(bytes32[], uint256[], uint256[]) {
        uint256 totalCharities = charities.length;
        bytes32[] memory names = new bytes32[](totalCharities);
        uint256[] memory totalScores = new uint256[](totalCharities);
        uint256[] memory totalVotes = new uint256[](totalCharities);

        for (uint256 _charityId = 0; _charityId < totalCharities; _charityId++) {
            Charity storage _charity = charities[_charityId];
            names[_charityId] = _charity._name;
            totalScores[_charityId] = _charity._totalScores;
            totalVotes[_charityId] = _charity._totalVotes;
        }

        return (names, totalScores, totalVotes);
    }

    function getVotes() public view returns(uint256[]) {
        uint256 totalCharities = charities.length;
        uint256[] memory voterScores = new uint256[](totalCharities);

        for (uint256 _charityId = 0; _charityId < totalCharities; _charityId++) {
            Charity storage _charity = charities[_charityId];
            voterScores[_charityId] = _charity._votes[msg.sender];
        }

        return voterScores;
    }

    function hasRight() public view isOpen returns (bool) {
        // confirm with Seedom that this user has participated with entries
        var ( _entries, ) = seedom.participants(msg.sender);
        return (_entries > 0);
    }

    function add(bytes32 _charityName, uint256 _score) public {
        require(hasRight());
        Charity memory _newCharity = Charity(_charityName, _score, 1);
        charities.push(_newCharity);
        Charity storage _charity = charities[charities.length - 1];
        _charity._votes[msg.sender] = _score;
        Vote(msg.sender, charities.length - 1, _score);
    }

    function vote(uint256 _charityId, uint256 _score) public isOpen {
        require(hasRight());
        Charity storage _charity = charities[_charityId];
        uint256 _vote = _charity._votes[msg.sender];

        // undo a previous score
        if (_vote > 0) {
            _charity._totalScores -= _vote;
            _charity._totalVotes--;
        }

        // handle new vote
        if (_score > 0) {
            _charity._totalScores += _score;
            _charity._totalVotes++;
        }

        _charity._votes[msg.sender] = _score;
        Vote(msg.sender, _charityId, _score);
    }

}