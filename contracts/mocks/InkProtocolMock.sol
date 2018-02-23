pragma solidity ^0.4.11;

import '../InkProtocolCore.sol';

contract InkProtocolMock is InkProtocolCore {
  function InkProtocolMock() public {
    balances[msg.sender] = totalSupply_;
  }
}
