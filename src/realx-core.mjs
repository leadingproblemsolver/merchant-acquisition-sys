import {addAccount} from './domain.mjs';

// CSV reader handles escaped quotes, commas, CRLF and line breaks within quoted cells.
export function parseCSV(source) {
  const raw=String(source||'').replace(/^\uFEFF/,'');
  let rows=[], row=[], cell='', quotes=false;
  for(let i=0;i<raw.length;i++){
    const ch=raw[i];
    if(ch==='"'){
      if(quotes && raw[i+1]==='"'){cell+='"';i++} else quotes=!quotes;
    }else if(ch===','&&!quotes){row.push(cell);cell=''}
    else if((ch==='\n'||ch==='\r')&&!quotes){
      if(ch==='\r'&&raw[i+1]==='\n')i++;
      row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';
    }else cell+=ch;
  }
  if(quotes)throw Error('CSV has an unmatched quote');
  if(cell||row.length){row.push(cell);if(row.some(x=>x.trim()))rows.push(row)}
  if(!rows.length)return [];
  const headers=rows.shift().map(h=>h.trim());
  if(!headers.includes('company'))throw Error('CSV must contain a company column');
  return rows.map((values,i)=>({__row:i+2,...Object.fromEntries(headers.map((h,j)=>[h,(values[j]||'').trim()]))}));
}
export const FOOD_SEGMENTS=['Food/','Events/Catering'];
export const isMerchantCandidate = row => FOOD_SEGMENTS.some(s=>(row.sector||'').startsWith(s));
export function importCandidates(data, rows, {foodOnly=true}={}) {
  let next=data, added=0, duplicate=0, skipped=0;
  for(const row of rows){
    if(!row.company?.trim()||(foodOnly&&!isMerchantCandidate(row))){skipped++;continue;}
    const source=row.instagram_url?.startsWith('https://')?row.instagram_url:row.directory_source;
    if(!source?.startsWith('https://')){skipped++;continue;}
    try{
      next=addAccount(next,{track:'REALX',company:row.company,source,buyer:'',contact:'',pain:'UNVERIFIED — '+(row.hypothesis_to_check||'Student offer fit'),next:'Verify live profile and request decision-maker introduction',sector:row.sector||'',instagram:row.instagram_url||'',directorySource:row.directory_source||'',sourceStatus:'DIRECTORY_CANDIDATE',hypothesis:'STUDENT_ACQUISITION',permission:'UNCONFIRMED',profileVerified:false,ownerVerified:false});
      added++;
    }catch(error){if(error.message.includes('Duplicate company'))duplicate++;else throw error;}
  }
  return {data:next,added,duplicate,skipped};
}
export const HYPOTHESES={
 STUDENT_ACQUISITION:{title:'Reach verified students',question:'Are you actively trying to bring in more university students, or is that not a priority?',value:'Student-specific offer discovery'},
 OFF_PEAK:{title:'Test quieter trading hours',question:'Are there quieter periods when a student-only offer would be worth testing?',value:'Targeted student visits during an owner-confirmed quiet period'}
};
export function draftConversation(account, hypothesis='STUDENT_ACQUISITION', channel='IN_PERSON') {
 const h=HYPOTHESES[hypothesis];if(!h)throw Error('Unknown hypothesis');
 if(!account||!account.company)throw Error('Account missing');
 const company=account.company;
 if(channel==='IN_PERSON')return `Hi, is the person responsible for local promotions or partnerships available? I'm helping RealX explore student offers in Qatar. ${h.question}`;
 if(channel==='PHONE')return `Hello, I'm calling about a potential student offer for ${company}. Could you direct me to whoever manages promotions or partnerships? ${h.question}`;
 if(channel==='EMAIL' || channel==='DM'){
   if(account.permission!=='CONSENTED'||!account.permissionRef?.trim())throw Error('Electronic marketing draft is gated until recipient consent and evidence reference are recorded');
   if(!account.outreachAuthorized||!account.authorizationRef?.trim())throw Error('RealX outreach authorization and approval reference required');
   return `Hello, following our agreed contact, I'm helping RealX explore student offers in Qatar. ${h.question} If useful, may I arrange a short discussion with our partnerships team? If you'd prefer no further messages, please let me know.`;
 }
 throw Error('Unsupported channel');
}
export function canHandoff(account,events){
 const booked=events.filter(e=>e.accountId===account?.id&&e.type==='MEETING_BOOKED').at(-1);
 const gaps=[];
 if(!account)gaps.push('Select an account');
 else{
  if(!account.ownerVerified || !account.buyer?.trim())gaps.push('Confirm decision-maker role');
  if(!account.contact?.trim())gaps.push('Record a permitted contact route');
 }
 if(!booked)gaps.push('Log a confirmed meeting with date/time and reference');
 return {ready:gaps.length===0,gaps,booked};
}
export function buildHandoff(account,events){
 const check=canHandoff(account,events);
 if(!check.ready)throw Error('AE handoff blocked: '+check.gaps.join('; '));
 const last=events.filter(e=>e.accountId===account.id).slice(-8);
 const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
 return [
  'REALX — MERCHANT MEETING HANDOFF (LOCAL DRAFT)',
  `Company: ${clean(account.company)}`,
  `Source: ${clean(account.source)}`,
  `Decision owner (user-confirmed): ${clean(account.buyer)}`,
  `Permitted route: ${clean(account.contact)}`,
  `Value hypothesis: ${HYPOTHESES[account.hypothesis||'STUDENT_ACQUISITION'].title}`,
  `Buyer-confirmed need (if any): ${clean(account.confirmedNeed)||'NOT CONFIRMED'}`,
  `Booked date/time (Qatar local): ${check.booked.meetingAt}`,
  `Meeting confirmation actor: ${clean(check.booked.actor)}`,
  `Meeting receipt (self-entered; not provider verified): ${clean(check.booked.receipt)}`,
  `Last events: ${last.map(e=>`${e.type} (${clean(e.note)}; ${clean(e.receipt)})`).join(' | ')}`,
  'Next: AE confirms receipt, holds discovery, agrees approved merchant terms.',
  'No merchant partnership or redemption is inferred from this booking.'
 ].join('\n');
}
export function csvSafe(s){const x=String(s??'');return '"'+(/^[=+@\-\t\r]/.test(x)?"'":"")+x.replaceAll('"','""')+'"';}
export function realxExport(data){
 const fields=['company','source','sector','stage','buyer','ownerVerified','contact','permission','hypothesis','profileVerified','confirmedNeed','next'];
 return [fields.join(','),...data.accounts.filter(a=>a.track==='REALX').map(a=>fields.map(k=>csvSafe(a[k])).join(','))].join('\r\n');
}
