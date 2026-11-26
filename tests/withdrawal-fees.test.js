import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeAbiParameters } from 'viem';
import { MessageType } from 'genlayer-js';
import { withdrawalFeeOptions } from '../src/withdrawal-fees.js';

test('binds an external transfer allowance to the credit recipient', () => {
  const recipient = '0x' + '22'.repeat(20);
  const options = withdrawalFeeOptions(recipient, { receiptGasPrice: 250000000n });
  const [allocation] = options.messageAllocations;
  assert.equal(allocation.messageType, MessageType.External);
  assert.equal(allocation.onAcceptance, false);
  assert.equal(allocation.recipient, recipient);
  const [gas, price] = decodeAbiParameters([{type:'uint256'}, {type:'uint256'}], allocation.feeParams);
  assert.equal(gas, 100000n);
  assert.equal(price, 300000000n);
  assert.equal(options.totalMessageFees, gas * price);
  assert.equal(allocation.budget, gas * price);
});

test('fails closed for invalid recipient or unavailable gas price', () => {
  assert.throws(() => withdrawalFeeOptions('bad', {receiptGasPrice: 1n}));
  assert.throws(() => withdrawalFeeOptions('0x'+'22'.repeat(20), {receiptGasPrice: 0n}));
});
