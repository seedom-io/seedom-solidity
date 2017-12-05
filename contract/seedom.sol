pragma solidity ^0.4.4;

contract Seedom {

    event Kickoff(
        address charity,
        uint256 charitySplit,
        uint256 winnerSplit,
        uint256 ownerSplit,
        uint256 valuePerEntry,
        uint256 kickoffTime,
        uint256 revealTime,
        uint256 endTime,
        uint256 expireTime
    );

    event Participation(
        address indexed participant,
        bytes32 hashedRandom
    );

    event Raise(
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

    event WinningInput(
        uint256 winningRandom,
        uint256 winningEntryIndex
    );

    event WinnerSearch(
        uint256 leftIndex,
        uint256 rightIndex,
        uint256 midIndex,
        address midRevealerAddress,
        uint256 midRevealerCumulative,
        uint256 nextIndex,
        uint256 nextRevealerCumulative
    );

    event Win(
        address indexed winner,
        uint256 random,
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

    struct Raiser {
        address charity;
        uint256 charitySplit;
        uint256 winnerSplit;
        uint256 ownerSplit;
        uint256 valuePerEntry;
        uint256 kickoffTime;
        uint256 revealTime;
        uint256 endTime;
        uint256 expireTime;
    }

    struct Participant {
        uint256 entries;
        bytes32 hashedRandom;
        uint256 random;
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
        require(msg.sender == raiser.charity);
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
        _charity = raiser.charity;
        _charitySplit = raiser.charitySplit;
        _winnerSplit = raiser.winnerSplit;
        _ownerSplit = raiser.ownerSplit;
        _valuePerEntry = raiser.valuePerEntry;
        _kickoffTime = raiser.kickoffTime;
        _revealTime = raiser.revealTime;
        _endTime = raiser.endTime;
        _expireTime = raiser.expireTime;
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
        _entries = _participant.entries;
        _hashedRandom = _participant.hashedRandom;
        _random = _participant.random;
    }

    function balance(address _address) public view returns (uint256) {
        return balancesMapping[_address];
    }

    /**
     * Kicks off a new raiser. Here we set the charity ethereum wallet
     * address, the percentage cuts for the charity, winner, and owner, the wei
     * of each entry, and the reveal, end, and expire times. A new raiser
     * can only be kicked off if a winner is chosen from the current raiser
     * or the current raiser is cancelled.
     */
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
        require(_expireTime > _endTime); // time for charity to end everything (or community after expire)
        // we can only start a new raiser if a winner has been 
        // chosen or the last raiser was cancelled
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
            raiser.kickoffTime,
            _revealTime,
            _endTime,
            _expireTime
        );

    }

    /**
     * Clears blockchain storage elements to prepare for a new raiser.
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

    /**
    * Used by the charity to officially begin the raiser. The charity
    * supplies the first hashed random, which is revealed by the charity
    * in end() to alter the community revealed pool of randoms.
    */
    function seed(bytes32 _hashedRandom) public onlyCharity {
        require(now >= raiser.kickoffTime); // ensure we are in kick phase
        require(now < raiser.revealTime); // but before the reveal
        require(winner == address(0)); // safety check
        require(!cancelled); // we can't participate in a cancelled charity
        require(charityHashedRandom == 0x0); // safety check
        require(_hashedRandom != 0x0); // hashed random cannot be zero

        // set the charity's hashed random; this is the final revealed
        // random number used to generate the winning random globally
        charityHashedRandom = _hashedRandom;

    }

    /**
     * Participate in the current raiser by contributing randomness to the
     * global selection of a winner. Send a hashed random number N using the
     * following formula: sha3(N, address). This being the SHA3 hash of the
     * random number prepended to the sender's address. Do not forget your
     * random number contribution as this will be required during the random
     * revealation phase to confirm your entries. After participation, send wei
     * to the callback function to receive entries and thereby increase your
     * chances of winning. Participation is only permitted between seed and
     * reveal.
     */
    function participate(bytes32 _hashedRandom) public raiserOngoing neverOwner payable {
        require(now < raiser.revealTime); // but before the reveal
        require(_hashedRandom != 0x0); // hashed random cannot be zero

        // find existing participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant.entries == 0); // safety check
        require(_participant.hashedRandom == 0x0); // make sure they have not participated
        require(_participant.random == 0); // safety check
        // save hashed random, add to tracked
        _participant.hashedRandom = _hashedRandom;
        participants.push(msg.sender);
        // send out participation update
        Participation(msg.sender, _hashedRandom);
        // did we also receive wei? if so, raise
        if (msg.value > 0) {
            raise(_participant);
        }
    
    }

    /**
     * Internal function called by participate and the fallback function
     * for submitting entries initially during participation or several
     * times after participation through this fallback function.
     */
    function raise(Participant storage _participant) internal {

        // calculate the number of entries from the wei sent
        uint256 _newEntries = msg.value / raiser.valuePerEntry;
        // if we have any, update participant and total
        if (_newEntries > 0) {
            _participant.entries += _newEntries;
            totalEntries += _newEntries;
        }

        // calculate partial entry refund
        uint256 _refund = msg.value % raiser.valuePerEntry;
        // send raise event
        Raise(msg.sender, msg.value, _refund, _newEntries, totalEntries);
        // refund any excess wei immediately (partial entry)
        // keep this at end to prevent re-entrancy!
        if (_refund > 0) {
            msg.sender.transfer(_refund);
        }

    }

    /**
     * Fallback function that accepts wei for entries. This will always
     * fail if participate() is not called once first with a hashed random.
     */
    function () public raiserOngoing neverOwner payable {
        require(now < raiser.revealTime); // but before the reveal
        require(msg.value > 0); // some money needs to be sent

        // find existing participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant.hashedRandom != 0x0); // make sure they participated
        // forward to raise
        raise(_participant);

    }

    /**
     * Reveal your hashed random to the world. This contract will verify that
     * the random number submitted during the participation phase matches
     * this number, confirming all of your entries at once. This procedure
     * can only be completed once. After the revelation period ends, all
     * of these revealed random numbers will be used to deterministically
     * generate a global random number, which will determine the winner.
     */
    function reveal(uint256 _random) public raiserOngoing neverOwner {
        require(now >= raiser.revealTime); // ensure we are in reveal phase
        require(now < raiser.endTime); // but before the end
        require(_random != 0);

        // find the original participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant.entries > 0); // make sure they entered
        require(_participant.hashedRandom == keccak256(_random, msg.sender)); // verify random against hashed random
        require(_participant.random == 0); // make sure no random set already
        // set random, track revealer, update stats
        _participant.random = _random;
        revealers.push(msg.sender);
        totalRevealed += _participant.entries;
        // send out revelation update
        Revelation(msg.sender, _participant.entries, totalRevealed, revealers.length);

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
    function end(uint256 _charityRandom) public raiserOngoing onlyCharity {
        require(now >= raiser.endTime); // a charity can only be ended after the reveal period is over
        require(charityHashedRandom == keccak256(_charityRandom, msg.sender)); // verify charity's hashed random

        uint256[] memory _cumulatives = new uint256[](revealers.length);
        // calculate social random & index from this random
        uint256 _crowdsourcedRandom = crowdsourceRandom(_charityRandom, _cumulatives);
        uint256 _entryIndex = _crowdsourcedRandom % totalRevealed;
        // send out winning input
        WinningInput(_crowdsourcedRandom, _entryIndex);
        // find winner & coresponding participant
        winner = findWinnerAddress(_entryIndex, _cumulatives);
        Participant memory _participant = participantsMapping[winner];

        uint256 _ownerReward;
        uint256 _charityReward;
        uint256 _winnerReward;
        // get owner, winner, and charity refunds
        (_charityReward, _winnerReward, _ownerReward) = calculateRewards();
        // add rewards to existing balances
        balancesMapping[raiser.charity] += _charityReward;
        balancesMapping[winner] += _winnerReward;
        balancesMapping[owner] += _ownerReward;
        // send out win event
        Win(winner, _participant.random, _charityReward, _winnerReward, _ownerReward);

    }

    /**
     * Using all of the revealed random numbers, deterministically generate
     * a global winning random by XORing them together. This procedure will
     * also set up a discrete cumulative density function (CDF) using the
     * number of entries for each participant as the random selection weight.
     */
    function crowdsourceRandom(
        uint256 _charityRandom,
        uint256[] memory _cumulatives) internal view returns (uint256)
    {

        uint256 _cumulative = 0;
        uint256 _crowdsourcedRandom = 0;
        address _revealerAddress;
        Participant memory _participant;
        // generate winning random from all revealed randoms
        for (uint256 revealerIndex = 0; revealerIndex < revealers.length; revealerIndex++) {

            _revealerAddress = revealers[revealerIndex];
            // get the participant for this revealer
            _participant = participantsMapping[_revealerAddress];
            require(_participant.entries > 0); // safety check
            require(_participant.hashedRandom != 0x0); // safety check
            require(_participant.random != 0); // safety check
            // set lower cumulative bound
            _cumulatives[revealerIndex] = _cumulative;
            _cumulative += _participant.entries;
            // xor all randoms together
            _crowdsourcedRandom = _crowdsourcedRandom ^ _participant.random;

        }

        // the charity's initial random has the ultimate randomization effect
        return _crowdsourcedRandom ^ _charityRandom;

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
            WinnerSearch(
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

    /**
     * Calculate refund amounts to the charity, winner, and owner
     * given the percentage splits specified at kickoff.
     */
    function calculateRewards() internal view returns (
        uint256 _charityReward,
        uint256 _winnerReward,
        uint256 _ownerReward)
    {
        // calculate total wei received
        uint256 _totalValue = totalEntries * raiser.valuePerEntry;
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        _charityReward = _totalValue * raiser.charitySplit / 100;
        _winnerReward = _totalValue * raiser.winnerSplit / 100;
        _ownerReward = _totalValue * raiser.ownerSplit / 100;
    }

    /**
     * Cancels a raiser early, before a winner is chosen, and distribute
     * all received wei back to the original participants. This procedure
     * must exist in case of catostropic failure to return wei.
     */
    function cancel() public {
        require(winner == address(0)); // if someone won, we've already sent the money out
        require(!cancelled); // we can't cancel more than once
        // this can only be executed before a winner is chosen by the owner or charity
        // it can be executed by anyone after an expiration period after the end
        if ((msg.sender != owner) && (msg.sender != raiser.charity)) {
            require(now >= raiser.expireTime);
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
            balancesMapping[_participantAddress] += _participant.entries * raiser.valuePerEntry;
            // send out cancellation event
            Cancellation(_participantAddress, balancesMapping[_participantAddress]);
        }

    }

    /**
     * This is the only method for getting ether out of the contract. All
     * winnings and refunds (due to cancellation) are transferred in this way.
     */
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