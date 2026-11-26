export function selectWalletProvider(injected, choice) {
  if (!['okx', 'default'].includes(choice)) throw Error('Unknown wallet choice.');
  const provider = choice === 'okx' ? injected.okxwallet : injected.ethereum;
  if (typeof provider?.request !== 'function') throw Error('Selected wallet is not available.');
  return provider;
}
