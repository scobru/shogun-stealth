import { ethers, Transaction } from "ethers";

export interface SweepParams {
  sendAmount: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  l1Fee: bigint;
  l2Fee: bigint;
  totalFee: bigint;
}

const ORACLE_ABI = [
  "function getL1Fee(bytes memory _data) public view returns (uint256)",
];

const DEFAULT_ORACLE = "0x420000000000000000000000000000000000000F";

/**
 * Calculates the maximum possible send amount for a sweep, accounting for both L2 and L1 fees.
 * Target is to leave the balance at exactly 0.
 */
export async function calculateSweepParams(
  provider: ethers.JsonRpcProvider,
  from: string,
  to: string,
  balance: bigint,
  oracleAddress: string = DEFAULT_ORACLE
): Promise<SweepParams> {
  const feeData = await provider.getFeeData();
  
  // Use maxFeePerGas if available (EIP-1559), but for simple sweeps gasPrice is often more stable
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? ethers.parseUnits("1", "gwei");
  const gasLimit = 21000n;
  const l2Fee = gasLimit * gasPrice;

  if (balance <= l2Fee) {
    return {
      sendAmount: 0n,
      gasPrice,
      gasLimit,
      l1Fee: 0n,
      l2Fee,
      totalFee: l2Fee,
    };
  }

  // Initial guess for send amount
  let sendAmount = balance - l2Fee;

  try {
    const network = await provider.getNetwork();
    const nonce = await provider.getTransactionCount(from);

    // Create a transaction object to estimate L1 fee
    // Note: The value doesn't strictly affect the size (RLP encoding of 0 vs 1 ETH is same bytes if in same range)
    const tx = Transaction.from({
      to,
      value: sendAmount,
      gasLimit,
      gasPrice,
      nonce,
      chainId: network.chainId,
      data: "0x",
    });

    const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);
    
    // getL1Fee expects the data that will be posted to L1. 
    // This is usually the unsigned RLP or signed RLP. 
    // We use unsignedSerialized as an approximation and add a buffer for the signature.
    let l1Fee = await oracle.getL1Fee(tx.unsignedSerialized);
    
    // The L1 Data Fee calculation: l1_gas_used * l1_gas_price * scalar
    // A signature adds 65 bytes. 
    // We add a safety margin (e.g. 10%) to the L1 fee to ensure the tx isn't rejected
    // and to account for the signature bytes not included in unsignedSerialized.
    l1Fee = (l1Fee * 110n) / 100n; 

    const totalFee = l2Fee + l1Fee;
    
    if (balance <= totalFee) {
       return {
         sendAmount: 0n,
         gasPrice,
         gasLimit,
         l1Fee,
         l2Fee,
         totalFee,
       };
    }

    sendAmount = balance - totalFee;

    return {
      sendAmount,
      gasPrice,
      gasLimit,
      l1Fee,
      l2Fee,
      totalFee,
    };
  } catch (e) {
    console.warn("Precise L1 fee estimation failed, falling back to safe buffer:", e);
    // Fallback if oracle fails: use a conservative buffer (0.00006 ETH is usually plenty on Base)
    const fallbackL1Buffer = ethers.parseUnits("0.00006", "ether");
    const totalFee = l2Fee + fallbackL1Buffer;
    
    return {
      sendAmount: balance > totalFee ? balance - totalFee : 0n,
      gasPrice,
      gasLimit,
      l1Fee: fallbackL1Buffer,
      l2Fee,
      totalFee,
    };
  }
}
