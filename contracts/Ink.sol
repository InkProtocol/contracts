pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/StandardToken.sol';
import './InkMediator.sol';
import './InkPolicy.sol';

contract Ink is StandardToken {
  string public constant name = "Ink Protocol";
  string public constant symbol = "XNK";
  uint8 public constant decimals = 18;

  // A total supply of 500,000,000 Ink Tokens.
  uint public constant totalSupply = 500000000000000000000000000;

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
    Settled,                  // 17

    // This is an internal state to represent a completed transaction.
    Completed                 // 18
  }

  uint private globalTransactionId = 0;

  mapping(address => mapping(address => bool)) private agents;
  mapping(uint => Transaction) internal transactions;

  struct Transaction {
    address creator;
    address buyer;
    address seller;
    address policy;
    address mediator;
    uint32 mediationExpiry;
    TransactionState state;
    uint stateTime;
    uint amount;
  }

  event TransactionInitiated(
    uint indexed id,
    address creator,
    address indexed buyer,
    address indexed seller,
    address policy,
    address mediator,
    uint amount,
    bytes32 metadata
  );

  event TransactionAccepted(
    uint indexed id
  );

  event TransactionDisputed(
    uint indexed id
  );

  event TransactionEscalated(
    uint indexed id
  );

  event TransactionRevoked(
    uint indexed id
  );

  event TransactionRefundedByMediator(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionSettledByMediator(
    uint indexed id,
    uint buyerAmount,
    uint sellerAmount,
    uint buyerMediatorFee,
    uint sellerMediatorFee
  );

  event TransactionConfirmedByMediator(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionConfirmed(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionRefunded(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionConfirmedAfterExpiry(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionConfirmedAfterDispute(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionRefundedAfterDispute(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionRefundedAfterExpiry(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionConfirmedAfterEscalation(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionRefundedAfterEscalation(
    uint indexed id,
    uint mediatorFee
  );

  event TransactionSettled(
    uint indexed id,
    uint buyerAmount,
    uint sellerAmount
  );

  event FeedbackUpdated(
    uint indexed transactionId,
    uint8 rating,
    bytes32 comment
  );

  event AccountLinked(
    address indexed from,
    address indexed to
  );

  event DebugUint(string _name, uint _uint);
  event DebugBool(string _name, bool _bool);
  event DebugAddress(string _name, address _address);
  event DebugString(string _string);

  /*
    Constructor
  */

  function Ink() public {
    // TODO: Add distribution logic here.
  }


  /*
    Agent functions
  */

  function authorize(address _agent) external {
    require(_agent != address(0));
    require(msg.sender != _agent);

    agents[msg.sender][_agent] = true;
  }

  function deauthorize(address _agent) external {
    require(_agent != address(0));
    require(msg.sender != _agent);

    delete agents[msg.sender][_agent];
  }

  function authorizedBy(address _account) public view returns (bool) {
    require(_account != address(0));

    return msg.sender == _account || agents[_account][msg.sender];
  }


  /*
    Account linking functions
  */

  function linkWith(address _account) external {
    _link(msg.sender, _account);
  }

  function link(address _from, address _to) external {
    require(authorizedBy(_from));

    _link(_from, _to);
  }


  /*
    Transaction functions
  */

  function createTransaction(address _seller, uint _amount, bytes32 _metadata, address _policy, address _mediator) external {
    _createTransaction(msg.sender, _seller, _amount, _metadata, _policy, _mediator, false);
  }

  function createTransactionForBuyer(address _buyer, address _seller, uint _amount, bytes32 _metadata, address _policy, address _mediator) external {
    require(authorizedBy(_buyer));
    _createTransaction(_buyer, _seller, _amount, _metadata, _policy, _mediator, false);
  }

  function createTransactionForBuyerAndSeller(address _buyer, address _seller, uint _amount, bytes32 _metadata, address _policy, address _mediator) external {
    require(authorizedBy(_buyer) && authorizedBy(_seller));
    _createTransaction(_buyer, _seller, _amount, _metadata, _policy, _mediator, true);
  }

  function revokeTransaction(uint _id) external {
    _revokeTransaction(_id, _findTransactionForBuyer(_id));
  }

  function acceptTransaction(uint _id) external {
    _acceptTransaction(_id, _findTransactionForSeller(_id));
  }

  function confirmTransaction(uint _id) external {
    _confirmTransaction(_id, _findTransactionForBuyer(_id));
  }

  function confirmTransactionAfterExpiry(uint _id) external {
    _confirmTransactionAfterExpiry(_id, _findTransactionForSeller(_id));
  }

  function refundTransaction(uint _id) external {
    _refundTransaction(_id, _findTransactionForSeller(_id));
  }

  function refundTransactionAfterExpiry(uint _id) external {
    _refundTransactionAfterExpiry(_id, _findTransactionForBuyer(_id));
  }

  function disputeTransaction(uint _id) external {
    _disputeTransaction(_id, _findTransactionForBuyer(_id));
  }

  function escalateDisputeToMediator(uint _id) external {
    _escalateDisputeToMediator(_id, _findTransactionForSeller(_id));
  }

  function settleTransaction(uint _id) external {
    _settleTransaction(_id, _findTransactionForParty(_id));
  }

  function refundTransactionByMediator(uint _id) external {
    _refundTransactionByMediator(_id, _findTransactionForMediator(_id));
  }

  function confirmTransactionByMediator(uint _id) external {
    _confirmTransactionByMediator(_id, _findTransactionForMediator(_id));
  }

  function settleTransactionByMediator(uint _id, uint _buyerAmount, uint _sellerAmount) external {
    _settleTransactionByMediator(_id, _findTransactionForMediator(_id), _buyerAmount, _sellerAmount);
  }

  function provideTransactionFeedback(uint _id, uint8 _rating, bytes32 _comment) external {
    _provideTransactionFeedback(_id, _findTransactionForFeedback(_id), _rating, _comment);
  }


  /*
    Private functions
  */

  function _createTransaction(address _buyer, address _seller, uint _amount, bytes32 _metadata, address _policy, address _mediator, bool _accepted) private {
    require(_buyer != address(0) && _seller != address(0));
    require(_buyer != _seller);
    require(_amount > 0);

    // Per specifications, if a mediator is involved then a policy is required.
    // Otherwise, policy must be a zero address.
    if (_mediator == address(0)) {
      require(_policy == address(0));
    } else {
      require(_policy != address(0));
    }

    // Increment the transaction.
    uint id = globalTransactionId++;

    Transaction storage transaction = transactions[id];

    // Create the transaction.
    if (msg.sender != _buyer) {
      transaction.creator = msg.sender;
    }
    transaction.buyer = _buyer;
    transaction.seller = _seller;
    transaction.state = TransactionState.Initiated;
    transaction.amount = _amount;
    transaction.policy = _policy;

    _resolveMediator(id, transaction, _mediator);

    // Emit the event.
    TransactionInitiated({
      id: id,
      creator: msg.sender,
      buyer: transaction.buyer,
      seller: transaction.seller,
      policy: _policy,
      mediator: _mediator,
      amount: transaction.amount,
      metadata: _metadata
    });

    // Place the buyer's tokens in escrow (ie. this contract).
    _transferFrom(_buyer, this, _amount);

    if (_accepted) {
      _acceptTransaction(id, transaction);
    }
  }

  function _revokeTransaction(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Initiated);

    TransactionRevoked({ id: _id });

    _transferFromTransaction(_transaction.buyer, _transaction.amount);

    _cleanupTransaction(_id, _transaction, false);
  }

  function _acceptTransaction(uint _id, Transaction storage _transaction) private {
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

  function _confirmTransaction(uint _id, Transaction storage _transaction) private {
    TransactionState finalState;

    if (_transaction.state == TransactionState.Accepted) {
      finalState = TransactionState.Confirmed;
    } else if (_transaction.state == TransactionState.Disputed) {
      finalState = TransactionState.ConfirmedAfterDispute;
    } else if (_transaction.state == TransactionState.Escalated) {
      require(_afterExpiry(_transaction, _transaction.mediationExpiry));
      finalState = TransactionState.ConfirmedAfterEscalation;
    } else {
      revert();
    }

    _completeTransaction(_id, _transaction, finalState, _transaction.seller);
  }

  function _confirmTransactionAfterExpiry(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Accepted);
    require(_afterExpiry(_transaction, InkPolicy(_transaction.policy).transactionExpiry()));

    _completeTransaction(_id, _transaction, TransactionState.ConfirmedAfterExpiry, _transaction.seller);
  }

  function _refundTransaction(uint _id, Transaction storage _transaction) private {
    TransactionState finalState;

    if (_transaction.state == TransactionState.Accepted) {
      finalState = TransactionState.Refunded;
    } else if (_transaction.state == TransactionState.Disputed) {
      finalState = TransactionState.RefundedAfterDispute;
    } else if (_transaction.state == TransactionState.Escalated) {
      require(_afterExpiry(_transaction, _transaction.mediationExpiry));
      finalState = TransactionState.RefundedAfterEscalation;
    } else {
      revert();
    }

    _completeTransaction(_id, _transaction, finalState, _transaction.buyer);
  }

  function _refundTransactionAfterExpiry(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Disputed);
    require(_afterExpiry(_transaction, InkPolicy(_transaction.policy).escalationExpiry()));

    _completeTransaction(_id, _transaction, TransactionState.RefundedAfterExpiry, _transaction.buyer);
  }

  function _disputeTransaction(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Accepted);
    require(_afterExpiry(_transaction, InkPolicy(_transaction.policy).fulfillmentExpiry()));

    _updateTransactionState(_transaction, TransactionState.Disputed);

    TransactionDisputed({ id: _id });
  }

  function _escalateDisputeToMediator(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Disputed);

    _updateTransactionState(_transaction, TransactionState.Escalated);

    TransactionEscalated({ id: _id });
  }

  function _settleTransaction(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Escalated);
    require(_afterExpiry(_transaction, _transaction.mediationExpiry));

    // Divide the escrow amount in half and give it to the buyer. There's
    // a possibility that one account will get slightly more than the other.
    // We have decided to give the lesser amount to the buyer (arbitrarily).
    uint buyerAmount = _transaction.amount.div(2);
    // The remaining amount is given to the seller.
    uint sellerAmount = _transaction.amount.sub(buyerAmount);

    TransactionSettled({
      id: _id,
      buyerAmount: buyerAmount,
      sellerAmount: sellerAmount
    });

    _transferFromTransaction(_transaction.buyer, buyerAmount);
    _transferFromTransaction(_transaction.seller, sellerAmount);

    _cleanupTransaction(_id, _transaction, true);
  }

  function _refundTransactionByMediator(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Escalated);

    _completeTransaction(_id, _transaction, TransactionState.RefundedByMediator, _transaction.buyer);
  }

  function _confirmTransactionByMediator(uint _id, Transaction storage _transaction) private {
    require(_transaction.state == TransactionState.Escalated);

    _completeTransaction(_id, _transaction, TransactionState.ConfirmedByMediator, _transaction.seller);
  }

  function _settleTransactionByMediator(uint _id, Transaction storage _transaction, uint _buyerAmount, uint _sellerAmount) private {
    require(_transaction.state == TransactionState.Escalated);
    require(_buyerAmount.add(_sellerAmount) == _transaction.amount);

    uint buyerMediatorFee;
    uint sellerMediatorFee;

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

    _transferFromTransaction(_transaction.buyer, _buyerAmount.sub(buyerMediatorFee));
    _transferFromTransaction(_transaction.seller, _sellerAmount.sub(sellerMediatorFee));
    _transferFromTransaction(_transaction.mediator, buyerMediatorFee.add(sellerMediatorFee));

    _cleanupTransaction(_id, _transaction, true);
  }

  function _provideTransactionFeedback(uint _id, Transaction storage _transaction, uint8 _rating, bytes32 _comment) private {
    // The transaction must be in the completed state to allow feedback.
    require(_transaction.state == TransactionState.Completed);

    // As per functional specifications, ratings must be an integer between
    // 1 and 5, inclusive.
    require(_rating >= 1 && _rating <= 5);

    FeedbackUpdated({
      transactionId: _id,
      rating: _rating,
      comment: _comment
    });
  }

  function _completeTransaction(uint _id, Transaction storage _transaction, TransactionState _finalState, address _transferTo) private {
    uint mediatorFee = _fetchMediatorFee(_transaction, _finalState);

    if (_finalState == TransactionState.Confirmed) {
      TransactionConfirmed({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedAfterDispute) {
      TransactionConfirmedAfterDispute({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedAfterEscalation) {
      TransactionConfirmedAfterEscalation({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedAfterExpiry) {
      TransactionConfirmedAfterExpiry({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.Refunded) {
      TransactionRefunded({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedAfterDispute) {
      TransactionRefundedAfterDispute({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedAfterEscalation) {
      TransactionRefundedAfterEscalation({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedAfterExpiry) {
      TransactionRefundedAfterExpiry({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.RefundedByMediator) {
      TransactionRefundedByMediator({ id: _id, mediatorFee: mediatorFee });
    } else if (_finalState == TransactionState.ConfirmedByMediator) {
      TransactionConfirmedByMediator({ id: _id, mediatorFee: mediatorFee });
    }

    _transferFromTransaction(_transferTo, _transaction.amount.sub(mediatorFee));
    _transferFromTransaction(_transaction.mediator, mediatorFee);

    _cleanupTransaction(_id, _transaction, true);
  }

  function _fetchMediatorFee(Transaction storage _transaction, TransactionState _finalState) private returns (uint) {
    if (_transaction.mediator == address(0)) {
      return 0;
    }

    uint mediatorFee;
    InkMediator mediator = InkMediator(_transaction.mediator);

    if (_finalState == TransactionState.Confirmed) {
      mediatorFee = mediator.confirmTransactionFee(_transaction.amount);
    } else if (_finalState == TransactionState.ConfirmedAfterExpiry) {
      mediatorFee = mediator.confirmTransactionAfterExpiryFee(_transaction.amount);
    } else if (_finalState == TransactionState.ConfirmedAfterDispute) {
      mediatorFee = mediator.confirmTransactionAfterDisputeFee(_transaction.amount);
    } else if (_finalState == TransactionState.ConfirmedByMediator) {
      mediatorFee = mediator.confirmTransactionByMediatorFee(_transaction.amount);
    } else if (_finalState == TransactionState.Refunded) {
      mediatorFee = mediator.refundTransactionFee(_transaction.amount);
    } else if (_finalState == TransactionState.RefundedAfterExpiry) {
      mediatorFee = mediator.refundTransactionAfterExpiryFee(_transaction.amount);
    } else if (_finalState == TransactionState.RefundedAfterDispute) {
      mediatorFee = mediator.refundTransactionAfterDisputeFee(_transaction.amount);
    } else if (_finalState == TransactionState.RefundedByMediator) {
      mediatorFee = mediator.refundTransactionByMediatorFee(_transaction.amount);
    }

    // The mediator's fee cannot be more than transaction's amount.
    require(mediatorFee <= _transaction.amount);

    return mediatorFee;
  }

  function _resolveMediator(uint _transactionId, Transaction storage _transaction, address _mediator) private {
    if (_mediator != address(0)) {
      bool mediatorAccepted;

      _transaction.mediator = _mediator;

      // We need to see if the mediator will accept this transaction.
      (
        mediatorAccepted,
        _transaction.mediationExpiry
      ) = InkMediator(_mediator).requestMediator(_transactionId, _transaction.amount);

      // The mediator must have accepted the transaction otherwise we abort.
      require(mediatorAccepted);
    }
  }

  function _afterExpiry(Transaction storage _transaction, uint32 _expiry) private view returns (bool) {
    return now.sub(_transaction.stateTime) >= _expiry;
  }

  function _findTransactionForBuyer(uint _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(authorizedBy(transaction.buyer));
  }

  function _findTransactionForSeller(uint _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(authorizedBy(transaction.seller));
  }

  function _findTransactionForParty(uint _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(authorizedBy(transaction.buyer) || authorizedBy(transaction.seller));
  }

  function _findTransactionForMediator(uint _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);
    require(transaction.mediator == msg.sender);
  }

  function _findTransactionForFeedback(uint _id) private view returns (Transaction storage transaction) {
    transaction = _findTransaction(_id);

    // If the creator is not set, then the creator is the buyer.
    if (transaction.creator == address(0)) {
      // The transaction was created by the buyer so the buyer is allowed
      // to update their feedback comment at anytime.
      require(msg.sender == transaction.buyer);
    } else {
      // The transaction was created by an agent so the agent must be the one
      // making the update AND the agent must be authorized by the buyer.
      require(msg.sender == transaction.creator && authorizedBy(transaction.buyer));
    }
  }

  function _findTransaction(uint _id) private view returns (Transaction storage transaction) {
    transaction = transactions[_id];

    require(transaction.state != TransactionState.Null);
  }

  function _transferFrom(address _from, address _to, uint _value) private returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(_from, _to, _value);

    return true;
  }

  function _transferFromTransaction(address _to, uint _value) private returns (bool) {
    if (_value > 0) {
      return _transferFrom(this, _to, _value);
    }

    return true;
  }

  function _updateTransactionState(Transaction storage _transaction, TransactionState _state) private {
    _transaction.state = _state;
    _transaction.stateTime = now;
  }

  function _cleanupTransaction(uint _id, Transaction storage _transaction, bool _completed) private {
    // Remove data that is no longer needed on the contract.

    if (_completed) {
      _transaction.state = TransactionState.Completed;

      delete _transaction.seller;
      delete _transaction.policy;
      delete _transaction.mediator;
      delete _transaction.stateTime;
      delete _transaction.amount;
    } else {
      delete transactions[_id];
    }
  }

  function _link(address _from, address _to) private {
    require(_from != address(0) && _to != address(0));
    require(_from != _to);

    AccountLinked({
      from: _from,
      to: _to
    });
  }
}
