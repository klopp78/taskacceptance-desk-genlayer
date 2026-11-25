export function assertFinalizedExecution(receipt) {
  if (receipt?.statusName !== 'FINALIZED' ||
      receipt?.lifecycle?.state !== 'finalized' ||
      receipt?.lifecycle?.outcome !== 'accepted' ||
      receipt?.txExecutionResultName !== 'FINISHED_WITH_RETURN') {
    throw Error('Execution not verified. Inspect transaction before retrying.');
  }
}

export async function waitForFinalizedExecution(client, hash) {
  const receipt = await client.waitForTransactionReceipt({
    hash, waitUntil: 'finalized', fullTransaction: true, retries: 180, interval: 3000,
  });
  assertFinalizedExecution(receipt);
  return receipt;
}
