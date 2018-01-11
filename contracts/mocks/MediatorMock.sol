pragma solidity ^0.4.11;

import '../InkMediator.sol';
import '../Ink.sol';

contract MediatorMock is InkMediator {
  function requestMediator(uint _transactionId, uint _transactionAmount) external returns (bool, uint32) {
    _transactionId;
    _transactionAmount;
    return (true, 10 days);
  }

  function refundTransaction(uint _transactionId, address _ink) external {
    Ink(_ink).refundTransactionByMediator(_transactionId);
  }

  function confirmTransaction(uint _transactionId, address _ink) external {
    Ink(_ink).confirmTransactionByMediator(_transactionId);
  }

  function settleTransaction(uint _transactionId, uint _buyerAmount, uint _sellerAmount, address _ink) external {
    Ink(_ink).settleTransactionByMediator(_transactionId, _buyerAmount, _sellerAmount);
  }

  function confirmTransactionFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 10;
  }

  function confirmTransactionAfterExpiryFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 11;
  }

  function confirmTransactionAfterDisputeFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 12;
  }

  function confirmTransactionByMediatorFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 13;
  }

  function refundTransactionFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 14;
  }

  function refundTransactionAfterExpiryFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 15;
  }

  function refundTransactionAfterDisputeFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 16;
  }

  function refundTransactionByMediatorFee(uint _transactionAmount) external returns (uint) {
    _transactionAmount;
    return 17;
  }

  function settleTransactionByMediatorFee(uint _buyerAmount, uint _sellerAmount) external returns (uint, uint) {
    return (_buyerAmount / 10, _sellerAmount / 10);
  }

  function _selfdestruct(address _recipient) external {
    selfdestruct(_recipient);
  }
}
