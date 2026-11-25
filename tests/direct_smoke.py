"""Official GenLayer Direct Mode smoke test; requires genlayer-test 0.30.0."""
from pathlib import Path
import json
from gltest.direct import VMContext, deploy_contract

vm = VMContext()
with vm.activate():
    contract = deploy_contract(Path(__file__).parents[1] / 'contracts/task_acceptance.py', vm)
    assert contract.list_tasks(0, 10) == '[]'
    from genlayer import Address
    buyer=Address('0x'+'11'*20)
    worker=Address('0x'+'22'*20)
    vm.warp('2026-11-25T00:00:00+00:00')
    vm.sender=buyer
    import genlayer as gl
    gl.message.datetime='2026-11-25T00:00:00+00:00'
    from genlayer import u256
    gl.message.value=u256(100)
    task_id=contract.create_task(worker,json.dumps(['Include three risks','Include mitigations']),1795651200,'direct-smoke')
    baseline=json.loads(contract.get_task(task_id))['baseline_hash']
    with vm.prank(worker):
        contract.accept_task(task_id,baseline)
        contract.submit_delivery(task_id,'Three risks: schedule, cost, reliability. Mitigations: buffer, budget, tests.')
    # gltest 0.30 auto-decodes mocked JSON once; preserve the SDK's text response.
    vm.mock_llm('.*',json.dumps(json.dumps({'criteria':['met','met']})))
    contract.assess(task_id)
    assert json.loads(contract.get_task(task_id))['state']=='reviewed'
    vm.warp('2026-11-25T02:00:00+00:00')
    gl.message.datetime='2026-11-25T02:00:00+00:00'
    contract.finalize(task_id)
    assert contract.credit_of(worker)=='100'
print('Official Direct Mode create/accept/deliver/assess/finalize passed')
