pragma solidity ^0.4.4;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract Charity is Ownable {
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
        uint256 totalRevealed,
        uint256 totalRevealers);

    event Win(
        address indexed winner,
        uint256 charityAmount,
        uint256 winnerAmount,
        uint256 ownerAmount);

    event Cancellation();

    struct Participant {
        uint256 entries;
        bytes32 hashedRandom;
    }

    struct Revealer {
        uint256 random;
        uint256 cumulativeEntries;
    }

    address public charity;
    address public winner;
    uint256 public charitySplit;
    uint256 public winnerSplit;
    uint256 public ownerSplit;
    uint256 public weiPerEntry;
    uint256 public startTime;
    uint256 public revealTime;
    uint256 public endTime;
    bool public cancelled;

    uint256 public totalEntries;
    address[] public participants;
    mapping(address => Participant) public participantsMapping;

    uint256 public totalRevealed;
    address[] public revealers;
    mapping(address => Revealer) public revealersMapping;

    function Charity() {
        // initiall set this charity cancelled
        cancelled = true;
    }

    function totalParticipants() public returns (uint256) {
        return participants.length;
    }

    function totalRevealers() public returns (uint256) {
        return revealers.length;
    }

    /**
     * Starts a new charity. Here we set the charity ethereum wallet address,
     * the percentage cuts for the charity, winner, and owner, the wei of each
     * entry, and the start, reveal, and end times. A new charity can only be
     * started if a winner is chosen from the last charity or the last charity
     * was cancelled.
     */
    function start(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _weiPerEntry,
        uint256 _startTime,
        uint256 _revealTime,
        uint256 _endTime) public onlyOwner
    {
        require(_charity != 0x0);
        require(_charitySplit != 0);
        require(_winnerSplit != 0);
        require(_ownerSplit != 0);
        require(_weiPerEntry != 0);
        require(_startTime >= now && _revealTime >= _startTime && _endTime >= _revealTime);
        // we can only start a new charity if a winner has been chosen or the last
        // charity was cancelled
        require(winner != address(0) || cancelled);

        charity = _charity;
        charitySplit = _charitySplit;
        winnerSplit = _winnerSplit;
        ownerSplit = _ownerSplit;
        weiPerEntry = _weiPerEntry;
        startTime = _startTime;
        revealTime = _revealTime;
        endTime = _endTime;

        // clear out any pre-existing state
        clear();

    }

    /**
     * Clears blockchain storage elements to prepare for a new charity.
     */
    function clear() internal {

        // set no winner
        winner = address(0);
        // set not cancelled
        cancelled = false;
        // clear out stats
        totalEntries = 0;
        totalRevealed = 0;

        // delete all participants in mapping
        for (uint256 participantsIndex = 0; participantsIndex < participants.length; participantsIndex++) {
            delete participantsMapping[participants[participantsIndex]];
        }

        // delete all revealers in mapping
        for (uint256 revealersIndex = 0; revealersIndex < revealers.length; revealersIndex++) {
            delete revealersMapping[revealers[revealersIndex]];
        }

        // delete revealer addresses
        delete revealers;
        // delete participant addresses
        delete participants;

    }

    /**
     * Fallback convenience function for accepting wei for additional entries
     * after a hashed random was initially submitted. This will always fail if
     * participate() is not called at least once with a hashed random.
     */
    function () public payable {
        participate(0x0);
    }

    /**
     * Participate in the current charity. First, send a hashed random number N
     * using the following formula: sha3(N, address). This being the SHA3 hash
     * of the random number prepended to the sender's address. Do not forget your
     * random number as this will be required during the reveal phase to confirm
     * your entries. You can continue to send wei to obtain additional entries by
     * sending 0 for hashed random. Participation is only permitted from the
     * start and reaveal times.
     */
    function participate(bytes32 _hashedRandom) public payable {
        require(msg.sender != owner); // owner cannot participate
        require(now >= startTime && now <= revealTime); // ensure we are after the start but before the reveal
        require(msg.value != 0); // some wei must be sent
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't participate in a cancelled charity

        address _sender = msg.sender;
        uint256 _wei = msg.value;
        // calculate the number of entries from the wei sent
        uint256 _newEntries = _wei.div(weiPerEntry);
        require(_newEntries > 0); // ensure at least one

        // find existing participant
        Participant memory _participant = participantsMapping[_sender];
        // new participant?
        if (_participant.entries == 0 || _participant.hashedRandom == 0x0) {
            require(_hashedRandom != 0x0); // hashed random cannot be zero
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
        Participation(_sender, _newEntries, _participant.entries, totalEntries, participants.length);

    }

    /**
     * Reveal your hashed random to the world. This contract will verify that
     * the random number submitted during the participation phase matches
     * this number, confirming all of your entries at once. This procedure
     * can only be completed once. After the revelation period ends, all
     * of these revealed random numbers will be used to deterministically
     * generate a global random number, which will determine the winner.
     */
    function reveal(uint256 _random) public {
        require(msg.sender != owner); // owner cannot reveal
        require(now >= revealTime && now <= endTime); // ensure we are after the reveal but before the end
        require(_random != 0); // random non-zero
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't reveal in a cancelled charity

        // find the original participant
        address _sender = msg.sender;
        Participant memory _participant = participantsMapping[_sender];
        require(_participant.entries > 0); // make sure they entered
        require(_participant.hashedRandom == sha3(_random, _sender)); // verify random against hashed random

        // create a revealer for this participant
        Revealer memory _revealer = revealersMapping[_sender];
        require(_revealer.random == 0); // make sure no random set already
        require(_revealer.cumulativeEntries == 0); // safety check

        // track revealers & set random on revealer to consider them revealed
        revealers.push(_sender);
        _revealer.random = _random;
        // update revealed entries count
        totalRevealed = totalRevealed.add(_participant.entries);
        // send out revelation update
        Revelation(_sender, _participant.entries, totalRevealed, revealers.length);

    }

    /**
     * End this charity, choose a winner and disseminate wei according to
     * the split percentages. All of the revealed random numbers will be
     * used to deterministically generate a global random number. A binary
     * search is performed with this random number to find the actual
     * winner with the weight of their entries used in random selection.
     */
    function end() public onlyOwner {
        require(now >= endTime); // a charity can only be ended after the reveal period is over
        require(winner == address(0)); // make sure someone hasn't already won
        require(!cancelled); // we can't end a cancelled charity

        // randomly determine winner address and set in storage
        uint256 _winningRandom = calculateWinningRandom();
        // calculate winning index from this random
        uint256 _winnerIndex = _winningRandom % totalRevealed;
        // set winner
        winner = findWinningRevealerAddress(0, revealers.length - 1, _winnerIndex);

        uint256 _charityAmount;
        uint256 _winnerAmount;
        uint256 _ownerAmount;
        // get amounts to transfer
        (_charityAmount, _winnerAmount, _ownerAmount) = calculateTransferAmounts();

        // make wei transfers
        charity.transfer(_charityAmount);
        winner.transfer(_winnerAmount);
        owner.transfer(_ownerAmount);

        // send out win event
        Win(winner, _charityAmount, _winnerAmount, _ownerAmount);

    }

    /**
     * Using all of the revealed random numbers, deterministically generate
     * a global winning random by XORing them together. This procedure will
     * also set up a discrete cumulative density function (CDF) using the
     * number of entries for each participant as the random selection weight.
     */
    function calculateWinningRandom() internal returns (uint256) {

        uint256 _cumulativeEntries = 0;
        uint256 _winningRandom = 0;
        // generate winning random from all revealed randoms
        for (uint256 revealerIndex = 0; revealerIndex < revealers.length; revealerIndex++) {

            address _revealerAddress = revealers[revealerIndex];
            // get the participant for this revealer
            Participant memory _participant = participantsMapping[_revealerAddress];
            require(_participant.entries > 0); // safety check
            require(_participant.hashedRandom != 0x0); // safety check

            // get the revealer
            Revealer memory _revealer = revealersMapping[_revealerAddress];
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

    /**
     * Finds the winning revealer address amongst the participants who
     * revealed their random number to us. The winner index is a random
     * number that was chosen between 0 and the sum of the weights
     * (total entries). A binary search is then performed amongst the
     * revealers to find a revealer that falls in an interval of the
     * following:
     * revealer cumulative entries
     * <= winner index
     * < next revealer cumulative entries
     */
    function findWinningRevealerAddress(
        uint256 _leftIndex,
        uint256 _rightIndex,
        uint256 _winnerIndex) internal returns (address)
    {

        // calculate the mid index  for binary search, find the mid revealer, get next sequential index
        uint256 _midIndex = _leftIndex + ((_rightIndex - _leftIndex) / 2);
        address _midRevealerAddress = revealers[_midIndex];
        uint256 _nextIndex = _midIndex + 1;

        // we are at the end of the array, the winner is the last revealer
        if (_nextIndex >= revealers.length) {
            return _midRevealerAddress;
        }

        // find the mid and very next revealers
        Revealer memory _midRevealer = revealersMapping[_midRevealerAddress];
        address _nextRevealerAddress = revealers[_nextIndex];
        Revealer memory _nextRevealer = revealersMapping[_nextRevealerAddress];

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

    /**
     * Calculate transfer amounts to the charity, winner, and owner
     * given the percentage splits specified at charity start.
     */
    function calculateTransferAmounts() internal returns (
        uint256 _charityAmount,
        uint256 _winnerAmount,
        uint256 _ownerAmount)
    {

        // calculate total wei received
        uint256 _totalWei = totalEntries.div(weiPerEntry);
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        _charityAmount = _totalWei.mul(charitySplit).div(100);
        _winnerAmount = _totalWei.mul(winnerSplit).div(100);
        _ownerAmount = _totalWei.mul(ownerSplit).div(100);

    }

    /**
     * Cancels a charity early, before a winner is chosen, and distribute
     * all received wei back to the original participants. This procedure
     * must exist in case of catostropic failure to return wei.
     */
    function cancel() public onlyOwner {
        require(now >= startTime); // we can cancel at any time
        require(winner == address(0)); // if someone won, we've already sent the money out
        require(!cancelled); // we can't cancel more than once

        // immediately set us to cancelled
        cancelled = true;

        // loop through all participants to refund them
        for (uint256 participantsIndex = 0; participantsIndex < participants.length; participantsIndex++) {

            address _participantAddress = participants[participantsIndex];
            // get the participant for refund
            Participant memory _participant = participantsMapping[_participantAddress];
            // this should never happen, but keep moving as we cannot die
            // during cancellation
            if (_participant.entries == 0) {
                continue;
            }

            // calculate refund
            uint256 _wei = _participant.entries.mul(weiPerEntry);
            // send refund
            _participantAddress.transfer(_wei);

        }

        // send out cancellation event
        Cancellation();

    }

}