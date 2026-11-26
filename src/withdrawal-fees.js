import { MessageType, encodeExternalMessageFeeParams } from 'genlayer-js';

export function withdrawalFeeOptions(recipient, policy) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) throw Error('Invalid credit recipient.');
  const price = BigInt(policy.receiptGasPrice);
  if (price <= 0n) throw Error('External transfer gas price unavailable.');
  const gasLimit = 100000n;
  const maxGasPrice = (price * 12000n + 9999n) / 10000n;
  const budget = gasLimit * maxGasPrice;
  return {
    totalMessageFees: budget,
    messageAllocations: [{
      messageType: MessageType.External, onAcceptance: false, recipient,
      budget, feeParams: encodeExternalMessageFeeParams({ gasLimit, maxGasPrice }),
    }],
  };
}
