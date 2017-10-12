pragma solidity ^0.4.4;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract Charity is Ownable {
    using SafeMath for uint256;

    event Participation(
        address indexed participant,
        bytes32 hashedRandom
    );

    event Fund(
        address indexed participant,
        uint256 value,
        uint256 refund,
        uint256 newEntries,
        uint256 totalEntries
    );

    event Revelation(
        address indexed revealer,
        uint256 newRevealedEntries,
        uint256 totalRevealed,
        uint256 totalRevealers
    );

    event Win(
        address indexed winner,
        uint256 charityReward,
        uint256 winnerReward,
        uint256 ownerReward
    );

    event Cancellation(
        address indexed participant,
        uint256 refund
    );

    event Withdrawal(
        address indexed wallet,
        uint256 balance
    );

    struct Participant {
        uint256 entries;
        bytes32 hashedRandom;
        uint256 random;
    }

    modifier neverOwner() {
        require(msg.sender != owner);
        _;
    }

    modifier onlyCharity() {
        require(msg.sender == charity);
        _;
    }

    modifier onlyOwnerOrCharity() {
        require((msg.sender == owner) || (msg.sender == charity));
        _;
    }

    modifier openParticipation() {
        require(charityHashedRandom != 0x0); // safety check
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't participate in a cancelled charity
        _;
    }

    address public charity;
    address public winner;
    uint256 public charitySplit;
    uint256 public winnerSplit;
    uint256 public ownerSplit;
    uint256 public valuePerEntry;
    uint256 public constructTime;
    uint256 public startTime;
    uint256 public revealTime;
    uint256 public endTime;

    bool public cancelled;
    bytes32 public charityHashedRandom;
    uint256 public totalEntries;
    uint256 public totalRevealed;
    address[] public participants;
    address[] public revealers;
    mapping(address => Participant) participantsMapping;
    mapping(address => uint256) balancesMapping;

    function Charity() public {
        // initiall set this charity cancelled
        cancelled = true;
    }

    function totalParticipants() public returns (uint256) {
        return participants.length;
    }

    function totalRevealers() public returns (uint256) {
        return revealers.length;
    }

    function participant(address _address) public returns (
        uint256 _entries,
        bytes32 _hashedRandom,
        uint256 _random)
    {
        Participant storage _participant = participantsMapping[_address];
        _entries = _participant.entries;
        _hashedRandom = _participant.hashedRandom;
        _random = _participant.random;
    }

    function balance(address _address) public returns (uint256) {
        return balancesMapping[_address];
    }

    /**
     * Constructs a new charity. Here we set the charity ethereum wallet address,
     * the percentage cuts for the charity, winner, and owner, the wei of each
     * entry, and the start, reveal, and end times. A new charity can only be
     * started if a winner is chosen from the last charity or the last charity
     * was cancelled.
     */
    function construct(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _valuePerEntry,
        uint256 _startTime,
        uint256 _revealTime,
        uint256 _endTime) public onlyOwner
    {
        require(_charity != 0x0);
        require(_charitySplit != 0);
        require(_winnerSplit != 0);
        require(_ownerSplit != 0);
        require(_valuePerEntry != 0);
        require(_startTime >= now);
        require(_revealTime > _startTime);
        require(_endTime > _revealTime);
        // we can only start a new charity if a winner has been chosen or the last
        // charity was cancelled
        require(winner != address(0) || cancelled);

        charity = _charity;
        charitySplit = _charitySplit;
        winnerSplit = _winnerSplit;
        ownerSplit = _ownerSplit;
        valuePerEntry = _valuePerEntry;
        constructTime = now;
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

        // clear out charity hashed random
        charityHashedRandom = 0x0;
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

        // delete revealer addresses
        delete revealers;
        // delete participant addresses
        delete participants;

    }

    function seed(bytes32 _hashedRandom) public onlyCharity {
        require(now >= constructTime); // ensure we are after construct
        require(now < startTime); // but before the start
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't participate in a cancelled charity
        require(charityHashedRandom == 0x0); // safety check
        require(_hashedRandom != 0x0); // hashed random cannot be zero

        // set the charity's hashed random; this is the final revealed
        // random number used to generate the winning random globally
        charityHashedRandom = _hashedRandom;

    }

    /**
     * Participate in the current charity by contributing randomness to the global
     * selection of a winner. Send a hashed random number N using the following
     * formula: sha3(N, address). This being the SHA3 hash of the random number
     * prepended to the sender's address. Do not forget your random number
     * contribution as this will be required during the random revealation phase
     * to confirm your entries. After participation, send wei to the callback
     * function to receive entries and thereby increase your chances of winning.
     * Participation is only permitted between the start and reaveal times.
     */
    function participate(bytes32 _hashedRandom) public openParticipation neverOwner {
        require(now >= startTime); // ensure we are after the start
        require(now < revealTime); // but before the reveal
        require(_hashedRandom != 0x0); // hashed random cannot be zero

        address _sender = msg.sender;
        // find existing participant
        Participant storage _participant = participantsMapping[_sender];
        require(_participant.entries == 0); // safety check
        require(_participant.hashedRandom == 0x0); // make sure they have not participated
        require(_participant.random == 0); // safety check
        // save hashed random, add to tracked
        _participant.hashedRandom = _hashedRandom;
        participants.push(_sender);

        // send out participation update
        Participation(_sender, _hashedRandom);
    
    }

    /**
     * Fallback function that accepts wei for entries. This will always
     * fail if participate() is not called once first with a hashed random.
     */
    function () public openParticipation neverOwner payable {
        require(now >= startTime); // ensure we are after the start
        require(now < revealTime); // but before the reveal
        require(msg.value > 0); // some money needs to be sent

        address _sender = msg.sender;
        // find existing participant
        Participant storage _participant = participantsMapping[_sender];
        require(_participant.hashedRandom != 0x0); // make sure they participated

        uint256 _value = msg.value;
        // calculate the number of entries from the wei sent
        uint256 _newEntries = _value / valuePerEntry;
        require(_newEntries > 0); // ensure at least one

        // add new entries to participant and total
        _participant.entries += _newEntries;
        totalEntries += _newEntries;

        uint256 _refund = _value % valuePerEntry;
        // refund any excess wei
        if (_refund > 0) {
            balancesMapping[_sender] += _refund;
        }

        // send fund event
        Fund(_sender, _value, _refund, _newEntries, totalEntries);

    }

    /**
     * Reveal your hashed random to the world. This contract will verify that
     * the random number submitted during the participation phase matches
     * this number, confirming all of your entries at once. This procedure
     * can only be completed once. After the revelation period ends, all
     * of these revealed random numbers will be used to deterministically
     * generate a global random number, which will determine the winner.
     */
    function reveal(uint256 _random) public openParticipation neverOwner {
        require(now >= revealTime); // ensure we are after the reveal
        require(now < endTime); // but before the end
        require(bytes32(_random)[0] > 0x8); // random avoids bit-flipping and padding

        // find the original participant
        address _sender = msg.sender;
        Participant storage _participant = participantsMapping[_sender];
        require(_participant.entries > 0); // make sure they entered
        require(_participant.hashedRandom == keccak256(_random, _sender)); // verify random against hashed random
        require(_participant.random == 0); // make sure no random set already

        // set random, track revealer, update stats
        _participant.random = _random;
        revealers.push(_sender);
        totalRevealed += _participant.entries;
        // send out revelation update
        Revelation(_sender, _participant.entries, totalRevealed, revealers.length);

    }

    /**
     * End this charity, choose a winner and disseminate wei according to
     * the split percentages. All of the revealed random numbers will be
     * used to deterministically generate a global random number. A binary
     * search is performed with this random number to find the actual
     * winner with the weight of their entries used in random selection.
     * Anyone can perform this operation to ensure that winnings can
     * always be distributed without requiring the owner.
     */
    function end(uint256 _charityRandom) public openParticipation onlyCharity {
        require(now >= endTime); // a charity can only be ended after the reveal period is over
        require(charityHashedRandom == keccak256(_charityRandom, msg.sender)); // verify charity's hashed random

        uint256[] memory _cumulatives = new uint256[](revealers.length);
        // calculate social random & index from this random, set winner
        uint256 _winningRandom = calculateWinningRandom(_charityRandom, _cumulatives);
        uint256 _winnerIndex = _winningRandom % totalRevealed;
        winner = findWinningRevealerAddress(0, revealers.length - 1, _winnerIndex, _cumulatives);

        uint256 _ownerReward;
        uint256 _charityReward;
        uint256 _winnerReward;
        // get owner, winner, and charity refunds
        (_charityReward, _winnerReward, _ownerReward) = calculateRewards();
        // add rewards to existing balances
        balancesMapping[charity] += _charityReward;
        balancesMapping[winner] += _winnerReward;
        balancesMapping[owner] += _ownerReward;

        // send out win event
        Win(winner, _charityReward, _winnerReward, _ownerReward);

    }

    /**
     * Using all of the revealed random numbers, deterministically generate
     * a global winning random by XORing them together. This procedure will
     * also set up a discrete cumulative density function (CDF) using the
     * number of entries for each participant as the random selection weight.
     */
    function calculateWinningRandom(
        uint256 _charityRandom,
        uint256[] _cumulatives) internal returns (uint256)
    {

        uint256 _cumulative = 0;
        uint256 _winningRandom = 0;
        // generate winning random from all revealed randoms
        for (uint256 revealerIndex = 0; revealerIndex < revealers.length; revealerIndex++) {

            address _revealerAddress = revealers[revealerIndex];
            // get the participant for this revealer
            Participant memory _participant = participantsMapping[_revealerAddress];
            require(_participant.entries > 0); // safety check
            require(_participant.hashedRandom != 0x0); // safety check
            require(_participant.random != 0); // safety check

            // set lower cumulative bound
            _cumulatives[revealerIndex] = _cumulative;
            _cumulative += _participant.entries;
            // xor all randoms together
            _winningRandom = _winningRandom ^ _participant.random;

        }

        // the charity's initial random has the ultimate randomization effect
        return _winningRandom ^ _charityRandom;

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
        uint256 _winnerIndex,
        uint256[] _cumulatives) internal returns (address)
    {

        // the winner is the last revealer!
        if (_leftIndex == _rightIndex) {
            return revealers[_leftIndex];
        }

        // calculate the mid index  for binary search, find the mid revealer, get next sequential index
        uint256 _midIndex = _leftIndex + ((_rightIndex - _leftIndex) / 2);
        address _midRevealerAddress = revealers[_midIndex];
        uint256 _nextIndex = _midIndex + 1;
        // find the mid and very next revealer cumulatives
        uint256 _midRevealerCumulative = _cumulatives[_midIndex];
        uint256 _nextRevealerCumulative = _cumulatives[_nextIndex];
        // see if we are in range of winner index
        bool _winnerGTEMid = _winnerIndex >= _midRevealerCumulative;
        bool _winnerLTNext = _winnerIndex < _nextRevealerCumulative;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
        if (_winnerGTEMid) {
            // we are in range, winner found!
            if (_winnerLTNext) { return _midRevealerAddress; }
            // winner is greater, move right
            return findWinningRevealerAddress(_nextIndex, _rightIndex, _winnerIndex, _cumulatives);
        }
        // winner is less, move left
        return findWinningRevealerAddress(_leftIndex, _midIndex, _winnerIndex, _cumulatives);

    }

    /**
     * Calculate refund amounts to the charity, winner, and owner
     * given the percentage splits specified at charity start.
     */
    function calculateRewards() internal returns (
        uint256 _charityReward,
        uint256 _winnerReward,
        uint256 _ownerReward)
    {
        // calculate total wei received
        uint256 _totalValue = totalEntries * valuePerEntry;
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        _charityReward = _totalValue * charitySplit / 100;
        _winnerReward = _totalValue * winnerSplit / 100;
        _ownerReward = _totalValue * ownerSplit / 100;
    }

    /**
     * Cancels a charity early, before a winner is chosen, and distribute
     * all received wei back to the original participants. This procedure
     * must exist in case of catostropic failure to return wei.
     */
    function cancel() public onlyOwnerOrCharity {
        require(winner == address(0)); // if someone won, we've already sent the money out
        require(!cancelled); // we can't cancel more than once

        // immediately set us to cancelled
        cancelled = true;

        // loop through all participants to refund them
        for (uint256 participantsIndex = 0; participantsIndex < participants.length; participantsIndex++) {
            address _participantAddress = participants[participantsIndex];
            // get the participant & refund
            Participant memory _participant = participantsMapping[_participantAddress];
            balancesMapping[_participantAddress] += _participant.entries * valuePerEntry;
            // send out cancellation event
            Cancellation(_participantAddress, balancesMapping[_participantAddress]);
        }

    }

    /**
     * This is the only method for getting funds out of the contract. All
     * winnings and refunds are transferred in this way.
     */
    function withdraw() public {

        address _sender = msg.sender;
        // determine where to find the refund amount
        uint256 _balance = balancesMapping[_sender];
        // execute the refund if we have one
        if (_balance > 0) {
            _sender.transfer(_balance);
            // send withdrawal event
            Withdrawal(_sender, _balance);
        }

    }

}