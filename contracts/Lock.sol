// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// import "hardhat/console.sol";

contract InteropLabsWallet {
  address[] public signers;

  modifier onlyTxAuth() {
    _verifyTxAuth();
    _;
  }

  constructor(address[] memory _signers) {
    signers = _signers;
  }


 function verifySignature(bytes32 message, bytes memory signature) public view returns (bool) {
  bytes32 messageHash = keccak256(abi.encodePacked(message));
  bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);

  return ECDSA.recover(ethSignedMessageHash, signature) == owner;
 }

 function executeVerifiedTransaction(bytes32 message, bytes memory signature) public {

 }

 function _verifyTxAuth() internal view {
 }


function changeSigners(address _newSigner) onlyTxAuth public {
    //Remove msg.sender from signers
    for (uint i = 0; i < signers.length; i++) {
        if (signers[i] == msg.sender) {
            signers[i] = _newSigner;
        }
    }

    emit NewSignerSet(msg.sender, _newSigner);
    
}
