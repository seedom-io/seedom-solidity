pragma solidity ^0.4.19;

contract Seedom {

    event Seed(
        bytes32 _charityHashedRandom
    );

    event Participation(
        address _participant,
        uint256 _entries,
        bytes32 _hashedRandom
    );

    event Raise(
        address _participant,
        uint256 _entries,
        uint256 _refund
    );

    event Revelation(
        address _participant,
        bytes32 _random,
        uint256 _entries
    );

    event Win(
        address _winner,
        bytes32 _winnerRandom,
        bytes32 _charityRandom
    );

    event Cancellation();

    event Withdrawal(
        address _address
    );

    struct Raiser {
        address _owner;
        address _charity;
        uint256 _charitySplit;
        uint256 _winnerSplit;
        uint256 _ownerSplit;
        uint256 _valuePerEntry;
        uint256 _deployTime;
        uint256 _revealTime;
        uint256 _endTime;
        uint256 _expireTime;
        uint256 _destructTime;
        uint256 _maxParticipants;
    }

    struct Participant {
        uint256 _entries;
        bytes32 _hashedRandom;
        bytes32 _random;
    }

    modifier onlyOwner() {
        require(msg.sender == raiser._owner);
        _;
    }

    modifier neverOwner() {
        require(msg.sender != raiser._owner);
        _;
    }

    modifier onlyCharity() {
        require(msg.sender == raiser._charity);
        _;
    }

    modifier raiserOngoing() {
        require(charityHashedRandom != 0x0); // ensure charity seed
        require(!raiserFinished()); // ensure not finished
        require(!cancelled); // we can't participate if raiser cancelled
        _;
    }
    
    Raiser public raiser;
    mapping(address => Participant) public participantsMapping;
    address[] public participants;
    address[] public revealers;
    bytes32 charityHashedRandom;
    bytes32 charityRandom;
    address winner;
    uint256 totalEntries;
    uint256 totalRevealed;
    bool cancelled;
    bool charityWithdrawn;
    bool winnerWithdrawn;
    bool ownerWithdrawn;

    function Seedom(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        uint256 _valuePerEntry,
        uint256 _revealTime,
        uint256 _endTime,
        uint256 _expireTime,
        uint256 _destructTime,
        uint256 _maxParticipants
    ) public {
        require(_charity != 0x0);
        require(_charitySplit != 0);
        require(_winnerSplit != 0);
        require(_charitySplit + _winnerSplit + _ownerSplit == 1000);
        require(_valuePerEntry != 0);
        require(_revealTime >= now); // time for the charity to seed and others to participate
        require(_endTime > _revealTime); // time for participants to reveal their randoms
        require(_expireTime > _endTime); // time for charity to end the raiser
        require(_destructTime > _expireTime); // when this contract is selfdestructed

        // set the raiser
        raiser = Raiser(
            msg.sender,
            _charity,
            _charitySplit,
            _winnerSplit,
            _ownerSplit,
            _valuePerEntry,
            now,
            _revealTime,
            _endTime,
            _expireTime,
            _destructTime,
            _maxParticipants
        );
    }

    function state() public view returns (
        bytes32 _charityHashedRandom,
        bytes32 _charityRandom,
        address _winner,
        bytes32 _winnerRandom,
        bool _cancelled,
        uint256 _totalParticipants,
        uint256 _totalEntries,
        uint256 _totalRevealers,
        uint256 _totalRevealed
    ) {
        _charityHashedRandom = charityHashedRandom;
        _charityRandom = charityRandom;
        _winner = winner;
        _winnerRandom = participantsMapping[winner]._random;
        _cancelled = cancelled;
        _totalParticipants = participants.length;
        _totalEntries = totalEntries;
        _totalRevealers = revealers.length;
        _totalRevealed = totalRevealed;
    }

    function raiserFinished() internal view returns (bool) {
        return ((winner != address(0)) && (charityRandom != 0x0));
    }

    // Returns the balance of a charity, winner, owner, or participant.
    function balance() public view returns (uint256) {
        // check for raiser ended normally
        if (raiserFinished()) {
            // winner, get split
            uint256 _split;
            // determine split based on sender
            if (msg.sender == raiser._charity) {
                if (charityWithdrawn) {
                    return 0;
                }
                _split = raiser._charitySplit;
            } else if (msg.sender == winner) {
                if (winnerWithdrawn) {
                    return 0;
                }
                _split = raiser._winnerSplit;
            } else if (msg.sender == raiser._owner) {
                if (ownerWithdrawn) {
                    return 0;
                }
                _split = raiser._ownerSplit;
            } else {
                return 0;
            }
            // multiply total entries by split % (non-revealed winnings are forfeited)
            return totalEntries * raiser._valuePerEntry * _split / 1000;
        } else if (cancelled) {
            // value per entry times participant entries == balance
            Participant storage _participant = participantsMapping[msg.sender];
            return _participant._entries * raiser._valuePerEntry;
        }

        return 0;
    }

    // Used by the charity to officially begin their raiser. The charity supplies the first hashed
    // random, which is kept secret and revealed by the charity in end().
    function seed(bytes32 _charityHashedRandom) public onlyCharity {
        require(now < raiser._revealTime); // before the reveal
        require(!raiserFinished()); // ensure raiser not finished
        require(!cancelled); // cannot seed cancelled raiser
        require(charityHashedRandom == 0x0); // safety check
        require(_charityHashedRandom != 0x0); // hashed random cannot be zero

        charityHashedRandom = _charityHashedRandom;
        // broadcast seed
        Seed(_charityHashedRandom);
    }

    // Participate in this raiser by contributing randomness to the global selection of a winner.
    // Send a hashed random value N using the following formula: sha3(N, address). Do not forget
    // your random value as this will be required during the random revealation phase to confirm
    // your entries. After participation, send wei to the callback function to receive additional
    // entries. Participation is only permitted between seed() and the reveal time.
    function participate(bytes32 _hashedRandom) public raiserOngoing neverOwner payable {
        require(now < raiser._revealTime); // but before the reveal
        require(_hashedRandom != 0x0); // hashed random cannot be zero
        // check for no limit or under limit
        require((raiser._maxParticipants == 0) || (participants.length < raiser._maxParticipants));

        // find existing participant
        Participant storage _participant = participantsMapping[msg.sender];
        require(_participant._entries == 0); // safety check
        require(_participant._hashedRandom == 0x0); // make sure they have not participated
        require(_participant._random == 0x0); // safety check
        // save hashed random, add to tracked
        _participant._hashedRandom = _hashedRandom;
        participants.push(msg.sender);
        // did we also receive wei? if so, raise
        if (msg.value > 0) {
            raise(_participant);
        }

        // send out participation update
        Participation(msg.sender, _participant._entries, _hashedRandom);
    }

    // Called by participate() and the fallback function for procuring additional entries.
    function raise(Participant storage _participant) internal returns (
        uint256 _newEntries,
        uint256 _refund
    ) {
        // calculate the number of entries from the wei sent
        _newEntries = msg.value / raiser._valuePerEntry;
        require(_newEntries >= 1); // ensure we have at least one entry
        // if we have any, update participant and total
        _participant._entries += _newEntries;
        totalEntries += _newEntries;
        // calculate partial entry refund
        _refund = msg.value % raiser._valuePerEntry;
        // refund any excess wei immediately (partial entry)
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

        uint256 _newEntries;
        uint256 _refund;
        // forward to raise
        (_newEntries, _refund) = raise(_participant);
        // send raise event
        Raise(msg.sender, _newEntries, _refund);
    }

    // Reveal your hashed random to the world. The random is hashed and verified to match the
    // hashed random provided during the participation phase. All entries are confirmed with a
    // single call to reveal() and this call can only be completed once.
    function reveal(bytes32 _random) public raiserOngoing neverOwner {
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
        Revelation(msg.sender, _random, _participant._entries);
    }

    // Ends this raiser and chooses a winning supporter. All of the revealed randoms and the
    // charity's final revealed random will be used to deterministically generate a universal
    // random value. This method can only be performed by the charity after the end time.
    function end(bytes32 _charityRandom) public raiserOngoing onlyCharity {
        require(now >= raiser._endTime); // end can occur only after ent time
        require(charityHashedRandom == keccak256(_charityRandom, msg.sender)); // verify charity's hashed random
        
        // save this random to storage
        charityRandom = _charityRandom;
        uint256[] memory _cumulatives = new uint256[](revealers.length);
        // calculate crowdsourced random & entry index from this random
        bytes32 _crowdsourcedRandom = crowdsourceRandom(_cumulatives);
        uint256 _entryIndex = uint256(_crowdsourcedRandom) % totalRevealed;
        // find and set winner, get the participant
        winner = findWinner(_entryIndex, _cumulatives);
        Participant memory _participant = participantsMapping[winner];
        // send out win event
        Win(winner, _participant._random, _charityRandom);
    }

    // Using all of the revealed random values, including the charity's final random,
    // deterministically generate a universal random by XORing them together. This procedure
    // will also set up a discrete cumulative density function (CDF) using the number of entries
    // for each participant.
    function crowdsourceRandom(uint256[] memory _cumulatives) internal view returns (bytes32) {
        uint256 _cumulative = 0;
        bytes32 _crowdsourcedRandom = 0;
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
        return _crowdsourcedRandom ^ charityRandom;
    }

    // Finds the winning supporter revealer address amongst the participants who revealed their
    // random number to the contract. The winner index is a crowdsourced random number that is
    // chosen between 0 and the sum of the weights (total entries). A binary search is then
    // performed amongst the revealers to find a revealer that falls in the following interval:
    // (revealer cumulative entries <= winner index < next revealer cumulative entries)
    function findWinner(
        uint256 _entryIndex,
        uint256[] memory _cumulatives) internal view returns (address)
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

    // Cancels a raiser early, before a winning supporter is chosen. All funds can be then be
    // withdrawn using the withdraw() function. cancel() can only be executed by the owner or
    // charity before a winning supporter is chosen. After the expire time, if the owner or charity
    // has not cancelled and a winning supporter has not been chosen, this function becomes open to
    // everyone as a final safeguard.
    function cancel() public {
        require(!raiserFinished()); // ensure the raiser didn't end normally
        require(!cancelled); // we can't cancel more than once
        // open cancellation to community if past expire time
        if ((msg.sender != raiser._owner) && (msg.sender != raiser._charity)) {
            require(now >= raiser._expireTime);
        }

        // immediately set us to cancelled
        cancelled = true;
        // send out cancellation event
        Cancellation();
    }

    // Used to withdraw funds from the contract from either winnings or refunds from a
    // cancellation.
    function withdraw() public {
        // check for a balance
        uint256 _balance = balance();
        require (_balance > 0); // can only withdraw a balance
        // check for raiser ended normally
        if (raiserFinished()) {

            // determine split based on sender
            if (msg.sender == raiser._charity) {
                charityWithdrawn = true;
            } else if (msg.sender == winner) {
                winnerWithdrawn = true;
            } else if (msg.sender == raiser._owner) {
                ownerWithdrawn = true;
            } else {
                revert();
            }

        } else if (cancelled) {

            // set participant entries to zero to prevent multiple refunds
            Participant storage _participant = participantsMapping[msg.sender];
            _participant._entries = 0;

        } else {
            // no winner and not cancelled
            revert();
        }

        // execute the refund if we have one
        msg.sender.transfer(_balance);
        // send withdrawal event
        Withdrawal(msg.sender);
    }

    // destroy() will be used to clean up very old contracts from the Ethreum network.
    function destroy() public onlyOwner {
        require(now >= raiser._destructTime); // can only be done after a while
        // destroy this contract and send remaining funds to owner
        selfdestruct(msg.sender);
    }
}