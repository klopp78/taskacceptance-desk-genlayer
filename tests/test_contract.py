"""Executes the submitted Python contract with mocked GenLayer host services.
Not a substitute for GenVM Direct Mode or funded Studionet integration tests.
"""
import sys, types, json, unittest, importlib.util, copy
import datetime
from pathlib import Path
class Address(str): pass
class Generic:
    def __class_getitem__(cls, item): return dict
class Arr:
    def __class_getitem__(cls, item): return list
class Decorator:
    def __call__(self, fn): return fn
    payable = property(lambda self: self)
class Return:
    def __init__(self, data): self.calldata = data
class Message(types.SimpleNamespace):
    @property
    def datetime(self):
        return datetime.datetime.fromtimestamp(gl.block.timestamp,datetime.timezone.utc).isoformat()
gl=types.SimpleNamespace(Contract=object, public=types.SimpleNamespace(view=Decorator(),write=Decorator()),
    message=Message(sender_address=Address("buyer"),value=0),block=types.SimpleNamespace(timestamp=1000))
gl.evm=types.SimpleNamespace(contract_interface=lambda cls:cls)
gl.contract=types.SimpleNamespace(Contract=object)
gl.nondet=types.SimpleNamespace(exec_prompt=lambda p:json.dumps({"criteria":["met","met"]}))
gl.vm=types.SimpleNamespace(Return=Return)
def nondet(leader,validator):
    result=leader()
    if not validator(Return(result)): raise Exception("consensus_disagreement")
    return result
gl.vm.run_nondet=nondet
module=types.ModuleType("genlayer")
module.__dict__.update(gl.__dict__)
storage=types.ModuleType('genlayer.storage'); storage.TreeMap=Generic; storage.DynArray=Arr
sys.modules['genlayer.storage']=storage
for key,value in dict(gl=gl,Address=Address,u256=int,u64=int,u32=int,TreeMap=Generic,DynArray=Arr).items():setattr(module,key,value)
sys.modules["genlayer"]=module
spec=importlib.util.spec_from_file_location("task",Path(__file__).parents[1]/"contracts/task_acceptance.py")
contract=importlib.util.module_from_spec(spec);spec.loader.exec_module(contract)
class Tests(unittest.TestCase):
    def setUp(self):
        self.c=contract.TaskAcceptance();self.c.tasks={};self.c.ids=[];self.c.credits={}
        gl.block.timestamp=1000;gl.message.sender_address=Address("buyer");gl.message.value=100
        gl.nondet.exec_prompt=lambda p:json.dumps({"criteria":["met","met"]})
        self.id=self.c.create_task(Address("worker"),json.dumps(["Provide risks","Provide mitigations"]),2000,"nonce")
    def record(self):return json.loads(self.c.get_task(self.id))
    def delivery(self):
        gl.message.sender_address=Address("worker")
        self.c.accept_task(self.id,self.record()["baseline_hash"])
        self.c.submit_delivery(self.id,"Risk: delay. Mitigation: advance scheduling.")
    def test_bound_parties_and_original_terms(self):
        gl.message.sender_address=Address("stranger")
        with self.assertRaisesRegex(Exception,"only_worker"):self.c.accept_task(self.id,self.record()["baseline_hash"])
        gl.message.sender_address=Address("worker")
        with self.assertRaisesRegex(Exception,"terms_not_confirmed"):self.c.accept_task(self.id,"forged")
        self.delivery()
        with self.assertRaisesRegex(Exception,"delivery_closed"):self.c.submit_delivery(self.id,"changed")
    def test_pass_challenge_window_and_replay(self):
        self.delivery();self.c.assess(self.id)
        with self.assertRaisesRegex(Exception,"not_finalizable"):self.c.finalize(self.id)
        gl.block.timestamp=4600;self.c.finalize(self.id)
        self.assertEqual(self.c.credit_of(Address("worker")),"100")
        with self.assertRaisesRegex(Exception,"not_finalizable"):self.c.finalize(self.id)
    def test_timeout_every_live_state(self):
        gl.block.timestamp=2000;self.c.finalize(self.id)
        self.assertEqual(self.c.credit_of(Address("buyer")),"100")
    def test_stalled_dispute_refund(self):
        self.delivery();self.c.assess(self.id)
        gl.message.sender_address=Address("stranger")
        with self.assertRaisesRegex(Exception,"parties_only"):self.c.challenge(self.id,"bad")
        gl.message.sender_address=Address("buyer");self.c.challenge(self.id,"Missing detail")
        gl.block.timestamp=87400;self.c.finalize(self.id)
        self.assertEqual(self.record()["settlement"]["reason"],"dispute_timeout")
    def test_inconclusive_refunds(self):
        self.delivery();gl.nondet.exec_prompt=lambda p:json.dumps({"criteria":["met","unknown"]})
        self.c.assess(self.id);gl.block.timestamp=4600;self.c.finalize(self.id)
        self.assertEqual(self.c.credit_of(Address("buyer")),"100")
    def test_malformed_model_and_recovery(self):
        self.delivery();gl.nondet.exec_prompt=lambda p:'{"criteria":["met"]}'
        with self.assertRaisesRegex(Exception,"malformed_verdict"):self.c.assess(self.id)
        self.assertEqual(self.record()["state"],"submitted")
        gl.block.timestamp=87400;self.c.finalize(self.id)
        self.assertEqual(self.record()["settlement"]["reason"],"assessment_timeout")
    def test_validator_disagreement(self):
        self.delivery()
        answers=iter(['{"criteria":["met","met"]}','{"criteria":["unmet","met"]}'])
        gl.nondet.exec_prompt=lambda p:next(answers)
        with self.assertRaisesRegex(Exception,"consensus_disagreement"):self.c.assess(self.id)
        self.assertEqual(self.record()["state"],"submitted")
    def test_resolution_rechecks_context(self):
        self.delivery();self.c.assess(self.id);self.c.challenge(self.id,"Missing mitigation")
        gl.nondet.exec_prompt=lambda p:json.dumps({"criteria":["unmet","met"]})
        self.c.resolve(self.id);self.c.finalize(self.id)
        self.assertEqual(len(self.record()["assessments"]),2)
        self.assertEqual(self.c.credit_of(Address("buyer")),"100")
if __name__=="__main__":unittest.main()

