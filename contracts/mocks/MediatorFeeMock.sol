pragma solidity ^0.4.11;

import './MediatorMock.sol';

contract MediatorFeeMock is MediatorMock {
  uint private buyerFee = 0;
  uint private sellerFee = 0;

  function MediatorFeeMock(uint _buyerFee, uint _sellerFee) public {
    buyerFee = _buyerFee;
    sellerFee = _sellerFee;
  }

  function settleTransactionByMediatorFee(uint _buyerAmount, uint _sellerAmount) external returns (uint, uint) {
    // XXX: Remove warnings by referencing the variable.
    _buyerAmount;
    _sellerAmount;

    return (buyerFee, sellerFee);
  }
}
