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
    assert contract.get_version()=='taskacceptance.v2.1.sponsored-credit'
    task_id=contract.create_task(str(worker),json.dumps(['Include three risks','Include mitigations']),1795651200,'direct-smoke','100')
    assert json.loads(contract.get_task(task_id))['baseline']['worker']==str(worker).lower()
    baseline=json.loads(contract.get_task(task_id))['baseline_hash']
    with vm.prank(worker):
        contract.accept_task(task_id,baseline)
        contract.submit_delivery(task_id,'Three risks: schedule, cost, reliability. Mitigations: buffer, budget, tests.')
    # gltest 0.30 auto-decodes mocked JSON once; preserve the SDK's text response.
    vm.mock_llm('.*',json.dumps(json.dumps({'criteria':['met','met']})))
    contract.assess(task_id)
    assert vm.run_validator() is True
    assert vm.run_validator(leader_result='{"criteria":[],"decision":"pass","context_hash":"forged"}') is False
    assert json.loads(contract.get_task(task_id))['state']=='reviewed'
    vm.warp('2026-11-25T02:00:00+00:00')
    gl.message.datetime='2026-11-25T02:00:00+00:00'
    contract.finalize(task_id)
    assert contract.credit_of(str(worker))=='100'
print('Official Direct Mode create/accept/deliver/assess/finalize passed')
