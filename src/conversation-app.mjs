import {blank,validateImport,addAccount,addEvent,metrics,promoteEvidence} from './domain.mjs';
import {parseCSV,importCandidates,canHandoff,buildHandoff,realxExport} from './realx-core.mjs';
import {profileScore,mapConversation,nextActionCard,GOALS} from './conversation-core.mjs';
const $=id=>document.getElementById(id), STORE='marketos-v2-evidence';
let db=blank(),selectedId=null;
try{const old=localStorage.getItem(STORE);if(old)db=validateImport(JSON.parse(old))}catch(e){console.warn('Cannot load existing MarketOS ledger',e)}
const all=()=>db.accounts.filter(a=>a.track==='REALX');
const sel=()=>all().find(a=>a.id===selectedId)||null;
const el=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=String(text??'');if(cls)e.className=cls;return e};
function toast(msg,error=false){$('toast').textContent=msg;$('toast').className='status'+(error?' error':'')}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(db))}catch(e){toast('Local saving unavailable — export JSON',true)}render()}
function select(id){selectedId=id;render()}
function fill(a){const keys=['studentRelevance','studentEvidence','partnerStatus','buyer','contact','buyerGoal','interestStatus','confirmedNeed','goalEvidenceRef','permission','permissionRef','authorizationRef'];
 const defaults={studentRelevance:'UNKNOWN',partnerStatus:'UNKNOWN',buyerGoal:'UNKNOWN',interestStatus:'UNKNOWN',permission:'UNCONFIRMED'};
 for(const k of keys)$(k).value=a[k]??defaults[k]??'';
 $('profileVerified').checked=!!a.profileVerified;$('ownerVerified').checked=!!a.ownerVerified;$('outreachAuthorized').checked=!!a.outreachAuthorized;
 $('nextAction').value=a.next||'';$('hypothesis').value=a.hypothesis||'STUDENT_ACQUISITION';
}
function render(){const as=all();if(!as.some(a=>a.id===selectedId))selectedId=as[0]?.id||null;
 const k=metrics(db,'REALX'),boxes=[['Candidates',k.accounts],['Approaches',k.attempted],['Replies',k.replied],['Discoveries',k.discoveries],['Booked',k.meetingsBooked],['AE Accepted',k.handoffsAccepted]];
 $('kpis').replaceChildren(...boxes.map(([n,v])=>{const d=el('div','','kpi');d.append(el('strong',v),el('span',n));return d}));
 const q=$('search').value.toLowerCase(),f=$('filter').value;
 const found=as.filter(a=>(f==='ALL'||a.stage===f)&&(a.company+' '+(a.sector||'')+' '+(a.buyer||'')).toLowerCase().includes(q));
 $('queueCount').textContent=`${found.length} shown · ${as.length} stored`;const leads=found.map(a=>{const r=profileScore(a),b=el('button','','lead'+(a.id===selectedId?' active':''));const s=el('strong',a.company),t=el('span',`${r.score}/100 · ${r.status} · ${a.buyer||'Owner unknown'} · ${a.stage}`);b.append(s,t);b.addEventListener('click',()=>select(a.id));return b});$('leads').replaceChildren(...(leads.length?leads:[el('p','No matches. Import or add a business.','muted')]));
 const accountsEv=db.events.filter(e=>e.track==='REALX');$('funnel').textContent=`${k.attempted} approached → ${k.replied} replied → ${k.discoveries} discovery → ${k.meetingsBooked} booked → ${k.handoffsAccepted} accepted.\nReply/approached: ${k.attempted?(100*k.replied/k.attempted).toFixed(1)+'%':'N/A'} · Booked/approached: ${k.attempted?(100*k.meetingsBooked/k.attempted).toFixed(1)+'%':'N/A'}`;
 const lookup=new Map(as.map(a=>[a.id,a.company]));$('events').replaceChildren(...(accountsEv.length?accountsEv.slice(-8).reverse().map(e=>el('div',`${(e.at||'').slice(0,16)} · ${lookup.get(e.accountId)||'?'} · ${e.type} · ${e.receipt}`,'mini')):[el('p','No actual external events yet.','muted')]));
 const a=sel();for(const id of ['profileForm','eventForm'])$(id).querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=!a);for(const id of ['replyClass','hypothesis','copyQuestion','copyCard','copyGemini','copyHandoff','askGemini'])$(id).disabled=!a;
 $('selected').textContent=a?`${a.company} · ${a.sector||'Unknown'} · ${a.evidence} · directory entries require manual verification`:'No account selected';
 if(!a){$('score').textContent='—';$('scoreExplain').textContent='';$('profileLink').hidden=true;$('instagramLink').hidden=true;$('nextQuestion').textContent='Select an account.';$('handoff').textContent='No account.';return}
 fill(a);
 const p=profileScore(a);$('score').textContent=`${p.score}/100 · ${p.status}`;$('scoreExplain').textContent=`Scored based only on operator-recorded criteria:\n${p.facts.join('\n')||'No positive criteria verified'}\n\nGaps:\n${p.gaps.join('\n')||'None identified'}`;
 $('profileLink').hidden=!a.source; if(a.source)$('profileLink').href=a.source;
 $('instagramLink').hidden=!a.instagram;if(a.instagram)$('instagramLink').href=a.instagram;
 renderMapper();renderHandoff();
}
function renderMapper(){const a=sel();if(!a)return;
 const m=mapConversation(a,db.events,$('replyClass').value);
 $('mapStage').textContent=m.stage;$('nextQuestion').textContent=m.question;$('mapReason').textContent=m.reason;
 $('mapReceipt').textContent='Capture: '+m.receipt;$('mapNext').textContent='Next: '+m.next;
}
function renderHandoff(){const a=sel();if(!a)return;const c=canHandoff(a,db.events);$('handoffStatus').textContent=c.ready?'Meeting recorded; ready for AE review, not yet AE accepted.':'Blocked: '+c.gaps.join('; ');$('handoff').textContent=c.ready?buildHandoff(a,db.events):'No completed AE handoff yet.'}
async function copy(s){try{await navigator.clipboard.writeText(s);toast('Copied; nothing was sent.')}catch(e){toast('Clipboard unavailable here; select and manually copy text.',true)}}
function getDraftContext(a){const m=mapConversation(a,db.events,$('replyClass').value);return `You are a practical RealX Qatar conversation copilot. Use only confirmed facts.\nCompany: ${a.company}\nSource: ${a.source}\nSegment: ${a.sector||'UNKNOWN'}\nDecision-maker: ${a.ownerVerified?a.buyer:'UNCONFIRMED'}\nBusiness goal: ${GOALS[a.buyerGoal||'UNKNOWN']}\nActual buyer words: ${a.confirmedNeed||'NOT RECORDED'}\nSource/receipt: ${a.goalEvidenceRef||'NONE'}\nLatest response classification: ${$('replyClass').value}\nCurrent stage: ${m.stage}\nSuggested next question: ${m.question}\nRealX outreach authorization: ${a.outreachAuthorized&&a.authorizationRef?'OPERATOR-REPORTED YES':'NOT VERIFIED'}\nElectronic message consent: ${a.permission==='CONSENTED'&&a.permissionRef?'OPERATOR-REPORTED YES':'NOT VERIFIED'}\n\nReturn STRICT JSON: {"facts":[],"hypotheses":[],"stage":"","next_question":"","why":"","objection_response":"","requested_receipt":"","next_external_action":"","should_stop":false}. One question <=25 words. Never fabricate contact, payment, pricing, discount, meeting, merchant intent, redemptions or RealX authorization. Do not generate an electronic marketing message without recorded consent AND RealX authorization. If asked about commercial terms, state unknown and request approved terms. No outbound sending.`}
$('loadSeed').onclick=async()=>{try{const csv=typeof EMBEDDED_CSV!=='undefined'?EMBEDDED_CSV:await fetch('./data/food_candidates.csv').then(r=>{if(!r.ok)throw Error('Candidate file not found');return r.text()});const r=importCandidates(db,parseCSV(csv));db=r.data;persist();toast(`${r.added} existing directory candidates imported, ${r.duplicate} duplicates. No buyer data verified.`)}catch(e){toast(e.message,true)}};
$('importCsv').onclick=()=>$('csvInput').click();$('csvInput').onchange=async e=>{try{if(!e.target.files[0])return;const rows=parseCSV(await e.target.files[0].text());const r=importCandidates(db,rows);db=r.data;persist();toast(`Added ${r.added}, duplicates ${r.duplicate}, skipped ${r.skipped}.`)}catch(err){toast(err.message,true)}finally{e.target.value=''}};
$('manualForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);try{db=addAccount(db,{track:'REALX',company:String(f.get('company')).trim(),source:String(f.get('source')).trim(),sector:String(f.get('sector')).trim(),next:'Verify owner and partnership status',profileVerified:false,partnerStatus:'UNKNOWN'});selectedId=db.accounts.at(-1).id;e.target.reset();persist();toast('Prospect added without asserting validation.')}catch(err){toast(err.message,true)}};
$('search').oninput=render;$('filter').onchange=render;
$('profileForm').onsubmit=e=>{e.preventDefault();const a=sel();if(!a)return;
 const keys=['studentRelevance','studentEvidence','partnerStatus','buyer','contact','buyerGoal','interestStatus','confirmedNeed','goalEvidenceRef','permission','permissionRef','authorizationRef'];const updates=Object.fromEntries(keys.map(k=>[k,$(k).value.trim()]));
 updates.profileVerified=$('profileVerified').checked;updates.ownerVerified=$('ownerVerified').checked;updates.outreachAuthorized=$('outreachAuthorized').checked;updates.hypothesis=$('hypothesis').value;updates.next=$('nextAction').value.trim();
 if(updates.ownerVerified&&!updates.buyer)return toast('Confirmed decision-maker needs a role/name',true);
 if(updates.studentRelevance!=='UNKNOWN'&&!updates.studentEvidence)return toast('Student relevance needs a source or observation',true);
 if(updates.confirmedNeed&&!updates.goalEvidenceRef)return toast('Buyer statement needs a source/date reference',true);
 if(updates.permission==='CONSENTED'&&!updates.permissionRef)return toast('Consent requires evidence reference',true);
 if(updates.outreachAuthorized&&!updates.authorizationRef)return toast('RealX authorization requires a reference',true);
 db={...db,accounts:db.accounts.map(x=>x.id===a.id?{...x,...updates}:x)};
 if(updates.profileVerified&&a.evidence==='HYPOTHESIS'&&a.source){try{db=promoteEvidence(db,a.id,'PUBLIC_EVIDENCE',a.source)}catch(err){toast(err.message,true)}}
 persist();toast('Profile updated. Verification inputs remain human-reported.')};
$('replyClass').onchange=renderMapper;
$('hypothesis').onchange=()=>{const a=sel();if(!a)return;db={...db,accounts:db.accounts.map(x=>x.id===a.id?{...x,hypothesis:$('hypothesis').value}:x)};persist()};
$('copyQuestion').onclick=()=>{const a=sel();if(a)copy(mapConversation(a,db.events,$('replyClass').value).question)};
$('copyCard').onclick=()=>{const a=sel();if(a)copy(nextActionCard(a,db.events,$('replyClass').value))};
$('copyGemini').onclick=()=>{const a=sel();if(a)copy(getDraftContext(a))};
$('askGemini').onclick=async()=>{
 const a=sel();if(!a)return;const m=mapConversation(a,db.events,$('replyClass').value),out=$('aiResult');
 out.classList.remove('hidden');out.textContent='Requesting optional Gemini review...';
 try{const reply=await fetch('/api/conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:a,responseClass:$('replyClass').value,exactReply:'',deterministicStage:m.stage,deterministicQuestion:m.question})});
 const result=await reply.json();if(!reply.ok)throw Error(result.error||'API unavailable');
 out.textContent=`AI-SUGGESTED (NOT VERIFIED) · ${result.stage}\nNext: ${result.next_question}\nReason: ${result.why}\nCapture: ${result.evidence_to_capture}\nAction: ${result.next_action}\nUncertainty: ${result.uncertainty}\nDo not promote this suggestion to evidence.`;
 }catch(e){out.textContent=`Gemini unavailable: ${e.message}.\nOffline mapped question: ${m.question}`}
};
$('eventType').onchange=()=>{$('meetingField').classList.toggle('hidden',$('eventType').value!=='MEETING_BOOKED')};
$('eventForm').onsubmit=e=>{e.preventDefault();const a=sel();if(!a)return;
 const type=$('eventType').value,note=$('eventNote').value.trim(),receipt=$('eventReceipt').value.trim(),actor=$('eventActor').value.trim(),meetingAt=$('meetingAt').value;
 try{db=addEvent(db,a.id,{type,note,receipt,actor,meetingAt});e.target.reset();$('meetingField').classList.add('hidden');persist();toast(`${type} stored as operator-reported external event. No provider verification.`)}catch(err){toast(err.message,true)}};
$('copyHandoff').onclick=()=>{const a=sel();if(!a)return;try{copy(buildHandoff(a,db.events))}catch(e){toast(e.message,true)}};
function download(name,s,mime){const u=URL.createObjectURL(new Blob([s],{type:mime}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$('exportJson').onclick=()=>download('realx-marketos-v3-ledger.json',JSON.stringify(db,null,2),'application/json');
$('exportCsv').onclick=()=>download('realx-merchant-accounts.csv',realxExport(db),'text/csv;charset=utf-8');
$('importJson').onclick=()=>$('jsonInput').click();$('jsonInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>5000000)throw Error('JSON export exceeds 5MB');const data=validateImport(JSON.parse(await f.text()));if(!confirm('Replace current in-browser MarketOS ledger with this backup? Export first if needed.'))return;db=data;selectedId=null;persist();toast('MarketOS V2-compatible JSON restored.')}catch(err){toast(err.message,true)}finally{e.target.value=''}};
render();
