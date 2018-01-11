pragma solidity ^0.4.11;

import '../InkPolicy.sol';

contract PolicyMock is InkPolicy {
  function transactionExpiry() external pure returns (uint32) {
    return 8 days;
  }

  function fulfillmentExpiry() external pure returns (uint32) {
    return 7 days;
  }

  function escalationExpiry() external pure returns (uint32) {
    return 6 days;
  }
}
