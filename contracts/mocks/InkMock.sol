pragma solidity ^0.4.11;

import '../Ink.sol';

contract InkMock is Ink {
  function InkMock() {
    balances[msg.sender] = totalSupply;
  }

  function _updateTransactionState(uint _id, TransactionState _state) external {
    transactions[_id].state = _state;
  }

  function _fetchTransaction(uint _id) external constant returns (address, address, address, address, TransactionState, uint) {
    var transaction = transactions[_id];

    return (transaction.creator,
            transaction.buyer,
            transaction.seller,
            transaction.mediator,
            transaction.state,
            transaction.amount);
  }
}
