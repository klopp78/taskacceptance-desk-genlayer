import './style.css';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { parseEther, formatEther } from 'viem';
const $=id=>document.getElementById(id);
let account,client,busy=false;
const reader=createClient({chain:studionet});
$('address').value=localStorage.getItem('taskacceptance.v2.contract')||'0x5b9b230e55AC1Ae9EbD3b5969872173785F3E464';
$('deadline').value=new Date(Date.now()+86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));});
document.querySelector('[data-tab]').classList.add('active');
function address(){const a=$('address').value.trim();if(!/^0x[0-9a-fA-F]{40}$/.test(a))throw Error('Set a deployed v2 contract address.');localStorage.setItem('taskacceptance.v2.contract',a);return a;}
function task(){const id=$('taskid').value.trim();if(!/^task_[a-f0-9]{64}$/.test(id))throw Error('Load a valid task ID.');return id;}
async function guard(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){$('status').textContent=e.shortMessage||e.message||String(e);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function identity(){if(!client)throw Error('Connect wallet first.');const [current]=await window.ethereum.request({method:'eth_accounts'});if(current?.toLowerCase()!==account.toLowerCase())throw Error('Wallet account changed. Reconnect.');if(Number(await window.ethereum.request({method:'eth_chainId'}))!==studionet.id)throw Error('Switch wallet to Studionet.');}
$('connect').onclick=()=>guard(async()=>{if(!window.ethereum)throw Error('No browser wallet detected.');[account]=await window.ethereum.request({method:'eth_requestAccounts'});if(Number(await window.ethereum.request({method:'eth_chainId'}))!==studionet.id)await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+studionet.id.toString(16)}]});client=createClient({chain:studionet,account,provider:window.ethereum});$('connect').textContent=account.slice(0,6)+'...'+account.slice(-4);$('status').textContent='Connected to Studionet';});
async function version(){const v=await reader.readContract({address:address(),functionName:'get_version',args:[],transactionHashVariant:'latest-final'});if(v!=='taskacceptance.v2.amount-bound')throw Error('Wrong contract version; v2 required.');}
async function readTask(){await version();const raw=await reader.readContract({address:address(),functionName:'get_task',args:[task()],transactionHashVariant:'latest-final'});if(!raw)throw Error('Task not found in finalized state.');const r=JSON.parse(raw);if(r.id!==task())throw Error('Task readback mismatch.');$('record').textContent=JSON.stringify(r,null,2);$('state').textContent=r.state;$('baseline').value=r.baseline_hash;return r;}
async function credit(){if(!account)return;const value=await reader.readContract({address:address(),functionName:'credit_of',args:[account],transactionHashVariant:'latest-final'});$('credit').textContent=formatEther(BigInt(value))+' GEN credit';}
$('load').onclick=()=>guard(async()=>{await readTask();await credit();$('status').textContent='Finalized task loaded.';});
async function write(functionName,args,value=0n){
  await identity();
  await version();
  const request={address:address(),functionName,args,value};
  $('status').textContent='Estimating protocol fees...';
  const estimate=await client.estimateTransactionFeesForWrite(request);
  await confirmTransaction(request,estimate);
  await identity();
  if(address().toLowerCase()!==request.address.toLowerCase())throw Error('Contract changed during confirmation.');
  const hash=await client.writeContract({...request,fees:{distribution:estimate.distribution,feeValue:estimate.feeValue,messageAllocations:estimate.messageAllocations}});
  $('tx').href='https://explorer-studio.genlayer.com/tx/'+hash;$('tx').hidden=false;
  $('status').textContent='Awaiting finalized execution: '+hash;
  const r=await client.waitForTransactionReceipt({hash,waitUntil:'finalized',retries:180,interval:3000});
  if(r.lifecycle?.state!=='finalized'||r.resultName!=='MAJORITY_AGREE'||r.txExecutionResultName!=='FINISHED_WITH_RETURN')throw Error('Execution not verified. Inspect transaction before retrying.');
  return r;
}

async function confirmTransaction(request,estimate){
  const dialog=document.createElement('dialog');
  dialog.setAttribute('aria-labelledby','transaction-title');
  const title=document.createElement('h2');title.id='transaction-title';title.textContent='Confirm testnet transaction';
  const details=document.createElement('pre');
  details.textContent=JSON.stringify({network:'Studionet (61999)',account,contract:request.address,method:request.functionName,escrowGEN:formatEther(request.value),escrowWei:request.value.toString(),protocolFeeGEN:formatEther(BigInt(estimate.feeValue)),arguments:request.args},null,2);
  const accept=document.createElement('button');accept.textContent='Confirm and request wallet signature';
  const cancel=document.createElement('button');cancel.textContent='Cancel transaction';
  dialog.append(title,details,accept,cancel);document.body.append(dialog);
  return new Promise((resolve,reject)=>{
    const finish=(approved)=>{dialog.close();dialog.remove();approved?resolve():reject(Error('Canceled before signing.'));};
    accept.onclick=()=>finish(true);cancel.onclick=()=>finish(false);
    dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);},{once:true});
    dialog.showModal();
  });
}
$('createTask').onclick=()=>guard(async()=>{
  await identity();
  const nonce=crypto.randomUUID(),criteria=$('criteria').value.split('\n').filter(x=>x.trim());
  const deadline=Math.floor(new Date($('deadline').value).getTime()/1000),worker=$('worker').value.trim();
  if(!Number.isFinite(deadline)||!/^0x[a-fA-F0-9]{40}$/.test(worker))throw Error('Invalid worker or deadline.');
  const id=await reader.readContract({address:address(),functionName:'preview_task_id',args:[account,nonce],transactionHashVariant:'latest-final'});
  const amount=parseEther($('amount').value);
  if(amount<=0n||amount>10n**18n)throw Error('Deposit must be positive and at most 1 test GEN.');
  await write('create_task',[worker,JSON.stringify(criteria),deadline,nonce,amount.toString()],amount);
  $('taskid').value=id;
  const r=await readTask();
  if(r.baseline.buyer.toLowerCase()!==account.toLowerCase()||r.baseline.worker.toLowerCase()!==worker.toLowerCase())throw Error('Created task identity mismatch.');
  if(r.baseline.deposit_wei!==amount.toString())throw Error('Deposit readback mismatch; stop all further actions.');
  $('status').textContent='Funded task finalized and read back.';
});
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>guard(async()=>{const name=b.dataset.action,args=[task()];if(name==='accept_task')args.push($('baseline').value);if(name==='submit_delivery')args.push($('delivery').value);if(name==='challenge')args.push($('objection').value);await write(name,args);await readTask();await credit();$('status').textContent=name+' finalized and state read back.';}));
$('withdraw').onclick=()=>guard(async()=>{await write('withdraw',[]);await credit();$('status').textContent='Withdrawal emission finalized. Verify recipient balance separately.';});

