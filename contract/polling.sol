pragma solidity ^0.4.19;

import "fundraiser.sol";

contract Polling {

    event CastName(
        address indexed _caster,
        uint256 indexed _causeIndex,
        bytes32 _causeName,
        uint256 _causeVoteCount
    );

    event CastIndex(
        address indexed _caster,
        uint256 indexed _causeIndex,
        uint256 _causeVoteCount
    );

    struct Cause {
        bytes32 _name;
        address _caster;
        uint256 _voteCount;
    }

    struct Vote {
        uint256 _causeIndex;
        uint256 _count;
    }

    Cause[] _causes;
    Fundraiser fundraiser;
    mapping (address => Vote[]) public _participants;

    function Polling(
        address _fundraiser
    ) public {
        fundraiser = Fundraiser(_fundraiser);
    }

    function causes() public view returns (
        bytes32[] _names,
        address[] _casters,
        uint256[] _voteCounts
    ) {
        _names = new bytes32[](_causes.length);
        _casters = new address[](_causes.length);
        _voteCounts = new uint256[](_causes.length);

        for (uint256 _causeIndex = 0; _causeIndex < _causes.length; _causeIndex++) {
            Cause storage _cause = _causes[_causeIndex];
            _names[_causeIndex] = _cause._name;
            _casters[_causeIndex] = _cause._caster;
            _voteCounts[_causeIndex] = _cause._voteCount;
        }
    }

    function votes() public view returns (
        uint256[] _causeIndexes,
        uint256[] _counts
    ) {
        Vote[] storage _votes = _participants[msg.sender];
        _causeIndexes = new uint256[](_votes.length);
        _counts = new uint256[](_votes.length);

        for (uint256 _voteIndex = 0; _voteIndex < _votes.length; _voteIndex++) {
            Vote storage _vote = _votes[_voteIndex];
            _causeIndexes[_voteIndex] = _vote._causeIndex;
            _counts[_voteIndex] = _vote._count;
        }
    }

    function maxVotes() public view returns (uint256) {
        // get end time from fundraiser
        var (,,,,,,,,,, _endTime,,,) = fundraiser.deployment();
        if (now >= _endTime) {
            return 0;
        }
        // ensure fundraiser not cancelled
        var (,,,,,,,, _cancelled,,) = fundraiser.state();
        if (_cancelled) {
            return 0;
        }
        // confirm user has participated with entries
        var ( _entries,) = fundraiser.participants(msg.sender);
        if (_entries == 0) {
            return 0;
        }

        return 1;
    }

    function underMaxVoteCount(
        Vote[] storage _votes,
        uint256 _count
    ) private view returns (bool) {
        uint256 _currentCount = 0;
        for (uint256 _voteIndex = 0; _voteIndex < _votes.length; _voteIndex) {
            Vote storage _vote = _votes[_voteIndex];
            _currentCount += _vote._count;
        }

        return (_currentCount + _count) <= maxVotes();
    } 

    function voteName(bytes32 _causeName, uint256 _count) public {
        require(_causeName != 0x0);

        // get participant votes, ensure new under max count
        Vote[] storage _votes = _participants[msg.sender];
        require(underMaxVoteCount(_votes, _count));

        // make sure cause doesn't already exist
        for (uint256 _causeIndex = 0; _causeIndex < _causes.length; _causeIndex++) {
            Cause storage _cause = _causes[_causeIndex];
            if (_cause._name == _causeName) {
                revert();
            }
        }

        _causeIndex = _causes.length;
        // cast vote
        _vote(_causeIndex, _count);
        // create cause
        Cause memory _newCause = Cause(_causeName, msg.sender, _count);
        _causes.push(_newCause);

        CastName(
            msg.sender,
            _causeIndex,
            _causeName,
            _count
        );
    }

    function _vote(uint256 _causeIndex, uint256 _count) public {
        // get participant votes, ensure new under max count
        Vote[] storage _votes = _participants[msg.sender];
        require(underMaxVoteCount(_votes, _count));
        // create new vote
        Vote memory _vote = Vote(_causeIndex, _count);
        _votes.push(_vote);
    }

    function voteIndex(uint256 _causeIndex, uint256 _count) public {
        require(_causeIndex < _causes.length);
        
        // cast vote
        _vote(_causeIndex, _count);
        // update cause
        Cause storage _cause = _causes[_causeIndex];
        _cause._voteCount += _count;

        CastIndex(
            msg.sender,
            _causeIndex,
            _cause._voteCount
        );
    }

    function destroy() public {
        // get destruct time from fundraiser
        var (,,,, _owner,,,,,,,, _destructTime,) = fundraiser.deployment();
        require (_owner == msg.sender);
        require (now >= _destructTime);
        selfdestruct(msg.sender);
    }

}