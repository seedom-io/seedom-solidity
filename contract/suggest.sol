pragma solidity ^0.4.19;

import "seedom.sol";

contract Suggest {

    event Vote(address indexed _address, uint256 indexed _charityIndex, uint256 _score);

    struct Charity {
        bytes32 _name;
        address _creator;
        uint256 _totalScores;
        uint256 _totalVotes;
        mapping (address => uint256) _votes;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier isOpen() {
        require(now < endTime);
        _;
    }

    modifier canDestruct() {
        require(now >= destructTime);
        _;
    }

    address owner;
    uint256 public maxScore;
    uint256 public endTime;
    uint256 public destructTime;
    Charity[] charities;
    Seedom seedom;

    function Suggest(
        uint256 _maxScore,
        address _seedomAddress
    ) public {
        owner = msg.sender;
        maxScore = _maxScore;
        seedom = Seedom(_seedomAddress);
        // set end and destruct times from seedom
        ( , , , , , , , , endTime, , destructTime, ) = seedom.raiser();
    }

    function getCharities() public view returns(bytes32[], uint256[], uint256[]) {
        uint256 totalCharities = charities.length;
        bytes32[] memory names = new bytes32[](totalCharities);
        uint256[] memory totalScores = new uint256[](totalCharities);
        uint256[] memory totalVotes = new uint256[](totalCharities);

        for (uint256 _charityIndex = 0; _charityIndex < totalCharities; _charityIndex++) {
            Charity storage _charity = charities[_charityIndex];
            names[_charityIndex] = _charity._name;
            totalScores[_charityIndex] = _charity._totalScores;
            totalVotes[_charityIndex] = _charity._totalVotes;
        }

        return (names, totalScores, totalVotes);
    }

    function getVotes() public view returns(uint256[]) {
        uint256 totalCharities = charities.length;
        uint256[] memory scores = new uint256[](totalCharities);
        for (uint256 _charityIndex = 0; _charityIndex < totalCharities; _charityIndex++) {
            Charity storage _charity = charities[_charityIndex];
            scores[_charityIndex] = _charity._votes[msg.sender];
        }

        return scores;
    }

    function hasRight(
        uint256 _forCharityIndex,
        bytes32 _forCharityName
    ) public view isOpen returns (bool) {
        // first confirm with Seedom that this user has participated with entries
        var ( _entries, ) = seedom.participants(msg.sender);
        if (_entries == 0) {
            return false;
        }
        // see if votes and suggestions exist elsewhere
        for (uint256 _charityIndex = 0; _charityIndex < charities.length; _charityIndex++) {
            Charity storage _charity = charities[_charityIndex];
            // if we already have this name, deny
            if (_charity._name == _forCharityName) {
                return false;
            }
            // skip charity checking right for
            if (_charityIndex == _forCharityIndex) {
                continue;
            }
            // if the user is a suggester of another charity, deny
            if (_charity._creator == msg.sender) {
                return false;
            }
            uint256 score = _charity._votes[msg.sender];
            // if the user has voted elsewhere, deny
            if (score > 0) {
                return false;
            }
        }

        return true;
    }

    function addCharity(bytes32 _charityName, uint256 _score) public isOpen {
        require(_charityName != 0x0);
        require(_score <= maxScore);
        // use next index that doesn't exist
        require(hasRight(charities.length, _charityName));
        // create new charity
        Charity memory _newCharity = Charity(_charityName, msg.sender, _score, 1);
        charities.push(_newCharity);
        // pull it from storage to update mapping
        Charity storage _charity = charities[charities.length - 1];
        _charity._votes[msg.sender] = _score;
        Vote(msg.sender, charities.length - 1, _score);
    }

    function vote(uint256 _charityIndex, uint256 _score) public isOpen {
        require(_score <= maxScore);
        require(hasRight(_charityIndex, 0x0));
        Charity storage _charity = charities[_charityIndex];
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

        // set voter score
        _charity._votes[msg.sender] = _score;
        Vote(msg.sender, _charityIndex, _score);
    }

    function destroy() public canDestruct onlyOwner {
        selfdestruct(msg.sender);
    }

}