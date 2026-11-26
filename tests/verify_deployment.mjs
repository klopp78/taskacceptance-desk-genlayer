// Read-only public verification. Never creates accounts or sends transactions.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { waitForFinalizedExecution } from '../src/finality.js';

const deployment = JSON.parse(await readFile(new URL('../deployments/studio-v2.json', import.meta.url), 'utf8'));
const client = createClient({ chain: studionet });
const normalize = source => source.replace(/\r\n/g, '\n').replace(/\n+$/, '');
const source = normalize(await client.getContractCode(deployment.address));
const submitted = normalize(await readFile(new URL('../contracts/task_acceptance.py', import.meta.url), 'utf8'));
assert.equal(source, submitted, 'Deployed and submitted source differ.');
assert.equal(createHash('sha256').update(source).digest('hex'), deployment.deployedSourceMatch.sha256);
const read = (functionName, args) => client.readContract({address:deployment.address,functionName,args,transactionHashVariant:'latest-final'});
assert.equal(await read('get_version', []), deployment.version);
// Studio code upgrades are accepted protocol operations, not ordinary VM calls.
const upgrade = await client.waitForTransactionReceipt({hash:deployment.upgrade,waitUntil:'finalized',fullTransaction:true});
assert.equal(upgrade.statusName, 'FINALIZED');
assert.equal(upgrade.lifecycle?.state, 'finalized');
assert.equal(upgrade.lifecycle?.outcome, 'accepted');
assert.equal(upgrade.txExecutionResultName, 'NOT_VOTED');
for (const hash of ['create','accept','deliver','assess','finalize'].map(step => deployment.liveTask[step])) {
  await waitForFinalizedExecution(client, hash);
}
const record = JSON.parse(await read('get_task', [deployment.liveTask.id]));
assert.equal(record.id, deployment.liveTask.id);
assert.equal(record.state, 'settled');
assert.equal(record.baseline.deposit_wei, deployment.liveTask.depositWei);
assert.equal(record.assessment.decision, 'pass');
assert(record.settlement.time >= record.challenge_deadline, 'Settlement bypassed the challenge window.');
assert.equal(record.settlement.recipient.toLowerCase(), record.baseline.worker.toLowerCase());
const payout = deployment.liveTask.payout;
assert(payout?.verified && deployment.fundedWorkflowVerified, 'Payout has not been verified.');
await waitForFinalizedExecution(client, payout.transaction);
assert.equal(BigInt(payout.afterWei) - BigInt(payout.beforeWei), BigInt(record.settlement.amount_wei));
assert.equal(await read('credit_of', [record.baseline.worker]), '0');
console.log(JSON.stringify({sourceMatch:true,version:deployment.version,task:record.id,state:record.state,payoutDeltaWei:(BigInt(payout.afterWei)-BigInt(payout.beforeWei)).toString()},null,2));
