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
        uint256 _votes,
        uint256 indexed _causeIndex,
        uint256 _causeScores,
        uint256 _causeVotes
    );

    struct Cause {
        bytes32 _name;
        address _caster;
        uint256 _scores;
        uint256 _votes;
    }

    struct Vote {
        uint256 _causeIndex;
        uint256 _score;
    }

    uint256 maxScore;
    Fundraiser fundraiser;
    Cause[] _causes;
    mapping (address => Vote[]) _participants;

    function Polling(
        uint256 _maxScore,
        address _fundraiser
    ) public {
        maxScore = _maxScore;
        fundraiser = Fundraiser(_fundraiser);
    }

    function caster() public view returns (
        uint256 _maxScore,
        uint256 _maxVotes,
        uint256 _votes
    ) {
        _maxScore = maxScore;
        _maxVotes = maxVotes();
        _votes = _participants[msg.sender].length;
    }

    function causes() public view returns (
        bytes32[] _names,
        address[] _casters,
        uint256[] _scores,
        uint256[] _votes
    ) {
        _names = new bytes32[](_causes.length);
        _casters = new address[](_causes.length);
        _scores = new uint256[](_causes.length);
        _votes = new uint256[](_causes.length);

        for (uint256 _causeIndex = 0; _causeIndex < _causes.length; _causeIndex++) {
            Cause storage _cause = _causes[_causeIndex];
            _names[_causeIndex] = _cause._name;
            _casters[_causeIndex] = _cause._caster;
            _scores[_causeIndex] = _cause._scores;
            _votes[_causeIndex] = _cause._votes;
        }

        return (
            _names,
            _casters,
            _scores,
            _votes
        );
    }

    function votes() public view returns (
        uint256[] _causeIndexes,
        uint256[] _scores
    ) {
        Vote[] storage _votes = _participants[msg.sender];
        _causeIndexes = new uint256[](_votes.length);
        _scores = new uint256[](_votes.length);

        for (
            uint256 _voteIndex = 0;
            _voteIndex < _votes.length;
            _voteIndex++
        ) {
            Vote storage _vote = _votes[_voteIndex];
            _causeIndexes[_voteIndex] = _vote._causeIndex;
            _scores[_voteIndex] = _vote._score;
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
        require(_participants[msg.sender].length != maxVotes());

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
        _participants[msg.sender].push(_newVote);

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

        Vote[] storage _votes = _participants[msg.sender];
        Cause storage _cause = _causes[_causeIndex];
        // find an existing sender vote
        for (
            uint256 _voteIndex = 0;
            _voteIndex < _votes.length;
            _voteIndex++
        ) {
            if (_votes[_voteIndex]._causeIndex == _causeIndex) {
                break;
            }
        }

        // remove existing vote from cause totals
        if (_voteIndex != _votes.length) {
            uint256 _existingScore = _votes[_voteIndex]._score;
            // only update totals if we have a score
            if (_existingScore > 0) {
                _cause._scores -= _existingScore;
                _cause._votes -= 1;
            }
        }
        
        // delete vote or cast new vote
        if (_score == 0) {

            if (_cause._caster == msg.sender) {
                _votes[_voteIndex]._score = 0;
            } else {
                if (_votes.length > 1) {
                    _votes[_voteIndex] = _votes[_votes.length - 1];
                }
                _votes.length--;
            }

        } else {
            
            // update existing vote or create a new one
            if (_voteIndex != _votes.length) {
                _votes[_voteIndex]._score = _score;
            } else {
                require(_votes.length == 0);
                Vote memory _newVote = Vote(_causeIndex, _score);
                _votes.push(_newVote);
            }

            // add new vote to cause totals
            _cause._scores += _score;
            _cause._votes += 1;

        }

        CastIndex(
            msg.sender,
            _score,
            _votes.length,
            _causeIndex,
            _cause._scores,
            _cause._votes
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