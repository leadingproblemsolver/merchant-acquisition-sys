export const TRACKS = ['REALX','PAID_B2B','UHUB'];
export const STAGES = ['SOURCED','VERIFIED','CONTACTED','REPLIED','MEETING_BOOKED','HANDOFF','DISCOVERY','PROPOSED','PILOT','WON','LOST'];
export const EVIDENCE = ['HYPOTHESIS','PUBLIC_EVIDENCE','BUYER_CONFIRMED','TRANSACTION_VERIFIED'];
const valid = (v, arr) => arr.includes(v);
export const blank = () => ({schema:2, accounts:[], events:[]});
export function validateAccount(a) {
  if (!a || typeof a !== 'object') throw Error('Account must be an object');
  if (!valid(a.track, TRACKS)) throw Error('Invalid track');
  if (!String(a.company||'').trim()) throw Error('Company is required');
  if (!valid(a.stage, STAGES)) throw Error('Invalid stage');
  if (!valid(a.evidence, EVIDENCE)) throw Error('Invalid evidence state');
  if (a.source && !/^https?:\/\//i.test(a.source)) throw Error('Source URL must be HTTP(S)');
  return a;
}
export function addAccount(data, input) {
  const a = validateAccount({...input, stage:'SOURCED', evidence:'HYPOTHESIS'});
  if (data.accounts.some(x=>x.track===a.track && x.company.toLowerCase()===a.company.trim().toLowerCase())) throw Error('Duplicate company within track');
  const account={...a,id:crypto.randomUUID(),company:a.company.trim(),next:a.next||'Verify evidence and contact route',createdAt:new Date().toISOString()};
  return {...data,accounts:[...data.accounts,account]};
}
const REQUIREMENTS = {
  PUBLIC_EVIDENCE:['source'],
  BUYER_CONFIRMED:['receipt','actor'],
  TRANSACTION_VERIFIED:['receipt','actor']
};
export function addEvent(data, accountId, input) {
  const a=data.accounts.find(x=>x.id===accountId);
  if(!a) throw Error('Account not found');
  if(!input.type || !input.note?.trim()) throw Error('Event type and factual note are required');
  if(!input.receipt?.trim()) throw Error('A receipt/reference is required to record external events');
  const allowed=['ATTEMPT','DELIVERED','REPLY','DISCOVERY','NEXT_STEP','PROPOSAL','PILOT_AUTHORIZED','PAYMENT','PARTNER_ACTIVE','REDEMPTION','REJECTION','EVIDENCE','MEETING_BOOKED','HANDOFF_ACCEPTED'];
  if(!allowed.includes(input.type)) throw Error('Invalid event type');
  if (input.type==='MEETING_BOOKED') {
    if(a.track!=='REALX') throw Error('Merchant meeting belongs to REALX');
    if(!input.actor?.trim()) throw Error('Meeting needs a confirmed contact/actor');
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.meetingAt||'')) throw Error('Meeting needs an exact local date/time');
  }
  if (input.type==='HANDOFF_ACCEPTED') {
    if(a.track!=='REALX') throw Error('AE handoff belongs to REALX');
    if(!input.actor?.trim()) throw Error('Handoff needs accepting AE');
    if(!data.events.some(e=>e.accountId===accountId&&e.type==='MEETING_BOOKED')) throw Error('Book a meeting before AE handoff');
  }
  if(input.type==='PAYMENT' && (!Number.isFinite(Number(input.amount)) || Number(input.amount)<=0)) throw Error('Payment needs positive amount');
  if(input.type==='PAYMENT' && a.track!=='PAID_B2B') throw Error('Only PAID_B2B cash receipts belong in this revenue measure');
  if(input.type==='REDEMPTION' && a.track!=='REALX') throw Error('Redemption belongs to REALX');
  const event={id:crypto.randomUUID(),accountId,track:a.track,at:new Date().toISOString(),type:input.type,note:input.note.trim(),receipt:input.receipt.trim(),actor:input.actor||'',meetingAt:input.type==='MEETING_BOOKED'?input.meetingAt:undefined,amount:input.type==='PAYMENT'?Number(input.amount):0};
  const eventStage={ATTEMPT:'CONTACTED',REPLY:'REPLIED',MEETING_BOOKED:'MEETING_BOOKED',HANDOFF_ACCEPTED:'HANDOFF',DISCOVERY:'DISCOVERY',PROPOSAL:'PROPOSED',PILOT_AUTHORIZED:'PILOT',PAYMENT:'WON',PARTNER_ACTIVE:'WON',REJECTION:'LOST'}[input.type];
  const updated={...a};
  if(eventStage && (STAGES.indexOf(eventStage)>STAGES.indexOf(updated.stage)||eventStage==='LOST')) updated.stage=eventStage;
  return {...data,events:[...data.events,event],accounts:data.accounts.map(x=>x.id===accountId?updated:x)};
}
export function promoteEvidence(data, id, state, receipt, actor='') {
  if(!valid(state,EVIDENCE)) throw Error('Unknown evidence state');
  const a=data.accounts.find(x=>x.id===id);if(!a)throw Error('Account not found');
  for(const field of REQUIREMENTS[state]||[]) {
    if(field==='source' && !a.source)throw Error('Public evidence needs a source URL');
    if(field==='receipt' && !receipt?.trim())throw Error('Evidence promotion needs a receipt');
    if(field==='actor' && !actor.trim())throw Error('Buyer/transaction confirmation needs an actor');
  }
  if(EVIDENCE.indexOf(state)<EVIDENCE.indexOf(a.evidence)) throw Error('Evidence cannot be downgraded through promotion');
  const next={...data,accounts:data.accounts.map(x=>x.id===id?{...x,evidence:state,stage:x.stage==='SOURCED'?'VERIFIED':x.stage}:x)};
  return state==='HYPOTHESIS'?next:addEvent(next,id,{type:'EVIDENCE',note:`Promoted to ${state}`,receipt:receipt||a.source,actor});
}
export function metrics(data,track){
  const accounts=data.accounts.filter(a=>a.track===track), ids=new Set(accounts.map(a=>a.id));
  const ev=data.events.filter(e=>ids.has(e.accountId));
  const distinct=type=>new Set(ev.filter(e=>e.type===type).map(e=>e.accountId)).size;
  const count=(...types)=>new Set(ev.filter(e=>types.includes(e.type)).map(e=>e.accountId)).size;
  const approached=distinct('ATTEMPT'),replied=distinct('REPLY'), discoveries=distinct('DISCOVERY');
  return {accounts:accounts.length,attempted:approached,replied,discoveries,commitments:distinct('NEXT_STEP'),pilots:distinct('PILOT_AUTHORIZED'),paidAccounts:distinct('PAYMENT'),collectedQAR:track==='PAID_B2B'?ev.filter(e=>e.type==='PAYMENT').reduce((s,e)=>s+e.amount,0):null,activePartners:track==='REALX'?distinct('PARTNER_ACTIVE'):null,meetingsBooked:track==='REALX'?distinct('MEETING_BOOKED'):null,handoffsAccepted:track==='REALX'?distinct('HANDOFF_ACCEPTED'):null,redemptions:track==='REALX'?ev.filter(e=>e.type==='REDEMPTION').length:null,replyRate:approached?replied/approached:null,discoveryRate:replied?discoveries/replied:null};
}
export function validateImport(data){
  if(!data || data.schema!==2 || !Array.isArray(data.accounts) || !Array.isArray(data.events)) throw Error('Expected MarketOS v2 JSON export');
  const ids=new Set();for(const a of data.accounts){validateAccount(a);if(!a.id||ids.has(a.id))throw Error('Duplicate/missing account id');ids.add(a.id)}
  for(const e of data.events){if(!ids.has(e.accountId)||!e.id||!e.type||!e.receipt)throw Error('Invalid orphan or incomplete event')}
  return data;
}
export function csvExport(data){
  const headers=['track','company','stage','evidence','source','buyer','contact','pain','next','id'];
  const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';
  return [headers.join(','),...data.accounts.map(a=>headers.map(k=>quote(a[k])).join(','))].join('\r\n');
}
export function gapReport(data,track){
 const missing=[];
 for(const a of data.accounts.filter(x=>x.track===track)) {
   if(!a.source)missing.push({account:a.company,gap:'No source URL',action:'Verify company and attach source'});
   if(!a.contact)missing.push({account:a.company,gap:'No contact route',action:'Identify publicly listed business route'});
   if(!a.buyer)missing.push({account:a.company,gap:'No buyer role',action:'Identify decision owner'});
   if(!data.events.some(e=>e.accountId===a.id && e.type==='ATTEMPT'))missing.push({account:a.company,gap:'No outreach attempt',action:'Make one permitted actual contact'});
 }
 return missing;
}
