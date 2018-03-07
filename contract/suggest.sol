pragma solidity ^0.4.19;

import "seedom.sol";

contract Suggest {

    event Cast(address indexed _address, uint256 indexed _charityIndex, uint256 _score);

    struct Charity {
        bytes32 _name;
        address _suggestor;
        uint256 _totalScores;
        uint256 _totalVotes;
    }

    struct Vote {
        uint256 _charityIndex;
        uint256 _score;
    }

    uint256 maxScore;
    Seedom seedom;
    Charity[] charities;
    mapping (address => Vote[]) votes;

    function Suggest(
        uint256 _maxScore,
        address _seedomAddress
    ) public {
        maxScore = _maxScore;
        seedom = Seedom(_seedomAddress);
    }

    function getCharities() public view returns (
        bytes32[] _names,
        address[] _suggestors,
        uint256[] _totalScores,
        uint256[] _totalVotes
    ) {
        uint256 totalCharities = charities.length;
        _names = new bytes32[](totalCharities);
        _suggestors = new address[](totalCharities);
        _totalScores = new uint256[](totalCharities);
        _totalVotes = new uint256[](totalCharities);
        // first pass to get fundamentals
        for (uint256 _charityIndex = 0; _charityIndex < totalCharities; _charityIndex++) {
            Charity storage _charity = charities[_charityIndex];
            _names[_charityIndex] = _charity._name;
            _suggestors[_charityIndex] = _charity._suggestor;
            _totalScores[_charityIndex] = _charity._totalScores;
            _totalVotes[_charityIndex] = _charity._totalVotes;
        }

        return (
            _names,
            _suggestors,
            _totalScores,
            _totalVotes
        );
    }

    function getVotes() public view returns (
        uint256[] _charityIndexes,
        uint256[] _scores
    ) {
        Vote[] storage _votes = votes[msg.sender];
        uint256 totalVotes = _votes.length;
        _charityIndexes = new uint256[](totalVotes);
        _scores = new uint256[](totalVotes);
        // first pass to get fundamentals
        for (uint256 _voteIndex = 0; _voteIndex < totalVotes; _voteIndex++) {
            Vote storage _vote = _votes[_voteIndex];
            _charityIndexes[_voteIndex] = _vote._charityIndex;
            _scores[_voteIndex] = _vote._score;
        }

        return (
            _charityIndexes,
            _scores
        );
    }

    function hasRight() public view returns (bool) {
        // get end time from seedom
        var ( , , , , , , , , _endTime, , , ) = seedom.raiser();
        if (now >= _endTime) {
            return false;
        }

        // ensure raiser not cancelled
        var ( , , , , , , , , _cancelled, , ) = seedom.state();
        if (_cancelled) {
            return false;
        }

        // confirm user has participated with entries
        var ( _entries, ) = seedom.participants(msg.sender);
        if (_entries == 0) {
            return false;
        }

        return true;
    }

    function canVote() public view returns (bool) {
        return votes[msg.sender].length == 0;
    }

    function voteSuggest(bytes32 _charityName, uint256 _score) public {
        require(_charityName != 0x0);
        require(_score <= maxScore);
        require(hasRight());
        require(canVote());

        // make sure charity doesn't exist
        for (uint256 _charityIndex = 0; _charityIndex < charities.length; _charityIndex++) {
            Charity storage _charity = charities[_charityIndex];
            if (_charity._name == _charityName) {
                revert();
            }
        }

        uint256 _newCharityIndex = charities.length;
        // create new charity
        Charity memory _newCharity = Charity(_charityName, msg.sender, _score, 1);
        charities.push(_newCharity);
        // update total votes
        Vote memory _newVote = Vote(_newCharityIndex, _score);
        votes[msg.sender].push(_newVote);

        Cast(msg.sender, _newCharityIndex, _score);
    }

    function voteCharity(uint256 _charityIndex, uint256 _score) public {
        require(_score <= maxScore);
        require(hasRight());

        Vote[] storage _votes = votes[msg.sender];
        Charity storage _charity = charities[_charityIndex];
        // delete existing charity vote
        for (uint256 _voteIndex = 0; _voteIndex < _votes.length; _voteIndex++) {
            Vote storage _existingVote = _votes[_voteIndex];
            if (_existingVote._charityIndex == _charityIndex) {
                _charity._totalScores -= _existingVote._score;
                _charity._totalVotes -= 1;
                removeVote(_votes, _voteIndex);
                break;
            }
        }

        // cast new vote
        if (_score > 0) {
            require(canVote());
            _charity._totalScores += _score;
            _charity._totalVotes += 1;
            Vote memory _newVote = Vote(_charityIndex, _score);
            votes[msg.sender].push(_newVote);
        }

        Cast(msg.sender, _charityIndex, _score);
    }

    function removeVote(
         Vote[] storage _votes,
         uint256 _index
    ) internal {
        // if we have more than one vote, move last vote to deleted's spot
        if (_votes.length > 1) {
            _votes[_index] = _votes[_votes.length - 1];
        }
        _votes.length--;
    }

    function destroy() public {
        // get destruct time from seedom
        var ( , , , _owner, , , , , , , _destructTime, ) = seedom.raiser();
        require (_owner == msg.sender);
        require (now >= _destructTime);
        selfdestruct(msg.sender);
    }

}