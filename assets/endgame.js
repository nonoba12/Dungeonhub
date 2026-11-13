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
function egBrowseRaids(){
 const list=RAID_CATALOG.map((r,i)=>({r,i})).filter(x=>egRaidFilter==='all'||(egRaidFilter==='legacy'?x.r.legacy:!x.r.legacy));
 const mock=list.map(({r,i})=>egCardShell({name:r.name,year:r.year,place:r.place,tone:r.tone,legacy:r.legacy,key:'raid-'+r.slug,runs:[],onOpen:`egOpenRaid(${i})`,tag:r.legacy?'Legacy raid':'Raid',emptyText:'Find a Guardian to see run history'})).join('');
 return `<header class="eg-heading"><span class="eyebrow">DESTINY 2 ENDGAME</span><h1>Raids</h1><p>Browse raids in the same layout as dungeon records. Open a Guardian profile for real run timelines, completion counts, and report-backed full starts.</p></header>
 <div class="eg-toolbar"><span>${list.length} raids</span><div><button class="${egRaidFilter==='active'?'active':''}" onclick="egRaidFilter='active';render()">Available (10)</button><button class="${egRaidFilter==='legacy'?'active':''}" onclick="egRaidFilter='legacy';render()">Legacy (5)</button><button class="${egRaidFilter==='all'?'active':''}" onclick="egRaidFilter='all';render()">All (15)</button></div></div>
 <div class="profile-dungeon-gallery">${mock}</div>${egExploreCTA('Select a Guardian to populate raid cards with actual run timelines and stats.')}`;
}
function egExploreCTA(description){return `<div class="eg-cta"><div><strong>View your Guardian's endgame stats</strong><p>${escapeHtml(description)}</p></div><button class="primary" onclick="navigate('profile')">Find a Guardian ↗</button></div>`}
function egBrowsePantheon(){
 const groups=egPantheonGroups();
 const tiles=groups.map(g=>egCardShell({...g,key:'pantheon-'+g.key,runs:[],onOpen:"navigate('profile')",tag:'Pantheon',emptyText:'Find a Guardian to see recorded runs'})).join('');
 return `<header class="eg-heading"><span class="eyebrow">RAID GAUNTLETS</span><h1>Pantheon</h1><p>Activity history, times, and linked reports for the Pantheon boss gauntlets. Guardian cards show only reports accessible through Bungie.</p></header>
 <div class="profile-dungeon-gallery">${tiles}</div>
 ${egExploreCTA('Open a Guardian and select Pantheon to see real activity timelines.')}
 <p class="subnote">Pantheon activity classification is based on Bungie activity names and dates. Unavailable history is not counted as a failure or an all-time zero.</p>`;
}
function egBrowseLowmans(){return `<header class="eg-heading"><span class="eyebrow">SMALL FIRETEAMS</span><h1>Lowmans</h1><p>Find recorded raid clears by solo, duo and trio fireteams. A full-run badge requires a PGCR showing completion, a small fireteam and an explicit fresh-start flag.</p></header>
 <div class="eg-lowman-grid">${[['SOLO','1 Guardian','Full-start raid completions with one recorded participant'],['DUO','2 Guardians','Full-start raid completions with two recorded participants'],['TRIO','3 Guardians','Full-start raid completions with three recorded participants']].map(([k,t,d])=>`<div class="eg-info-card"><span class="eg-pill">${k}</span><strong>${t}</strong><p>${d}</p></div>`).join('')}</div>
 ${egExploreCTA('Open any public Guardian, choose Lowmans, and inspect the linked PGCRs.')}
 <p class="note">Checkpoint-only completions and reports with unknown starts are not counted as verified lowmans. Fireteam size is determined from distinct PGCR participants, not the activity-history playerCount alone.</p>`}
function egOpenRaid(i){if(!RAID_CATALOG[i])return;egSelectedRaidSlug=RAID_CATALOG[i].slug;navigate('raid-detail')}
function egRenderRaidDetail(){const r=RAID_CATALOG.find(x=>x.slug===egSelectedRaidSlug);if(!r)return egBrowseRaids();const i=RAID_CATALOG.indexOf(r);
 return `<button class="eg-back" onclick="navigate('raids')">← All raids</button><div class="eg-detail-hero" style="--eg-a:${r.tone[0]};--eg-b:${r.tone[1]}"><span class="eyebrow">${r.legacy?'LEGACY RAID':'RAID RECORDS'}</span><h1>${escapeHtml(r.name)}</h1><p>${escapeHtml(r.place)} · ${r.year}${r.seal?' · '+escapeHtml(r.seal):''}</p></div>
 <div class="eg-info-card"><strong>Raid activity tracking</strong><p>Search for a Bungie Name to see runs, completions and PGCRs for this raid. Lowman verification is based on full-start reports where available.</p><button class="primary" onclick="navigate('profile')">Find a Guardian ↗</button></div>`}
