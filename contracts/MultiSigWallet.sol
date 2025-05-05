// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

contract MultiSigWallet {
  using ECDSA for bytes32;

  error incorrectThreshold();
  error incorrectSigner();
  error unauthorized();
  error insufficientSignatures();
  error invalidSignatures();
  error executionFailed();
  error invalidNonce();
  error signerAlreadyExists();
  error signerNotFound();
  error transactionAlreadyExecuted();

  event SignersSetup(address indexed wallet, address[] signers, uint256 threshold);
  event SignerAdded(address indexed operator, address indexed signer, uint256 threshold);
  event SignerRemoved(address indexed operator, address indexed signer);
  event TransactionExecuted(address indexed executor, bytes32 indexed messageId);
  event ThresholdUpdated(address indexed operator, uint256 threshold);

  mapping(address => bool) public isSigner;
  address[] public signers;
  uint256 public thresholdSignatures;
  uint256 public nonce;
  mapping(bytes32 => bool) public executedTransactions;
  mapping(bytes32 => uint256) public signedTransactions;

  // keccak256("EIP712Domain(uint256 chainId,address verifyingContract)")
  bytes32 public constant DOMAIN_SEPARATOR_TYPEHASH =
    0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218;

  // keccak256("Transaction(address destination,uint256 value,bytes data,uint256 nonce)")
  bytes32 public constant TRANSACTION_TYPEHASH =
    0x7c98e64bd943448b4e24ef8c2cdec7b8b1275970cfe10daf2a9bfa4b04dce905;

  constructor(address[] memory _signers, uint256 _thresholdSignatures) {
    _setupSigners(_signers, _thresholdSignatures);
  }

  /**
   * @notice Executes ANY transaction on behalf of the contract if the k of n signatures are valid.
   * @dev Design decisions:
   *      - Uses standard call for all transactions including signer management
   *      - DelegateCall was considered but not implemented because:
   *        1. Signer management is handled internally with proper access control
   *        2. The current implementation provides better gas efficiency
   *        3. The contract maintains direct control over its state
   *        4. The implementation follows the principle of least privilege
   *      - All transactions require k valid signatures
   *      - Signatures are verified for duplicates and validity
   *      - Nonce is used to prevent replay attacks
   *      - After developing a first iteration, I have integrated EIP-712 to improve the signature verification process.
   *      - Further improvements:
   *        Add timelock delay to change thresholdSignatures
   *        Add batch signer add/remove.
   * @param _destinationContract The address of the contract to execute the transaction on.
   * @param _value The value to send with the transaction.
   * @param _data The data to send with the transaction.
   * @param _nonce The nonce of the transaction.
   * @param _signatures The signatures of the signers.
   */
  function executeTransaction(
    address _destinationContract,
    uint256 _value,
    bytes memory _data,
    uint256 _nonce,
    bytes[] memory _signatures
  ) public {
    if (_signatures.length < thresholdSignatures) revert insufficientSignatures();

    bytes32 txHash = getTransactionHash(_destinationContract, _value, _data, _nonce);
    bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(txHash);
    if (executedTransactions[ethSignedHash]) revert transactionAlreadyExecuted();

    if (checkSignatures(ethSignedHash, _signatures)) {
      executedTransactions[ethSignedHash] = true;
      nonce = _nonce;
      _executeTransaction(_destinationContract, _value, _data);
    } else {
      revert invalidSignatures();
    }

    emit TransactionExecuted(msg.sender, txHash);
  }

  // Simpler version of ecdsa, bc we dont check order of signatures
  function checkSignatures(
    bytes32 ethSignedHash,
    bytes[] memory signatures
  ) internal view returns (bool) {
    // Verify that the number of signatures is equal to or greater than the threshold
    if (signatures.length < thresholdSignatures) {
      revert insufficientSignatures();
    }

    address[] memory recoveredSigners = new address[](signatures.length);
    uint256 validSignatures = 0;

    // Verify each signature
    for (uint256 i = 0; i < signatures.length; i++) {
      // Recover the signer's address
      address recoveredSigner = ECDSA.recover(ethSignedHash, signatures[i]);
      // Verify that the signer is a valid owner
      if (isSigner[recoveredSigner]) {
        // Verify that this signer hasn't signed before (avoid duplicates)
        bool isDuplicate = false;
        for (uint256 j = 0; j < validSignatures; j++) {
          if (recoveredSigners[j] == recoveredSigner) {
            isDuplicate = true;
            break;
          }
        }

        // If not a duplicate, count it as a valid signature
        if (!isDuplicate) {
          recoveredSigners[validSignatures] = recoveredSigner;
          validSignatures++;
          // If we reach the threshold, we can return true
          if (validSignatures >= thresholdSignatures) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function getDomainSeparator() public view returns (bytes32) {
    return keccak256(abi.encode(DOMAIN_SEPARATOR_TYPEHASH, block.chainid, address(this)));
  }

  function getTransactionHash(
    address destinationContract,
    uint256 value,
    bytes memory data,
    uint256 _nonce
  ) public view returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(TRANSACTION_TYPEHASH, destinationContract, value, keccak256(data), _nonce)
    );

    return
      keccak256(
        abi.encodePacked(
          '\x19\x01', //EIP-712 prefix
          getDomainSeparator(),
          structHash
        )
      );
  }

  ////// SIGNER FUNCTIONS //////
  /**
   * @notice Updates the signer set, we protect this function checking the sender is the contract itself.
   * @param _signer The address of the signer to add or remove.
   * @param _isAdd Whether to add or remove the signer.
   * @param _newThreshold The new threshold for the contract.
   */
  function updateSignerSet(address _signer, bool _isAdd, uint256 _newThreshold) public {
    if (msg.sender != address(this)) revert unauthorized();
    if (_isAdd) {
      addSignerAndUpdateThreshold(_signer, _newThreshold);
    } else {
      removeSignerAndUpdateThreshold(_signer, _newThreshold);
    }
  }

  /**
   * @notice Adds a signer to the contract.
   * @param _signer The address of the signer to add.
   * @param _newThreshold The new threshold for the contract.
   */
  function addSignerAndUpdateThreshold(address _signer, uint256 _newThreshold) internal {
    if (_signer == address(0)) revert incorrectSigner();
    if (isSigner[_signer]) revert signerAlreadyExists();
    if (_newThreshold > signers.length || _newThreshold == 0) revert incorrectThreshold();

    isSigner[_signer] = true;
    signers.push(_signer);
    thresholdSignatures = _newThreshold;

    emit SignerAdded(msg.sender, _signer, _newThreshold);
    emit ThresholdUpdated(msg.sender, _newThreshold);
  }

  /**
   * @notice Removes a signer from the contract.
   * @param _signer The address of the signer to remove.
   * @param _newThreshold The new threshold for the contract.
   */
  function removeSignerAndUpdateThreshold(address _signer, uint256 _newThreshold) internal {
    if (!isSigner[_signer]) revert signerNotFound();
    if (_newThreshold == 0 || _newThreshold > signers.length - 1) revert incorrectThreshold();

    // Remove signer from mapping
    isSigner[_signer] = false;

    // Remove signer from array
    for (uint256 i = 0; i < signers.length; i++) {
      if (signers[i] == _signer) {
        signers[i] = signers[signers.length - 1];
        signers.pop();
        break;
      }
    }
    thresholdSignatures = _newThreshold;

    emit SignerRemoved(msg.sender, _signer);
    emit ThresholdUpdated(msg.sender, _newThreshold);
  }

  ////// INTERNAL FUNCTIONS //////

  /**
   * @notice Sets the initial storage of the contract.
   * @param _signers List of Safe owners.
   * @param _threshold Number of required confirmations for a Safe transaction.
   */
  function _setupSigners(address[] memory _signers, uint256 _threshold) internal {
    uint256 signersLength = _signers.length;
    // Validate that the threshold is smaller than the number of added owners.
    if (_threshold > signersLength || _threshold == 0) revert incorrectThreshold();

    for (uint256 i = 0; i < signersLength; ++i) {
      address signer = _signers[i];
      // Owner address cannot be null or the contract itself
      if (signer == address(0) || signer == address(this)) revert incorrectSigner();
      // Check if signer already exists
      if (isSigner[signer]) revert signerAlreadyExists();

      signers.push(signer);
      isSigner[signer] = true;
    }
    thresholdSignatures = _threshold;

    emit SignersSetup(msg.sender, _signers, _threshold);
  }

  function _executeTransaction(
    address destinationContract,
    uint256 value,
    bytes memory data
  ) internal returns (bool success, bytes memory returnData) {
    (success, returnData) = destinationContract.call{ value: value }(data);
    if (!success) revert executionFailed();
  }

  // Function to get all current signers
  function getSigners() public view returns (address[] memory) {
    return signers;
  }
}
