pragma solidity ^0.4.4;

import 'zeppelin/contracts/math/SafeMath.sol';

contract Charity {
    using SafeMath for uint256;

    event Participation(
        address indexed participant,
        uint256 newParticipantEntries,
        uint256 totalParticipantEntries,
        uint256 totalEntries,
        uint256 totalParticipants);

    event Revelation(
        address indexed revealer,
        uint256 newRevealedEntries,
        uint256 totalRevealed);

    struct Participant {
        uint256 entries;
        bytes32 hashedRandom;
    }

    struct Revealer {
        uint256 random;
        uint256 cumulativeEntries;
    }

    address owner;
    address charity;
    address winner;
    uint256 charitySplit;
    uint256 winnerSplit;
    uint256 ownerSplit;
    uint256 entryCost;
    uint256 startTime;
    uint256 revealTime;
    uint256 endTime;
    bool cancelled;

    uint256 totalEntries;
    address[] participants;
    mapping(address => Participant) participantsMapping;

    uint256 totalRevealed;
    address[] revealers;
    mapping(address => Revealer) revealersMapping;

    function Charity() {
        owner = msg.sender;
    }

    function getOwner() public returns (address) {
        return owner;
    }

    function getTotalParticipants() public returns (uint256) {
        return participants.length;
    }

    function getTotalEntries() public returns (uint256) {
        return totalEntries;
    }

    function getTotalRevealed() public returns (uint256) {
        return totalRevealed;
    }

    function start(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _entryCost,
        uint256 _startTime,
        uint256 _revealTime,
        uint256 _endTime) public
    {
        require(msg.sender == owner); // make sure only we can authorize a new charity
        require(_charity != 0x0);
        require(_charitySplit > 0);
        require(_winnerSplit > 0);
        require(_ownerSplit > 0);
        require(_entryCost > 0);
        require(_startTime >= now && revealTime >= _startTime && _endTime >= _revealTime);

        charity = _charity;
        charitySplit = _charitySplit;
        winnerSplit = _winnerSplit;
        ownerSplit = _ownerSplit;
        entryCost = _entryCost;
        startTime = _startTime;
        revealTime = _revealTime;
        endTime = _endTime;

        // clear out any pre-existing state
        clear();

    }

    function clear() internal {

        // set no winner
        winner = 0;
        // set not cancelled
        cancelled = false;
        // clear out stats
        totalEntries = 0;
        totalRevealed = 0;

        // delete all participants in mapping
        for (uint256 i = 0; i < participants.length; i++) {
            delete participantsMapping[participants[i]];
        }

        // delete all revealers in mapping
        for (uint256 i = 0; i < revealers.length; i++) {
            delete revealersMapping[revealers[i]];
        }

        // delete revealer addresses
        delete revealers;
        // delete participant addresses
        delete participants;

    }

    function participate(bytes32 _hashedRandom) public payable returns (bool) {
        require(msg.sender != owner); // owner cannot participate
        require(now >= startTime && now <= revealTime); // ensure we are after the start but before the reveal
        require(msg.value != 0); // some wei must be sent
        require(_hashedRandom != 0x0); // hashed random cannot be zero
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't participate in a cancelled charity

        address _sender = msg.sender;
        uint256 _wei = msg.value;
        // calculate the number of entries from the wei sent
        uint256 _newEntries = _wei.div(entryCost);
        require(_newEntries > 0); // ensure at least one

        // find existing participant
        Participant _participant = participantsMapping[_sender];
        // some safety checks
        require(_participant.revealedRandom == 0);
        require(_participant.cumulativeEntries == 0);

        // new participant?
        if (_participant.entries == 0 || _participant.hashedRandom == 0x0) {
            // some safety checks
            require(_participant.entries == 0);
            require(_participant.hashedRandom == 0x0);
            _participant.hashedRandom = _hashedRandom;
            participants.push(_sender);
        }

        // add new entries to participant and total
        _participant.entries = _participant.entries.add(_newEntries);
        totalEntries = totalEntries.add(_newEntries);
        // send out participation update
        Participation(_sender, _newEntries, _participant.entries, totalEntries, participantAddresses.length);
        return true;

    }

    function reveal(uint256 _random) public returns (bool) {
        require(msg.sender != owner); // owner cannot reveal
        require(now >= revealTime && now <= endTime); // ensure we are after the reveal but before the end
        require(_random != 0); // random non-zero
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't reveal in a cancelled charity

        // find the original participant
        address _sender = msg.sender;
        Participant _participant = participantsMapping[_sender];
        require(_participant.entries > 0); // make sure they entered
        require(_participant.hashedRandom == sha3(_random, _sender)); // verify random against hashed random

        // create a revealer for this participant
        Revealer _revealer = revealersMapping[_sender];
        require(_revealer.random == 0); // make sure no random set already
        require(_revealer.cumulativeEntries == 0); // safety check

        // track revealers & set random on revealer to consider them revealed
        revealers.push(_sender);
        _revealer.random = _random;
        // update revealed entries count
        totalRevealed = totalRevealed.add(_participant.entries);
        // send out revelation update
        Revelation(_sender, _participant.entries, totalRevealed);
        return true;

    }

    function end() public {
        require(msg.sender == owner); // make sure only we can end a charity
        require(now >= endTime); // a charity can only be ended after the reveal period is over
        require(winner == address(0)); // make sure someone hasn't already won
        require(!cancelled); // we can't end a cancelled charity

        // randomly determine winner address and set in storage
        uint256 _winningRandom = calculateWinningRandom();
        // calculate winning index from this random
        uint256 _winnerIndex = _winningRandom % totalRevealed;
        // set winner
        winner = findWinningRevealerAddress(0, revealers.length - 1, _winnerIndex);

        // get amounts to transfer
        (_charityAmount, _winnerAmount, _ownerAmount) = calculateTransferAmounts();

        // make wei transfers
        charity.transfer(_charityAmount);
        winner.transfer(_winnerAmount);
        owner.transfer(_ownerAmount);

    }

    function calculateWinningRandom() internal returns (uint256) {

        uint256 _cumulativeEntries = 0;
        uint256 _winningRandom = 0;
        // generate winning random from all revealed randoms
        for (uint256 i = 0; i < revealers.length; i++) {

            uint256 _revealerAddress = revealers[i];
            // get the participant for this revealer
            Participant _participant = participantsMapping[_revealerAddress];
            require(_participant.entries > 0); // safety check
            require(_participant.hashedRandom != 0x0); // safety check

            // get the revealer
            Revealer _revealer = revealersMapping[_revealerAddress];
            require(_revealer.random != 0); // safety check
            require(_revealer.cumulativeEntries == 0); // safety check

            // keep track of the sum of revealed entries as we loop
            _cumulativeEntries = _cumulativeEntries.add(_participant.entries);
            _revealer.cumulativeEntries = _cumulativeEntries;
            // xor all randoms together
            _winningRandom = _winningRandom ^ _revealer.random;

        }

        return _winningRandom;

    }

    function findWinningRevealerAddress(uint256 _leftIndex, uint256 _rightIndex, uint256 _winnerIndex) internal returns (Participant) {

        // calculate the mid index (binary search)
        uint256 _midIndex = _leftIndex + ((_rightIndex - _leftIndex) / 2);
        // find the mid revealer
        address _midRevealerAddress = revealers[_midIndex];
        // get next index
        uint256 _nextIndex = _midIndex + 1;

        // we are at the end of the array, the winner is the last revealer
        if (_nextIndex >= revealers.length) {
            return _midRevealerAddress;
        }

        // find the mid and very next revealers
        Revealer _midRevealer = revealersMapping[_midRevealerAddress];
        address _nextRevealerAddress = revealers[_nextIndex];
        Revealer _nextRevealer = revealersMapping[_nextRevealerAddress];

        bool _winnerGTEMid = _winnerIndex >= _midRevealer.cumulativeEntries;
        bool _winnerLTNext = _winnerIndex < _nextRevealer.cumulativeEntries;          
        // we are in range and found the winner!                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
        if (_winnerGTEMid && _winnerLTNext) {
            return _midRevealerAddress;
        }

        // winner index is greater, move right
        if (_winnerGTEMid) {
            return findWinningRevealerAddress(_nextIndex, _rightIndex, _winnerIndex);
        }

        // winner index is less, move left
        return findWinningRevealerAddress(_leftIndex, _midIndex - 1, _winnerIndex);

    }

    function calculateTransferAmounts() internal returns (
        uint256 _charityAmount,
        uint256 _winnerAmount,
        uint256 _ownerAmount)
    {

        // calculate total wei received
        uint256 _totalWei = totalEntries.div(entryRate);
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        _charityAmount = _totalWei.mul(charitySplit).div(100);
        _winnerAmount = _totalWei.mul(winnerSplit).div(100);
        _ownerAmount = _totalWei.mul(ownerSplit).div(100);

    }

    function cancel() public {
        require(msg.sender == owner); // make sure only we can cancel a charity
        require(now >= startTime); // we can cancel at any time
        require(winner == address(0)); // if someone won, we've already sent the money out
        require(!cancelled); // we can't cancel more than once

        // immediately set us to cancelled
        cancelled = true;

        // loop through all participants to refund them
        for (uint256 i = 0; i < participants.length; i++) {

            address _participantAddress = participants[i];
            // get the participant for refund
            Participant _participant = participantsMapping[_participantAddress];
            // this should never happen, but keep moving as we cannot die
            // during cancellation
            if (_participant.entries == 0) {
                continue;
            }

            // calculate refund
            uint256 _wei = _participant.entries.mul(entryCost);
            // send refund
            _participantAddress.transfer(_wei);

        }

    }

}