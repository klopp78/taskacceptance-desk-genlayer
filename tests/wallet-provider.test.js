import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectWalletProvider } from '../src/wallet-provider.js';

test('explicit OKX selection cannot fall back to a competing injected provider', () => {
  const okx = {request: async () => []};
  const other = {request: async () => []};
  assert.equal(selectWalletProvider({okxwallet:okx,ethereum:other}, 'okx'), okx);
  assert.equal(selectWalletProvider({okxwallet:okx,ethereum:other}, 'default'), other);
});
test('retains the selected provider object if the global default changes', () => {
  const injected = {ethereum:{request:async()=>[]}};
  const bound = selectWalletProvider(injected, 'default');
  injected.ethereum = {request:async()=>[]};
  assert.notEqual(bound, injected.ethereum);
});
test('rejects missing wallets and unknown choices without fallback', () => {
  assert.throws(() => selectWalletProvider({ethereum:{request(){}}}, 'okx'));
  assert.throws(() => selectWalletProvider({}, 'default'));
  assert.throws(() => selectWalletProvider({}, 'forged'));
});
