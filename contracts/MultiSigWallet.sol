// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// import "hardhat/console.sol";

contract MultiSigWallet {
    error incorrectThreshold();
    error incorrectSigner();
    error unauthorized();
    error insufficientSignatures();
    error invalidSignatures();

    event SignersSetup(address indexed wallet, address[] signers, uint256 threshold);
    event SignerAdded(address indexed signer, uint256 threshold);
    event TransactionExecuted(bytes32 indexed messageId, address indexed executor);
    event ThresholdUpdated(address indexed signer, uint256 threshold);

    mapping(address => bool) public isSigner;
    address[] public signers;
    uint256 public thresholdSignatures;

    constructor(address[] memory _signers, uint256 _thresholdSignatures) {
        setupSigners(_signers, _thresholdSignatures);
    }

    function executeTransaction(address to, uint256 value, bytes memory data, bytes[] memory signatures) public {
        if (signatures.length < thresholdSignatures) revert insufficientSignatures();

        bytes32 messageId = keccak256(abi.encodePacked(to, value, data));

        if (checkSignatures(messageId, signatures)) {
            _executeTransaction(to, value, data); //todo: delegate call
        } else {
            revert invalidSignatures();
        }

        emit TransactionExecuted(messageId, msg.sender);
    }

    /**
     * @notice Returns the hash of a transaction.
     * @dev Potentially we could use EIP-712 to sign transactions.
     * @param to The address of the contract to call.
     * @param value The value to send with the transaction.
     * @param data The data to send with the transaction.
     * @return The hash of the transaction.
     */
    function getTransactionHash(address to, uint256 value, bytes memory data) public view returns (bytes32) {
        return keccak256(abi.encodePacked(to, value, data));
    }

    // Simpler version of ecdsa, bc we dont check orders of signatures
    function checkSignatures(bytes32 messageId, bytes[] memory signatures) internal view returns (bool) {
        // Verify that the number of signatures is equal to or greater than the threshold
        if (signatures.length < threshold) {
            return false;
        }

        address[] memory signers = new address[](signatures.length);
        uint256 validSignatures = 0;

        // Verify each signature
        for (uint256 i = 0; i < signatures.length; i++) {
            // Recover the signer's address
            address recoveredSigner = ECDSA.recover(messageId, signatures[i]);

            // Verify that the signer is a valid owner
            if (isOwner[recoveredSigner]) {
                // Verify that this signer hasn't signed before (avoid duplicates)
                bool isDuplicate = false;
                for (uint256 j = 0; j < validSignatures; j++) {
                    if (signers[j] == recoveredSigner) {
                        isDuplicate = true;
                        break;
                    }
                }

                // If not a duplicate, count it as a valid signature
                if (!isDuplicate) {
                    signers[validSignatures] = recoveredSigner;
                    validSignatures++;

                    // If we reach the threshold, we can return true
                    if (validSignatures >= threshold) {
                        return true;
                    }
                }
            }
        }

        // We didn't reach the threshold of valid signatures
        return false;
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
            // Owner address cannot be null.
            address signer = _signers[i];
            if (signer == address(0) || signer == address(this)) revert incorrectSigner();
            if (signers[signer] != address(0)) revert incorrectSigner();
            signers[signer] = signer;
            isSigner[signer] = true;
        }
        thresholdSignatures = _threshold;

        emit SignersSetup(address(this), _signers, _threshold);
    }

    function addSignerAndUpdateThreshold(address _signer, uint256 _newthreshold) public {
        if (!isSigner[msg.sender]) revert unauthorized();
        if (_newthreshold < signers.length + 1) revert incorrectThreshold();

        isSigner[_signer] = true;
        signers.push(_signer);
        thresholdSignatures = _newthreshold;

        emit SignerAdded(msg.sender, _signer);
        emit ThresholdUpdated(msg.sender, _newthreshold);
    }

    /**
     * @notice Removes a signer from the contract.
     * @param _signer The address of the signer to remove.
     * @dev Here only 1 signer can remove another signer, not recommended for production.
     *      We could integrate k-of-n multisig to allow more security.
     */
    function removeSigner(address _signer) public {
        if (!isSigner[msg.sender]) revert unauthorized();
        isSigner[_signer] = false;
        thresholdSignatures--;

        emit SignerRemoved(_signer);
    }
}
