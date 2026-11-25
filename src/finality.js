export function assertFinalizedExecution(receipt) {
  if (receipt?.statusName !== 'FINALIZED' ||
      receipt?.lifecycle?.state !== 'finalized' ||
      receipt?.lifecycle?.outcome !== 'accepted' ||
      receipt?.txExecutionResultName !== 'FINISHED_WITH_RETURN') {
    throw Error('Execution not verified. Inspect transaction before retrying.');
  }
}
