pragma solidity ^0.4.4;

contract Charity {

    event Kickoff(
        address charity,
        uint256 charitySplit,
        uint256 winnerSplit,
        uint256 ownerSplit,
        uint256 valuePerEntry,
        uint256 kickTime,
        uint256 revealTime,
        uint256 endTime,
        uint256 expireTime
    );

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

    struct Kick {
        address charity;
        uint256 charitySplit;
        uint256 winnerSplit;
        uint256 ownerSplit;
        uint256 valuePerEntry;
        uint256 kickTime;
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
        require(msg.sender == kick.charity);
        _;
    }

    modifier playTime() {
        require(charityHashedRandom != 0x0); // ensure charity seed
        require(winner == address(0)); // ensure no winner
        require(!cancelled); // we can't participate in a cancelled charity
        _;
    }

    address public owner;
    Kick kick;
    address public winner;
    bool public cancelled;
    bytes32 public charityHashedRandom;
    uint256 public totalEntries;
    uint256 public totalRevealed;
    address[] public participants;
    address[] public revealers;
    mapping(address => Participant) participantsMapping;
    mapping(address => uint256) balancesMapping;

    function Charity() public {
        // set owner
        owner = msg.sender;
        // initiall set this charity cancelled
        cancelled = true;
    }

    function timestamp() public view returns (uint256) {
        return now;
    }

    function currentKick() public view returns (
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _valuePerEntry,
        uint256 _kickTime,
        uint256 _revealTime,
        uint256 _endTime,
        uint256 _expireTime
    ) {
        _charity = kick.charity;
        _charitySplit = kick.charitySplit;
        _winnerSplit = kick.winnerSplit;
        _ownerSplit = kick.ownerSplit;
        _valuePerEntry = kick.valuePerEntry;
        _kickTime = kick.kickTime;
        _revealTime = kick.revealTime;
        _endTime = kick.endTime;
        _expireTime = kick.expireTime;
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
     * Constructs a new charity. Here we set the charity ethereum wallet address,
     * the percentage cuts for the charity, winner, and owner, the wei of each
     * entry, and the reveal, end, and expire times. A new charity can only be
     * kicked off if a winner is chosen from the last charity or the last charity
     * was cancelled.
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
        // we can only start a new charity if a winner has been chosen or the last
        // charity was cancelled
        require(winner != address(0) || cancelled);

        kick = Kick(
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

        // clear out any pre-existing state
        clear();
        // send out event
        Kickoff(
            _charity,
            _charitySplit,
            _winnerSplit,
            _ownerSplit,
            _valuePerEntry,
            kick.kickTime,
            _revealTime,
            _endTime,
            _expireTime
        );

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
        require(now >= kick.kickTime); // ensure we are in kick phase
        require(now < kick.revealTime); // but before the reveal
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
     * Participation is only permitted between seed and reveal.
     */
    function participate(bytes32 _hashedRandom) public playTime neverOwner payable {
        require(now < kick.revealTime); // but before the reveal
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

        // did we also receive wei? if so, fund
        if (msg.value > 0) {
            fund(_participant);
        }
    
    }

    /**
     * Internal function called by participate and the fallback function
     * for submitting entries initially during participation or several
     * times after participation through this fallback function.
     */
    function fund(Participant storage _participant) internal {

        // calculate the number of entries from the wei sent
        uint256 _newEntries = msg.value / kick.valuePerEntry;
        // if we have any, update participant and total
        if (_newEntries > 0) {
            _participant.entries += _newEntries;
            totalEntries += _newEntries;
        }

        uint256 _refund = msg.value % kick.valuePerEntry;
        // refund any excess wei (partial entry)
        if (_refund > 0) {
            balancesMapping[msg.sender] += _refund;
        }

        // send fund event
        Fund(msg.sender, msg.value, _refund, _newEntries, totalEntries);

    }

    /**
     * Fallback function that accepts wei for entries. This will always
     * fail if participate() is not called once first with a hashed random.
     */
    function () public playTime neverOwner payable {
        require(now < kick.revealTime); // but before the reveal
        require(msg.value > 0); // some money needs to be sent

        // find existing participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant.hashedRandom != 0x0); // make sure they participated
        // forward to funding
        fund(_participant);

    }

    /**
     * Reveal your hashed random to the world. This contract will verify that
     * the random number submitted during the participation phase matches
     * this number, confirming all of your entries at once. This procedure
     * can only be completed once. After the revelation period ends, all
     * of these revealed random numbers will be used to deterministically
     * generate a global random number, which will determine the winner.
     */
    function reveal(uint256 _random) public playTime neverOwner {
        require(now >= kick.revealTime); // ensure we are in reveal phase
        require(now < kick.endTime); // but before the end
        require(_random != 0);

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
    function end(uint256 _charityRandom) public playTime onlyCharity {
        require(now >= kick.endTime); // a charity can only be ended after the reveal period is over
        require(charityHashedRandom == keccak256(_charityRandom, msg.sender)); // verify charity's hashed random

        uint256[] memory _cumulatives = new uint256[](revealers.length);
        // calculate social random & index from this random
        uint256 _winningRandom = calculateWinningRandom(_charityRandom, _cumulatives);
        uint256 _winningEntryIndex = _winningRandom % totalRevealed;
        // send out winning input
        WinningInput(_winningRandom, _winningEntryIndex);
        // find winner
        winner = findWinnerAddress(_winningEntryIndex, _cumulatives);

        uint256 _ownerReward;
        uint256 _charityReward;
        uint256 _winnerReward;
        // get owner, winner, and charity refunds
        (_charityReward, _winnerReward, _ownerReward) = calculateRewards();
        // add rewards to existing balances
        balancesMapping[kick.charity] += _charityReward;
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
        uint256[] memory _cumulatives) internal view returns (uint256)
    {

        uint256 _cumulative = 0;
        uint256 _winningRandom = 0;
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
    function findWinnerAddress(
        uint256 _winningEntryIndex,
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

            if (_winningEntryIndex >= _midRevealerCumulative) {
                if (_winningEntryIndex < _nextRevealerCumulative) {
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
        uint256 _totalValue = totalEntries * kick.valuePerEntry;
        // divide it up amongst all entities (non-revealed winnings are forfeited)
        _charityReward = _totalValue * kick.charitySplit / 100;
        _winnerReward = _totalValue * kick.winnerSplit / 100;
        _ownerReward = _totalValue * kick.ownerSplit / 100;
    }

    /**
     * Cancels a charity early, before a winner is chosen, and distribute
     * all received wei back to the original participants. This procedure
     * must exist in case of catostropic failure to return wei.
     */
    function cancel() public {
        require(winner == address(0)); // if someone won, we've already sent the money out
        require(!cancelled); // we can't cancel more than once
        // this can only be executed before a winner is chosen by the owner or charity
        // it can be executed by anyone after an expiration period after the end
        if ((msg.sender != owner) && (msg.sender != kick.charity)) {
            require(now >= kick.expireTime);
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
            balancesMapping[_participantAddress] += _participant.entries * kick.valuePerEntry;
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
        // fail if no balance
        require(_balance > 0);
        // execute the refund if we have one
        _sender.transfer(_balance);
        // send withdrawal event
        Withdrawal(_sender, _balance);

    }

}