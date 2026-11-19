// Rule-based, inspectable conversation and ICP assistance. No remote AI calls.
export const GOALS = {
  UNKNOWN: 'Unknown / ask first',
  NEW_STUDENTS: 'Bring in more student customers',
  OFF_PEAK: 'Fill quieter trading times',
  REPEAT: 'Encourage repeat visits',
  OTHER: 'Another business objective',
  NONE: 'No relevant growth objective'
};
export const REPLY_CLASSES=['NONE','INTERESTED','QUESTION','OBJECTION','WRONG_PERSON','NOT_NOW','DECLINED'];
const clean = x => String(x??'').trim();
export function profileScore(a={}) {
  const facts=[];let score=0;
  const add=(n,name,rule)=>{if(rule){score+=n;facts.push(`${name} (+${n})`)}};
  add(20,'Verified live company profile',!!a.profileVerified&&/^https?:\/\//.test(a.source||''));
  add(20,'Verified F&B student-offer segment',!!a.profileVerified&&/Food\//i.test(a.sector||''));
  add(20,'Student relevance documented',a.studentRelevance&&a.studentRelevance!=='UNKNOWN'&&!!clean(a.studentEvidence));
  add(25,'Decision owner and route confirmed',!!a.ownerVerified&&!!clean(a.buyer)&&!!clean(a.contact));
  add(15,'Relevant buyer goal confirmed',!!clean(a.confirmedNeed)&&a.buyerGoal&&!['UNKNOWN','NONE'].includes(a.buyerGoal)&&!!clean(a.goalEvidenceRef));
  const stopped = a.partnerStatus==='EXISTING_PARTNER'||a.interestStatus==='DECLINED'||a.permission==='DECLINED';
  const status=stopped?'STOP':score>=70?'ENGAGE':score>=40?'RESEARCH':'VERIFY';
  const gaps=[];
  if(!a.profileVerified)gaps.push('Check the live business profile');
  if(!a.studentRelevance||a.studentRelevance==='UNKNOWN'||!clean(a.studentEvidence))gaps.push('Establish observable student relevance');
  if(!a.ownerVerified||!clean(a.buyer)||!clean(a.contact))gaps.push('Identify and reach the promotion decision owner');
  if(!a.partnerStatus||a.partnerStatus==='UNKNOWN')gaps.push('Check current RealX partner status with the team');
  if(!clean(a.confirmedNeed)||!clean(a.goalEvidenceRef))gaps.push('Ask about a real goal and record the source');
  return {score,status,facts,gaps,stopped};
}

export function mapConversation(account={}, events=[], replyClass='NONE') {
  const a=account||{};
  if(!REPLY_CLASSES.includes(replyClass))throw Error('Unknown reply class');
  const booked=events.some(e=>e.accountId===a.id&&e.type==='MEETING_BOOKED');
  const result=(stage,question,reason,receipt,next)=>({stage,question,reason,receipt,next,company:a.company||'Unknown'});
  if(a.partnerStatus==='EXISTING_PARTNER')return result('ROUTE_EXISTING','Is there a RealX account owner who should handle offer performance?','Avoid duplicate merchant acquisition','Named RealX account owner','Hand off internally');
  if(a.permission==='DECLINED'||a.interestStatus==='DECLINED'||replyClass==='DECLINED')return result('STOP','No further pitch. Thank them and close the enquiry.','Respect explicit refusal','Rejection/opt-out note','Close lead and stop contacting');
  if(booked)return result('AE_HANDOFF','Which RealX account executive has accepted this confirmed meeting?','A booking is not yet an accepted handoff','AE acknowledgment reference','Send approved handoff and log AE acceptance');
  if(replyClass==='WRONG_PERSON')return result('HUMAN_ROUTER','Who manages student promotions or local partnerships for this business?','Find the actual decision owner','Role/name or explicit referral','Record referral and request appropriate introduction');
  if(replyClass==='QUESTION')return result('CLARIFY','What would you need to know before deciding whether a student offer is worth exploring?','Clarify their evaluation criteria; avoid inventing partnership terms','Exact buyer question and requested detail','Obtain approved answer and reply');
  if(replyClass==='OBJECTION')return result('OBJECTION','What about a student offer would make it unsuitable for your business?','Learn the real constraint before making claims','Verbatim objection','Record constraint or disqualify');
  if(replyClass==='NOT_NOW'||a.interestStatus==='NOT_NOW')return result('TIMING','Is there a better time to revisit this, or should I close the enquiry?','Respect timing and avoid unwanted follow-up','Permission or explicit close decision','Schedule only if invited');
  if(!a.ownerVerified||!clean(a.buyer))return result('HUMAN_ROUTER','Who decides whether this location can test student offers or partnerships?','A staff member may not control offers','Decision role or referral','Find the authorized decision-maker');
  if(!a.buyerGoal||a.buyerGoal==='UNKNOWN')return result('GOAL_DISCOVERY','Is bringing in students, filling quieter hours, or repeat visits a current priority?','Do not assume a café needs customers','Buyer-selected objective, including no priority','Record goal and source');
  if(a.buyerGoal==='NONE')return result('DISQUALIFY','Understood. Would you prefer I close this enquiry?','No relevant expressed objective','Explicit decision','Close without pitching');
  if(!clean(a.confirmedNeed)||!clean(a.goalEvidenceRef)){
    const prompts={NEW_STUDENTS:'How do university students currently discover your café?',OFF_PEAK:'Which hours, if any, are actually quiet enough to test an offer?',REPEAT:'How do you currently recognize or encourage returning student customers?',OTHER:'Can you describe the last time this business objective created a problem?'};
    return result('EVIDENCE_DISCOVERY',prompts[a.buyerGoal]||prompts.OTHER,'Request a concrete example, not hypothetical enthusiasm','Verbatim reply + dated interaction reference','Capture confirmed goal and evidence');
  }
  if(a.interestStatus==='INTERESTED'||replyClass==='INTERESTED'){
    if(!a.outreachAuthorized||!clean(a.authorizationRef))return result('INTERNAL_APPROVAL','Would you be comfortable if I asked our authorized RealX partnerships contact to follow up?','Do not represent a merchant offer without team approval','Buyer permission and team approval','Obtain authorization then arrange meeting');
    return result('MEETING_REQUEST','Would a 10-minute conversation with the RealX partnerships team be useful?','Make one bounded, relevant commitment request','Confirmed date/time, buyer and meeting reference','Book with both parties, then hand off to AE');
  }
  return result('VALUE_TEST','Would testing a student-specific offer address that goal, or is another approach better?','Test the value hypothesis instead of asserting ROI','Buyer yes/no and reasons','If interested, ask for an authorized meeting');
}
export function nextActionCard(a,events,replyClass='NONE'){
  const p=profileScore(a),m=mapConversation(a,events,replyClass);
  return [
    `REALX CONVERSATION CARD — ${clean(a.company)||'UNKNOWN'}`,
    `Source: ${clean(a.source)||'NONE'}`,
    `ICP: ${p.score}/100 · ${p.status} · self-reported checks`,
    `Buyer: ${clean(a.buyer)||'UNKNOWN'}`,
    `Declared goal: ${GOALS[a.buyerGoal||'UNKNOWN']||GOALS.UNKNOWN}`,
    `Buyer example: ${clean(a.confirmedNeed)||'NOT YET CONFIRMED'}`,
    `Evidence ref: ${clean(a.goalEvidenceRef)||'NONE'}`,
    `Stage: ${m.stage}`,
    `ASK: ${m.question}`,
    `WHY: ${m.reason}`,
    `CAPTURE: ${m.receipt}`,
    `NEXT: ${m.next}`,
    `GAPS: ${p.gaps.join('; ')||'No profile gaps identified'}`,
    'Do not infer consent, send messages, or claim a meeting from this card.'
  ].join('\n');
}
