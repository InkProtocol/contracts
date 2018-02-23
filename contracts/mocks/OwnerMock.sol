pragma solidity ^0.4.11;

import '../InkOwner.sol';
import '../InkProtocolInterface.sol';

contract OwnerMock is InkOwner {
  bool authorizeTransactionResponse;

  // Events emitted when callbacks are called.
  event AuthorizeTransactionCalled(
    uint256 transactionId,
    address buyer
  );

  event TransactionCreated(
    uint256 transactionId
  );

  function OwnerMock() public {
    authorizeTransactionResponse = true;
  }

  function setAuthorizeTransactionResponse(bool _response) external {
    authorizeTransactionResponse = _response;
  }

  function authorizeTransaction(uint256 _id, address _buyer) external returns (bool) {
    AuthorizeTransactionCalled({
      transactionId: _id,
      buyer: _buyer
    });
    return authorizeTransactionResponse;
  }

  // Proxy functions

  function proxyCreateTransaction(InkProtocolInterface _ink, address _seller, uint256 _amount, bytes32 _metadata, address _policy, address _mediator, address _owner) external {
    TransactionCreated({
      transactionId: _ink.createTransaction(_seller, _amount, _metadata, _policy, _mediator, _owner)
    });
  }

  function proxyRevokeTransaction(InkProtocolInterface _ink, uint256 _id) external {
    _ink.revokeTransaction(_id);
  }

  function proxyAcceptTransaction(InkProtocolInterface _ink, uint256 _id) external {
    _ink.acceptTransaction(_id);
  }

  function proxyConfirmTransaction(InkProtocolInterface _ink, uint256 _id) external {
    _ink.confirmTransaction(_id);
  }

  function proxyConfirmTransactionAfterExpiry(InkProtocolInterface _ink, uint256 _id) external {
    _ink.confirmTransactionAfterExpiry(_id);
  }

  function proxyRefundTransaction(InkProtocolInterface _ink, uint256 _id) external {
    _ink.refundTransaction(_id);
  }

  function proxyRefundTransactionAfterExpiry(InkProtocolInterface _ink, uint256 _id) external {
    _ink.refundTransactionAfterExpiry(_id);
  }

  function proxyDisputeTransaction(InkProtocolInterface _ink, uint256 _id) external {
    _ink.disputeTransaction(_id);
  }

  function proxyEscalateDisputeToMediator(InkProtocolInterface _ink, uint256 _id) external {
    _ink.escalateDisputeToMediator(_id);
  }

  function proxySettleTransaction(InkProtocolInterface _ink, uint256 _id) external {
    _ink.settleTransaction(_id);
  }

  function proxyRefundTransactionByMediator(InkProtocolInterface _ink, uint256 _id) external {
    _ink.refundTransactionByMediator(_id);
  }

  function proxyConfirmTransactionByMediator(InkProtocolInterface _ink, uint256 _id) external {
    _ink.confirmTransactionByMediator(_id);
  }

  function proxySettleTransactionByMediator(InkProtocolInterface _ink, uint256 _id, uint256 _buyerAmount, uint256 _sellerAmount) external {
    _ink.settleTransactionByMediator(_id, _buyerAmount, _sellerAmount);
  }

  function proxyProvideTransactionFeedback(InkProtocolInterface _ink, uint256 _id, uint8 _rating, bytes32 _comment) external {
    _ink.provideTransactionFeedback(_id, _rating, _comment);
  }
}
