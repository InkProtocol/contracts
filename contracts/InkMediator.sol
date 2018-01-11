pragma solidity ^0.4.11;

interface InkMediator {
  function requestMediator(uint _transactionId, uint _transactionAmount) external returns (bool, uint32);
  function confirmTransactionFee(uint _transactionAmount) external returns (uint);
  function confirmTransactionAfterExpiryFee(uint _transactionAmount) external returns (uint);
  function confirmTransactionAfterDisputeFee(uint _transactionAmount) external returns (uint);
  function confirmTransactionByMediatorFee(uint _transactionAmount) external returns (uint);
  function refundTransactionFee(uint _transactionAmount) external returns (uint);
  function refundTransactionAfterExpiryFee(uint _transactionAmount) external returns (uint);
  function refundTransactionAfterDisputeFee(uint _transactionAmount) external returns (uint);
  function refundTransactionByMediatorFee(uint _transactionAmount) external returns (uint);
  function settleTransactionByMediatorFee(uint _buyerAmount, uint _sellerAmount) external returns (uint, uint);
}
