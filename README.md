# TaskAcceptance Desk

Text-deliverable acceptance escrow on GenLayer, not an official Taskmarket integration.

The buyer deposits Studio test GEN and commits 1-8 acceptance criteria, a named worker and a deadline. The worker must confirm the baseline hash before delivering an immutable UTF-8 text artifact. Validators compare every criterion classification and the canonical assessment context. Only a passing consensus verdict can credit the worker after a one-hour challenge period. Either named party can challenge once. Unresolved, inconclusive and failed reviews refund the buyer. Any wallet can recover a timed-out task. Credited recipients withdraw to their own address.

Trust scope: this product evaluates the completeness of submitted text, not whether outside facts are true. External URLs are not accepted as substitutes for evidence. The buyer and worker should agree to the refund-on-inconclusive and timeout terms before the worker accepts.

New deployments use the official GenVM v0.4 runner. The browser client uses GenLayer SDK 2.0 fee estimation and finality/readback, not ethers ABI calls. The Studionet deployment is `0x96AEeA3bD87145e6951730e298530d8e36c49C3a`; its deploy finalized and a finalized registry read returned `[]`. See `deployments/studio.json`. The funded end-to-end workflow and recipient payout have not yet been verified.

## Local checks

`npm install`, `npm test`, `npm run build`. Set `PYTHON` to a Python 3.12 executable if it is not on PATH. Eight host-mocked tests execute the actual submitted Python methods (not a separate JavaScript state machine). These cover named parties, baseline matching, delivery immutability, challenge windows, single settlement, timeout refunds, malformed models, validator disagreement and dispute resolution. They do not prove native transfer execution or GenVM compatibility. `tests/direct_smoke.py` is an additional official GenLayer Direct Mode check; install `genlayer-test==0.30.0` to run it.

## Deployment checklist

- Official Direct Mode deployment and create/accept/deliver/assess/finalize have passed on Linux using genlayer-test 0.30.0. LLM results are mocked; this does not prove live validator consensus or external payout success.
- Deploy matching source in Chrome galax Studio, with a fee deposit.
- Set the resulting address in the app. Verify task-specific IDs under concurrent creates.
- Complete a funded buyer/worker flow and check final execution status, state and recipient balances.
- Publish the static `dist/` to GitHub Pages (no ChatGPT-branded domain).
- Attach repository, source-matched Explorer address and working site to a normal Projects submission, not the WG mission.
