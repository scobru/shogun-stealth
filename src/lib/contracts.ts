import { ethers } from "ethers";

// --- CONTRACT ADDRESSES (BASE SEPOLIA - 84532) ---

export const STEALTH_KEY_REGISTRY_ADDRESS = "0x6038197D7eb76ee668b37c61021619542F757B63";
export const PAYMENT_FORWARDER_ADDRESS = "0x512edE537cb53dcbFC29629B4999c3e8f18799Eb";

// --- ABIs ---

export const STEALTH_KEY_REGISTRY_ABI = [
    "function registerStealthKeys(string _viewingPublicKey, string _spendingPublicKey) external",
    "function registerStealthKeysOnBehalf(address _registrant, string calldata _viewingPublicKey, string calldata _spendingPublicKey, uint8 _v, bytes32 _r, bytes32 _s) external",
    "function getStealthKeys(address _registrant) external view returns (string viewingPublicKey, string spendingPublicKey)",
    "event StealthKeysRegistered(address indexed registrant, string viewingPublicKey, string spendingPublicKey)",
    "function registerStealthMetadata(address _stealthAddress, string _ephemeralPublicKey, string _encryptedRandomNumber, string _recipientPublicKey) external",
    "event StealthMetadataRegistered(address indexed stealthAddress, address indexed sender, string ephemeralPublicKey, string encryptedRandomNumber, string recipientPublicKey)"
];

export const PAYMENT_FORWARDER_ABI = [
    "function sendEth(address payable _receiver, uint256 _tollCommitment, bytes32 _pkx, bytes32 _ciphertext) external payable",
    "function toll() external view returns (uint256)",
    "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)"
];

// --- CONTRACT HELPERS ---

export function getRegistryContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(STEALTH_KEY_REGISTRY_ADDRESS, STEALTH_KEY_REGISTRY_ABI, signerOrProvider);
}

export function getPaymentForwarderContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(PAYMENT_FORWARDER_ADDRESS, PAYMENT_FORWARDER_ABI, signerOrProvider);
}
