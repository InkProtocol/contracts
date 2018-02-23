pragma solidity ^0.4.11;

interface InkProtocolInterface {
  // Event emitted when a transaction is initiated.
  event TransactionInitiated(
    uint256 indexed id,
    address owner,
    address indexed buyer,
    address indexed seller,
    address policy,
    address mediator,
    uint256 amount,
    // A hash string representing the metadata for the transaction. This is
    // somewhat arbitrary for the transaction. Only the transaction owner
    // will really know the original contents of the metadata and may choose
    // to share it at their discretion.
    bytes32 metadata
  );

  // Event emitted when a transaction has been accepted by the seller.
  event TransactionAccepted(
    uint256 indexed id
  );

  // Event emitted when a transaction has been disputed by the buyer.
  event TransactionDisputed(
    uint256 indexed id
  );

  // Event emitted when a transaction is escalated to the mediator by the
  // seller.
  event TransactionEscalated(
    uint256 indexed id
  );

  // Event emitted when a transaction is revoked by the seller.
  event TransactionRevoked(
    uint256 indexed id
  );

  // Event emitted when a transaction is revoked by the seller.
  event TransactionRefundedByMediator(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is settled by the mediator.
  event TransactionSettledByMediator(
    uint256 indexed id,
    uint256 buyerAmount,
    uint256 sellerAmount,
    uint256 buyerMediatorFee,
    uint256 sellerMediatorFee
  );

  // Event emitted when a transaction is confirmed by the mediator.
  event TransactionConfirmedByMediator(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is confirmed by the buyer.
  event TransactionConfirmed(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is refunded by the seller.
  event TransactionRefunded(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is confirmed by the seller after the
  // transaction expiry.
  event TransactionConfirmedAfterExpiry(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is confirmed by the buyer after it was
  // disputed.
  event TransactionConfirmedAfterDispute(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is refunded by the seller after it was
  // disputed.
  event TransactionRefundedAfterDispute(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is refunded by the buyer after the
  // escalation expiry.
  event TransactionRefundedAfterExpiry(
    uint256 indexed id,
    uint256 mediatorFee
  );

  // Event emitted when a transaction is confirmed by the buyer after the
  // mediation expiry.
  event TransactionConfirmedAfterEscalation(
    uint256 indexed id
  );

  // Event emitted when a transaction is refunded by the seller after the
  // mediation expiry.
  event TransactionRefundedAfterEscalation(
    uint256 indexed id
  );

  // Event emitted when a transaction is settled by either the buyer or the
  // seller after the mediation expiry.
  event TransactionSettled(
    uint256 indexed id,
    uint256 buyerAmount,
    uint256 sellerAmount
  );

  // Event emitted when a transaction's feedback is updated by the buyer.
  event FeedbackUpdated(
    uint256 indexed transactionId,
    uint8 rating,
    bytes32 comment
  );

  // Event emitted an account is (unidirectionally) linked to another account.
  // For two accounts to be acknowledged as linked, the linkage must be
  // bidirectional.
  event AccountLinked(
    address indexed from,
    address indexed to
  );

  /* Protocol */
  function link(address _to) external;
  function createTransaction(address _seller, uint256 _amount, bytes32 _metadata, address _policy, address _mediator) external returns (uint256);
  function createTransaction(address _seller, uint256 _amount, bytes32 _metadata, address _policy, address _mediator, address _owner) external returns (uint256);
  function revokeTransaction(uint256 _id) external;
  function acceptTransaction(uint256 _id) external;
  function confirmTransaction(uint256 _id) external;
  function confirmTransactionAfterExpiry(uint256 _id) external;
  function refundTransaction(uint256 _id) external;
  function refundTransactionAfterExpiry(uint256 _id) external;
  function disputeTransaction(uint256 _id) external;
  function escalateDisputeToMediator(uint256 _id) external;
  function settleTransaction(uint256 _id) external;
  function refundTransactionByMediator(uint256 _id) external;
  function confirmTransactionByMediator(uint256 _id) external;
  function settleTransactionByMediator(uint256 _id, uint256 _buyerAmount, uint256 _sellerAmount) external;
  function provideTransactionFeedback(uint256 _id, uint8 _rating, bytes32 _comment) external;

  /* ERC20 */
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  function allowance(address owner, address spender) public view returns (uint256);
  function increaseApproval(address spender, uint addedValue) public returns (bool);
  function decreaseApproval(address spender, uint subtractedValue) public returns (bool);
}
