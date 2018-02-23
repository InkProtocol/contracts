pragma solidity ^0.4.11;

import '../InkPolicy.sol';

contract ErrorPolicyMock is InkPolicy {
  function transactionExpiry() external pure returns (uint32) {
    assert(false);
    return 8 days;
  }

  function fulfillmentExpiry() external pure returns (uint32) {
    assert(false);
    return 7 days;
  }

  function escalationExpiry() external pure returns (uint32) {
    assert(false);
    return 6 days;
  }
}
