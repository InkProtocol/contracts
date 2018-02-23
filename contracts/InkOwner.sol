pragma solidity ^0.4.11;

interface InkOwner {
  function authorizeTransaction(uint256 _id, address _buyer) external returns (bool);
}
