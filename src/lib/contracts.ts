import { ethers } from "ethers";

// --- ABIs ---

export const STEALTH_KEY_REGISTRY_ABI = [
    "function registerStealthKeys(string _viewingPublicKey, string _spendingPublicKey) external",
    "function registerStealthKeysOnBehalf(address _registrant, string calldata _viewingPublicKey, string calldata _spendingPublicKey, uint8 _v, bytes32 _r, bytes32 _s) external",
    "function getStealthKeys(address _registrant) external view returns (string viewingPublicKey, string spendingPublicKey)",
    "event StealthKeysRegistered(address indexed registrant, string viewingPublicKey, string spendingPublicKey)",
    "function registerStealthMetadata(address _stealthAddress, string _ephemeralPublicKey, string _encryptedRandomNumber, string _recipientPublicKey) external",
    "event StealthMetadataRegistered(address indexed stealthAddress, address indexed sender, string ephemeralPublicKey, string encryptedRandomNumber, string recipientPublicKey)",
    "function nonces(address _owner) external view returns (uint256)"
];

export const PAYMENT_FORWARDER_ABI = [
    "function sendEth(address payable _receiver, uint256 _tollCommitment, bytes32 _pkx, bytes32 _ciphertext) external payable",
    "function toll() external view returns (uint256)",
    "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)"
];

// --- CONTRACT HELPERS ---

export function getRegistryContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(address, STEALTH_KEY_REGISTRY_ABI, signerOrProvider);
}

export function getPaymentForwarderContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(address, PAYMENT_FORWARDER_ABI, signerOrProvider);
}
