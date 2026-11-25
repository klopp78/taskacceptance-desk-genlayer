import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFinalizedExecution, waitForFinalizedExecution } from '../src/finality.js';

const finalized = {
  status: 7,
  statusName: 'FINALIZED',
  lifecycle: { state: 'finalized', outcome: 'accepted' },
  result: 1,
  txExecutionResult: 1,
  txExecutionResultName: 'FINISHED_WITH_RETURN',
};

test('accepts the observed SDK 2 Studio receipt without resultName', () => {
  assert.doesNotThrow(() => assertFinalizedExecution(finalized));
});

test('rejects non-final, rejected, failed and incomplete receipts', () => {
  for (const receipt of [
    undefined, {},
    { ...finalized, statusName: 'ACCEPTED' },
    { ...finalized, lifecycle: { state: 'decided', outcome: 'accepted' } },
    { ...finalized, lifecycle: { state: 'finalized', outcome: 'rejected' } },
    { ...finalized, txExecutionResultName: 'ROLLBACK' },
    { ...finalized, txExecutionResultName: undefined },
  ]) assert.throws(() => assertFinalizedExecution(receipt));
});

test('requests full SDK receipts rather than the renamed simplified schema', async () => {
  const client = { waitForTransactionReceipt: async options => {
    assert.equal(options.fullTransaction, true);
    assert.equal(options.waitUntil, 'finalized');
    assert.equal(options.hash, '0xtest');
    return finalized;
  } };
  assert.equal(await waitForFinalizedExecution(client, '0xtest'), finalized);
});
