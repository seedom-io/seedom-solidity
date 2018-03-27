pragma solidity ^0.4.19;

contract Seedom {

    event Seed(
        bytes32 _npoSecret
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

    event Revelation(
        bytes32 _npoMessage
    );

    event Selection(
        address _participant,
        bytes32 _participantMessage,
        bytes32 _npoMessage,
        bytes32 _ownerMessage
    );

    event Cancellation();

    event Withdrawal(
        address _address
    );

    struct Fundraiser {
        address _npo;
        uint256 _npoSplit;
        uint256 _participantSplit;
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
        bytes32 _npoSecret;
        bytes32 _npoMessage;
        bool _npoWithdrawn;
        address _participant;
        bool _participantWithdrawn;
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
        require(msg.sender == fundraiser._owner);
        _;
    }

    modifier neverOwner() {
        require(msg.sender != fundraiser._owner);
        _;
    }

    modifier onlyCharity() {
        require(msg.sender == fundraiser._npo);
        _;
    }

    modifier neverCharity() {
        require(msg.sender != fundraiser._npo);
        _;
    }

    modifier participationPhase() {
        require(now < fundraiser._endTime);
        _;
    }

    modifier endPhase() {
        require((now >= fundraiser._endTime) && (now < fundraiser._expireTime));
        _;
    }

    modifier destructionPhase() {
        require(now >= fundraiser._destructTime);
        _;
    }
    
    Fundraiser public fundraiser;
    mapping(address => Participant) public participants;
    address[] public participantAddresses;
    State _state;

    function Seedom(
        address _npo,
        uint256 _npoSplit,
        uint256 _participantSplit,
        uint256 _ownerSplit,
        bytes32 _ownerSecret,
        uint256 _valuePerEntry,
        uint256 _endTime,
        uint256 _expireTime,
        uint256 _destructTime,
        uint256 _maxParticipants
    ) public {
        require(_npo != 0x0);
        require(_npoSplit != 0);
        require(_participantSplit != 0);
        require(_npoSplit + _participantSplit + _ownerSplit == 1000);
        require(_ownerSecret != 0x0);
        require(_valuePerEntry != 0);
        require(_endTime > now); // participation phase
        require(_expireTime > _endTime); // end phase
        require(_destructTime > _expireTime); // destruct phase

        // set the fundraiser
        fundraiser = Fundraiser(
            _npo,
            _npoSplit,
            _participantSplit,
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
        bytes32 _npoSecret,
        bytes32 _npoMessage,
        bool _npoWithdrawn,
        address _participant,
        bytes32 _participantMessage,
        bool _participantWithdrawn,
        bytes32 _ownerMessage,
        bool _ownerWithdrawn,
        bool _cancelled,
        uint256 _totalParticipants,
        uint256 _totalEntries
    ) {
        _npoSecret = _state._npoSecret;
        _npoMessage = _state._npoMessage;
        _npoWithdrawn = _state._npoWithdrawn;
        _participant = _state._participant;
        _participantMessage = participants[_participant]._message;
        _participantWithdrawn = _state._participantWithdrawn;
        _ownerMessage = _state._ownerMessage;
        _ownerWithdrawn = _state._ownerWithdrawn;
        _cancelled = _state._cancelled;
        _totalParticipants = participantAddresses.length;
        _totalEntries = _state._totalEntries;
    }

    // Returns the balance of a npo, selected, owner, or participant.
    function balance() public view returns (uint256) {
        // check for fundraiser ended normally
        if (_state._participant != address(0)) {
            // selected, get split
            uint256 _split;
            // determine split based on sender
            if (msg.sender == fundraiser._npo) {
                if (_state._npoWithdrawn) {
                    return 0;
                }
                _split = fundraiser._npoSplit;
            } else if (msg.sender == _state._participant) {
                if (_state._participantWithdrawn) {
                    return 0;
                }
                _split = fundraiser._participantSplit;
            } else if (msg.sender == fundraiser._owner) {
                if (_state._ownerWithdrawn) {
                    return 0;
                }
                _split = fundraiser._ownerSplit;
            } else {
                return 0;
            }
            // multiply total entries by split % (non-revealed winnings are forfeited)
            return _state._totalEntries * fundraiser._valuePerEntry * _split / 1000;
        } else if (_state._cancelled) {
            // value per entry times participant entries == balance
            Participant storage _participant = participants[msg.sender];
            return _participant._entries * fundraiser._valuePerEntry;
        }

        return 0;
    }

    // Used by the NPO to officially begin their fundraiser. The npo supplies the first hashed
    // message, which is kept secret and revealed by the npo in end().
    function begin(bytes32 _secret) public participationPhase onlyCharity {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._npoSecret == 0x0); // npo has not seeded secret
        require(_secret != 0x0); // secret cannot be zero

        // seed npo secret, starting the fundraiser
        _state._npoSecret = _secret;

        // broadcast seed
        Seed(_secret);
    }

    // Participate in this fundraiser by contributing messageness to the global selection of a selected.
    // Send a secret value N using the following formula: sha3(N, address). Do not forget
    // your message value as this will be required during the message revealation phase to confirm
    // your entries. After participation, send wei to the callback function to receive additional
    // entries. Participation is only permitted between seed() and the reveal time.
    function participate(bytes32 _message) public participationPhase neverCharity neverOwner payable {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._npoSecret != 0x0); // npo has seeded secret
        require(_message != 0x0); // message cannot be zero
        // check for no limit or under limit
        require(
            (fundraiser._maxParticipants == 0)
            || (participantAddresses.length < fundraiser._maxParticipants)
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
        _entries = msg.value / fundraiser._valuePerEntry;
        require(_entries >= 1); // ensure we have at least one entry
        // if we have any, update participant and total
        _participant._entries += _entries;
        _state._totalEntries += _entries;
        // calculate partial entry refund
        _refund = msg.value % fundraiser._valuePerEntry;
        // refund any excess wei immediately (partial entry)
        if (_refund > 0) {
            msg.sender.transfer(_refund);
        }
    }

    // Fallback function that accepts wei for additional entries. This will always fail if
    // participate() is not called once with a secret.
    function () public participationPhase neverCharity neverOwner payable {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._npoSecret != 0x0); // npo has seeded secret

        // find existing participant
        Participant storage _participant = participants[msg.sender];
        require(_participant._message != 0x0); // make sure they participated
        // forward to raise
        var (_entries, _refund) = _raise(_participant);
        
        // send raise event
        Raise(msg.sender, _entries, _refund);
    }

    function reveal(bytes32 _message) public endPhase onlyCharity {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._npoMessage == 0x0); // cannot have revealed already
        require(_decode(_state._npoSecret, _message)); // check for valid message

        // save revealed npo message
        _state._npoMessage = _message;

        // send reveal event
        Revelation(_message);
    }

    function _decode(bytes32 _secret, bytes32 _message) internal view returns (bool) {
        return _secret == keccak256(_message, msg.sender);
    }

    // Ends this fundraiser and selects a suparticipant to reward. All of the revealed messages and
    // the npo's final revealed message will be used to deterministically generate a universal
    // message value. This method can only be performed by the npo after the end time.
    function end(bytes32 _message) public endPhase onlyOwner {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._npoMessage != 0x0); // npo must have revealed
        require(_state._ownerMessage == 0x0); // cannot have ended already
        require(_decode(fundraiser._ownerSecret, _message)); // check for valid message

        // save revealed owner message
        _state._ownerMessage = _message;
        // calculate entry cumulatives, participants message, and universal message
        uint256[] memory _entryCumulatives = new uint256[](participantAddresses.length);
        bytes32 _participantsMessage = _calculateParticipantsMessage(_entryCumulatives);
        bytes32 _universalMessage = _participantsMessage ^ _state._npoMessage ^ _message;
        // calculate entry index from universal message and total entries
        uint256 _entryIndex = uint256(_universalMessage) % _state._totalEntries;
        // find and set selected, get the participant
        uint256 _participantParticipantIndex = _findSelectedParticipantIndex(_entryIndex, _entryCumulatives);
        _state._participant = participantAddresses[_participantParticipantIndex];
        Participant memory _participant = participants[_state._participant];

        // send out select event
        Selection(_state._participant, _participant._message, _state._npoMessage, _message);
    }

    // Using all of the revealed message values, including the npo's final message,
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
    // message number to the contract. The selected index is a crowdsourced message number that is
    // chosen between 0 and the sum of the weights (total entries). A binary search is then
    // performed amongst the revealers to find a revealer that falls in the following interval:
    // (revealer cumulative entries <= selected index < next revealer cumulative entries)
    function _findSelectedParticipantIndex(
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
            // the selected is the last participant! (edge case)
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
                    // we are in range, selected found!
                    return _midParticipantIndex;
                }
                // selected is greater, move right
                _leftParticipantIndex = _nextParticipantIndex;
            } else {
                // selected is less, move left
                _rightParticipantIndex = _midParticipantIndex;
            }
        }
    }

    // Cancels a fundraiser early, before a winning supporter is chosen. All funds can be then be
    // withdrawn using the withdraw() function. cancel() can only be executed by the owner or
    // npo before a winning supporter is chosen. After the expire time, if the owner or npo
    // has not cancelled and a winning supporter has not been chosen, this function becomes open to
    // everyone as a final safeguard.
    function cancel() public {
        require(!_state._cancelled); // fundraiser not already cancelled
        require(_state._participant == address(0)); // selected must not have been chosen
        // open cancellation to community if past expire time (but before destruct time)
        if ((msg.sender != fundraiser._owner) && (msg.sender != fundraiser._npo)) {
            require((now >= fundraiser._expireTime) && (now < fundraiser._destructTime));
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
        // check for fundraiser ended normally
        if (_state._participant != address(0)) {

            // determine split based on sender
            if (msg.sender == fundraiser._npo) {
                _state._npoWithdrawn = true;
            } else if (msg.sender == _state._participant) {
                _state._participantWithdrawn = true;
            } else if (msg.sender == fundraiser._owner) {
                _state._ownerWithdrawn = true;
            } else {
                revert();
            }

        } else if (_state._cancelled) {

            // set participant entries to zero to prevent multiple refunds
            Participant storage _participant = participants[msg.sender];
            _participant._entries = 0;

        } else {
            // no selected and not cancelled
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