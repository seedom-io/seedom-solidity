pragma solidity ^0.4.19;

import "seedom.sol";

contract Suggest {

    event CastName(
        address indexed _caster,
        uint256 indexed _charityIndex,
        bytes32 _charityName,
        uint256 _score
    );

    event CastIndex(
        address indexed _caster,
        uint256 indexed _charityIndex,
        uint256 _score
    );

    struct Charity {
        bytes32 _name;
        address _caster;
        uint256 _totalScores;
        uint256 _totalVotes;
    }

    struct Vote {
        uint256 _charityIndex;
        uint256 _score;
    }

    uint256 maxScore;
    Seedom seedom;
    Charity[] _charities;
    mapping (address => Vote[]) _votes;

    function Suggest(
        uint256 _maxScore,
        address _seedomAddress
    ) public {
        maxScore = _maxScore;
        seedom = Seedom(_seedomAddress);
    }

    function status() public view returns (
        uint256 _maxScore,
        bool _hasRight,
        bool _hasVoted
    ) {
        _maxScore = maxScore;
        _hasRight = hasRight();
        _hasVoted = _votes[msg.sender].length > 0;
    }

    function charities() public view returns (
        bytes32[] _names,
        address[] _casters,
        uint256[] _totalScores,
        uint256[] _totalVotes
    ) {
        uint256 totalCharities = _charities.length;
        _names = new bytes32[](totalCharities);
        _casters = new address[](totalCharities);
        _totalScores = new uint256[](totalCharities);
        _totalVotes = new uint256[](totalCharities);

        for (uint256 _charityIndex = 0; _charityIndex < totalCharities; _charityIndex++) {
            Charity storage _charity = _charities[_charityIndex];
            _names[_charityIndex] = _charity._name;
            _casters[_charityIndex] = _charity._caster;
            _totalScores[_charityIndex] = _charity._totalScores;
            _totalVotes[_charityIndex] = _charity._totalVotes;
        }

        return (
            _names,
            _casters,
            _totalScores,
            _totalVotes
        );
    }

    function votes() public view returns (
        uint256[] _charityIndexes,
        uint256[] _scores
    ) {
        Vote[] storage _casterVotes = _votes[msg.sender];
        uint256 _totalSenderVotes = _casterVotes.length;
        _charityIndexes = new uint256[](_totalSenderVotes);
        _scores = new uint256[](_totalSenderVotes);

        for (
            uint256 _casterVoteIndex = 0;
            _casterVoteIndex < _totalSenderVotes;
            _casterVoteIndex++
        ) {
            Vote storage _casterVote = _casterVotes[_casterVoteIndex];
            _charityIndexes[_casterVoteIndex] = _casterVote._charityIndex;
            _scores[_casterVoteIndex] = _casterVote._score;
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

    function voteName(bytes32 _charityName, uint256 _score) public {
        require(_charityName != 0x0);
        require(_score <= maxScore);
        require(_votes[msg.sender].length == 0);
        require(hasRight());

        // make sure charity doesn't exist
        for (uint256 _charityIndex = 0; _charityIndex < _charities.length; _charityIndex++) {
            Charity storage _charity = _charities[_charityIndex];
            if (_charity._name == _charityName) {
                revert();
            }
        }

        uint256 _newCharityIndex = _charities.length;
        // create new charity
        Charity memory _newCharity = Charity(_charityName, msg.sender, _score, 1);
        _charities.push(_newCharity);
        // update total votes
        Vote memory _newVote = Vote(_newCharityIndex, _score);
        _votes[msg.sender].push(_newVote);

        CastName(msg.sender, _newCharityIndex, _charityName, _score);
    }

    function voteIndex(uint256 _charityIndex, uint256 _score) public {
        require(_score <= maxScore);
        require(hasRight());

        Vote[] storage _casterVotes = _votes[msg.sender];
        Charity storage _charity = _charities[_charityIndex];
        // find an existing sender vote
        for (
            uint256 _casterVoteIndex = 0;
            _casterVoteIndex < _casterVotes.length;
            _casterVoteIndex++
        ) {
            if (_casterVotes[_casterVoteIndex]._charityIndex == _charityIndex) {
                break;
            }
        }

        // remove existing vote from charity totals
        if (_casterVoteIndex != _casterVotes.length) {
            uint256 _existingScore = _casterVotes[_casterVoteIndex]._score;
            // only update totals if we have a score
            if (_existingScore > 0) {
                _charity._totalScores -= _existingScore;
                _charity._totalVotes -= 1;
            }
        }
        
        // delete vote or cast new vote
        if (_score == 0) {

            if (_charity._caster == msg.sender) {
                _casterVotes[_casterVoteIndex]._score = 0;
            } else {
                if (_casterVotes.length > 1) {
                    _casterVotes[_casterVoteIndex] = _casterVotes[_casterVotes.length - 1];
                }
                _casterVotes.length--;
            }

        } else {
            
            // update existing vote or create a new one
            if (_casterVoteIndex != _casterVotes.length) {
                _casterVotes[_casterVoteIndex]._score = _score;
            } else {
                require(_casterVotes.length == 0);
                Vote memory _newVote = Vote(_charityIndex, _score);
                _casterVotes.push(_newVote);
            }

            // add new vote to charity totals
            _charity._totalScores += _score;
            _charity._totalVotes += 1;

        }

        CastIndex(msg.sender, _charityIndex, _score);
    }

    function destroy() public {
        // get destruct time from seedom
        var ( , , , _owner, , , , , , , _destructTime, ) = seedom.raiser();
        require (_owner == msg.sender);
        require (now >= _destructTime);
        selfdestruct(msg.sender);
    }

}