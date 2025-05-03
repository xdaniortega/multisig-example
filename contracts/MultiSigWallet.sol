// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "hardhat/console.sol";

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

    event SignersSetup(
        address indexed wallet,
        address[] signers,
        uint256 threshold
    );
    
    event SignerAdded(
        address indexed operator,
        address indexed signer,
        uint256 threshold
    );
    
    event SignerRemoved(
        address indexed operator,
        address indexed signer
    );
    
    event TransactionExecuted(
        address indexed executor,
        bytes32 indexed messageId
    );
    
    event ThresholdUpdated(
        address indexed operator,
        uint256 threshold
    );

    mapping(address => bool) public isSigner;
    address[] public signers;
    uint256 public thresholdSignatures;
    uint256 public nonce;
    mapping(bytes32 => bool) public executedTransactions;
    mapping(bytes32 => uint256) public signedTransactions;

    constructor(address[] memory _signers, uint256 _thresholdSignatures) {
        setupSigners(_signers, _thresholdSignatures);
    }

//todo: move to argument as encoded parameters
//todo: improve 
    function executeTransaction(address destinationContract, uint256 value, bytes memory data, bytes[] memory signatures) public {
        if (signatures.length < thresholdSignatures) revert insufficientSignatures();
        uint256 _nonce = nonce;
        bytes32 txHash = getTransactionHash(destinationContract, value, data, ++_nonce);

        // put here the toEthSignedMessageHash
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(txHash);
        if (checkSignatures(ethSignedHash, signatures)) {
            if (executedTransactions[ethSignedHash]) revert transactionAlreadyExecuted();
            executedTransactions[ethSignedHash] = true;
            _executeTransaction(destinationContract, value, data);
            nonce++;
        } else {
            revert invalidSignatures();
        }

        emit TransactionExecuted(msg.sender, txHash);
    }

    // Simpler version of ecdsa, bc we dont check orders of signatures
    function checkSignatures(bytes32 ethSignedHash, bytes[] memory signatures) internal view returns (bool) {
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

    function getTransactionHash(address destinationContract, uint256 value, bytes memory data, uint256 _nonce) public view returns (bytes32) {
        // Create the transaction hash by encoding all parameters
        bytes32 hash = keccak256(abi.encodePacked(destinationContract, value, data, _nonce));
        return hash;
    }

    ////// SIGNER FUNCTIONS //////

    /**
     * @notice Sets the initial storage of the contract.
     * @param _signers List of Safe owners.
     * @param _threshold Number of required confirmations for a Safe transaction.
     */
    function setupSigners(address[] memory _signers, uint256 _threshold) internal {
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

    function addSignerAndUpdateThreshold(address _signer, uint256 _newThreshold) public {
        if (!isSigner[msg.sender]) revert unauthorized();
        if (_signer == address(0) || _signer == address(this)) revert incorrectSigner();
        if (isSigner[_signer]) revert signerAlreadyExists();
        if (_newThreshold > signers.length + 1 || _newThreshold == 0) revert incorrectThreshold();

        isSigner[_signer] = true;
        signers.push(_signer);
        thresholdSignatures = _newThreshold;

        emit SignerAdded(msg.sender, _signer, _newThreshold);
        emit ThresholdUpdated(msg.sender, _newThreshold);
    }

    /**
     * @notice Removes a signer from the contract.
     * @param _signer The address of the signer to remove.
     * @dev Here only 1 signer can remove another signer, not recommended for production.
     *      We could integrate k-of-n multisig to allow more security.
     */
    function removeSigner(address _signer) public {
        if (!isSigner[msg.sender]) revert unauthorized();
        if (!isSigner[_signer]) revert signerNotFound();
        if (signers.length <= thresholdSignatures) revert incorrectThreshold();

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

        emit SignerRemoved(msg.sender, _signer);
    }

    function _executeTransaction(address destinationContract, uint256 value, bytes memory data) internal returns (bool success, bytes memory returnData) {
        (success, returnData) = destinationContract.call{value: value}(data);
        if (!success) revert executionFailed();
    }

    // Function to get all current signers
    function getSigners() public view returns (address[] memory) {
        return signers;
    }
}
