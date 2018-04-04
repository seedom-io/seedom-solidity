pragma solidity ^0.4.19;

import "fundraiser.sol";

contract Polling {

    event CastName(
        address indexed _caster,
        uint256 _score,
        uint256 indexed _causeIndex,
        bytes32 _causeName
    );

    event CastIndex(
        address indexed _caster,
        uint256 _score,
        uint256 _totalVotes,
        uint256 indexed _causeIndex,
        uint256 _causeTotalScores,
        uint256 _causeTotalVotes
    );

    struct Cause {
        bytes32 _name;
        address _caster;
        uint256 _totalScores;
        uint256 _totalVotes;
    }

    struct Vote {
        uint256 _causeIndex;
        uint256 _score;
    }

    uint256 maxScore;
    Fundraiser fundraiser;
    Cause[] _causes;
    mapping (address => Vote[]) _votes;

    function Polling(
        uint256 _maxScore,
        address _fundraiserAddress
    ) public {
        maxScore = _maxScore;
        fundraiser = Fundraiser(_fundraiserAddress);
    }

    function caster() public view returns (
        uint256 _maxScore,
        uint256 _maxVotes,
        uint256 _totalVotes
    ) {
        _maxScore = maxScore;
        _maxVotes = maxVotes();
        _totalVotes = _votes[msg.sender].length;
    }

    function causes() public view returns (
        bytes32[] _names,
        address[] _casters,
        uint256[] _totalScores,
        uint256[] _totalVotes
    ) {
        uint256 totalCharities = _causes.length;
        _names = new bytes32[](totalCharities);
        _casters = new address[](totalCharities);
        _totalScores = new uint256[](totalCharities);
        _totalVotes = new uint256[](totalCharities);

        for (uint256 _causeIndex = 0; _causeIndex < totalCharities; _causeIndex++) {
            Cause storage _cause = _causes[_causeIndex];
            _names[_causeIndex] = _cause._name;
            _casters[_causeIndex] = _cause._caster;
            _totalScores[_causeIndex] = _cause._totalScores;
            _totalVotes[_causeIndex] = _cause._totalVotes;
        }

        return (
            _names,
            _casters,
            _totalScores,
            _totalVotes
        );
    }

    function votes() public view returns (
        uint256[] _causeIndexes,
        uint256[] _scores
    ) {
        Vote[] storage _casterVotes = _votes[msg.sender];
        uint256 _totalSenderVotes = _casterVotes.length;
        _causeIndexes = new uint256[](_totalSenderVotes);
        _scores = new uint256[](_totalSenderVotes);

        for (
            uint256 _casterVoteIndex = 0;
            _casterVoteIndex < _totalSenderVotes;
            _casterVoteIndex++
        ) {
            Vote storage _casterVote = _casterVotes[_casterVoteIndex];
            _causeIndexes[_casterVoteIndex] = _casterVote._causeIndex;
            _scores[_casterVoteIndex] = _casterVote._score;
        }

        return (
            _causeIndexes,
            _scores
        );
    }

    function maxVotes() public view returns (uint256) {
        // get end time from fundraiser
        var ( , , , , , , , , _endTime, , , ) = fundraiser.deployment();
        if (now >= _endTime) {
            return 0;
        }
        // ensure fundraiser not cancelled
        var ( , , , , , , , , _cancelled, , ) = fundraiser.state();
        if (_cancelled) {
            return 0;
        }
        // confirm user has participated with entries
        var ( _entries, ) = fundraiser.participants(msg.sender);
        if (_entries == 0) {
            return 0;
        }

        return 1;
    }

    function voteName(bytes32 _causeName, uint256 _score) public {
        require(_causeName != 0x0);
        require(_score <= maxScore);
        require(_votes[msg.sender].length != maxVotes());

        // make sure cause doesn't exist
        for (uint256 _causeIndex = 0; _causeIndex < _causes.length; _causeIndex++) {
            Cause storage _cause = _causes[_causeIndex];
            if (_cause._name == _causeName) {
                revert();
            }
        }

        uint256 _newCauseIndex = _causes.length;
        // create new cause
        Cause memory _newCause = Cause(_causeName, msg.sender, _score, 1);
        _causes.push(_newCause);
        // update total votes
        Vote memory _newVote = Vote(_newCauseIndex, _score);
        _votes[msg.sender].push(_newVote);

        CastName(
            msg.sender,
            _score,
            _newCauseIndex,
            _causeName
        );
    }

    function voteIndex(uint256 _causeIndex, uint256 _score) public {
        require(_score <= maxScore);
        require(maxVotes() > 0);

        Vote[] storage _casterVotes = _votes[msg.sender];
        Cause storage _cause = _causes[_causeIndex];
        // find an existing sender vote
        for (
            uint256 _casterVoteIndex = 0;
            _casterVoteIndex < _casterVotes.length;
            _casterVoteIndex++
        ) {
            if (_casterVotes[_casterVoteIndex]._causeIndex == _causeIndex) {
                break;
            }
        }

        // remove existing vote from cause totals
        if (_casterVoteIndex != _casterVotes.length) {
            uint256 _existingScore = _casterVotes[_casterVoteIndex]._score;
            // only update totals if we have a score
            if (_existingScore > 0) {
                _cause._totalScores -= _existingScore;
                _cause._totalVotes -= 1;
            }
        }
        
        // delete vote or cast new vote
        if (_score == 0) {

            if (_cause._caster == msg.sender) {
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
                Vote memory _newVote = Vote(_causeIndex, _score);
                _casterVotes.push(_newVote);
            }

            // add new vote to cause totals
            _cause._totalScores += _score;
            _cause._totalVotes += 1;

        }

        CastIndex(
            msg.sender,
            _score,
            _casterVotes.length,
            _causeIndex,
            _cause._totalScores,
            _cause._totalVotes
        );
    }

    function destroy() public {
        // get destruct time from fundraiser
        var ( , , , _owner, , , , , , , _destructTime, ) = fundraiser.deployment();
        require (_owner == msg.sender);
        require (now >= _destructTime);
        selfdestruct(msg.sender);
    }

}