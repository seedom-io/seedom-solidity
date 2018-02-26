pragma solidity ^0.4.19;

contract Seedom {

    event Seed(
        bytes32 _charitySecret
    );

    event Participation(
        address _participant,
        bytes32 _message,
        uint256 _entries,
        uint256 _refund
    );

    event Raise(
        address _participant,
        uint256 _entries,
        uint256 _refund
    );

    event Win(
        address _winner,
        bytes32 _winnerMessage,
        bytes32 _charityMessage,
        bytes32 _ownerMessage
    );

    event Cancellation();

    event Withdrawal(
        address _address
    );

    struct Raiser {
        address _charity;
        uint256 _charitySplit;
        uint256 _winnerSplit;
        address _owner;
        uint256 _ownerSplit;
        bytes32 _ownerSecret;
        uint256 _valuePerEntry;
        uint256 _deployTime;
        uint256 _endTime;
        uint256 _expireTime;
        uint256 _destructTime;
        uint256 _maxParticipants;
    }

    struct State {
        bytes32 _charitySecret;
        bytes32 _charityMessage;
        bool _charityWithdrawn;
        address _winner;
        bool _winnerWithdrawn;
        bytes32 _ownerMessage;
        bool _ownerWithdrawn;
        bool _cancelled;
        uint256 _totalEntries;
    }

    struct Participant {
        uint256 _entries;
        bytes32 _message;
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

    modifier neverCharity() {
        require(msg.sender != raiser._charity);
        _;
    }

    modifier participationPhase() {
        require(now < raiser._endTime);
        _;
    }

    modifier endPhase() {
        require((now >= raiser._endTime) && (now < raiser._expireTime));
        _;
    }

    modifier destructionPhase() {
        require(now >= raiser._destructTime);
        _;
    }
    
    Raiser public raiser;
    mapping(address => Participant) public participants;
    address[] public participantAddresses;
    State _state;

    function Seedom(
        address _charity,
        uint256 _charitySplit,
        uint256 _winnerSplit,
        uint256 _ownerSplit,
        bytes32 _ownerSecret,
        uint256 _valuePerEntry,
        uint256 _endTime,
        uint256 _expireTime,
        uint256 _destructTime,
        uint256 _maxParticipants
    ) public {
        require(_charity != 0x0);
        require(_charitySplit != 0);
        require(_winnerSplit != 0);
        require(_charitySplit + _winnerSplit + _ownerSplit == 1000);
        require(_ownerSecret != 0x0);
        require(_valuePerEntry != 0);
        require(_endTime > now); // participation phase
        require(_expireTime > _endTime); // end phase
        require(_destructTime > _expireTime); // destruct phase

        // set the raiser
        raiser = Raiser(
            _charity,
            _charitySplit,
            _winnerSplit,
            msg.sender,
            _ownerSplit,
            _ownerSecret,
            _valuePerEntry,
            now,
            _endTime,
            _expireTime,
            _destructTime,
            _maxParticipants
        );

    }

    function state() public view returns (
        bytes32 _charitySecret,
        bytes32 _charityMessage,
        bool _charityWithdrawn,
        address _winner,
        bytes32 _winnerMessage,
        bool _winnerWithdrawn,
        bytes32 _ownerMessage,
        bool _ownerWithdrawn,
        bool _cancelled,
        uint256 _totalParticipants,
        uint256 _totalEntries
    ) {
        _charitySecret = _state._charitySecret;
        _charityMessage = _state._charityMessage;
        _charityWithdrawn = _state._charityWithdrawn;
        _winner = _state._winner;
        _winnerMessage = participants[_winner]._message;
        _winnerWithdrawn = _state._winnerWithdrawn;
        _ownerMessage = _state._ownerMessage;
        _ownerWithdrawn = _state._ownerWithdrawn;
        _cancelled = _state._cancelled;
        _totalParticipants = participantAddresses.length;
        _totalEntries = _state._totalEntries;
    }

    // Returns the balance of a charity, winner, owner, or participant.
    function balance() public view returns (uint256) {
        // check for raiser ended normally
        if (_state._winner != address(0)) {
            // winner, get split
            uint256 _split;
            // determine split based on sender
            if (msg.sender == raiser._charity) {
                if (_state._charityWithdrawn) {
                    return 0;
                }
                _split = raiser._charitySplit;
            } else if (msg.sender == _state._winner) {
                if (_state._winnerWithdrawn) {
                    return 0;
                }
                _split = raiser._winnerSplit;
            } else if (msg.sender == raiser._owner) {
                if (_state._ownerWithdrawn) {
                    return 0;
                }
                _split = raiser._ownerSplit;
            } else {
                return 0;
            }
            // multiply total entries by split % (non-revealed winnings are forfeited)
            return _state._totalEntries * raiser._valuePerEntry * _split / 1000;
        } else if (_state._cancelled) {
            // value per entry times participant entries == balance
            Participant storage _participant = participants[msg.sender];
            return _participant._entries * raiser._valuePerEntry;
        }

        return 0;
    }

    // Used by the charity to officially begin their raiser. The charity supplies the first hashed
    // message, which is kept secret and revealed by the charity in end().
    function seed(bytes32 _secret) public participationPhase onlyCharity {
        require(!_state._cancelled); // raiser not cancelled
        require(_state._charitySecret == 0x0); // charity has not seeded secret
        require(_secret != 0x0); // secret cannot be zero

        // seed charity secret, starting the raiser
        _state._charitySecret = _secret;

        // broadcast seed
        Seed(_secret);
    }

    // Participate in this raiser by contributing messageness to the global selection of a winner.
    // Send a secret value N using the following formula: sha3(N, address). Do not forget
    // your message value as this will be required during the message revealation phase to confirm
    // your entries. After participation, send wei to the callback function to receive additional
    // entries. Participation is only permitted between seed() and the reveal time.
    function participate(bytes32 _message) public participationPhase neverCharity neverOwner payable {
        require(!_state._cancelled); // raiser not cancelled
        require(_state._charitySecret != 0x0); // charity has seeded secret
        require(_message != 0x0); // message cannot be zero
        // check for no limit or under limit
        require(
            (raiser._maxParticipants == 0)
            || (participantAddresses.length < raiser._maxParticipants)
        );

        // find and check for no existing participant
        Participant storage _participant = participants[msg.sender];
        require(_participant._entries == 0);
        require(_participant._message == 0x0);

        // add entries to participant
        var (_entries, _refund) = _raise(_participant);
        // save secret, and remember participation
        _participant._message = _message;
        participantAddresses.push(msg.sender);

        // send out participation update
        Participation(msg.sender, _message, _entries, _refund);
    }

    // Called by participate() and the fallback function for procuring additional entries.
    function _raise(Participant storage _participant) internal returns (
        uint256 _entries,
        uint256 _refund
    ) {
        // calculate the number of entries from the wei sent
        _entries = msg.value / raiser._valuePerEntry;
        require(_entries >= 1); // ensure we have at least one entry
        // if we have any, update participant and total
        _participant._entries += _entries;
        _state._totalEntries += _entries;
        // calculate partial entry refund
        _refund = msg.value % raiser._valuePerEntry;
        // refund any excess wei immediately (partial entry)
        if (_refund > 0) {
            msg.sender.transfer(_refund);
        }
    }

    // Fallback function that accepts wei for additional entries. This will always fail if
    // participate() is not called once with a secret.
    function () public participationPhase neverCharity neverOwner payable {
        require(!_state._cancelled); // raiser not cancelled
        require(_state._charitySecret != 0x0); // charity has seeded secret

        // find existing participant
        Participant storage _participant = participants[msg.sender];
        require(_participant._message != 0x0); // make sure they participated
        // forward to raise
        var (_entries, _refund) = _raise(_participant);
        
        // send raise event
        Raise(msg.sender, _entries, _refund);
    }

    function reveal(bytes32 _message) public endPhase onlyCharity {
        require(!_state._cancelled); // raiser not cancelled
        require(_state._charityMessage == 0x0); // cannot have revealed already
        require(_decode(_state._charitySecret, _message)); // check for valid message

        // save revealed charity message
        _state._charityMessage = _message;
    }

    function _decode(bytes32 _secret, bytes32 _message) internal view returns (bool) {
        return _secret == keccak256(_message, msg.sender);
    }

    // Ends this raiser and chooses a winning supporter. All of the revealed messages and the
    // charity's final revealed message will be used to deterministically generate a universal
    // message value. This method can only be performed by the charity after the end time.
    function end(bytes32 _message) public endPhase onlyOwner {
        require(!_state._cancelled); // raiser not cancelled
        require(_state._charityMessage != 0x0); // charity must have revealed
        require(_state._ownerMessage == 0x0); // cannot have ended already
        require(_decode(raiser._ownerSecret, _message)); // check for valid message

        // save revealed owner message
        _state._ownerMessage = _message;
        // calculate entry cumulatives, participants message, and universal message
        uint256[] memory _entryCumulatives = new uint256[](participantAddresses.length);
        bytes32 _participantsMessage = _calculateParticipantsMessage(_entryCumulatives);
        bytes32 _universalMessage = _participantsMessage ^ _state._charityMessage ^ _message;
        // calculate entry index from universal message and total entries
        uint256 _entryIndex = uint256(_universalMessage) % _state._totalEntries;
        // find and set winner, get the participant
        uint256 _winnerParticipantIndex = _findWinnerParticipantIndex(_entryIndex, _entryCumulatives);
        _state._winner = participantAddresses[_winnerParticipantIndex];
        Participant memory _participant = participants[_state._winner];

        // send out win event
        Win(_state._winner, _participant._message, _state._charityMessage, _message);
    }

    // Using all of the revealed message values, including the charity's final message,
    // deterministically generate a universal message by XORing them together. This procedure
    // will also set up a discrete cumulative density function (CDF) using the number of entries
    // for each participant.
    function _calculateParticipantsMessage(
        uint256[] memory _entryCumulatives
    ) internal view returns (bytes32) {
        address _participantAddress;
        uint256 _entryCumulative = 0;
        bytes32 _participantsMessage = 0;
        Participant memory _participant;
        // loop through all participants
        for (uint256 _participantIndex = 0; _participantIndex < participantAddresses.length; _participantIndex++) {
            // get the participant at this index
            _participantAddress = participantAddresses[_participantIndex];
            _participant = participants[_participantAddress];
            require(_participant._entries >= 1); // needs to have at least one entry
            require(_participant._message != 0x0); // needs to have a message
            // set lower cumulative bound
            _entryCumulatives[_participantIndex] = _entryCumulative;
            _entryCumulative += _participant._entries;
            // xor all messages together
            _participantsMessage = _participantsMessage ^ _participant._message;
        }
        // participant messages XORed
        return _participantsMessage;
    }

    // Finds the winning supporter revealer address amongst the participants who revealed their
    // message number to the contract. The winner index is a crowdsourced message number that is
    // chosen between 0 and the sum of the weights (total entries). A binary search is then
    // performed amongst the revealers to find a revealer that falls in the following interval:
    // (revealer cumulative entries <= winner index < next revealer cumulative entries)
    function _findWinnerParticipantIndex(
        uint256 _entryCumulative,
        uint256[] memory _entryCumulatives
    ) internal view returns (uint256)  {
        uint256 _midEntryCumulative;
        uint256 _nextEntryCumulative;
        uint256 _midParticipantIndex;
        uint256 _nextParticipantIndex;
        uint256 _leftParticipantIndex = 0;
        uint256 _rightParticipantIndex = participantAddresses.length - 1;
        // loop until winning participant found
        while (true) {
            // the winner is the last participant! (edge case)
            if (_leftParticipantIndex == _rightParticipantIndex) {
                return _leftParticipantIndex;
            }
            // get indexes for mid & next
            _midParticipantIndex =
                _leftParticipantIndex + ((_rightParticipantIndex - _leftParticipantIndex) / 2);
            _nextParticipantIndex = _midParticipantIndex + 1;
            // get cumulatives for mid & next
            _midEntryCumulative = _entryCumulatives[_midParticipantIndex];
            _nextEntryCumulative = _entryCumulatives[_nextParticipantIndex];
            // binary search
            if (_entryCumulative >= _midEntryCumulative) {
                if (_entryCumulative < _nextEntryCumulative) {
                    // we are in range, winner found!
                    return _midParticipantIndex;
                }
                // winner is greater, move right
                _leftParticipantIndex = _nextParticipantIndex;
            } else {
                // winner is less, move left
                _rightParticipantIndex = _midParticipantIndex;
            }
        }
    }

    // Cancels a raiser early, before a winning supporter is chosen. All funds can be then be
    // withdrawn using the withdraw() function. cancel() can only be executed by the owner or
    // charity before a winning supporter is chosen. After the expire time, if the owner or charity
    // has not cancelled and a winning supporter has not been chosen, this function becomes open to
    // everyone as a final safeguard.
    function cancel() public {
        require(!_state._cancelled); // raiser not already cancelled
        require(_state._winner == address(0)); // winner must not have been chosen
        // open cancellation to community if past expire time (but before destruct time)
        if ((msg.sender != raiser._owner) && (msg.sender != raiser._charity)) {
            require((now >= raiser._expireTime) && (now < raiser._destructTime));
        }

        // immediately set us to cancelled
        _state._cancelled = true;

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
        if (_state._winner != address(0)) {

            // determine split based on sender
            if (msg.sender == raiser._charity) {
                _state._charityWithdrawn = true;
            } else if (msg.sender == _state._winner) {
                _state._winnerWithdrawn = true;
            } else if (msg.sender == raiser._owner) {
                _state._ownerWithdrawn = true;
            } else {
                revert();
            }

        } else if (_state._cancelled) {

            // set participant entries to zero to prevent multiple refunds
            Participant storage _participant = participants[msg.sender];
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
    function destroy() public destructionPhase onlyOwner {
        // destroy this contract and send remaining funds to owner
        selfdestruct(msg.sender);
    }
}