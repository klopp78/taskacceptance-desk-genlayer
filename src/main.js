import './style.css';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { parseEther, formatEther } from 'viem';
const $=id=>document.getElementById(id);
let account,client,busy=false;
const reader=createClient({chain:studionet});
$('address').value=localStorage.getItem('taskacceptance.contract')||'';
$('deadline').value=new Date(Date.now()+86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));});
document.querySelector('[data-tab]').classList.add('active');
function address(){const a=$('address').value.trim();if(!/^0x[0-9a-fA-F]{40}$/.test(a))throw Error('Set a deployed contract address.');localStorage.setItem('taskacceptance.contract',a);return a;}
function task(){const id=$('taskid').value.trim();if(!/^task_[a-f0-9]{64}$/.test(id))throw Error('Load a valid task ID.');return id;}
async function guard(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){$('status').textContent=e.shortMessage||e.message||String(e);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function identity(){if(!client)throw Error('Connect wallet first.');const [current]=await window.ethereum.request({method:'eth_accounts'});if(current?.toLowerCase()!==account.toLowerCase())throw Error('Wallet account changed. Reconnect.');if(Number(await window.ethereum.request({method:'eth_chainId'}))!==studionet.id)throw Error('Switch wallet to Studionet.');}
$('connect').onclick=()=>guard(async()=>{if(!window.ethereum)throw Error('No browser wallet detected.');[account]=await window.ethereum.request({method:'eth_requestAccounts'});if(Number(await window.ethereum.request({method:'eth_chainId'}))!==studionet.id)await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+studionet.id.toString(16)}]});client=createClient({chain:studionet,account,provider:window.ethereum});$('connect').textContent=account.slice(0,6)+'...'+account.slice(-4);$('status').textContent='Connected to Studionet';});
async function readTask(){const raw=await reader.readContract({address:address(),functionName:'get_task',args:[task()],stateStatus:'finalized'});if(!raw)throw Error('Task not found in finalized state.');const r=JSON.parse(raw);if(r.id!==task())throw Error('Task readback mismatch.');$('record').textContent=JSON.stringify(r,null,2);$('state').textContent=r.state;$('baseline').value=r.baseline_hash;return r;}
async function credit(){if(!account)return;const value=await reader.readContract({address:address(),functionName:'credit_of',args:[account],stateStatus:'finalized'});$('credit').textContent=formatEther(BigInt(value))+' GEN credit';}
$('load').onclick=()=>guard(async()=>{await readTask();await credit();$('status').textContent='Finalized task loaded.';});
async function write(functionName,args,value=0n){
  await identity();
  const request={address:address(),functionName,args,value};
  $('status').textContent='Estimating protocol fees...';
  const estimate=await client.estimateTransactionFeesForWrite(request);
  if(!window.confirm('Submit '+functionName+'? Escrow: '+formatEther(value)+' test GEN; fee deposit: '+formatEther(BigInt(estimate.feeValue))+' test GEN'))throw Error('Canceled before signing.');
  const hash=await client.writeContract({...request,fees:{distribution:estimate.distribution,feeValue:estimate.feeValue,messageAllocations:estimate.messageAllocations}});
  $('tx').href='https://explorer-studio.genlayer.com/tx/'+hash;$('tx').hidden=false;
  $('status').textContent='Awaiting finalized execution: '+hash;
  const r=await client.waitForTransactionReceipt({hash,waitUntil:'finalized',retries:180,interval:3000});
  if(r.lifecycle?.state!=='finalized'||r.resultName!=='MAJORITY_AGREE'||r.txExecutionResultName!=='FINISHED_WITH_RETURN')throw Error('Execution not verified. Inspect transaction before retrying.');
  return r;
}
$('createTask').onclick=()=>guard(async()=>{
  await identity();
  const nonce=crypto.randomUUID(),criteria=$('criteria').value.split('\n').filter(x=>x.trim());
  const deadline=Math.floor(new Date($('deadline').value).getTime()/1000),worker=$('worker').value.trim();
  if(!Number.isFinite(deadline)||!/^0x[a-fA-F0-9]{40}$/.test(worker))throw Error('Invalid worker or deadline.');
  const id=await reader.readContract({address:address(),functionName:'preview_task_id',args:[account,nonce],transactionHashVariant:'latest-final'});
  await write('create_task',[worker,JSON.stringify(criteria),deadline,nonce],parseEther($('amount').value));
  $('taskid').value=id;
  const r=await readTask();
  if(r.baseline.buyer.toLowerCase()!==account.toLowerCase()||r.baseline.worker.toLowerCase()!==worker.toLowerCase())throw Error('Created task identity mismatch.');
  $('status').textContent='Funded task finalized and read back.';
});
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>guard(async()=>{const name=b.dataset.action,args=[task()];if(name==='accept_task')args.push($('baseline').value);if(name==='submit_delivery')args.push($('delivery').value);if(name==='challenge')args.push($('objection').value);await write(name,args);await readTask();await credit();$('status').textContent=name+' finalized and state read back.';}));
$('withdraw').onclick=()=>guard(async()=>{await write('withdraw',[]);await credit();$('status').textContent='Withdrawal emission finalized. Verify recipient balance separately.';});

