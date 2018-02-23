pragma solidity ^0.4.11;

interface InkMediator {
  function mediationExpiry() external returns (uint32);
  function requestMediator(uint256 _transactionId, uint256 _transactionAmount, address _transactionOwner) external returns (bool);
  function confirmTransactionFee(uint256 _transactionAmount) external returns (uint256);
  function confirmTransactionAfterExpiryFee(uint256 _transactionAmount) external returns (uint256);
  function confirmTransactionAfterDisputeFee(uint256 _transactionAmount) external returns (uint256);
  function confirmTransactionByMediatorFee(uint256 _transactionAmount) external returns (uint256);
  function refundTransactionFee(uint256 _transactionAmount) external returns (uint256);
  function refundTransactionAfterExpiryFee(uint256 _transactionAmount) external returns (uint256);
  function refundTransactionAfterDisputeFee(uint256 _transactionAmount) external returns (uint256);
  function refundTransactionByMediatorFee(uint256 _transactionAmount) external returns (uint256);
  function settleTransactionByMediatorFee(uint256 _buyerAmount, uint256 _sellerAmount) external returns (uint256, uint256);
}