function egResetRaidState(){egRaidState={key:'',loading:false,loaded:false,complete:false,more:false,checking:false,checked:0,error:'',pages:0,activities:[],reportInfo:new Map(),nextPages:{},ended:{},autoVersion:egRaidState.autoVersion+1};egProfileRaid='all';egTimelineOffsets.clear();egAutoCheckedTabs.clear()}
function egSetProfileTab(tab){profileTab=tab;egProfileRaid='all';render();if(['raids','pantheon','lowmans'].includes(tab)){void egLoadRaidHistory();if(egRaidState.loaded)void egAutoVerifyForTab(tab)}}
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
  const groups=RAID_CATALOG.map(r=>({...r,key:'raid-'+r.slug,runs:runs.filter(x=>egMatchRaid(x.name)?.slug===r.slug)}));
  html+=`<div class="eg-metrics">${egMetaBox('Raid activities',formatInt(runs.length),'Retrieved from Bungie')}${egMetaBox('Completions',formatInt(completed.length),'Includes checkpoints')}${egMetaBox('Raid kills',formatInt(runs.reduce((n,x)=>n+(x.kills||0),0)),'Retrieved activities')}${egMetaBox('PGCRs checked',formatInt(egRaidState.reportInfo.size),'Verification is limited')}</div>`;
  html+=egLegend()+egCheckToolbar();
  const shown=egProfileRaid==='all'?groups:groups.filter(x=>x.slug===egProfileRaid);
  html+=`<div class="eg-toolbar"><span>Raid records</span><select class="select" aria-label="Filter raids" onchange="egProfileRaid=this.value;render()"><option value="all" ${egProfileRaid==='all'?'selected':''}>All raids</option>${RAID_CATALOG.map(r=>`<option value="${r.slug}" ${egProfileRaid===r.slug?'selected':''}>${escapeHtml(r.name)}</option>`).join('')}</select></div>`;
  html+=`<div class="profile-dungeon-gallery">${shown.map(g=>egCardShell({...g,onOpen:`egFilterRaid('${g.slug}')`,tag:g.legacy?'Legacy raid':'Raid'})).join('')}</div>`;
  const listed=egProfileRaid==='all'?runs:runs.filter(x=>egMatchRaid(x.name)?.slug===egProfileRaid);
  html+=`<div class="eg-section-label">${egProfileRaid==='all'?'Recent raid activity':escapeHtml(RAID_CATALOG.find(x=>x.slug===egProfileRaid)?.name||'Raid')} (${listed.length})</div>${egRunTable(listed)}`;
 }else if(kind==='pantheon'){
  const groups=egPantheonGroups();
  const grouped=groups.map(g=>({...g,key:'pantheon-'+g.key,runs:runs.filter(x=>egPantheonKey(x)===g.key)}));
  html+=`<div class="eg-metrics">${egMetaBox('Pantheon activities',formatInt(runs.length),'Retrieved from Bungie')}${egMetaBox('Completions',formatInt(completed.length),'Includes checkpoints')}${egMetaBox('Kills',formatInt(runs.reduce((n,x)=>n+(x.kills||0),0)),'Retrieved activities')}${egMetaBox('PGCRs checked',formatInt(egRaidState.reportInfo.size),'Verification is limited')}</div>`;
  html+=egLegend()+egCheckToolbar();
  html+=`<div class="profile-dungeon-gallery">${grouped.map(g=>egCardShell({...g,onOpen:'egScrollToPantheonTable()'})).join('')}</div>`;
  html+=`<div class="eg-section-label" id="pantheon-activity-table">Pantheon activity history (${runs.length})</div>${egRunTable(runs)}`;
  html+=`<p class="note">Pantheon is discovered from activity names in accessible Bungie history. The 2024 event may be absent from newer API history. No unverified achievements are asserted.</p>`;
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
 for(const a of collection){a.name=activityNames.get(a.hash)||activityNames.get(a.directorHash)||`Activity ${a.hash}`;a.image=activityArt.get(a.hash)||activityArt.get(a.directorHash)||'';a.category=egIsPantheon(a.name)?'pantheon':egMatchRaid(a.name)?'raid':'unknown'}
 egRaidState.activities=collection.filter(x=>x.category==='raid'||x.category==='pantheon').sort((a,b)=>new Date(b.date)-new Date(a.date));
 egRaidState.loaded=true;egRaidState.more=characters.some(c=>!egRaidState.ended[c.characterId]);
 if(egRaidState.activities.length&&typeof rememberGuardian==='function')rememberGuardian({name:liveProfile.displayName,membershipId:String(id),membershipType:Number(type),statsCount:egRaidState.activities.length});
 if(issues.length)egRaidState.error=issues.slice(0,3).join(' · ');
 }catch(e){egRaidState.error=String(e.message||e)}finally{if(version===egRaidState.autoVersion){egRaidState.loading=false;if(current==='guardian')render();if(egRaidState.loaded&&['raids','pantheon'].includes(profileTab))void egAutoVerifyForTab(profileTab)}}
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
function egClassifyLowman(raw,account){
 const pgcr=raw?.Response||raw||{};
 const entries=Array.isArray(pgcr.entries)?pgcr.entries:[];
 if(!entries.length||entries.length>24)return {verified:false,candidate:false,outcome:'unknown',label:'Report unavailable'};
 const ids=new Set(entries.map(e=>{const u=e?.player?.destinyUserInfo;return u?.membershipId?`${u.membershipType}:${u.membershipId}`:''}).filter(Boolean));
 const size=ids.size;
 const matching=entries.filter(e=>String(e?.player?.destinyUserInfo?.membershipId||'')===String(account.membershipId));
 if(!matching.length)return {verified:false,candidate:false,outcome:'unknown',label:'Guardian not found in report',size};
 const finished=matching.some(e=>Number(e?.values?.completed?.basic?.value)===1);
 const start=pgcr.activityWasStartedFromBeginning;
 const fullStart=finished&&start===true;
 const checkpoint=finished&&start===false;
 const soloOrSmall=size>0&&size<=3;
 const flawless=entries.every(e=>Number(e?.values?.deaths?.basic?.value)===0);
 const label=({1:'Solo',2:'Duo',3:'Trio'})[size]||`${size}-player`;
 return {outcome:finished?'completed':'incomplete',completed:finished,fullStart,checkpoint,size,flawless,
  verified:fullStart&&soloOrSmall,candidate:finished&&soloOrSmall&&!fullStart,
  label:fullStart&&soloOrSmall?label:finished&&soloOrSmall?`${label} ${checkpoint?'checkpoint':'start unknown'}`:finished?'Completed':'Incomplete'};
}

