pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';
import './InkProtocolInterface.sol';
import './InkMediator.sol';
import './InkOwner.sol';

/// @title Ink Protocol: Decentralized reputation and payments for peer-to-peer marketplaces.
contract InkProtocolCore is InkProtocolInterface, StandardToken {
  string public constant name = "Ink Protocol";
  string public constant symbol = "XNK";
  uint8 public constant decimals = 18;

  uint256 private constant gasLimitForExpiryCall = 1000000;
  uint256 private constant gasLimitForMediatorCall = 4000000;

  enum Expiry {
    Transaction, // 0
    Fulfillment, // 1
    Escalation,  // 2
    Mediation    // 3
  }

  enum TransactionState {
    // This is an internal state to represent an uninitialized transaction.
    Null,                     // 0

    Initiated,                // 1
    Accepted,                 // 2
    Disputed,                 // 3
    Escalated,                // 4
    Revoked,                  // 5
    RefundedByMediator,       // 6
    SettledByMediator,        // 7
    ConfirmedByMediator,      // 8
    Confirmed,                // 9
    Refunded,                 // 10
    ConfirmedAfterExpiry,     // 11
    ConfirmedAfterDispute,    // 12
    RefundedAfterDispute,     // 13
    RefundedAfterExpiry,      // 14
    ConfirmedAfterEscalation, // 15
    RefundedAfterEscalation,  // 16
    Settled                   // 17
  }

  // The running ID counter for all Ink Transactions.
  uint256 private globalTransactionId = 0;

  // Mapping of all transactions by ID (globalTransactionId).
  mapping(uint256 => Transaction) internal transactions;

  // The struct definition for an Ink Transaction.
  struct Transaction {
    // The address of the buyer on the transaction.
    address buyer;
    // The address of the seller on the transaction.
    address seller;
    // The address of the policy contract for the transaction.
    address policy;
    // The address of the mediator contract for the transaction.
    address mediator;
    // The state of the transaction.
    TransactionState state;
    // The (block) time that the transaction transitioned to its current state.
    // This value is only set for the states that need it to be set (states
    // with an expiry involved).
    uint256 stateTime;
    // The XNK amount of the transaction.
    uint256 amount;
  }


  /*
    Constructor
  */

  function InkProtocolCore() internal {
    // Start with a total supply of 500,000,000 Ink Tokens (XNK).
    totalSupply_ = 500000000000000000000000000;
  }


  /*
    ERC20 override functions
  */

  function transfer(address _to, uint256 _value) public returns (bool) {
   // Don't allow token transfers to the Ink contract.
   require(_to != address(this));

   return super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
   // Don't allow token transfers to the Ink contract.
   require(_to != address(this));

   return super.transferFrom(_from, _to, _value);
  }


  /*
    Account linking functions

    Functions used by users and agents to declare a unidirectionally account
    linking.
  */

  // Called by a user who wishes to link with another _account.
  function link(address _to) external {
    require(_to != address(0));
    require(_to != msg.sender);

    AccountLinked({
      from: msg.sender,
      to: _to
    });
  }


  /*
    Transaction functions
  */

  function createTransaction(address _seller, uint256 _amount, bytes32 _metadata, address _policy, address _mediator) external returns (uint256) {
    return _createTransaction(_seller, _amount, _metadata, _policy, _mediator, address(0));
  }

  function createTransaction(address _seller, uint256 _amount, bytes32 _metadata, address _policy, address _mediator, address _owner) external returns (uint256) {
    return _createTransaction(_seller, _amount, _metadata, _policy, _mediator, _owner);
  }

  function revokeTransaction(uint256 _id) external {
    _revokeTransaction(_id, _findTransactionForBuyer(_id));
  }

  function acceptTransaction(uint256 _id) external {
    _acceptTransaction(_id, _findTransactionForSeller(_id));
  }

  function confirmTransaction(uint256 _id) external {
    _confirmTransaction(_id, _findTransactionForBuyer(_id));
  }

  function confirmTransactionAfterExpiry(uint256 _id) external {
    _confirmTransactionAfterExpiry(_id, _findTransactionForSeller(_id));
  }

  function refundTransaction(uint256 _id) external {
    _refundTransaction(_id, _findTransactionForSeller(_id));
  }

  function refundTransactionAfterExpiry(uint256 _id) external {
    _refundTransactionAfterExpiry(_id, _findTransactionForBuyer(_id));
  }

  function disputeTransaction(uint256 _id) external {
    _disputeTransaction(_id, _findTransactionForBuyer(_id));
  }

  function escalateDisputeToMediator(uint256 _id) external {
    _escalateDisputeToMediator(_id, _findTransactionForSeller(_id));
  }

  function settleTransaction(uint256 _id) external {
    _settleTransaction(_id, _findTransactionForParty(_id));
  }

  function refundTransactionByMediator(uint256 _id) external {
    _refundTransactionByMediator(_id, _findTransactionForMediator(_id));
  }

  function confirmTransactionByMediator(uint256 _id) external {
    _confirmTransactionByMediator(_id, _findTransactionForMediator(_id));
  }

  function settleTransactionByMediator(uint256 _id, uint256 _buyerAmount, uint256 _sellerAmount) external {
    _settleTransactionByMediator(_id, _findTransactionForMediator(_id), _buyerAmount, _sellerAmount);
  }

  function provideTransactionFeedback(uint256 _id, uint8 _rating, bytes32 _comment) external {
    _provideTransactionFeedback(_id, _findTransactionForBuyer(_id), _rating, _comment);
  }


  /*
    Private functions
  */

  function _createTransaction(address _seller, uint256 _amount, bytes32 _metadata, address _policy, address _mediator, address _owner) private returns (uint256) {
    require(_seller != address(0) && _seller != msg.sender);
    require(_owner != msg.sender && _owner != _seller);
    require(_amount > 0);

    // Per specifications, if a mediator is involved then a policy is required.
    // Otherwise, policy must be a zero address.
    if (_mediator == address(0)) {
      require(_policy == address(0));
    } else {
      require(_policy != address(0));
    }

    // Increment the transaction.
    uint256 id = globalTransactionId++;

    // Create the transaction.
    Transaction storage transaction = transactions[id];
    transaction.buyer = msg.sender;
    transaction.seller = _seller;
    transaction.state = TransactionState.Initiated;
    transaction.amount = _amount;
    transaction.policy = _policy;

    _resolveMediator(id, transaction, _mediator, _owner);
    _resolveOwner(id, _owner);

    // Emit the event.
    TransactionInitiated({
      id: id,
      owner: _owner,
      buyer: msg.sender,
      seller: _seller,
      policy: _policy,
      mediator: _mediator,
      amount: _amount,
      metadata: _metadata
    });

    // Place the buyer's tokens in escrow (ie. this contract).
    _transferFrom(msg.sender, this, _amount);

    // Return the newly created transaction's id.
    return id;
  }

  function _revokeTransaction(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Initiated);

    TransactionRevoked({ id: _id });

    _transferFromEscrow(_transaction.buyer, _transaction.amount);

    _cleanupTransaction(_id, _transaction, false);
  }

  function _acceptTransaction(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Initiated);

    if (_transaction.mediator != address(0)) {
      _updateTransactionState(_transaction, TransactionState.Accepted);
    }

    TransactionAccepted({ id: _id });

    if (_transaction.mediator == address(0)) {
      // If there is no mediator involved, the transaction is immediately confirmed.
      _completeTransaction(_id, _transaction, TransactionState.Confirmed, _transaction.seller);
    }
  }

  function _confirmTransaction(uint256 _id, Transaction storage _transaction) private {
    TransactionState finalState;

    if (_transaction.state == TransactionState.Accepted) {
      finalState = TransactionState.Confirmed;
    } else if (_transaction.state == TransactionState.Disputed) {
      finalState = TransactionState.ConfirmedAfterDispute;
    } else if (_transaction.state == TransactionState.Escalated) {
      require(_afterExpiry(_transaction, _fetchExpiry(_transaction, Expiry.Mediation)));
      finalState = TransactionState.ConfirmedAfterEscalation;
    } else {
      revert();
    }

    _completeTransaction(_id, _transaction, finalState, _transaction.seller);
  }

  function _confirmTransactionAfterExpiry(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Accepted);
    require(_afterExpiry(_transaction, _fetchExpiry(_transaction, Expiry.Transaction)));

    _completeTransaction(_id, _transaction, TransactionState.ConfirmedAfterExpiry, _transaction.seller);
  }

  function _refundTransaction(uint256 _id, Transaction storage _transaction) private {
    TransactionState finalState;

    if (_transaction.state == TransactionState.Accepted) {
      finalState = TransactionState.Refunded;
    } else if (_transaction.state == TransactionState.Disputed) {
      finalState = TransactionState.RefundedAfterDispute;
    } else if (_transaction.state == TransactionState.Escalated) {
      require(_afterExpiry(_transaction, _fetchExpiry(_transaction, Expiry.Mediation)));
      finalState = TransactionState.RefundedAfterEscalation;
    } else {
      revert();
    }

    _completeTransaction(_id, _transaction, finalState, _transaction.buyer);
  }

  function _refundTransactionAfterExpiry(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Disputed);
    require(_afterExpiry(_transaction, _fetchExpiry(_transaction, Expiry.Escalation)));

    _completeTransaction(_id, _transaction, TransactionState.RefundedAfterExpiry, _transaction.buyer);
  }

  function _disputeTransaction(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Accepted);
    require(_afterExpiry(_transaction, _fetchExpiry(_transaction, Expiry.Fulfillment)));

    _updateTransactionState(_transaction, TransactionState.Disputed);

    TransactionDisputed({ id: _id });
  }

  function _escalateDisputeToMediator(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Disputed);

    _updateTransactionState(_transaction, TransactionState.Escalated);

    TransactionEscalated({ id: _id });
  }

  function _settleTransaction(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Escalated);
    require(_afterExpiry(_transaction, _fetchExpiry(_transaction, Expiry.Mediation)));

    // Divide the escrow amount in half and give it to the buyer. There's
    // a possibility that one account will get slightly more than the other.
    // We have decided to give the lesser amount to the buyer (arbitrarily).
    uint256 buyerAmount = _transaction.amount.div(2);
    // The remaining amount is given to the seller.
    uint256 sellerAmount = _transaction.amount.sub(buyerAmount);

    TransactionSettled({
      id: _id,
      buyerAmount: buyerAmount,
      sellerAmount: sellerAmount
    });

    _transferFromEscrow(_transaction.buyer, buyerAmount);
    _transferFromEscrow(_transaction.seller, sellerAmount);

    _cleanupTransaction(_id, _transaction, true);
  }

  function _refundTransactionByMediator(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Escalated);

    _completeTransaction(_id, _transaction, TransactionState.RefundedByMediator, _transaction.buyer);
  }

  function _confirmTransactionByMediator(uint256 _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Escalated);

    _completeTransaction(_id, _transaction, TransactionState.ConfirmedByMediator, _transaction.seller);
  }

  function _settleTransactionByMediator(uint256 _id, Transaction storage _transaction, uint256 _buyerAmount, uint256 _sellerAmount) private {
    require(_transaction.state == TransactionState.Escalated);
    require(_buyerAmount.add(_sellerAmount) == _transaction.amount);

    uint256 buyerMediatorFee;
    uint256 sellerMediatorFee;

    (buyerMediatorFee, sellerMediatorFee) = InkMediator(_transaction.mediator).settleTransactionByMediatorFee(_buyerAmount, _sellerAmount);

    // Require that the sum of the fees be no more than the transaction's amount.
    require(buyerMediatorFee <= _buyerAmount && sellerMediatorFee <= _sellerAmount);

    TransactionSettledByMediator({
      id: _id,
      buyerAmount: _buyerAmount,
      sellerAmount: _sellerAmount,
      buyerMediatorFee: buyerMediatorFee,
      sellerMediatorFee: sellerMediatorFee
    });

    _transferFromEscrow(_transaction.buyer, _buyerAmount.sub(buyerMediatorFee));
    _transferFromEscrow(_transaction.seller, _sellerAmount.sub(sellerMediatorFee));
    _transferFromEscrow(_transaction.mediator, buyerMediatorFee.add(sellerMediatorFee));

    _cleanupTransaction(_id, _transaction, true);
  }

  function _provideTransactionFeedback(uint256 _id, Transaction storage _transaction, uint8 _rating, bytes32 _comment) private {
    // The transaction must be completed (Null state with a buyer) to allow
    // feedback.
    require(_transaction.state == TransactionState.Null);

    // As per functional specifications, ratings must be an integer between
    // 1 and 5, inclusive.
    require(_rating >= 1 && _rating <= 5);

    FeedbackUpdated({
      transactionId: _id,
      rating: _rating,
      comment: _comment
    });
  }

  function _completeTransaction(uint256 _id, Transaction storage _transaction, TransactionState _finalState, address _transferTo) private {
    uint256 mediatorFee = _fetchMediatorFee(_transaction, _finalState);

    if (_finalState == TransactionState.Confirmed) {
      TransactionConfirmed({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedAfterDispute) {
      TransactionConfirmedAfterDispute({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedAfterEscalation) {
      TransactionConfirmedAfterEscalation({ id: _id });
    } else if (_finalState == TransactionState.ConfirmedAfterExpiry) {
      TransactionConfirmedAfterExpiry({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.Refunded) {
      TransactionRefunded({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedAfterDispute) {
      TransactionRefundedAfterDispute({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedAfterEscalation) {
      TransactionRefundedAfterEscalation({ id: _id });
    } else if (_finalState == TransactionState.RefundedAfterExpiry) {
      TransactionRefundedAfterExpiry({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedByMediator) {
      TransactionRefundedByMediator({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedByMediator) {
      TransactionConfirmedByMediator({ id: _id, mediatorFee: mediatorFee });
    }

    _transferFromEscrow(_transferTo, _transaction.amount.sub(mediatorFee));
    _transferFromEscrow(_transaction.mediator, mediatorFee);

    _cleanupTransaction(_id, _transaction, true);
  }

  function _fetchExpiry(Transaction storage _transaction, Expiry _expiryType) private returns (uint32) {
    uint32 expiry;
    bool success;

    if (_expiryType == Expiry.Transaction) {
      success = _transaction.policy.call.gas(gasLimitForExpiryCall)(bytes4(keccak256("transactionExpiry()")));
    } else if (_expiryType == Expiry.Fulfillment) {
      success = _transaction.policy.call.gas(gasLimitForExpiryCall)(bytes4(keccak256("fulfillmentExpiry()")));
    } else if (_expiryType == Expiry.Escalation) {
      success = _transaction.policy.call.gas(gasLimitForExpiryCall)(bytes4(keccak256("escalationExpiry()")));
    } else if (_expiryType == Expiry.Mediation) {
      success = _transaction.mediator.call.gas(gasLimitForExpiryCall)(bytes4(keccak256("mediationExpiry()")));
    }

    if (success) {
      assembly {
        if eq(returndatasize(), 0x20) {
          let _freeMemPointer := mload(0x40)
          returndatacopy(_freeMemPointer, 0, 0x20)
          expiry := mload(_freeMemPointer)
        }
      }
    }

    return expiry;
  }

  function _fetchMediatorFee(Transaction storage _transaction, TransactionState _finalState) private returns (uint256) {
    if (_transaction.mediator == address(0)) {
      return 0;
    }

    uint256 mediatorFee;
    bool success;

    if (_finalState == TransactionState.Confirmed) {
      success = _transaction.mediator.call.gas(gasLimitForMediatorCall)(bytes4(keccak256("confirmTransactionFee(uint256)")), _transaction.amount);
    } else if (_finalState == TransactionState.ConfirmedAfterExpiry) {
      success = _transaction.mediator.call.gas(gasLimitForMediatorCall)(bytes4(keccak256("confirmTransactionAfterExpiryFee(uint256)")), _transaction.amount);
    } else if (_finalState == TransactionState.ConfirmedAfterDispute) {
      success = _transaction.mediator.call.gas(gasLimitForMediatorCall)(bytes4(keccak256("confirmTransactionAfterDisputeFee(uint256)")), _transaction.amount);
    } else if (_finalState == TransactionState.ConfirmedByMediator) {
      mediatorFee = InkMediator(_transaction.mediator).confirmTransactionByMediatorFee(_transaction.amount);
    } else if (_finalState == TransactionState.Refunded) {
      success = _transaction.mediator.call.gas(gasLimitForMediatorCall)(bytes4(keccak256("refundTransactionFee(uint256)")), _transaction.amount);
    } else if (_finalState == TransactionState.RefundedAfterExpiry) {
      success = _transaction.mediator.call.gas(gasLimitForMediatorCall)(bytes4(keccak256("refundTransactionAfterExpiryFee(uint256)")), _transaction.amount);
    } else if (_finalState == TransactionState.RefundedAfterDispute) {
      success = _transaction.mediator.call.gas(gasLimitForMediatorCall)(bytes4(keccak256("refundTransactionAfterDisputeFee(uint256)")), _transaction.amount);
    } else if (_finalState == TransactionState.RefundedByMediator) {
      mediatorFee = InkMediator(_transaction.mediator).refundTransactionByMediatorFee(_transaction.amount);
    }

    if (success) {
      assembly {
        if eq(returndatasize(), 0x20) {
          let _freeMemPointer := mload(0x40)
          returndatacopy(_freeMemPointer, 0, 0x20)
          mediatorFee := mload(_freeMemPointer)
        }
      }

      // The mediator's fee cannot be more than transaction's amount.
      if (mediatorFee > _transaction.amount) {
        mediatorFee = 0;
      }
    } else {
      require(mediatorFee <= _transaction.amount);
    }

    return mediatorFee;
  }

  function _resolveOwner(uint256 _transactionId, address _owner) private {
    if (_owner != address(0)) {
      // If an owner is specified, it must authorize the transaction.
      require(InkOwner(_owner).authorizeTransaction(
        _transactionId,
        msg.sender
      ));
    }
  }

  function _resolveMediator(uint256 _transactionId, Transaction storage _transaction, address _mediator, address _owner) private {
    if (_mediator != address(0)) {
      // The mediator must accept the transaction otherwise we abort.
      require(InkMediator(_mediator).requestMediator(_transactionId, _transaction.amount, _owner));

      // Assign the mediator to the transaction.
      _transaction.mediator = _mediator;
    }
  }

  function _afterExpiry(Transaction storage _transaction, uint32 _expiry) private view returns (bool) {
    return now.sub(_transaction.stateTime) >= _expiry;
  }

  function _findTransactionForBuyer(uint256 _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(msg.sender == transaction.buyer);
  }

  function _findTransactionForSeller(uint256 _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(msg.sender == transaction.seller);
  }

  function _findTransactionForParty(uint256 _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(msg.sender == transaction.buyer || msg.sender == transaction.seller);
  }

  function _findTransactionForMediator(uint256 _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(msg.sender == transaction.mediator);
  }

  function _findTransaction(uint256 _id) private view returns (Transaction storage transaction) {
    transaction = transactions[_id];
    require(_id < globalTransactionId);
  }

  function _transferFrom(address _from, address _to, uint256 _value) private returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(_from, _to, _value);

    return true;
  }

  function _transferFromEscrow(address _to, uint256 _value) private returns (bool) {
    if (_value > 0) {
      return _transferFrom(this, _to, _value);
    }

    return true;
  }

  function _updateTransactionState(Transaction storage _transaction, TransactionState _state) private {
    _transaction.state = _state;
    _transaction.stateTime = now;
  }

  function _cleanupTransaction(uint256 _id, Transaction storage _transaction, bool _completed) private {
    // Remove data that is no longer needed on the contract.

    if (_completed) {
      delete _transaction.state;
      delete _transaction.seller;
      delete _transaction.policy;
      delete _transaction.mediator;
      delete _transaction.stateTime;
      delete _transaction.amount;
    } else {
      delete transactions[_id];
    }
  }
}
