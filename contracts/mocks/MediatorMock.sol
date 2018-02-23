pragma solidity ^0.4.11;

import '../InkMediator.sol';
import '../InkProtocol.sol';

contract MediatorMock is InkMediator {
  bool raiseError;

  // Response for mediation expiry.
  uint32 mediationExpiryResponse;

  // Response for mediator request.
  bool requestMediatorResponse;

  // Responses for fees.
  uint256 confirmTransactionFeeResponse;
  uint256 confirmTransactionAfterExpiryFeeResponse;
  uint256 confirmTransactionAfterDisputeFeeResponse;
  uint256 confirmTransactionByMediatorFeeResponse;
  uint256 refundTransactionFeeResponse;
  uint256 refundTransactionAfterExpiryFeeResponse;
  uint256 refundTransactionAfterDisputeFeeResponse;
  uint256 refundTransactionByMediatorFeeResponse;
  uint256 settleTransactionByMediatorFeeResponseForBuyer;
  uint256 settleTransactionByMediatorFeeResponseForSeller;

  // Events emitted when callbacks are called.
  event MediationExpiryCalled();
  event RequestMediatorCalled(
    uint256 transactionId,
    uint256 transactionAmount,
    address transactionOwner
  );
  event ConfirmTransactionFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event ConfirmTransactionAfterExpiryFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event ConfirmTransactionAfterDisputeFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event ConfirmTransactionByMediatorFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event RefundTransactionFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event RefundTransactionAfterExpiryFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event RefundTransactionAfterDisputeFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event RefundTransactionByMediatorFeeCalled(uint256 transactionAmount, uint256 gasRemaining);
  event SettleTransactionByMediatorFeeCalled(uint256 buyerAmount, uint256 sellerAmount, uint256 gasRemaining);

  modifier raisesError {
    if (raiseError) {
      assert(false);
    }
    _;
  }

  function MediatorMock() public {
    requestMediatorResponse = true;
    mediationExpiryResponse = 1 days;
    confirmTransactionFeeResponse = 1;
    confirmTransactionAfterExpiryFeeResponse = 1;
    confirmTransactionAfterDisputeFeeResponse = 1;
    confirmTransactionByMediatorFeeResponse = 1;
    refundTransactionFeeResponse = 1;
    refundTransactionAfterExpiryFeeResponse = 1;
    refundTransactionAfterDisputeFeeResponse = 1;
    refundTransactionByMediatorFeeResponse = 1;
    settleTransactionByMediatorFeeResponseForBuyer = 1;
    settleTransactionByMediatorFeeResponseForSeller = 1;
  }

  function setRaiseError(bool _raiseError) external {
    raiseError = _raiseError;
  }

  function setMediationExpiryResponse(uint32 _response) external {
    mediationExpiryResponse = _response;
  }

  function mediationExpiry() external raisesError returns (uint32) {
    MediationExpiryCalled();
    return mediationExpiryResponse;
  }

  function setRequestMediatorResponse(bool _response) external {
    requestMediatorResponse = _response;
  }

  function requestMediator(uint256 _transactionId, uint256 _transactionAmount, address _transactionOwner) external raisesError returns (bool) {
    RequestMediatorCalled({
      transactionId: _transactionId,
      transactionAmount: _transactionAmount,
      transactionOwner: _transactionOwner
    });
    return requestMediatorResponse;
  }

  function setConfirmTransactionFeeResponse(uint256 _response) external {
    confirmTransactionFeeResponse = _response;
  }

  function confirmTransactionFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    _transactionAmount;
    ConfirmTransactionFeeCalled(_transactionAmount, msg.gas);
    return confirmTransactionFeeResponse;
  }

  function setConfirmTransactionAfterExpiryFeeResponse(uint256 _response) external {
    confirmTransactionAfterExpiryFeeResponse = _response;
  }

  function confirmTransactionAfterExpiryFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    ConfirmTransactionAfterExpiryFeeCalled(_transactionAmount, msg.gas);
    return confirmTransactionAfterExpiryFeeResponse;
  }

  function setConfirmTransactionAfterDisputeFeeResponse(uint256 _response) external {
    confirmTransactionAfterDisputeFeeResponse = _response;
  }

  function confirmTransactionAfterDisputeFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    _transactionAmount;
    ConfirmTransactionAfterDisputeFeeCalled(_transactionAmount, msg.gas);
    return confirmTransactionAfterDisputeFeeResponse;
  }

  function setConfirmTransactionByMediatorFeeResponse(uint256 _response) external {
    confirmTransactionByMediatorFeeResponse = _response;
  }

  function confirmTransactionByMediatorFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    ConfirmTransactionByMediatorFeeCalled(_transactionAmount, msg.gas);
    return confirmTransactionByMediatorFeeResponse;
  }

  function setRefundTransactionFeeResponse(uint256 _response) external {
    refundTransactionFeeResponse = _response;
  }

  function refundTransactionFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    RefundTransactionFeeCalled(_transactionAmount, msg.gas);
    return refundTransactionFeeResponse;
  }

  function setRefundTransactionAfterExpiryFeeResponse(uint256 _response) external {
    refundTransactionAfterExpiryFeeResponse = _response;
  }

  function refundTransactionAfterExpiryFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    RefundTransactionAfterExpiryFeeCalled(_transactionAmount, msg.gas);
    return refundTransactionAfterExpiryFeeResponse;
  }

  function setRefundTransactionAfterDisputeFeeResponse(uint256 _response) external {
    refundTransactionAfterDisputeFeeResponse = _response;
  }

  function refundTransactionAfterDisputeFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    RefundTransactionAfterDisputeFeeCalled(_transactionAmount, msg.gas);
    return refundTransactionAfterDisputeFeeResponse;
  }

  function setRefundTransactionByMediatorFeeResponse(uint256 _response) external {
    refundTransactionByMediatorFeeResponse = _response;
  }

  function refundTransactionByMediatorFee(uint256 _transactionAmount) external raisesError returns (uint256) {
    RefundTransactionByMediatorFeeCalled(_transactionAmount, msg.gas);
    return refundTransactionByMediatorFeeResponse;
  }

  function setSettleTransactionByMediatorFeeResponseForBuyer(uint256 _response) external {
    settleTransactionByMediatorFeeResponseForBuyer = _response;
  }

  function setSettleTransactionByMediatorFeeResponseForSeller(uint256 _response) external {
    settleTransactionByMediatorFeeResponseForSeller = _response;
  }

  function settleTransactionByMediatorFee(uint256 _buyerAmount, uint256 _sellerAmount) external raisesError returns (uint256, uint256) {
    SettleTransactionByMediatorFeeCalled({
      buyerAmount: _buyerAmount,
      sellerAmount: _sellerAmount,
      gasRemaining: msg.gas
    });
    return (settleTransactionByMediatorFeeResponseForBuyer, settleTransactionByMediatorFeeResponseForSeller);
  }

  function refundTransaction(address _ink, uint256 _transactionId) external {
    InkProtocol(_ink).refundTransactionByMediator(_transactionId);
  }

  function confirmTransaction(address _ink, uint256 _transactionId) external {
    InkProtocol(_ink).confirmTransactionByMediator(_transactionId);
  }

  function settleTransaction(address _ink, uint256 _transactionId, uint256 _buyerAmount, uint256 _sellerAmount) external {
    InkProtocol(_ink).settleTransactionByMediator(_transactionId, _buyerAmount, _sellerAmount);
  }

  // Proxy functions

  function proxyRevokeTransaction(address _ink, uint256 _id) external {
    InkProtocol(_ink).revokeTransaction(_id);
  }

  function proxyAcceptTransaction(address _ink, uint256 _id) external {
    InkProtocol(_ink).acceptTransaction(_id);
  }

  function proxyConfirmTransaction(address _ink, uint256 _id) external {
    InkProtocol(_ink).confirmTransaction(_id);
  }

  function proxyConfirmTransactionAfterExpiry(address _ink, uint256 _id) external {
    InkProtocol(_ink).confirmTransactionAfterExpiry(_id);
  }

  function proxyRefundTransaction(address _ink, uint256 _id) external {
    InkProtocol(_ink).refundTransaction(_id);
  }

  function proxyRefundTransactionAfterExpiry(address _ink, uint256 _id) external {
    InkProtocol(_ink).refundTransactionAfterExpiry(_id);
  }

  function proxyDisputeTransaction(address _ink, uint256 _id) external {
    InkProtocol(_ink).disputeTransaction(_id);
  }

  function proxyEscalateDisputeToMediator(address _ink, uint256 _id) external {
    InkProtocol(_ink).escalateDisputeToMediator(_id);
  }

  function proxySettleTransaction(address _ink, uint256 _id) external {
    InkProtocol(_ink).settleTransaction(_id);
  }

  function proxyProvideTransactionFeedback(address _ink, uint256 _id, uint8 _rating, bytes32 _comment) external {
    InkProtocol(_ink).provideTransactionFeedback(_id, _rating, _comment);
  }
}
