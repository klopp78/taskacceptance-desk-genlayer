# TaskAcceptance Desk

## v2 rebuild

The first funded UI experiment failed verification. Its old deployment is deprecated and must not be used as successful product evidence. v2 accepts wallet identities as strictly validated hex strings, caps each test escrow at 1 GEN, and requires an explicit canonical decimal `expected_deposit_wei` exactly equal to the transaction value. The frontend uses a fresh storage key, checks the on-chain v2 marker, passes bigint wei via SDK, and checks the exact stored deposit and both parties after finality.

Text-deliverable acceptance escrow on GenLayer, not an official Taskmarket integration.

The buyer deposits Studio test GEN and commits 1-8 acceptance criteria, a named worker and a deadline. The worker must confirm the baseline hash before delivering an immutable UTF-8 text artifact. Validators compare every criterion classification and the canonical assessment context. Only a passing consensus verdict can credit the worker after a one-hour challenge period. Either named party can challenge once. Unresolved, inconclusive and failed reviews refund the buyer. Any wallet can recover a timed-out task. Credited recipients withdraw to their own address.

Trust scope: this product evaluates the completeness of submitted text, not whether outside facts are true. External URLs are not accepted as substitutes for evidence. The buyer and worker should agree to the refund-on-inconclusive and timeout terms before the worker accepts.

New deployments use the official GenVM v0.4 runner. The browser client uses GenLayer SDK 2.0 fee estimation and finality/readback, not ethers ABI calls. The current Studionet deployment is `0x5b9b230e55AC1Ae9EbD3b5969872173785F3E464`; its deploy and version readback are finalized. See `deployments/studio-v2.json`. A live 0.01 test GEN task has completed finalized creation, named-worker acceptance, and immutable delivery submission. Assessment, settlement, and recipient payout are still unverified; this is not yet a completed funded end-to-end workflow. `deployments/studio.json` is historical and deprecated.

## Local checks

`npm install`, `npm test`, `npm run build`. Set `PYTHON` to a Python 3.12 executable if it is not on PATH. Ten host-mocked tests execute the actual submitted Python methods (not a separate JavaScript state machine). These cover named parties, baseline matching, delivery immutability, challenge windows, single settlement, timeout refunds, malformed models, validator disagreement and dispute resolution. Two frontend regression tests cover actual SDK lifecycle receipt fields and reject nonfinal or failed execution. They do not prove native transfer execution or GenVM compatibility. `tests/direct_smoke.py` is an additional official GenLayer Direct Mode check; install `genlayer-test==0.30.0` to run it.

## Deployment checklist

- Official Direct Mode deployment and create/accept/deliver/assess/finalize have passed on Linux using genlayer-test 0.30.0. LLM results are mocked; this does not prove live validator consensus or external payout success.
- Deploy matching source in Chrome galax Studio, with a fee deposit.
- Set the resulting address in the app. Verify task-specific IDs under concurrent creates.
- Complete a funded buyer/worker flow and check final execution status, state and recipient balances.
- Publish the static `dist/` to GitHub Pages (no ChatGPT-branded domain).
- Attach repository, source-matched Explorer address and working site to a normal Projects submission, not the WG mission.
