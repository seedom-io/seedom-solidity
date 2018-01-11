pragma solidity ^0.4.4;

contract Seedom {

    event Kickoff(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _valuePerEntry,
        uint256 _kickoffTime,
        uint256 _revealTime,
        uint256 _endTime,
        uint256 _expireTime
    );

    event Seed(
        bytes32 _hashedRandom
    );

    event Participation(
        address _participant,
        bytes32 _hashedRandom
    );

    event Raise(
        address _participant,
        uint256 _value,
        uint256 _refund,
        uint256 _newEntries,
        uint256 _totalEntries
    );

    event Revelation(
        address _revealer,
        uint256 _newRevealedEntries,
        uint256 _totalRevealed,
        uint256 _totalRevealers
    );

    event WinInput(
        uint256 _winningRandom,
        uint256 _winningEntryIndex
    );

    event WinSearch(
        uint256 _leftIndex,
        uint256 _rightIndex,
        uint256 _midIndex,
        address _midRevealerAddress,
        uint256 _midRevealerCumulative,
        uint256 _nextIndex,
        uint256 _nextRevealerCumulative
    );

    event Win(
        address _winner,
        uint256 _random,
        uint256 _charityReward,
        uint256 _winnerReward,
        uint256 _ownerReward
    );

    event Cancellation(
        address _participant,
        uint256 _refund
    );

    event Withdrawal(
        address _wallet,
        uint256 _balance
    );

    struct Raiser {
        address _charity;
        uint256 _charitySplit;
        uint256 _winnerSplit;
        uint256 _ownerSplit;
        uint256 _valuePerEntry;
        uint256 _kickoffTime;
        uint256 _revealTime;
        uint256 _endTime;
        uint256 _expireTime;
    }

    struct Participant {
        uint256 _entries;
        bytes32 _hashedRandom;
        uint256 _random;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier neverOwner() {
        require(msg.sender != owner);
        _;
    }

    modifier onlyCharity() {
        require(msg.sender == raiser._charity);
        _;
    }

    modifier raiserOngoing() {
        require(charityHashedRandom != 0x0); // ensure charity seed
        require(winner == address(0)); // ensure no winner
        require(!cancelled); // we can't participate if raiser cancelled
        _;
    }

    address public owner;
    Raiser raiser;
    address public winner;
    bool public cancelled;
    bytes32 public charityHashedRandom;
    uint256 public totalEntries;
    uint256 public totalRevealed;
    address[] public participants;
    address[] public revealers;
    mapping(address => Participant) participantsMapping;
    mapping(address => uint256) balancesMapping;

    function Seedom() public {
        // set owner
        owner = msg.sender;
        // initiall set us cancelled
        cancelled = true;
    }

    function timestamp() public view returns (uint256) {
        return now;
    }

    function currentRaiser() public view returns (
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _valuePerEntry,
        uint256 _kickoffTime,
        uint256 _revealTime,
        uint256 _endTime,
        uint256 _expireTime
    ) {
        _charity = raiser._charity;
        _charitySplit = raiser._charitySplit;
        _winnerSplit = raiser._winnerSplit;
        _ownerSplit = raiser._ownerSplit;
        _valuePerEntry = raiser._valuePerEntry;
        _kickoffTime = raiser._kickoffTime;
        _revealTime = raiser._revealTime;
        _endTime = raiser._endTime;
        _expireTime = raiser._expireTime;
    }

    function totalParticipants() public view returns (uint256) {
        return participants.length;
    }

    function totalRevealers() public view returns (uint256) {
        return revealers.length;
    }

    function participant(address _address) public view returns (
        uint256 _entries,
        bytes32 _hashedRandom,
        uint256 _random)
    {
        Participant memory _participant = participantsMapping[_address];
        _entries = _participant._entries;
        _hashedRandom = _participant._hashedRandom;
        _random = _participant._random;
    }

    function balance(address _address) public view returns (uint256) {
        return balancesMapping[_address];
    }

    // Kicks off a new raiser. Here we set the charity's ethereum wallet address, the percentage
    // splits, the wei of each entry, and several event times. A new raiser can only be kicked off
    // if a winner is chosen or the last raiser is cancelled.
    function kickoff(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _valuePerEntry,
        uint256 _revealTime,
        uint256 _endTime,
        uint256 _expireTime) public onlyOwner
    {
        require(_charity != 0x0);
        require(_charitySplit != 0);
        require(_winnerSplit != 0);
        require(_ownerSplit != 0);
        require(_valuePerEntry != 0);
        require(_revealTime >= now); // time for the charity to seed and others to participate
        require(_endTime > _revealTime); // time for participants to reveal their randoms
        require(_expireTime > _endTime); // time for charity to end the raiser
        require(winner != address(0) || cancelled);

        // clear out any pre-existing state
        clear();
        // store a new raiser on chain
        raiser = Raiser(
            _charity,
            _charitySplit,
            _winnerSplit,
            _ownerSplit,
            _valuePerEntry,
            now,
            _revealTime,
            _endTime,
            _expireTime
        );

        // send out event
        Kickoff(
            _charity,
            _charitySplit,
            _winnerSplit,
            _ownerSplit,
            _valuePerEntry,
            raiser._kickoffTime,
            _revealTime,
            _endTime,
            _expireTime
        );

    }

    // Clears state elements to prepare for a new raiser.
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

    // Used by the charity to officially begin their raiser. The charity supplies the first hashed
    // random, which is kept secret and revealed by the charity in end().
    function seed(bytes32 _hashedRandom) public onlyCharity {
        require(now >= raiser._kickoffTime); // ensure we have kicked off
        require(now < raiser._revealTime); // but before the reveal
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't participate in a cancelled charity
        require(charityHashedRandom == 0x0); // safety check
        require(_hashedRandom != 0x0); // hashed random cannot be zero

        charityHashedRandom = _hashedRandom;
        // broadcast seed
        Seed(_hashedRandom);

    }

    // Participate in the current raiser by contributing randomness to the global selection of a
    // winner. Send a hashed random value N using the following formula: sha3(N, address). Do not
    // forget your random value as this will be required during the random revealation phase to
    // confirm your entries. After participation, send wei to the callback function to receive
    // additional entries. Participation is only permitted between seed() and the reveal time.
    function participate(bytes32 _hashedRandom) public raiserOngoing neverOwner payable {
        require(now < raiser._revealTime); // but before the reveal
        require(_hashedRandom != 0x0); // hashed random cannot be zero

        // find existing participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant._entries == 0); // safety check
        require(_participant._hashedRandom == 0x0); // make sure they have not participated
        require(_participant._random == 0); // safety check
        // save hashed random, add to tracked
        _participant._hashedRandom = _hashedRandom;
        participants.push(msg.sender);
        // send out participation update
        Participation(msg.sender, _hashedRandom);
        // did we also receive wei? if so, raise
        if (msg.value > 0) {
            raise(_participant);
        }
    
    }

    // Called by participate() and the fallback function for obtaining additional entries.
    function raise(Participant storage _participant) internal {

        // calculate the number of entries from the wei sent
        uint256 _newEntries = msg.value / raiser._valuePerEntry;
        // if we have any, update participant and total
        if (_newEntries > 0) {
            _participant._entries += _newEntries;
            totalEntries += _newEntries;
        }

        // calculate partial entry refund
        uint256 _refund = msg.value % raiser._valuePerEntry;
        // send raise event
        Raise(msg.sender, msg.value, _refund, _newEntries, totalEntries);
        // refund any excess wei immediately (partial entry)
        // keep this at end to prevent re-entrancy!
        if (_refund > 0) {
            msg.sender.transfer(_refund);
        }

    }

    // Fallback function that accepts wei for additional entries. This will always fail if
    // participate() is not called once with a hashed random.
    function () public raiserOngoing neverOwner payable {
        require(now < raiser._revealTime); // but before the reveal
        require(msg.value > 0); // some money needs to be sent

        // find existing participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant._hashedRandom != 0x0); // make sure they participated
        // forward to raise
        raise(_participant);

    }

    // Reveal your hashed random to the world. The random is hashed and verified to match the
    // hashed random provided during the participation phase. All entries are confirmed with a
    // single call to reveal() and can only be completed once.
    function reveal(uint256 _random) public raiserOngoing neverOwner {
        require(now >= raiser._revealTime); // ensure we are in reveal phase
        require(now < raiser._endTime); // but before the end
        require(_random != 0);

        // find the original participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant._entries > 0); // make sure they entered
        require(_participant._hashedRandom == keccak256(_random, msg.sender)); // verify random against hashed random
        require(_participant._random == 0); // make sure no random set already
        // set random, track revealer, update stats
        _participant._random = _random;
        revealers.push(msg.sender);
        totalRevealed += _participant._entries;
        // send out revelation update
        Revelation(msg.sender, _participant._entries, totalRevealed, revealers.length);

    }

    // Ends this raiser, chooses a winning supporter, and disseminates wei according to the split
    // percentages provided during kickoff. All of the revealed randoms and the charity's final
    // revealed random will be used to deterministically generate a universal random value. This
    // method can only be performed by the charity after the end time.
    function end(uint256 _charityRandom) public raiserOngoing onlyCharity {
        require(now >= raiser._endTime); // end can occur only after ent time
        require(charityHashedRandom == keccak256(_charityRandom, msg.sender)); // verify charity's hashed random

        uint256[] memory _cumulatives = new uint256[](revealers.length);
        // calculate crowdsourced random & entry index from this random
        uint256 _crowdsourcedRandom = crowdsourceRandom(_charityRandom, _cumulatives);
        uint256 _entryIndex = _crowdsourcedRandom % totalRevealed;
        // send out winning input
        WinInput(_crowdsourcedRandom, _entryIndex);
        // find winner & coresponding participant
        winner = findWinnerAddress(_entryIndex, _cumulatives);
        Participant memory _participant = participantsMapping[winner];

        uint256 _ownerReward;
        uint256 _charityReward;
        uint256 _winnerReward;
        // get owner, winner, and charity refunds
        (_charityReward, _winnerReward, _ownerReward) = calculateRewards();
        // add rewards to existing balances
        balancesMapping[raiser._charity] += _charityReward;
        balancesMapping[winner] += _winnerReward;
        balancesMapping[owner] += _ownerReward;
        // send out win event
        Win(winner, _participant._random, _charityReward, _winnerReward, _ownerReward);

    }

    // Using all of the revealed random values, including the charity's final random,
    // deterministically generate a universal random by XORing them together. This procedure
    // will also set up a discrete cumulative density function (CDF) using the number of entries
    // for each participant.
    function crowdsourceRandom(
        uint256 _charityRandom,
        uint256[] memory _cumulatives) internal view returns (uint256)
    {

        uint256 _cumulative = 0;
        uint256 _crowdsourcedRandom = 0;
        address _revealerAddress;
        Participant memory _participant;
        // generate random from all revealed randoms
        for (uint256 revealerIndex = 0; revealerIndex < revealers.length; revealerIndex++) {

            _revealerAddress = revealers[revealerIndex];
            // get the participant for this revealer
            _participant = participantsMapping[_revealerAddress];
            require(_participant._entries > 0); // safety check
            require(_participant._hashedRandom != 0x0); // safety check
            require(_participant._random != 0); // safety check
            // set lower cumulative bound
            _cumulatives[revealerIndex] = _cumulative;
            _cumulative += _participant._entries;
            // xor all randoms together
            _crowdsourcedRandom = _crowdsourcedRandom ^ _participant._random;

        }

        // the charity's initial random has the ultimate randomization effect
        return _crowdsourcedRandom ^ _charityRandom;

    }

    // Finds the winning supporter revealer address amongst the participants who revealed their
    // random number to the contract. The winner index is a crowdsourced random number that is
    // chosen between 0 and the sum of the weights (total entries). A binary search is then
    // performed amongst the revealers to find a revealer that falls in the following interval:
    // (revealer cumulative entries <= winner index < next revealer cumulative entries)
    function findWinnerAddress(
        uint256 _entryIndex,
        uint256[] memory _cumulatives) internal returns (address)
    {
        uint256 _leftIndex = 0;
        uint256 _rightIndex = revealers.length - 1;
        uint256 _midIndex;
        uint256 _nextIndex;
        address _midRevealerAddress;
        uint256 _midRevealerCumulative;
        uint256 _nextRevealerCumulative;
        // loop until revealer found
        while (true) {

            // the winner is the last revealer! (edge case)
            if (_leftIndex == _rightIndex) {
                return revealers[_leftIndex];
            }

            // calculate the mid index  for binary search, find the mid revealer, get next sequential index
            _midIndex = _leftIndex + ((_rightIndex - _leftIndex) / 2);
            _midRevealerAddress = revealers[_midIndex];
            _nextIndex = _midIndex + 1;
            // find the mid and very next revealer cumulatives
            _midRevealerCumulative = _cumulatives[_midIndex];
            _nextRevealerCumulative = _cumulatives[_nextIndex];
            // send out search progress
            WinSearch(
                _leftIndex,
                _rightIndex,
                _midIndex,
                _midRevealerAddress,
                _midRevealerCumulative,
                _nextIndex,
                _nextRevealerCumulative
            );

            // binary search
            if (_entryIndex >= _midRevealerCumulative) {
                if (_entryIndex < _nextRevealerCumulative) {
                    // we are in range, winner found!
                    return _midRevealerAddress;
                }
                // winner is greater, move right
                _leftIndex = _nextIndex;
            } else {
                // winner is less, move left
                _rightIndex = _midIndex;
            }

        }

    }

    // Calculate reward wei to the charity, winner, and owner given the percentage splits specified
    // at kickoff.
    function calculateRewards() internal view returns (
        uint256 _charityReward,
        uint256 _winnerReward,
        uint256 _ownerReward)
    {
        // calculate total wei received
        uint256 _totalValue = totalEntries * raiser._valuePerEntry;
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        _charityReward = _totalValue * raiser._charitySplit / 100;
        _winnerReward = _totalValue * raiser._winnerSplit / 100;
        _ownerReward = _totalValue * raiser._ownerSplit / 100;
    }

    // Cancels a raiser early, before a winning supporter is chosen, allocating wei back to the
    // original holders through a mapping of balances, which must be withdrawn from. It can only be
    // executed by the owner or charity before a winning supporter is chosen. After the expire
    // time, if the owner or charity has not cancelled and a winning supporter has not been chosen,
    // this function becomes open to everyone as a final safeguard.
    function cancel() public {
        require(winner == address(0)); // if someone won, we've already sent the money out
        require(!cancelled); // we can't cancel more than once
        if ((msg.sender != owner) && (msg.sender != raiser._charity)) {
            require(now >= raiser._expireTime);
        }

        // immediately set us to cancelled
        cancelled = true;

        address _participantAddress;
        Participant memory _participant;
        // loop through all participants to refund them
        for (uint256 participantsIndex = 0; participantsIndex < participants.length; participantsIndex++) {
            // get the participant & refund
            _participantAddress = participants[participantsIndex];
            _participant = participantsMapping[_participantAddress];
            balancesMapping[_participantAddress] += _participant._entries * raiser._valuePerEntry;
            // send out cancellation event
            Cancellation(_participantAddress, balancesMapping[_participantAddress]);
        }

    }

    // This is the only method for getting wei out of the contract. All rewards and refunds
    // (due to cancellation) are withdrawn in this way.
    function withdraw() public {
        // determine where to find the refund amount
        uint256 _balance = balancesMapping[msg.sender];
        // fail if no balance
        require(_balance > 0);
        // set balance to zero
        balancesMapping[msg.sender] = 0;
        // send withdrawal event
        Withdrawal(msg.sender, _balance);
        // execute the refund if we have one
        // keep this at end to prevent re-entrancy!
        msg.sender.transfer(_balance);
    }

}