/* V28: One shared presentation component for Raids + Pantheon.
 * Data is never invented; only retrieved activities populate counters.
 */
const EG_V28_WINDOW=20;
const egTimelineOffsets=new Map();
const egAutoCheckedTabs=new Set();
const EG_V28_PANTHEON=[
 {key:'atraks',name:'Atraks Sovereign',year:2024,place:'Pantheon · 2024',tone:['#434a87','#1b233d']},
 {key:'oryx',name:'Oryx Exalted',year:2024,place:'Pantheon · 2024',tone:['#61436c','#262344']},
 {key:'rhulk',name:'Rhulk Indomitable',year:2024,place:'Pantheon · 2024',tone:['#644b6c','#283350']},
 {key:'nezarec',name:'Nezarec Sublime',year:2024,place:'Pantheon · 2024',tone:['#6a4266','#241b44']},
 {key:'new',name:'Pantheon · 2026',year:2026,place:'Pantheon · 2026',tone:['#304d7a','#25254e']},
 {key:'other',name:'Other Pantheon',year:2024,place:'Additional Bungie activities',tone:['#394d63','#272b4c']}
];
function egPantheonGroups(){return EG_V28_PANTHEON;}
function egPantheonKey(a){
 const name=egNorm(a.name);const year=new Date(a.date).getUTCFullYear();
 if(year>=2026)return 'new';
 if(name.includes('atraks sovereign'))return 'atraks';
 if(name.includes('oryx exalted'))return 'oryx';
 if(name.includes('rhulk indomitable'))return 'rhulk';
 if(name.includes('nezarec sublime'))return 'nezarec';
 return 'other';
}
function egLegend(){return `<div class="run-status-legend"><span class="legend-item"><i class="legend-dot" style="--dot:#4fc975"></i>Completed</span><span class="legend-item"><i class="legend-dot" style="--dot:#f0ac42"></i>Checkpoint completion</span><span class="legend-item"><i class="legend-dot" style="--dot:#ff625f"></i>PGCR-confirmed incomplete</span><span class="legend-item"><i class="legend-dot" style="--dot:#8794aa"></i>Not yet confirmed</span></div>`;}
function egFilterRaid(slug){egProfileRaid=egProfileRaid===slug?'all':slug;render();}
function egScrollToPantheonTable(){document.getElementById('pantheon-activity-table')?.scrollIntoView({behavior:'smooth',block:'start'});}
function egDotState(r){
 const inf=egReportStatus(r);
 if(inf?.outcome==='incomplete')return 'incomplete';
 if(inf?.checkpoint)return 'checkpoint';
 if(inf?.outcome==='completed'||r.completed)return 'complete';
 return 'unknown';
}
function egDotLabel(r){const state=egDotState(r);return state==='checkpoint'?'Checkpoint completion':state==='incomplete'?'PGCR-confirmed incomplete':state==='complete'?'Completed activity':'Not yet PGCR-confirmed';}
function egDots(runs){
 if(!runs.length)return '<span class="record-chart-empty">No runs retrieved</span>';
 return runs.map((r,i)=>{
  const stamp=String(r.date||'');
  const status=egDotState(r),info=egReportStatus(r);
  const label=`${egDotLabel(r)} · ${duration(r.duration)} · ${scanHistoryDate(stamp)} · Open report`;
  const date=escapeHtml(stamp);
  return `<button type="button" class="record-dot-hit ${status}" style="grid-column:${i%10+1};grid-row:${Math.floor(i/10)+1}" aria-label="${escapeHtml(label)}" data-run-time="${escapeHtml(duration(r.duration))}" data-run-date="${date}" data-run-status="${egDotLabel(r)}" data-run-class="${info?.fullStart?'Confirmed full start':info?.checkpoint?'Started at checkpoint':'Start not verified'}" data-run-award="${info?.verified?escapeHtml(info.label):''}" onclick="hideRunTooltip();openActivityReport('${String(r.instanceId).replace(/[^0-9]/g,'')}')"><span class="record-dot-pip"></span>${info?.verified?'<span class="eg-run-star" aria-hidden="true">★</span>':''}</button>`;
 }).join('');
}
function egRenderTimeline(chart,sorted,key){
 const max=Math.max(0,sorted.length-EG_V28_WINDOW);
 const from=Math.max(0,Math.min(max,Number(chart.dataset.offset)||0));
 chart.classList.toggle('dense',Math.min(EG_V28_WINDOW,sorted.length-from)>10);
 chart.innerHTML=`<div class="record-chart-line" aria-hidden="true"></div>${egDots(sorted.slice(from,from+EG_V28_WINDOW))}`;
 const parent=chart.closest('.record-timeline');
 const txt=parent?.querySelector('.record-timeline-count');
 if(txt)txt.textContent=`${from+1}–${Math.min(sorted.length,from+EG_V28_WINDOW)} / ${sorted.length}`;
 const older=parent?.querySelector('[data-eg-step="older"]');
 const newer=parent?.querySelector('[data-eg-step="newer"]');
 if(older)older.disabled=from===0;if(newer)newer.disabled=from===max;
 const slider=parent?.querySelector('.eg-timeline-range');if(slider)slider.value=from;
}
function egSeek(input){
 const wrapper=input.closest('.record-timeline');if(!wrapper)return;
 const key=wrapper.dataset.egKey;
 const runs=egTimelineData.get(key)||[];
 const from=Number(input.value)||0;
 egTimelineOffsets.set(key,from);
 const chart=wrapper.querySelector('.record-chart');chart.dataset.offset=String(from);
 egRenderTimeline(chart,runs,key);
 if(typeof hideRunTooltip==='function')hideRunTooltip();
}
function egStep(btn,n){const slider=btn.closest('.record-timeline')?.querySelector('.eg-timeline-range');if(!slider)return;slider.value=Math.max(0,Math.min(Number(slider.max),Number(slider.value)+n));egSeek(slider);}
const egTimelineData=new Map();
function egTimeline(key,runs){
 const sorted=[...runs].sort((a,b)=>new Date(a.date)-new Date(b.date));
 egTimelineData.set(key,sorted);
 const max=Math.max(0,sorted.length-EG_V28_WINDOW);
 const from=Math.max(0,Math.min(max,egTimelineOffsets.has(key)?egTimelineOffsets.get(key):max));
 const sample=sorted.slice(from,from+EG_V28_WINDOW);
 const range=sorted.length>EG_V28_WINDOW?`<div class="record-timeline-scrubber"><button type="button" class="record-timeline-step" data-eg-step="older" onclick="egStep(this,-10)" ${from===0?'disabled':''} aria-label="Earlier runs">‹</button><input class="record-timeline-range eg-timeline-range" type="range" min="0" max="${max}" value="${from}" oninput="egSeek(this)" aria-label="Browse run history"><button type="button" class="record-timeline-step" data-eg-step="newer" onclick="egStep(this,10)" ${from===max?'disabled':''} aria-label="Later runs">›</button></div><div class="record-timeline-caption"><span>Older ← → Newer</span><span class="record-timeline-count">${from+1}–${Math.min(sorted.length,from+EG_V28_WINDOW)} / ${sorted.length}</span></div>`:`<div class="record-timeline-no-slider">${sorted.length?`${sorted.length} run${sorted.length===1?'':'s'} loaded`:'No runs loaded'}</div>`;
 return `<div class="record-timeline" data-eg-key="${key}"><div class="record-chart ${sample.length>10?'dense':''}" data-offset="${from}"><div class="record-chart-line" aria-hidden="true"></div>${egDots(sample)}</div>${range}</div>`;
}
function egCardShell({name,year,place,tone=['#32445f','#1f283e'],key,runs=[],onOpen,tag,emptyText='No recorded runs'}){
 const finished=runs.filter(r=>r.completed);
 const verified=finished.filter(r=>egReportStatus(r)?.fullStart&&Number.isFinite(r.duration)&&r.duration>0);
 const fastest=verified.length?verified.reduce((best,x)=>x.duration<best.duration?x:best):null;
 const recent=[...finished].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
 const avg=verified.length?verified.reduce((t,r)=>t+r.duration,0)/verified.length:null;
 const bestLowman=finished.filter(r=>egReportStatus(r)?.verified).sort((a,b)=>a.duration-b.duration)[0];
 const badge=bestLowman?`<button class="record-badge sf" onclick="event.stopPropagation();openActivityReport('${bestLowman.instanceId}')" title="Open fastest PGCR-confirmed ${escapeHtml(egReportStatus(bestLowman).label)}"><span>★ ${escapeHtml(egReportStatus(bestLowman).label)} ↗</span></button>`:`<span class="record-badge eg-generic-badge">${escapeHtml(tag||'Pantheon')}</span>`;
 const candidate=[...runs].find(r=>r.image&&/^https:\/\/www\.bungie\.net\/[a-zA-Z0-9_\/.-]+$/.test(r.image));
 const image=candidate?`background-image:linear-gradient(0deg,#080913c9,#070a1022),url('${candidate.image}')`:'background-image:linear-gradient(120deg,transparent,#fff1 40%,transparent)';
 const safeOpen=onOpen||"navigate('profile')";
 const moment=recent&&Number.isFinite(recent.duration)?duration(recent.duration):'N/A';
 const best=fastest?duration(fastest.duration):'N/A';
 const mean=avg?duration(avg):'N/A';
 return `<article class="record-tile eg-record-tile"><div class="record-tile-cover" style="--c1:${tone[0]};--c2:${tone[1]};${image}"><button type="button" class="record-cover-link" onclick="${safeOpen}" aria-label="View ${escapeHtml(name)} records"></button><div class="record-badges">${badge}</div><small>${year} · ${escapeHtml(place)}</small><h3>${escapeHtml(name)}</h3></div><div class="record-tile-content"><div class="record-chart-row">${egTimeline(key,runs)}<div class="record-total"><strong>${runs.length?finished.length:'—'}</strong><span>Recorded<br>completions</span><small class="verified-full-count">${verified.length} confirmed full starts</small></div></div><div class="record-times"><div><strong>${moment}</strong><span>Recent</span></div><div>${fastest?.instanceId?`<button class="record-bestlink eg-best-button" onclick="openActivityReport('${fastest.instanceId}')">${best} ↗</button>`:`<strong>${best}</strong>`}<span>Best full start</span>${fastest?`<small class="record-best-date">${escapeHtml(scanHistoryDate(fastest.date))}</small>`:''}</div><div><strong>${mean}</strong><span>Full-start avg</span></div></div>${!runs.length?`<p class="eg-card-empty">${escapeHtml(emptyText)}</p>`:''}</div></article>`;
}
async function egAutoVerifyForTab(tab){
 if(!['raids','pantheon'].includes(tab)||!egRaidState.loaded||egRaidState.checking||egAutoCheckedTabs.has(tab))return;
 egAutoCheckedTabs.add(tab);
 await egCheckReports(tab==='raids'?'raid':'pantheon',16);
}
function egCheckToolbar(){return `<div class="eg-check-toolbar"><span>Full-start times and badges need PGCR verification. Unchecked history isn't labeled as a failed attempt.</span><button class="pill" type="button" onclick="egCheckReports()" ${egRaidState.checking?'disabled':''}>${egRaidState.checking?`Checking ${egRaidState.checked}…`:'Verify next 25 PGCRs ↻'}</button></div>`;}
async function egCheckReports(kind="all",maxReports=25){
 if(!liveProfile||egRaidState.checking)return;
 const key=`${liveProfile.account.membershipType}:${liveProfile.account.membershipId}`;
 if(key!==egRaidState.key)return;
 const all=egRaidState.activities.filter(r=>r.instanceId&&/^\d{6,25}$/.test(String(r.instanceId))&&!egRaidState.reportInfo.has(r.instanceId));
 const chosen=kind==='all'?all:all.filter(r=>r.category===kind);
 const unique=[];const used=new Set();
 for(const run of chosen){const group=run.category==='pantheon'?egPantheonKey(run):egMatchRaid(run.name)?.slug||run.name;if(!used.has(group)){unique.push(run);used.add(group)}}
 const queue=[...unique,...chosen.filter(x=>!unique.includes(x))].slice(0,maxReports);
 if(!queue.length)return;
 egRaidState.checking=true;egRaidState.checked=0;render();
 const version=egRaidState.autoVersion;const account=liveProfile.account;
 async function worker(){while(queue.length&&version===egRaidState.autoVersion){const run=queue.shift();try{const raw=await fetchActivityPGCR(run.instanceId);egRaidState.reportInfo.set(run.instanceId,egClassifyLowman(raw,account));}catch{egRaidState.reportInfo.set(run.instanceId,{outcome:'unknown',verified:false,candidate:false,label:'PGCR unavailable'})}egRaidState.checked++;if(egRaidState.checked%5===0&&current==='guardian')render();}}
 await Promise.all([worker(),worker()]);
 if(version===egRaidState.autoVersion){egRaidState.checking=false;if(current==='guardian')render();}
}
(function egInstallV28Styles(){
 const el=document.createElement('style');el.id='eg-v28-styles';
 el.textContent=`
 .eg-record-tile{border-radius:7px}.eg-record-tile .record-tile-cover{height:170px;background-size:cover;background-position:center}
 .eg-record-tile .record-tile-content{min-height:215px}.eg-record-tile .record-badges{z-index:4}
 .eg-generic-badge{background:#1e3556;border:1px solid #54719c;color:#d8eeff}
 .eg-record-tile .record-dot-hit{position:relative}.eg-run-star{position:absolute;top:0;left:50%;transform:translate(-50%,-12%);font-size:10px;color:#fff;pointer-events:none;text-shadow:0 1px 4px #000}
 .eg-check-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:13px 0 17px;color:var(--muted);font-size:11px;flex-wrap:wrap}
 .eg-check-toolbar button{flex:none}.eg-best-button{border:0;background:none;padding:0;color:var(--accent);font-weight:800;cursor:pointer}
 .eg-card-empty{color:var(--muted);font-size:10px;margin:13px 0 0;line-height:1.4}.eg-record-tile .record-chart{min-width:0}
 .eg-record-tile .record-dot-hit .record-dot-pip{width:11px;height:11px}.eg-record-tile .record-dot-hit:hover .record-dot-pip{transform:scale(1.35)}
 .eg-record-tile .record-dot-hit:focus-visible .record-dot-pip{outline:2px solid white;outline-offset:3px}
 .eg-record-tile .record-times strong,.eg-record-tile .record-times button{font-variant-numeric:tabular-nums}
 @media(max-width:740px){.eg-record-tile .record-tile-cover{height:185px}}
 `;document.head.appendChild(el);
})();
