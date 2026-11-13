/* DungeonHub V27 · Raid, Pantheon & Lowman module. Public Bungie data only. */
const RAID_CATALOG=[
 {name:'The Desert Perpetual',slug:'the-desert-perpetual',year:2025,place:'Kepler',seal:'Atemporal',tone:['#634d79','#283854']},
 {name:'Salvation’s Edge',slug:'salvations-edge',year:2024,place:'The Pale Heart',seal:'Iconoclast',tone:['#536c73','#26253d']},
 {name:'Crota’s End',slug:'crotas-end',year:2023,place:'The Moon',seal:'Swordbearer',tone:['#477c61','#141e2b']},
 {name:'Root of Nightmares',slug:'root-of-nightmares',year:2023,place:'Essence',seal:'Dream Warrior',tone:['#b57c65','#402b49']},
 {name:'King’s Fall',slug:'kings-fall',year:2022,place:'Dreadnaught',seal:'Kingslayer',tone:['#798072','#303b36']},
 {name:'Vow of the Disciple',slug:'vow-of-the-disciple',year:2022,place:'Savathûn’s Throne World',seal:'Disciple-Slayer',tone:['#9b6859','#282b40']},
 {name:'Vault of Glass',slug:'vault-of-glass',year:2021,place:'Venus',seal:'Fatebreaker',tone:['#638c91','#2e4054']},
 {name:'Deep Stone Crypt',slug:'deep-stone-crypt',year:2020,place:'Europa',seal:'Descendant',tone:['#6986a4','#283a49']},
 {name:'Garden of Salvation',slug:'garden-of-salvation',year:2019,place:'Moon',seal:'Enlightened',tone:['#668e64','#2c3653']},
 {name:'Last Wish',slug:'last-wish',year:2018,place:'Dreaming City',seal:'Rivensbane',tone:['#9470a9','#373459']},
 {name:'Crown of Sorrow',slug:'crown-of-sorrow',year:2019,place:'Leviathan',legacy:true,tone:['#86785d','#343141']},
 {name:'Scourge of the Past',slug:'scourge-of-the-past',year:2018,place:'Last City',legacy:true,tone:['#767881','#354252']},
 {name:'Spire of Stars',slug:'spire-of-stars',year:2018,place:'Leviathan',legacy:true,tone:['#9a7358','#37324f']},
 {name:'Eater of Worlds',slug:'eater-of-worlds',year:2017,place:'Leviathan',legacy:true,tone:['#817a9f','#3c3452']},
 {name:'Leviathan',slug:'leviathan',year:2017,place:'Nessus orbit',legacy:true,tone:['#a88958','#433346']}
];
const PANTHEON_VARIANTS=[
 {name:'Pantheon (2026)',detail:'Permanent Pantheon challenges and rotating encounters, introduced with Monument of Triumph.'},
 {name:'Pantheon (2024)',detail:'The original Pantheon boss gauntlets and challenge tiers.'}
];
let egRaidState={key:'',loading:false,loaded:false,complete:false,more:false,checking:false,checked:0,error:'',pages:0,activities:[],reportInfo:new Map(),nextPages:{},ended:{},autoVersion:0};
let egSelectedRaidSlug='';let egRaidFilter='active';let egProfileRaid='all';
const EG_RAID_PAGES_PER_BATCH=3;
const EG_HISTORY_PAGE_SIZE=100;
const EG_VERIFY_LIMIT=35;
const EG_PANTHEON_PAGES=1;
function egNorm(t){return String(t||'').normalize('NFKD').replace(/[’‘`´]/g,"'").toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function egIsPantheon(name){const n=egNorm(name);return /(?:^|\s)(?:the )?pantheon\b/.test(n)||n.includes('calus resplendent')||n.includes('morgeth surpassing')}
function egMatchRaid(name){const n=egNorm(name);if(!n||egIsPantheon(n))return null;
  return RAID_CATALOG.find(r=>{
    const rname=egNorm(r.name); if(r.slug==='leviathan')return n==='leviathan'||n.startsWith('leviathan raid');
    if(r.slug==='spire-of-stars')return n.includes('spire of stars')||n.includes('leviathan spire of stars');
    if(r.slug==='eater-of-worlds')return n.includes('eater of worlds')||n.includes('leviathan eater of worlds');
    return n.includes(rname) || n.includes(egNorm(r.slug));
  })||null;
}
function egCategoryTag(kind){return kind==='raids'?'Raids':kind==='pantheon'?'Pantheon':'Lowmans'}
function egHomeTiles(){return `<div class="eg-category-grid">
  <button class="eg-category eg-dungeon" onclick="navigate('dungeons')"><span class="eg-category-kicker">01 / DUNGEONS</span><strong>11 Dungeons</strong><small>Completions, solo flawless, activity reports</small><span>Explore ↗</span></button>
  <button class="eg-category eg-raids" onclick="navigate('raids')"><span class="eg-category-kicker">02 / RAIDS</span><strong>15 Raids</strong><small>Current and legacy raid history</small><span>Explore ↗</span></button>
  <button class="eg-category eg-pantheon" onclick="navigate('pantheon')"><span class="eg-category-kicker">03 / PANTHEON</span><strong>Pantheon</strong><small>Gauntlet runs and challenge history</small><span>Explore ↗</span></button>
  <button class="eg-category eg-lowman" onclick="navigate('lowmans')"><span class="eg-category-kicker">04 / LOWMANS</span><strong>Lowmans</strong><small>Solo, duo and trio raid reports</small><span>Explore ↗</span></button></div>`}
function egRaidCard(r,index,stat){const tones=r.tone;return `<button type="button" class="eg-raid-card" onclick="egOpenRaid(${index})" style="--eg-a:${tones[0]};--eg-b:${tones[1]}">
  <div class="eg-raid-visual"><span>${r.year}</span>${r.legacy?'<b>LEGACY</b>':''}</div>
  <div class="eg-raid-body"><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(r.place)}</small><div class="eg-raid-foot"><span>${stat||'Raid records'}</span><span>View ↗</span></div></div></button>`}
function egBrowseRaids(){const list=RAID_CATALOG.map((r,i)=>({r,i})).filter(x=>egRaidFilter==='all'||(egRaidFilter==='legacy'?x.r.legacy:!x.r.legacy));return `<header class="eg-heading"><span class="eyebrow">DESTINY 2 ENDGAME</span><h1>Raids</h1><p>Every currently playable raid, plus vaulted raids with historical records. Open a Guardian to check their raid history.</p></header>
  <div class="eg-toolbar"><span>${list.length} raid${list.length===1?'':'s'}</span><div><button class="${egRaidFilter==='active'?'active':''}" onclick="egRaidFilter='active';render()">Available (10)</button><button class="${egRaidFilter==='legacy'?'active':''}" onclick="egRaidFilter='legacy';render()">Legacy (5)</button><button class="${egRaidFilter==='all'?'active':''}" onclick="egRaidFilter='all';render()">All (15)</button></div></div>
  <div class="eg-raid-grid">${list.map(x=>egRaidCard(x.r,x.i)).join('')}</div>
  ${egExploreCTA('Search a Guardian to view their raid clears, recent activity and lowman reports.')}`}
function egExploreCTA(description){return `<div class="eg-cta"><div><strong>View your Guardian's endgame stats</strong><p>${escapeHtml(description)}</p></div><button class="primary" onclick="navigate('profile')">Find a Guardian ↗</button></div>`}
function egBrowsePantheon(){return `<header class="eg-heading"><span class="eyebrow">RAID GAUNTLETS</span><h1>Pantheon</h1><p>Track Pantheon activities returned by Bungie's public activity history. Includes the original 2024 event and the permanent 2026 challenges.</p></header>
 <div class="eg-feature-hero eg-pantheon-hero"><strong>Pantheon Activity Records</strong><p>See dates, completion status, duration and individual Bungie reports on a Guardian's profile.</p><button class="primary" onclick="navigate('profile')">Find a Guardian ↗</button></div>
 <div class="eg-pantheon-grid">${PANTHEON_VARIANTS.map(x=>`<div class="eg-info-card"><strong>${escapeHtml(x.name)}</strong><p>${escapeHtml(x.detail)}</p></div>`).join('')}</div>
 <p class="note">Pantheon is identified from Bungie's published activity names. Older or unavailable records may be missing from API history; this is not a historical all-time index.</p>`}
function egBrowseLowmans(){return `<header class="eg-heading"><span class="eyebrow">SMALL FIRETEAMS</span><h1>Lowmans</h1><p>Find recorded raid clears by solo, duo and trio fireteams. A full-run badge requires a PGCR showing completion, a small fireteam and an explicit fresh-start flag.</p></header>
 <div class="eg-lowman-grid">${[['SOLO','1 Guardian','Full-start raid completions with one recorded participant'],['DUO','2 Guardians','Full-start raid completions with two recorded participants'],['TRIO','3 Guardians','Full-start raid completions with three recorded participants']].map(([k,t,d])=>`<div class="eg-info-card"><span class="eg-pill">${k}</span><strong>${t}</strong><p>${d}</p></div>`).join('')}</div>
 ${egExploreCTA('Open any public Guardian, choose Lowmans, and inspect the linked PGCRs.')}
 <p class="note">Checkpoint-only completions and reports with unknown starts are not counted as verified lowmans. Fireteam size is determined from distinct PGCR participants, not the activity-history playerCount alone.</p>`}
function egOpenRaid(i){if(!RAID_CATALOG[i])return;egSelectedRaidSlug=RAID_CATALOG[i].slug;navigate('raid-detail')}
function egRenderRaidDetail(){const r=RAID_CATALOG.find(x=>x.slug===egSelectedRaidSlug);if(!r)return egBrowseRaids();const i=RAID_CATALOG.indexOf(r);
 return `<button class="eg-back" onclick="navigate('raids')">← All raids</button><div class="eg-detail-hero" style="--eg-a:${r.tone[0]};--eg-b:${r.tone[1]}"><span class="eyebrow">${r.legacy?'LEGACY RAID':'RAID RECORDS'}</span><h1>${escapeHtml(r.name)}</h1><p>${escapeHtml(r.place)} · ${r.year}${r.seal?' · '+escapeHtml(r.seal):''}</p></div>
 <div class="eg-info-card"><strong>Raid activity tracking</strong><p>Search for a Bungie Name to see runs, completions and PGCRs for this raid. Lowman verification is based on full-start reports where available.</p><button class="primary" onclick="navigate('profile')">Find a Guardian ↗</button></div>`}
function egResetRaidState(){egRaidState={key:'',loading:false,loaded:false,complete:false,more:false,checking:false,checked:0,error:'',pages:0,activities:[],reportInfo:new Map(),nextPages:{},ended:{},autoVersion:egRaidState.autoVersion+1};egProfileRaid='all'}
function egSetProfileTab(tab){profileTab=tab;egProfileRaid='all';render();if(['raids','pantheon','lowmans'].includes(tab))void egLoadRaidHistory()}
function egTabButton(tab,title){return `<button class="${profileTab===tab?'selected':''}" onclick="egSetProfileTab('${tab}')">${title}</button>`}
function egProfileTeaser(){const count=egRaidState.key&&liveProfile&&egRaidState.key===`${liveProfile.account.membershipType}:${liveProfile.account.membershipId}`?egRaidState.activities.length:null;return `<div class="eg-profile-teaser"><span>Also tracking raids, Pantheon and lowman reports</span><button onclick="egSetProfileTab('raids')">${count===null?'Load raid stats':count+' raid activities'} ↗</button><button onclick="egSetProfileTab('lowmans')">Lowmans ↗</button></div>`}
function egStatus(){if(egRaidState.loading)return 'Loading Bungie raid activity…';if(egRaidState.error)return `Partial results: ${egRaidState.error}`;if(egRaidState.loaded)return `${egRaidState.activities.length} recorded raid/Pantheon activities retrieved`;return 'Raid history not loaded yet'}
function egList(){return egRaidState.activities.filter(x=>x.category==='raid'||x.category==='pantheon')}
function egRuns(kind){return egList().filter(a=>kind==='pantheon'?a.category==='pantheon':kind==='lowmans'?a.category==='raid':a.category==='raid')}
function egMetaBox(label,value,detail=''){return `<div class="eg-metric"><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`}
function egReportStatus(run){return egRaidState.reportInfo.get(run.instanceId)||null}
function egRecordLine(r){const info=egReportStatus(r);const status=info?.verified?`<span class="eg-positive">${info.label}${info.flawless?' · Flawless':''}</span>`:info?.candidate?`<span class="eg-muted">${info.label}</span>`:info?'<span class="eg-muted">Not a verified lowman</span>':r.playerCount>0&&r.playerCount<=3?'<span class="eg-muted">Possible lowman · PGCR unchecked</span>':'—';
 return `<tr><td><b>${escapeHtml(r.name)}</b><small class="eg-date">${escapeHtml(scanHistoryDate(r.date))}</small></td><td>${r.completed?'<span class="eg-positive">Completed</span>':'Incomplete'}</td><td>${duration(r.duration)}</td><td>${status}</td><td>${reportLinkLocal(r.instanceId)}</td></tr>`}
function egRunTable(runs,max=90){const show=runs.slice(0,max);return `<div class="tablepanel eg-table"><div class="eg-table-scroll"><table><thead><tr><th>Activity</th><th>Result</th><th>Duration</th><th>Lowman status</th><th>Report</th></tr></thead><tbody>${show.length?show.map(egRecordLine).join(''):'<tr><td colspan="5" style="padding:24px;color:var(--muted)">No matching public activity reports found.</td></tr>'}</tbody></table></div></div>${runs.length>max?`<p class="note">Showing ${max} of ${runs.length} runs. Filter by raid to narrow your results.</p>`:''}`}
function egProfilePanel(kind){if(!liveProfile)return '<div class="empty">Open a Guardian first.</div>';
 const runs=egRuns(kind),completed=runs.filter(x=>x.completed),checks=completed.filter(x=>egRaidState.reportInfo.get(x.instanceId)),lowmans=checks.map(x=>({...x,info:egReportStatus(x)})).filter(x=>x.info?.verified);
 let html=`<div class="sectionhead eg-sectionhead"><div><h2>${egCategoryTag(kind)}</h2><p>${escapeHtml(egStatus())}</p></div>${egRaidState.loading?'<span class="eg-spinning">Loading…</span>':egRaidState.loaded?'<button class="smalllink" onclick="egLoadRaidHistory(true)">Load older runs ↻</button>':''}</div>`;
 if(egRaidState.error)html+=`<p class="eg-alert">${escapeHtml(egRaidState.error)}</p>`;
 if(!egRaidState.loaded&&!egRaidState.loading){html+=`<div class="eg-empty-panel"><p>Fetch raid and Pantheon activity history from Bungie for this Guardian. Nothing will change in the dungeon statistics.</p><button class="primary" onclick="egLoadRaidHistory()">Load raid data ↗</button></div>`;return html}
 if(kind==='raids'){
  html+=`<div class="eg-metrics">${egMetaBox('Recorded activities',formatInt(runs.length),'Available raid history')}${egMetaBox('Completed activities',formatInt(completed.length),'Checkpoint clears may count')}${egMetaBox('Raid kills',formatInt(runs.reduce((n,x)=>n+x.kills,0)),'In retrieved raid activities')}${egMetaBox('Lowmans verified',formatInt(lowmans.length),'Fresh-start PGCR only')}</div>`;
  const totals=RAID_CATALOG.map((r,i)=>({r,i,runs:runs.filter(x=>egMatchRaid(x.name)?.slug===r.slug)}));
  html+=`<div class="eg-profile-raid-grid">${totals.map(({r,i,runs})=>`<button class="eg-profile-raid ${egProfileRaid===r.slug?'selected':''}" onclick="egProfileRaid=egProfileRaid==='${r.slug}'?'all':'${r.slug}';render()"><b>${escapeHtml(r.name)}</b><span>${runs.filter(x=>x.completed).length} completed · ${runs.length} recorded</span></button>`).join('')}</div>`;
  const shown=egProfileRaid==='all'?runs:runs.filter(x=>egMatchRaid(x.name)?.slug===egProfileRaid);
  html+=`<div class="eg-section-label">${egProfileRaid==='all'?'Raid activity history':escapeHtml(RAID_CATALOG.find(x=>x.slug===egProfileRaid)?.name||'Raid')} · ${shown.length} runs</div>${egRunTable(shown)}`;
 }else if(kind==='pantheon'){
  html+=`<div class="eg-metrics">${egMetaBox('Pantheon activities',formatInt(runs.length),'Detected by Bungie activity name')}${egMetaBox('Completions',formatInt(completed.length),'May include checkpoint clears')}${egMetaBox('Kills',formatInt(runs.reduce((n,x)=>n+x.kills,0)),'In retrieved Pantheon reports')}</div><div class="eg-section-label">Pantheon activity history</div>${egRunTable(runs)}`;
  html+=`<p class="note">Pantheon may not be included in the Raid mode history filter. DungeonHub also checks recent unfiltered activities, but cannot guarantee complete 2024 or 2026 records.</p>`;
 }else{
  const candidates=completed.filter(x=>{const inf=egReportStatus(x);return inf?.candidate || (!inf&&Number(x.playerCount)>0&&Number(x.playerCount)<=3)});
  html+=`<div class="eg-metrics">${egMetaBox('Verified full-start',formatInt(lowmans.length),'PGCR-confirmed lowmans')}${egMetaBox('Solo',formatInt(lowmans.filter(x=>x.info.size===1).length),'1 participant')}${egMetaBox('Duo',formatInt(lowmans.filter(x=>x.info.size===2).length),'2 participants')}${egMetaBox('Trio',formatInt(lowmans.filter(x=>x.info.size===3).length),'3 participants')}</div>`;
  html+=`<div class="eg-verify-bar"><div><strong>Check raid PGCRs for lowmans</strong><p>Check up to 35 unchecked raid reports per click. Only 1–3 participants, completion, and confirmed full start receive a verified badge; unknown starts remain candidates.</p></div><button class="primary" ${egRaidState.checking?'disabled':''} onclick="egVerifyLowmans()">${egRaidState.checking?'Checking '+egRaidState.checked+' reports…':'Check lowman runs ↗'}</button></div>`;
  html+=`<div class="eg-section-label">Confirmed lowmans (${lowmans.length})</div>${egRunTable(lowmans,100)}`;
  if(candidates.length)html+=`<div class="eg-section-label">Potential / unconfirmed (${candidates.length})</div>${egRunTable(candidates,70)}`;
  if(!candidates.length&&!lowmans.length)html+=`<p class="note">No confirmed lowmans in retrieved history. Activity history may be incomplete, and a player count of three alone does not prove a lowman.</p>`;
 }
 if(egRaidState.loading)html+=`<p class="note">Loading additional historical pages…</p>`;
 else if(egRaidState.more)html+=`<button class="eg-load-more" onclick="egLoadRaidHistory(true)">Load older raid history ↻</button>`;
 return html;
}
async function egLoadRaidHistory(more=false){if(!liveProfile||egRaidState.loading)return;const account=liveProfile.account;const key=`${account.membershipType}:${account.membershipId}`;
 if(egRaidState.key!==key){egResetRaidState();egRaidState.key=key}
 if(egRaidState.loaded&&!more)return;
 egRaidState.loading=true;egRaidState.error='';const version=++egRaidState.autoVersion;const id=account.membershipId,type=account.membershipType,characters=liveProfile.characters||[];
 const fresh=[];const issues=[];let gotFullPage=false;
 try{
 for(const c of characters){
   const charId=c.characterId;for(let j=0;j<EG_RAID_PAGES_PER_BATCH;j++){
    if(version!==egRaidState.autoVersion||!liveProfile||`${liveProfile.account.membershipType}:${liveProfile.account.membershipId}`!==key)return;
    if(egRaidState.ended[charId])break;
    const page=egRaidState.nextPages[charId]||0;
    let list=[];
    try{const body=await bungie(`/Destiny2/${type}/Account/${id}/Character/${charId}/Stats/Activities/?mode=4&count=${EG_HISTORY_PAGE_SIZE}&page=${page}`);list=Array.isArray(body?.activities)?body.activities:[]}
    catch(e){issues.push(`${c.classLabel||'Character'}: ${String(e.message||e).slice(0,90)}`);egRaidState.ended[charId]=true;break}
    egRaidState.pages++;egRaidState.nextPages[charId]=page+1;
    for(const row of list){const a=toHistoryActivity(row,charId);if(a.instanceId)fresh.push(a)}
    if(list.length<EG_HISTORY_PAGE_SIZE){egRaidState.ended[charId]=true;break}else gotFullPage=true;
   }
 }
 // Pantheon may not be exposed under Raid mode. Check a bounded sample of recent unfiltered history.
 // This intentionally avoids scanning the user's entire history twice.
 if(!egRaidState.loaded){
  for(const c of characters){
   try{const body=await bungie(`/Destiny2/${type}/Account/${id}/Character/${c.characterId}/Stats/Activities/?mode=0&count=${EG_HISTORY_PAGE_SIZE}&page=0`);
     for(const row of (body?.activities||[])){const a=toHistoryActivity(row,c.characterId);if(a.instanceId)fresh.push({...a,egUnfiltered:true})}
   }catch(e){issues.push(`Pantheon sample: ${String(e.message||e).slice(0,70)}`)}
  }
 }
 const byId=new Map(egRaidState.activities.map(x=>[x.instanceId,x]));
 for(const a of fresh){if(!byId.has(a.instanceId))byId.set(a.instanceId,a)}
 const collection=[...byId.values()];
 const hashes=[...new Set(collection.filter(a=>!a.name||a.name.startsWith('Activity ')).map(x=>x.hash).filter(Boolean))];
 for(let i=0;i<hashes.length;i+=4){if(version!==egRaidState.autoVersion)return;await Promise.all(hashes.slice(i,i+4).map(h=>getActivityName(h)))}
 for(const a of collection){a.name=activityNames.get(a.hash)||`Activity ${a.hash}`;a.category=egIsPantheon(a.name)?'pantheon':egMatchRaid(a.name)?'raid':'unknown'}
 egRaidState.activities=collection.filter(x=>x.category==='raid'||x.category==='pantheon').sort((a,b)=>new Date(b.date)-new Date(a.date));
 egRaidState.loaded=true;egRaidState.more=characters.some(c=>!egRaidState.ended[c.characterId]);
 if(egRaidState.activities.length&&typeof rememberGuardian==='function')rememberGuardian({name:liveProfile.displayName,membershipId:String(id),membershipType:Number(type),statsCount:egRaidState.activities.length});
 if(issues.length)egRaidState.error=issues.slice(0,3).join(' · ');
 }catch(e){egRaidState.error=String(e.message||e)}finally{if(version===egRaidState.autoVersion){egRaidState.loading=false;if(current==='guardian')render()}}
}
async function egVerifyLowmans(){if(!liveProfile||egRaidState.checking)return;const account=liveProfile.account;const key=`${account.membershipType}:${account.membershipId}`;if(egRaidState.key!==key)return;
 const candidates=egRaidState.activities.filter(x=>x.category==='raid'&&x.completed&&!egRaidState.reportInfo.has(x.instanceId))
  .sort((a,b)=>Number(Number(a.playerCount)>3)-Number(Number(b.playerCount)>3))
  .slice(0,EG_VERIFY_LIMIT);
 egRaidState.checking=true;egRaidState.checked=0;render();const version=egRaidState.autoVersion;
 async function next(){while(candidates.length){if(version!==egRaidState.autoVersion)return;const r=candidates.shift();if(!r)break;
   try{const raw=await fetchActivityPGCR(r.instanceId);const info=egClassifyLowman(raw,account);egRaidState.reportInfo.set(r.instanceId,info)}
   catch(e){egRaidState.reportInfo.set(r.instanceId,{verified:false,candidate:true,label:'PGCR unavailable'})}
   egRaidState.checked++;if(egRaidState.checked%4===0&&profileTab==='lowmans'&&current==='guardian')render();
 }}
 await Promise.all([next(),next()]);egRaidState.checking=false;if(version===egRaidState.autoVersion&&current==='guardian')render();
}
function egClassifyLowman(raw,account){const pgcr=raw?.Response||raw||{};const entries=Array.isArray(pgcr.entries)?pgcr.entries:[];
 if(entries.length===0||entries.length>12)return {verified:false,candidate:false,label:'Anomalous report'};
 const ids=new Set(entries.map(e=>{const u=e?.player?.destinyUserInfo;return u?.membershipId?`${u.membershipType}:${u.membershipId}`:''}).filter(Boolean));
 const size=ids.size;if(size<1||size>6)return {verified:false,candidate:false,label:'Invalid fireteam size'};
 const member=entries.filter(e=>String(e?.player?.destinyUserInfo?.membershipId||'')===String(account.membershipId));
 if(!member.some(e=>Number(e?.values?.completed?.basic?.value)===1))return {verified:false,candidate:false,label:'Guardian did not complete'};
 if(size>3)return {verified:false,candidate:false,label:`${size}-Guardian fireteam`,size};
 const start=pgcr.activityWasStartedFromBeginning;
 const flawless=entries.every(e=>Number(e?.values?.deaths?.basic?.value)===0);
 const label=({1:'Solo',2:'Duo',3:'Trio'})[size];
 if(start===true)return {verified:true,candidate:false,label,size,flawless};
 return {verified:false,candidate:true,label:`${label} ${start===false?'checkpoint':'start unknown'}`,size,flawless};
}
