pragma solidity ^0.4.19;

contract Fundraiser {

    event Beginning(
        bytes32 _causeSecret
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
        bytes32 _causeMessage
    );

    event Selection(
        address _participant,
        bytes32 _participantMessage,
        bytes32 _causeMessage,
        bytes32 _ownerMessage
    );

    event Cancellation();

    event Withdrawal(
        address _address
    );

    struct Deployment {
        address _cause;
        uint256 _causeSplit;
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
        bytes32 _causeSecret;
        bytes32 _causeMessage;
        bool _causeWithdrawn;
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
        require(msg.sender == deployment._owner);
        _;
    }

    modifier neverOwner() {
        require(msg.sender != deployment._owner);
        _;
    }

    modifier onlyCause() {
        require(msg.sender == deployment._cause);
        _;
    }

    modifier neverCharity() {
        require(msg.sender != deployment._cause);
        _;
    }

    modifier participationPhase() {
        require(now < deployment._endTime);
        _;
    }

    modifier recapPhase() {
        require((now >= deployment._endTime) && (now < deployment._expireTime));
        _;
    }

    modifier destructionPhase() {
        require(now >= deployment._destructTime);
        _;
    }
    
    Deployment public deployment;
    mapping(address => Participant) public participants;
    address[] public participantAddresses;
    State _state;

    function Fundraiser(
        address _cause,
        uint256 _causeSplit,
        uint256 _participantSplit,
        uint256 _ownerSplit,
        bytes32 _ownerSecret,
        uint256 _valuePerEntry,
        uint256 _endTime,
        uint256 _expireTime,
        uint256 _destructTime,
        uint256 _maxParticipants
    ) public {
        require(_cause != 0x0);
        require(_causeSplit != 0);
        require(_participantSplit != 0);
        require(_causeSplit + _participantSplit + _ownerSplit == 1000);
        require(_ownerSecret != 0x0);
        require(_valuePerEntry != 0);
        require(_endTime > now); // participation phase
        require(_expireTime > _endTime); // end phase
        require(_destructTime > _expireTime); // destruct phase

        // set the deployment
        deployment = Deployment(
            _cause,
            _causeSplit,
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

    // returns the post-deployment state of the contract
    function state() public view returns (
        bytes32 _causeSecret,
        bytes32 _causeMessage,
        bool _causeWithdrawn,
        address _participant,
        bytes32 _participantMessage,
        bool _participantWithdrawn,
        bytes32 _ownerMessage,
        bool _ownerWithdrawn,
        bool _cancelled,
        uint256 _totalParticipants,
        uint256 _totalEntries
    ) {
        _causeSecret = _state._causeSecret;
        _causeMessage = _state._causeMessage;
        _causeWithdrawn = _state._causeWithdrawn;
        _participant = _state._participant;
        _participantMessage = participants[_participant]._message;
        _participantWithdrawn = _state._participantWithdrawn;
        _ownerMessage = _state._ownerMessage;
        _ownerWithdrawn = _state._ownerWithdrawn;
        _cancelled = _state._cancelled;
        _totalParticipants = participantAddresses.length;
        _totalEntries = _state._totalEntries;
    }

    // returns the balance of a cause, selected participant, owner, or participant (refund)
    function balance() public view returns (uint256) {
        // check for fundraiser ended normally
        if (_state._participant != address(0)) {
            // selected, get split
            uint256 _split;
            // determine split based on sender
            if (msg.sender == deployment._cause) {
                if (_state._causeWithdrawn) {
                    return 0;
                }
                _split = deployment._causeSplit;
            } else if (msg.sender == _state._participant) {
                if (_state._participantWithdrawn) {
                    return 0;
                }
                _split = deployment._participantSplit;
            } else if (msg.sender == deployment._owner) {
                if (_state._ownerWithdrawn) {
                    return 0;
                }
                _split = deployment._ownerSplit;
            } else {
                return 0;
            }
            // multiply total entries by split % (non-revealed winnings are forfeited)
            return _state._totalEntries * deployment._valuePerEntry * _split / 1000;
        } else if (_state._cancelled) {
            // value per entry times participant entries == balance
            Participant storage _participant = participants[msg.sender];
            return _participant._entries * deployment._valuePerEntry;
        }

        return 0;
    }

    // called by the cause to begin their fundraiser with their secret
    function begin(bytes32 _secret) public participationPhase onlyCause {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._causeSecret == 0x0); // cause has not seeded secret
        require(_secret != 0x0); // secret cannot be zero

        // seed cause secret, starting the fundraiser
        _state._causeSecret = _secret;

        // broadcast event
        Beginning(_secret);
    }

    // participate in this fundraiser by contributing messages and ether for entries
    function participate(bytes32 _message) public participationPhase neverCharity neverOwner payable {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._causeSecret != 0x0); // cause has seeded secret
        require(_message != 0x0); // message cannot be zero
        // check for no limit or under limit
        require(
            (deployment._maxParticipants == 0)
            || (participantAddresses.length < deployment._maxParticipants)
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

    // called by participate() and the fallback function for obtaining (additional) entries
    function _raise(Participant storage _participant) internal returns (
        uint256 _entries,
        uint256 _refund
    ) {
        // calculate the number of entries from the wei sent
        _entries = msg.value / deployment._valuePerEntry;
        require(_entries >= 1); // ensure we have at least one entry
        // if we have any, update participant and total
        _participant._entries += _entries;
        _state._totalEntries += _entries;
        // calculate partial entry refund
        _refund = msg.value % deployment._valuePerEntry;
        // refund any excess wei immediately (partial entry)
        if (_refund > 0) {
            msg.sender.transfer(_refund);
        }
    }

    // fallback function that accepts ether for additional entries after an initial participation
    function () public participationPhase neverCharity neverOwner payable {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._causeSecret != 0x0); // cause has seeded secret

        // find existing participant
        Participant storage _participant = participants[msg.sender];
        require(_participant._message != 0x0); // make sure they participated
        // forward to raise
        var (_entries, _refund) = _raise(_participant);
        
        // send raise event
        Raise(msg.sender, _entries, _refund);
    }

    // called by the cause to reveal their message after the end time but before the end() function
    // FIXME ADD RECAP BACK
    function reveal(bytes32 _message) public onlyCause {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._causeMessage == 0x0); // cannot have revealed already
        require(_decode(_state._causeSecret, _message)); // check for valid message

        // save revealed cause message
        _state._causeMessage = _message;

        // send reveal event
        Revelation(_message);
    }

    // determines that validity of a message, given a secret.
    function _decode(bytes32 _secret, bytes32 _message) internal view returns (bool) {
        return _secret == keccak256(_message, msg.sender);
    }

    // ends this fundraiser, selects a participant to reward, and allocates funds for the cause, the
    // selected participant, and the contract owner
    // FIXME ADD RECAP BACK
    function end(bytes32 _message) public onlyOwner {
        require(!_state._cancelled); // fundraiser not cancelled
        require(_state._causeMessage != 0x0); // cause must have revealed
        require(_state._ownerMessage == 0x0); // cannot have ended already
        require(_decode(deployment._ownerSecret, _message)); // check for valid message

        // save revealed owner message
        _state._ownerMessage = _message;
        // calculate entry cumulatives, participants message, and universal message
        uint256[] memory _entryCumulatives = new uint256[](participantAddresses.length);
        bytes32 _participantsMessage = _calculateParticipantsMessage(_entryCumulatives);
        bytes32 _randomMessage = _participantsMessage ^ _state._causeMessage ^ _message;
        // calculate entry index from universal message and total entries
        uint256 _entryIndex = uint256(_randomMessage) % _state._totalEntries;
        // find and set selected, get the participant
        uint256 _participantParticipantIndex = _findSelectedParticipantIndex(_entryIndex, _entryCumulatives);
        _state._participant = participantAddresses[_participantParticipantIndex];
        Participant memory _participant = participants[_state._participant];

        // send out select event
        Selection(_state._participant, _participant._message, _state._causeMessage, _message);
    }

    // XORs all participant messages in order to generate a crowd-sourced participants message,
    // generating a CDF of entries by participant in the process
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

    // finds a selected participant index using the CDF generated in
    // _calculateParticipantsMessage()
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

    // called by the cause or Seedom before the end time to cancel the fundraiser, refunding all
    // participants; this function is available to the entire community after the expire time
    function cancel() public {
        require(!_state._cancelled); // fundraiser not already cancelled
        require(_state._participant == address(0)); // selected must not have been chosen
        // open cancellation to community if past expire time (but before destruct time)
        if ((msg.sender != deployment._owner) && (msg.sender != deployment._cause)) {
            require((now >= deployment._expireTime) && (now < deployment._destructTime));
        }

        // immediately set us to cancelled
        _state._cancelled = true;

        // send out cancellation event
        Cancellation();
    }

    // used to withdraw funds from the contract from an ended fundraiser or refunds when the
    // fundraiser is cancelled
    function withdraw() public {
        // check for a balance
        uint256 _balance = balance();
        require (_balance > 0); // can only withdraw a balance
        // check for fundraiser ended normally
        if (_state._participant != address(0)) {

            // determine split based on sender
            if (msg.sender == deployment._cause) {
                _state._causeWithdrawn = true;
            } else if (msg.sender == _state._participant) {
                _state._participantWithdrawn = true;
            } else if (msg.sender == deployment._owner) {
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

    // destroy() will be used to clean up old contracts from the Ethreum network
    function destroy() public destructionPhase onlyOwner {
        // destroy this contract and send remaining funds to owner
        selfdestruct(msg.sender);
    }
}