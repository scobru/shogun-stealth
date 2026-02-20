import { ethers } from "ethers";

// TODO: Replace with actual deployed address on Base Sepolia (84532)
// The user's deployment file did not contain PaymentForwarder, so using a placeholder.
export const PAYMENT_FORWARDER_ADDRESS = "0x512edE537cb53dcbFC29629B4999c3e8f18799Eb";

export const PAYMENT_FORWARDER_ABI = [
    "function sendEth(address payable _receiver, uint256 _tollCommitment, bytes32 _pkx, bytes32 _ciphertext) external payable",
    "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)"
];

export function getPaymentForwarderContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(PAYMENT_FORWARDER_ADDRESS, PAYMENT_FORWARDER_ABI, signerOrProvider);
}
