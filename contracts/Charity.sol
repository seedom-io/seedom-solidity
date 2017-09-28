pragma solidity ^0.4.4;

import 'zeppelin/contracts/math/SafeMath.sol';

contract Charity {
    using SafeMath for uint256;

    event Participation(
        address indexed sender,
        uint256 entries,
        uint256 totalEntries,
        uint256 totalParticipants);

    event Revelation(
        address indexed sender,
        uint256 random,
        uint256 revealedEntries,
        uint256 totalRevealedEntries,
        uint256 totalRevealers);

    struct Participant {
        uint256 entries;
        bytes32 hashedRandom;
        uint256 random;
    }

    address owner;
    address charity;
    uint256 charitySplit;
    uint256 winnerSplit;
    uint256 ownerSplit;
    uint256 entryRate;
    uint256 startTime;
    uint256 revealTime;
    uint256 endTime;

    uint256 totalParticipants;
    uint256 totalEntries;
    uint256 totalRevealers;
    uint256 totalRevealedEntries;

    mapping(address => Participant) participants;
    address[] participantAddresses;
    address[] revelearsAddresses;

    function Charity() {
        owner = msg.sender;
    }

    function getOwner() returns (address) {
        return owner;
    }

    function start(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _entryRate,
        uint256 _startTime,
        uint256 _revealTime,
        uint256 _endTime) public
    {

        require(msg.sender == owner); // make sure only we can authorize a new charity
        require(_charity != 0x0);
        require(_charitySplit > 0);
        require(_winnerSplit > 0);
        require(_ownerSplit > 0);
        require(_entryRate > 0);
        require(_startTime >= now && revealTime >= _startTime && _endTime >= _revealTime);

        charity = _charity;
        charitySplit = _charitySplit;
        winnerSplit = _winnerSplit;
        ownerSplit = _ownerSplit;
        entryRate = _entryRate;
        startTime = _startTime;
        revealTime = _revealTime;
        endTime = _endTime;

    }

    function participate(bytes32 _hashedRandom) public payable {
        
        require(msg.sender != owner); // owner cannot participate
        require(now >= startTime && now <= revealTime); // ensure we are after the start but before the reveal
        require(msg.value != 0);
        require(_hashedRandom != 0x0);

        // get the message sender
        address _sender = message.sender;
        // get the amount of ether entered
        uint256 _wei = msg.value;
        // calculate entries amount to be created
        uint256 _entries = _wei.mul(entryRate);
        
        Participant _participant = participants[_sender];
        // create a new participant or add entries to existing
        if (_participant.entries == 0) {
            _participant = Participant(_entries, _hashedRandom);
            // track participant addresses
            participantAddresses.push(_sender);
            // update participants count
            totalParticipants = totalParticipants.add(1);
        } else {
            _participant.entries = _participant.entries.add(_entries);
        }

        // update total entries count
        totalEntries = totalEntries.add(_entries);
        // send out participation update
        Participation(_sender, _entries, _participant.entries, totalParticipants);

    }

    function reveal(uint256 _random) public returns (bool) {

        require(msg.sender != owner); // owner cannot reveal
        require(now >= revealTime && now <= endTime); // ensure we are after the reveal but before the end
        require(_random != 0);
        
        // get the message sender
        address _sender = message.sender;
        // find a participant for this sender
        Participant _participant = participants[_sender];

        // participant have to have entries to reveal
        if (_participant.entries == 0) {
            return false;
        }

        // participant can't have already revealed
        if (_participant.random != 0) {
            return false;
        }

        // make sure the participant's random is valid
        if (_participant.hashedRandom != sha3(_random, _sender)) {
            return false;
            
        }

        // set the revealed number in the participant
        _participant.random = _random;
        // track revealer addresses
        revealerAddresses.push(_sender);
        // update total revealers count
        totalRevealers = totalRevealers.add(1);
        // update total revealed entries count
        totalRevealedEntries = totalRevealedEntries.add(_participant.entries);
        // send out revelation update
        Revelation(_sender, _random, _participant.entries, totalRevealedEntries, totalRevealers);

    }

    function end() public {

        require(msg.sender == owner); // make sure only we can end a charity
        require(now >= endTime); // a charity can only be ended after the reveal period is over

        uint256 _winningRandom = 0;
        // XOR all revealed random numbers together
        for (uint256 i = 0; i < revealerAddresses.length; i++) {
            address revealerAddresses = revealerAddresses[i];
            Participant _participant = participants[revealerAddresses];
            _random = _random ^ _participant.random;
        }

        // find winner revealer
        uint256 _winnerRevealerIndex = _winningRandom % revealerAddresses.length;
        address _winnerRevealer = revealerAddresses[_winnerRevealerIndex];
        
        // calculate total wei received
        uint256 _totalWei = totalEntries.div(entryRate);
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        uint256 _charityAmount = _totalWei.mul(charitySplit).div(100);
        uint256 _winnerAmount = _totalWei.mul(winnerSplit).div(100);
        uint256 _ownerAmount = _totalWei.mul(ownerSplit).div(100);

        // make wei transfers
        charity.transfer(_charityAmount);
        _winnerRevealer.transfer(_winnerAmount);
        owner.transfer(_ownerAmount);
        
        // delete all participants
        for (uint256 i = 0; i < participantAddresses.length; i++) {
            delete participants[participantAddresses[i]];
        }

        // delete participant & revealer addresses
        delete participantAddresses;
        delete revealerAddresses;

    }

    

}