
const data=[
{name:'Equilibrium',year:2025,place:'Venus',seal:'Praxic',exotic:'Heirloom',c1:'#694c39',c2:'#2e2638',symbol:'✧',desc:'Between fire and shadow, the path to balance.'},
{name:'Sundered Doctrine',year:2025,place:'Savathûn’s Throne World',seal:'Delver',exotic:'Finality’s Auger',c1:'#5c473e',c2:'#1b3136',symbol:'◈',desc:'Power lies in the deepest vault.'},
{name:'Vesper’s Host',year:2024,place:'Europa orbit',seal:'Unleashed',exotic:'Ice Breaker',c1:'#315a6c',c2:'#162b40',symbol:'⌘',desc:'Defy the algorithm. Cut through its web.'},
{name:'Warlord’s Ruin',year:2023,place:'European Dead Zone',seal:'Wrathbearer',exotic:'Buried Bloodline',c1:'#5c423b',c2:'#29313f',symbol:'♜',desc:'Explore a Dark Age castle and its cursed relics.'},
{name:'Ghosts of the Deep',year:2023,place:'Titan',seal:'Ghoul',exotic:'The Navigator',c1:'#24646b',c2:'#1c3039',symbol:'≋',desc:'Drown in the deep, or rise from it.'},
{name:'Spire of the Watcher',year:2022,place:'Mars',seal:'WANTED',exotic:'Hierarchy of Needs',c1:'#7f5633',c2:'#3a2935',symbol:'△',desc:'Ascend a Seraph facility and stop the Vex.'},
{name:'Duality',year:2022,place:'Leviathan',seal:'Discerptor',exotic:'Heartshadow',c1:'#704243',c2:'#2d223d',symbol:'◉',desc:'Dive into the nightmares of an exiled emperor.'},
{name:'Grasp of Avarice',year:2021,place:'Cosmodrome',seal:'—',exotic:'Gjallarhorn',c1:'#5d5d2f',c2:'#263c34',symbol:'✦',desc:'A cautionary tale of greed and treasure.'},
{name:'Prophecy',year:2020,place:'Realm of the Nine',seal:'—',exotic:'—',c1:'#52417e',c2:'#252343',symbol:'◇',desc:'Enter the realm of the Nine to seek answers.'},
{name:'Pit of Heresy',year:2019,place:'Moon',seal:'—',exotic:'Xenophage quest',c1:'#6c3231',c2:'#2b292d',symbol:'♢',desc:'Descend beneath the Scarlet Keep.'},
{name:'The Shattered Throne',year:2018,place:'Dreaming City',seal:'—',exotic:'Wish-Ender quest',c1:'#385b72',c2:'#302747',symbol:'♛',desc:'Strike back at the curse of the Dreaming City.'}
];
const TRACKED_LEADERS_KEY='dungeonhub-real-bungie-rankings-v1';
const RANKING_STARTER_NAMES=['kro#3128','El Cancero#3914']; // Public Bungie Names shown in the user's own reference screenshots.
let rankingWarmupActive=false,rankingWarmupAttempted=false,rankingWarmupStatus='';
let current='overview',metric='clears',filter='all',sort='newest',chosen='All Dungeons',playerName='',profileTab='overview',dungeonFilter='all';
let selectedProfileDungeon='',dungeonStatusFilter='all',dungeonDisplayCount=50;
let historyScan={active:false,complete:false,cancelled:false,loaded:0,pages:0,doneCharacters:0,totalCharacters:0,issues:[],capped:false};
const HISTORY_PAGE_SIZE=100,MAX_HISTORY_PAGES=300;
const BUNGIE_API_BASE='https://dungeonhub-pgcr.williamsjacob223.workers.dev/bungie';
let liveProfile=null, liveLoading=false, liveError='', requestVersion=0;
let lookupQuery='',lookupMatches=[],lookupPhase='idle',lookupError='',lookupDelay=null,lookupSeq=0;
let headerQuery='',headerMatches=[],headerPhase='idle',headerDelay=null,headerSeq=0;
const GUARDIAN_HISTORY_KEY='dungeonhub-guardian-search-history-v1';
const guardianPrefixCache=new Map();
const CUSTOM_DUNGEON_IMAGES={
'The Shattered Throne':'/assets/dungeons/the-shattered-throne.webp',
'Prophecy':'/assets/dungeons/prophecy.webp',
'Pit of Heresy':'/assets/dungeons/pit-of-heresy.webp',
'Grasp of Avarice':'/assets/dungeons/grasp-of-avarice.webp',
'Duality':'/assets/dungeons/duality.webp',
'Spire of the Watcher':'/assets/dungeons/spire-of-the-watcher.webp',
'Ghosts of the Deep':'/assets/dungeons/ghosts-of-the-deep.webp',
'Warlord’s Ruin':'/assets/dungeons/warlords-ruin.webp',
'Sundered Doctrine':'/assets/dungeons/sundered-doctrine.webp',
'Equilibrium':'/assets/dungeons/equilibrium.webp',
'Vesper’s Host':'/assets/dungeons/vespers-host.webp',
};
let reportData=null,reportLoading=false,reportError='',activeReportId='',reportGeneration=0;
// Activity reports use the report service.
// Default report service address:
// Requests are sent through the configured service.
const DEFAULT_REPORT_PROXY_URL='https://dungeonhub-pgcr.williamsjacob223.workers.dev';
function getReportProxyURL(){
 let stored='';try{stored=localStorage.getItem('dungeonhub.pgcrProxy')||''}catch(e){}
 return (stored||DEFAULT_REPORT_PROXY_URL).replace(/\/+$/,'');
}

const reportResponseCache=new Map();
const reportRequestInflight=new Map();
const REPORT_RESPONSE_TTL=10*60*1000;
async function fetchActivityPGCR(id){
 const key=String(id);
 const cached=reportResponseCache.get(key);
 if(cached&&cached.expires>Date.now())return cached.data;
 if(reportRequestInflight.has(key))return reportRequestInflight.get(key);
 const pending=fetchActivityPGCRUncached(key);
 reportRequestInflight.set(key,pending);
 try{
  const data=await pending;
  if(reportResponseCache.size>=30)reportResponseCache.delete(reportResponseCache.keys().next().value);
  reportResponseCache.set(key,{data,expires:Date.now()+REPORT_RESPONSE_TTL});
  return data;
 }finally{reportRequestInflight.delete(key)}
}
async function fetchActivityPGCRUncached(id){
 const proxy=getReportProxyURL();
 if(!proxy){
   try { return await bungie(`/Destiny2/Stats/PostGameCarnageReport/${encodeURIComponent(id)}/`); }
   catch(e){
    const message=String(e.message||e);
    if(message.includes('Network or CORS'))throw new Error('Could not load this report. Try again in a moment.');
    throw e;
   }
 }
 let response;
 try { response=await fetch(`${proxy}/pgcr/${encodeURIComponent(id)}`,{method:'GET',headers:{'Accept':'application/json'}}); }
 catch(e){throw new Error('Could not connect to the report service. Please try again.');}
 let body;
 try{body=await response.json()}catch(e){throw new Error(`The report service returned an unexpected response (HTTP ${response.status}).`)}
 if(!response.ok)throw new Error(body?.error||body?.Message||`Report unavailable (HTTP ${response.status})`);
 if(body?.ErrorCode!==1)throw new Error(body?.Message||body?.ErrorStatus||`Bungie error ${body?.ErrorCode||'unknown'}`);
 return body.Response;
}
const weaponDefinitionCache=new Map();
const activityNames=new Map();
const activityArt=new Map();
const icon=(id)=>`<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-${id}"/></svg>`;
const format=(n)=>n.toLocaleString('en-US');
function navigate(page){
 const target=new URL(location.href);
 const endgamePages=['raids','pantheon','lowmans','raid-detail'];
 if(page!=='guardian'&&page!=='dungeonprofile'&&page!=='report')target.searchParams.delete('profile');
 if(page!=='report')target.searchParams.delete('pgcr');
 if(page==='leaderboards'){
  target.searchParams.set('view','leaderboards');
  if(chosen!=='All Dungeons')target.searchParams.set('dungeon',chosen);else target.searchParams.delete('dungeon');
  target.searchParams.delete('raid');
 }else if(endgamePages.includes(page)){
  target.searchParams.set('view',page);
  target.searchParams.delete('dungeon');
  if(page==='raid-detail'&&egSelectedRaidSlug)target.searchParams.set('raid',egSelectedRaidSlug);else target.searchParams.delete('raid');
 }else{
  target.searchParams.delete('view');target.searchParams.delete('raid');
  if(page!=='dungeonprofile')target.searchParams.delete('dungeon');
 }
 if(location.pathname+location.search!==target.pathname+target.search)history.pushState({},'',target.pathname+target.search+target.hash);
 current=page;
 document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.page===page||(page==='raid-detail'&&n.dataset.page==='raids')));
 document.getElementById('breadcrumb').textContent=({overview:'Overview',dungeons:'Dungeons',raids:'Raids',pantheon:'Pantheon',lowmans:'Lowmans','raid-detail':'Raid Records',leaderboards:'Dungeon Leaderboards',profile:'Player Lookup',guardian:'Guardian Profile',dungeonprofile:'Dungeon History',history:'Activity History',report:'Activity Report'})[page]||'Overview';
 window.scrollTo({top:0,behavior:'smooth'});render();
}
const DUNGEON_SEO_SLUGS={"Equilibrium": "equilibrium", "Sundered Doctrine": "sundered-doctrine", "Vesper’s Host": "vespers-host", "Warlord’s Ruin": "warlords-ruin", "Ghosts of the Deep": "ghosts-of-the-deep", "Spire of the Watcher": "spire-of-the-watcher", "Duality": "duality", "Grasp of Avarice": "grasp-of-avarice", "Prophecy": "prophecy", "Pit of Heresy": "pit-of-heresy", "The Shattered Throne": "the-shattered-throne"};
function cards(limit){let list=data.filter(d=>filter==='all'||(filter==='recent'?d.year>=2024:filter==='classic'?d.year<=2021:true));if(sort==='oldest')list=[...list].sort((a,b)=>a.year-b.year);if(sort==='az')list=[...list].sort((a,b)=>a.name.localeCompare(b.name));if(limit)list=list.slice(0,limit);return `<div class="dungeons">${list.map((d)=>{const img=CUSTOM_DUNGEON_IMAGES[d.name]||'';const coverStyle=`--c1:${d.c1};--c2:${d.c2};${img?`background-image:linear-gradient(0deg,#08101a88,#0a0d130d),url('${img}');background-size:cover;background-position:center;`:''}`;return `<article class="dungeon" role="button" tabindex="0" onclick="openDungeon('${d.name.replace(/'/g,"\\'")}')" onkeydown="if(event.key==='Enter')this.click()"><div class="cover" style="${coverStyle}"><span class="year">${d.year}</span></div><div class="dungeonbody"><div class="dungeonname">${d.name}</div><div class="destination">${d.place}</div><div class="cardfoot"><div><small>Dungeon seal</small><strong>${d.seal}</strong></div><div style="align-items:end"><small>View records</small><strong class="greentext">Explore ↗</strong><a class="seo-card-link" href="/dungeons/${DUNGEON_SEO_SLUGS[d.name]}/" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()">Dungeon page</a></div></div></div></article>`}).join('')}</div>`}
// Local cache for recently viewed profiles.
function readTrackedGuardians(){
 try{const values=JSON.parse(localStorage.getItem(TRACKED_LEADERS_KEY)||'[]');
  if(!Array.isArray(values))return [];
  return values.filter(v=>v&&/^\d{10,25}$/.test(String(v.id||''))&&Number.isFinite(Number(v.type))&&typeof v.name==='string'&&v.name.trim()&&Array.isArray(v.activities)).slice(0,24);
 }catch{return []}
}
function saveTrackedGuardian({account,displayName,activities},source='profile'){
 if(!account||!activities?.length)return;
 const id=String(account.membershipId||''),type=Number(account.membershipType);
 if(!/^\d{10,25}$/.test(id)||!Number.isInteger(type))return;
 const rows=activities.filter(r=>r&&r.date&&r.instanceId);
 if(!rows.length)return;
 const previous=readTrackedGuardians(), old=previous.find(v=>v.id===id&&Number(v.type)===type);
 if(source==='preview'&&old?.source==='profile')return; // Never replace a complete scan with a short preview.
 const entries=rows.map(r=>{
  const match=matchDungeon(r.name||'');
  const entryCache=verifiedRunCache.get(`${type}:${id}:${String(r.instanceId)}`);
  return {dungeon:match?.name||'',complete:!!r.completed,duration:Number.isFinite(r.duration)?r.duration:null,
   kills:Number(r.kills)||0,report:String(r.instanceId),tags:Array.isArray(entryCache?.tags)?entryCache.tags:[],checked:!!entryCache};
 });
 const item={id,type,name:String(displayName||old?.name||'Guardian').slice(0,90),source,
  activities:entries.slice(0,2000),updated:Date.now()};
 const result=[item,...previous.filter(v=>!(v.id===id&&Number(v.type)===type))].slice(0,16);
 try{localStorage.setItem(TRACKED_LEADERS_KEY,JSON.stringify(result))}catch{}
}
function refreshTrackedGuardianAchievements(){
 if(!liveProfile||!liveProfile.activities.length)return;
 saveTrackedGuardian(liveProfile,'profile');
}
function rankingMetricSummary(entry,dungeonName){
 const activities=entry.activities.filter(a=>!dungeonName||dungeonName==='All Dungeons'||a.dungeon===dungeonName);
 const completed=activities.filter(a=>a.complete);
 const full=completed.filter(a=>Number.isFinite(a.duration));
 const solo=completed.filter(a=>a.tags.includes('solo')||a.tags.includes('sf')).length;
 const sf=completed.filter(a=>a.tags.includes('sf')).length;
 const kills=activities.reduce((acc,a)=>acc+(Number(a.kills)||0),0);
 const checked=completed.filter(a=>a.checked).length;
 const best=full.length?Math.min(...full.map(a=>a.duration)):null;
 const bestRun=full.find(a=>a.duration===best)||null;
 return {clears:completed.length,best,kills,solo,sf,checked,recordCount:activities.length,bestRun};
}
function openRankedGuardian(type,id){openGuardian(Number(type),String(id),null,null);}
// Leaderboard results from previously recorded dungeon reports.
const sharedRankingCache=new Map();
const sharedRankingLoading=new Set();
const sharedRankingFetchedAt=new Map();
const SHARED_RANKING_TTL=5*60*1000;
const sharedRankingErrors=new Map();
const SHARED_RANKING_METRICS={clears:'completions',speed:'fastest',kills:'kills'};
const SHARED_RANKING_LABELS={clears:'Completions',speed:'Fastest Full Clear',kills:'Dungeon Kills'};
function sharedRankingKey(){return `${SHARED_RANKING_METRICS[metric]||'completions'}|${chosen}`;}
function refreshRankings(){const key=sharedRankingKey();sharedRankingCache.delete(key);sharedRankingFetchedAt.delete(key);sharedRankingErrors.delete(key);void fetchSharedRankings(true);}
async function fetchSharedRankings(force=false){
 const key=sharedRankingKey();
 if(sharedRankingLoading.has(key))return;
 if(!force&&sharedRankingCache.has(key)&&Date.now()-(sharedRankingFetchedAt.get(key)||0)<SHARED_RANKING_TTL)return;
 sharedRankingLoading.add(key);sharedRankingErrors.delete(key);
 const params=new URLSearchParams({metric:SHARED_RANKING_METRICS[metric]||'completions',limit:'50'});
 if(chosen!=='All Dungeons')params.set('dungeon',chosen);
 try{
  const endpoint=`${getReportProxyURL()}/leaderboard?${params}`;
  const res=await fetch(endpoint,{headers:{'Accept':'application/json'}});
  const body=await res.json();
  if(!res.ok||!body?.ok||!Array.isArray(body.guardians))throw new Error(body?.error||`Leaderboard returned HTTP ${res.status}`);
  sharedRankingCache.set(key,body);sharedRankingFetchedAt.set(key,Date.now());
 }catch(e){sharedRankingErrors.set(key,String(e.message||e));}
 finally{sharedRankingLoading.delete(key);if(current==='overview'||current==='leaderboards')render();}
}
function leaderboard(){
 if(metric==='speed'&&chosen==='All Dungeons')return `<div class="tablepanel" style="padding:20px"><div class="tabs">${Object.entries(SHARED_RANKING_LABELS).map(([k,v])=>`<button class="tab ${metric===k?'active':''}" onclick="metric='${k}';render()">${v}</button>`).join('')}</div><p class="note">Choose a specific dungeon to compare full-start completion times. Different dungeons cannot share a fair fastest-time ranking.</p><button class="smalllink" onclick="navigate('leaderboards')">Select dungeon →</button></div>`;
 const key=sharedRankingKey();
 const body=sharedRankingCache.get(key);
 const stale=!!body&&Date.now()-(sharedRankingFetchedAt.get(key)||0)>=SHARED_RANKING_TTL;
 const results=body?.guardians||[];
 const label=SHARED_RANKING_LABELS[metric]||'Completions';
 if((!body||stale)&&!sharedRankingLoading.has(key)&&!sharedRankingErrors.has(key))void fetchSharedRankings();
 const loading=sharedRankingLoading.has(key);
 const error=sharedRankingErrors.get(key);
 const rows=results.map((g,i)=>{
  const type=Number(g.membership_type),id=String(g.membership_id||'');
  const valid=Number.isInteger(type)&&type>0&&/^\d{5,25}$/.test(id);
  const name=escapeHtml(String(g.bungie_name||'Unknown Guardian'));
  const value=metric==='speed'?(Number(g.fastest_seconds)>0?duration(Number(g.fastest_seconds)):'—'):
   metric==='kills'?formatInt(Number(g.kills)||0):formatInt(Number(g.recorded_completions??g.completions)||0);
  const player=valid?`<button type="button" class="real-guardian-link" onclick="openRankedGuardian(${type},'${id}')"><span class="avatar">${escapeHtml(String(g.bungie_name||'G').slice(0,1).toUpperCase())}</span>${name} ↗</button>`:`<b>${name}</b>`;
  return `<tr><td><span class="rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span></td><td>${player}</td><td><b>${value}</b></td><td class="hide-mobile">${escapeHtml(chosen)}</td></tr>`;
 }).join('');
 const empty=loading?'Loading rankings…':error?`Couldn't load rankings right now.`:
   'No recorded runs for this selection yet.';
 const emptyNote=error?'Try refreshing in a moment.':
  'Try another dungeon or check back later.';
 return `<div class="tablepanel real-leaderboard"><div class="tabs">${Object.entries(SHARED_RANKING_LABELS).map(([k,v])=>`<button class="tab ${metric===k?'active':''}" onclick="metric='${k}';render()">${v}</button>`).join('')}</div><div class="real-rank-tools"><span>${body?results.length+' Guardians shown':loading?'Loading rankings…':'Recorded runs only'}</span><button class="smalllink" onclick="refreshRankings()">Refresh ↻</button></div><div style="overflow-x:auto"><table><thead><tr><th>Rank</th><th>Guardian</th><th>${label}</th><th class="hide-mobile">Dungeon</th></tr></thead><tbody>${rows||`<tr><td class="real-rank-empty" colspan="4"><b>${empty}</b><p>${emptyNote}</p></td></tr>`}</tbody></table></div><p class="note" style="padding:10px 16px">Completions include completed checkpoint runs. Rankings reflect reports indexed so far and may not include a Guardian’s entire history.</p></div>`;
}
async function warmupRealRankings(force=false){
 if(rankingWarmupActive||(!force&&rankingWarmupAttempted))return;
 rankingWarmupAttempted=true;rankingWarmupActive=true;rankingWarmupStatus='';
 if(current==='overview'||current==='leaderboards')render();
 let successes=0;
 for(const name of RANKING_STARTER_NAMES){
  try{
   if(!force&&readTrackedGuardians().some(g=>g.name.toLowerCase()===name.toLowerCase()))continue;
   const [stem,code]=name.split('#');
   const results=await bungie('/Destiny2/SearchDestinyPlayerByBungieName/-1/',{method:'POST',body:JSON.stringify({displayName:stem,displayNameCode:Number(code)})});
   const account=results?.find(x=>String(x?.membershipId||'').match(/^\d{10,25}$/));if(!account)continue;
   const type=Number(account.membershipType),id=String(account.membershipId);
   const profile=await bungie(`/Destiny2/${type}/Profile/${id}/?components=100,200`);
   const characters=Object.keys(profile?.characters?.data||{}).slice(0,3);
   const pages=await Promise.all(characters.map(async characterId=>{
    try{const data=await bungieHistoryPage(type,id,characterId,0);return (data?.activities||[]).map(x=>toHistoryActivity(x,characterId))}catch{return []}
   }));
   const activities=pages.flat().filter(a=>a?.date);
   const hashes=[...new Set(activities.map(a=>a.hash).filter(Boolean))].slice(0,35);
   for(let i=0;i<hashes.length;i+=5)await Promise.all(hashes.slice(i,i+5).map(getActivityName));
   for(const a of activities){a.name=activityNames.get(a.hash)||`Dungeon activity (${a.hash})`;}
   if(activities.length){saveTrackedGuardian({account,displayName:name,activities},'preview');successes++}
  }catch(e){rankingWarmupStatus='Some Bungie profile previews were unavailable';}
  if(current==='overview'||current==='leaderboards')render();
 }
 rankingWarmupActive=false;
 if(successes)rankingWarmupStatus=`Loaded ${successes} additional real Bungie profile${successes===1?'':'s'}`;
 if(current==='overview'||current==='leaderboards')render();
}

function render(){let out='';if(current==='overview'){out=`<h1 class="seo-home-title">Destiny 2 Endgame Tracker</h1>${egHomeTiles()}<div class="sectionhead home-first-heading"><div><h2>Explore Dungeons</h2><p>All 11 Destiny 2 dungeons</p></div><button class="smalllink" onclick="navigate('dungeons')">View all dungeons →</button></div>${cards(8)}<div class="sectionhead"><div><h2>Dungeon Leaderboards</h2><p>Completed dungeon activities indexed so far</p></div><button class="smalllink" onclick="navigate('leaderboards')">View rankings →</button></div>${leaderboard()}`}
else if(current==='dungeons'){out=`<div class="sectionhead" style="margin-top:9px"><div><h2 style="font-size:34px">All Dungeons</h2><p>Browse all Destiny 2 dungeons</p></div><div class="controls"><select class="select" aria-label="Filter dungeons" onchange="filter=this.value;render()"><option value="all" ${filter==='all'?'selected':''}>All releases</option><option value="recent" ${filter==='recent'?'selected':''}>2024+</option><option value="classic" ${filter==='classic'?'selected':''}>2018–2021</option></select><select class="select" aria-label="Sort dungeons" onchange="sort=this.value;render()"><option value="newest" ${sort==='newest'?'selected':''}>Newest first</option><option value="oldest" ${sort==='oldest'?'selected':''}>Oldest first</option><option value="az" ${sort==='az'?'selected':''}>A to Z</option></select></div></div>${cards()}`}
else if(current==='raids'){out=egBrowseRaids()}
else if(current==='pantheon'){out=egBrowsePantheon()}
else if(current==='lowmans'){out=egBrowseLowmans()}
else if(current==='raid-detail'){out=egRenderRaidDetail()}
else if(current==='leaderboards'){out=`<div class="sectionhead" style="margin-top:9px"><div><h2 style="font-size:34px">Dungeon Leaderboards</h2><p>Completed dungeon activities indexed so far</p></div><select class="select" aria-label="Dungeon filter" onchange="chosen=this.value;const u=new URL(location.href);if(chosen!=='All Dungeons')u.searchParams.set('dungeon',chosen);else u.searchParams.delete('dungeon');history.replaceState({},'',u.pathname+u.search);render()">${['All Dungeons',...data.map(d=>d.name)].map(n=>`<option value="${escapeHtml(n)}" ${chosen===n?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select></div>${leaderboard()}`}
else if(current==='profile'){out=`<h1 style="font:700 37px 'Space Grotesk';letter-spacing:-1px">Player lookup</h1><div class="searchcallout"><h2 style="font:700 22px 'Space Grotesk';margin-top:0">Find a Guardian</h2><p style="color:#9aabbd">Type part of a Bungie Name to find matching accounts, or enter a full Name#1234 for direct lookup.</p><form onsubmit="event.preventDefault();showProfile(document.getElementById('playerInput').value)"><input id="playerInput" placeholder="Guardian#1234" value="${escapeHtml(lookupQuery)}" autocomplete="off" oninput="scheduleLookup(this.value)" required><button class="primary" type="submit">Find Player →</button></form><p class="lookup-hint">Select a Guardian below to open their own shareable public profile.</p></div><div id="lookupResults">${lookupResultsHtml()}</div>`}
else if(current==='guardian'){out=guardianPage()}
else if(current==='dungeonprofile'){out=dungeonHistoryPage()}
else if(current==='history'){out=`<h1 style="font:700 37px 'Space Grotesk'">Dungeon Activity History</h1><p style="color:#93a2b5">Runs from your last Guardian search.</p>${scanStatusHtml()}${liveProfile?historyTable(liveProfile.activities):`<div class="empty">Search a Guardian first on the Player Lookup page to see real dungeon activity.</div>`}`}

else if(current==='report'){out=reportPage()}

document.getElementById('page').innerHTML=out+`<footer class="footer" aria-label="DungeonHub credits"><div class="footer-credit"><strong>Developed by kro</strong><span>DungeonHub V27</span></div></footer>`}
function duration(seconds){if(!Number.isFinite(seconds))return '—';const s=Math.max(0,Math.floor(seconds));return `${Math.floor(s/3600)?`${Math.floor(s/3600)}:`:''}${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function historyTable(activities){if(!activities.length)return '<div class="empty">No recent dungeon activities returned. The Guardian may have a private profile or no accessible records.</div>';return `<div class="tablepanel" style="overflow-x:auto"><table><thead><tr><th>Dungeon activity</th><th>Date</th><th>Duration</th><th>Completion</th><th>Report</th></tr></thead><tbody>${activities.slice(0,100).map(a=>`<tr><td><b>${escapeHtml(a.name)}</b></td><td>${escapeHtml(new Date(a.date).toLocaleDateString())}</td><td>${duration(a.duration)}</td><td>${a.completed?'<span class="badge">Completed</span>':'Incomplete'}</td><td>${a.instanceId?`<a target="_blank" rel="noopener noreferrer" style="color:var(--accent)" href="https://www.bungie.net/en/PGCR/${encodeURIComponent(a.instanceId)}">PGCR ↗</a>`:'—'}</td></tr>`).join('')}</tbody></table></div><p class="note">Showing up to 100 recorded runs. More may still be loading. Checkpoint clears may be included.</p>`}
function profile(name){const safe=escapeHtml(name);if(liveLoading)return `<div class="empty"><h2>Looking up ${safe}…</h2><p>Searching Bungie and loading recent dungeon runs for each character.</p></div>`;if(liveError)return `<div class="empty"><h2>Couldn't load ${safe}</h2><p>${escapeHtml(liveError)}</p><p>Try again in a moment.</p><button class="primary" onclick="showProfile(playerName)">Retry search ↻</button></div>`;if(!liveProfile)return '<div class="empty">Search with your Bungie Name (example: Guardian#1234).</div>';let a=liveProfile.activities;const completed=a.filter(x=>x.completed);const known=completed.filter(confirmedFullStart).filter(x=>Number.isFinite(x.duration)&&x.duration>0);const best=known.length?duration(Math.min(...known.map(x=>x.duration))):'—';return `<div class="profilehero"><div class="profileicon">${safe.slice(0,1).toUpperCase()}</div><div><h2>${safe}</h2><p>Bungie activity</p></div></div><div class="sectionhead"><h2>Recent Dungeon Records</h2></div><div class="detailstats"><div><small>Recent runs fetched</small><b>${a.length}</b></div><div><small>Completed (recent)</small><b>${completed.length}</b></div><div><small>Best PGCR full start</small><b>${best}</b></div></div><p class="note">Recent runs only. This is not a lifetime total.</p><div class="sectionhead"><h2>Recent Bungie dungeon activities</h2><button class="smalllink" onclick="navigate('history')">Activity history →</button></div>${historyTable(a)}`;}


/* Shareable, live Bungie PGCR view. The entire report is public game activity data. */
function reportSafe(value){return escapeHtml(String(value??''));}
function reportStat(entry,key){
 const options=[entry?.values?.[key],entry?.extended?.values?.[key],entry?.extended?.scoreboardValues?.[key]];
 for(const item of options){const n=Number(item?.basic?.value);if(item?.basic?.value!==undefined&&Number.isFinite(n))return n;}
 return null;
}
function reportNumber(n){return n===null||n===undefined?'—':Number(n).toLocaleString('en-US',{maximumFractionDigits:2});}
function reportDate(date){if(!date)return 'Date unavailable';const d=new Date(date);return Number.isNaN(d.getTime())?'Date unavailable':d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});}
function reportActivityName(a){
 const hash=Number(a?.activityDetails?.directorActivityHash||a?.activityDetails?.referenceId);
 return activityNames.get(hash)||a?.displayName||'Destiny 2 activity';
}
function matchDungeonArt(name){
 const normalized=String(name||'').toLowerCase().replace(/[‘’]/g,"'");
 const dungeon=data.find(x=>normalized.includes(x.name.toLowerCase().replace(/[‘’]/g,"'").replace(/^the /,''))||normalized.includes(x.name.toLowerCase().replace(/[‘’]/g,"'")));
 return dungeon?CUSTOM_DUNGEON_IMAGES[dungeon.name]||'':'';
}
function reportMemberName(e){
 const u=e?.player?.destinyUserInfo||e?.player?.bungieNetUserInfo||{};
 const name=u.bungieGlobalDisplayName||u.displayName||'Unknown Guardian';
 const code=Number(u.bungieGlobalDisplayNameCode);
 return `${name}${name.includes('#')||!Number.isInteger(code)||!code?'':`#${String(code).padStart(4,'0')}`}`;
}
function returnFromReport(){
 const u=new URL(location.href);u.searchParams.delete('pgcr');history.pushState({},'',u.pathname+u.search+u.hash);
 activeReportId='';reportLoading=false;reportData=null;reportError='';reportGeneration++;
 const p=u.searchParams.get('profile');const m=p?.match(/^(\d+)-(\d+)$/);
 if(m){selectedProfileDungeon=data.find(d=>d.name===u.searchParams.get('dungeon'))?.name||'';if(liveProfile&&String(liveProfile.account?.membershipId)===m[2]){current=selectedProfileDungeon?'dungeonprofile':'guardian';document.getElementById('breadcrumb').textContent=selectedProfileDungeon?'Dungeon History':'Guardian Profile';render()}else{openGuardian(m[1],m[2],null,null,!!selectedProfileDungeon)}}
 else{current='overview';document.getElementById('breadcrumb').textContent='Overview';render()}
 window.scrollTo({top:0,behavior:'smooth'});
}
function openActivityReport(id,{skipHistory=false}={}){
 id=String(id||'');if(!/^\d{6,25}$/.test(id))return;
 const u=new URL(location.href);u.searchParams.set('pgcr',id);
 if(!skipHistory)history.pushState({report:id},'',u.pathname+u.search+u.hash);
 activeReportId=id;reportData=null;reportError='';reportLoading=true;pgcrRowsPage=0;
 const generation=++reportGeneration;
 current='report';document.getElementById('breadcrumb').textContent='Activity Report';
 document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
 window.scrollTo({top:0});render();loadActivityReport(id,generation);
}
async function fetchWeaponDefinition(hash){
 const key=String(hash);if(weaponDefinitionCache.has(key))return weaponDefinitionCache.get(key);
 try{
  const def=await bungie(`/Destiny2/Manifest/DestinyInventoryItemDefinition/${encodeURIComponent(key)}/`);
  const result={name:def?.displayProperties?.name||`Item ${key}`,icon:def?.displayProperties?.icon||'',bucket:Number(def?.inventory?.bucketTypeHash||def?.equippingBlock?.equipmentSlotTypeHash)||0};
  weaponDefinitionCache.set(key,result);return result;
 }catch(e){const result={name:`Item ${key}`,icon:'',bucket:0};weaponDefinitionCache.set(key,result);return result;}
}
async function loadActivityReport(id,generation){
 try{
  const pgcr=await fetchActivityPGCR(id);
  if(generation!==reportGeneration)return;
  if(!pgcr||!Array.isArray(pgcr.entries))throw new Error('Bungie returned no activity entries for this report.');
  reportData=pgcr;reportLoading=false;reportError='';render();
  const hash=pgcr.activityDetails?.directorActivityHash||pgcr.activityDetails?.referenceId;
  if(hash&&!activityNames.has(Number(hash))){await getActivityName(hash);if(generation===reportGeneration&&current==='report')render()}
  const rankedWeapons=Array.from(new Set(pgcr.entries.slice(0,24).flatMap(e=>e.extended?.weapons||[]).map(w=>String(w.referenceId||'')).filter(Boolean)));
  // Cap manifest lookups for one report to avoid bombarding Bungie's API.
  for(let i=0;i<Math.min(30,rankedWeapons.length);i+=5){
   if(generation!==reportGeneration)return;
   await Promise.all(rankedWeapons.slice(i,i+5).map(fetchWeaponDefinition));
  }
  if(generation===reportGeneration&&current==='report')render();
 }catch(e){if(generation!==reportGeneration)return;reportLoading=false;reportError=e.message||String(e);render()}
}
function reportWeaponRows(){
 const all=new Map();
 for(const e of reportData.entries){for(const w of e?.extended?.weapons||[]){
  const id=String(w.referenceId||'');const kills=Number(w?.values?.uniqueWeaponKills?.basic?.value);
  if(!id||!Number.isFinite(kills))continue;
  const item=all.get(id)||{id,kills:0,players:new Set()};item.kills+=kills;item.players.add(reportMemberName(e));all.set(id,item);
 }}
 const values=[...all.values()].sort((a,b)=>b.kills-a.kills);
 if(!values.length)return `<section class="pgcr-panel pgcr-no-weapon"><h2>Weapon breakdown</h2><p>Bungie did not provide per-weapon kills for this activity.</p></section>`;
 const groups={kinetic:[],energy:[],power:[],other:[]};
 for(const weapon of values){
  const def=weaponDefinitionCache.get(weapon.id)||{name:`Item ${weapon.id}`,icon:'',bucket:0};
  const group=({1498876634:'kinetic',2465295065:'energy',953998645:'power'})[String(def.bucket)]||'other';
  groups[group].push({weapon,def});
 }
 const blocks=[['kinetic','KINETIC'],['energy','ENERGY'],['power','POWER'],['other','OTHER / UNRESOLVED']].filter(([key])=>groups[key].length>0);
 return `<section class="pgcr-panel"><div class="pgcr-section-top"><div><div class="eyebrow">WEAPONS</div><h2>Weapon breakdown</h2></div><span class="pgcr-section-hint">Weapon kills</span></div><div class="pgcr-weapon-grid">${blocks.map(([key,title])=>`<div class="pgcr-weapon-column"><div class="pgcr-weapon-heading">${title}</div>${groups[key].map(({weapon,def})=>{
  const path=/^\/[a-zA-Z0-9_\/.-]+$/.test(def.icon||'')?`https://www.bungie.net${def.icon}`:'';
  return `<div class="pgcr-weapon"><div class="pgcr-weapon-art">${path?`<img loading="lazy" src="${path}" alt="">`:'✧'}</div><div class="pgcr-weapon-info"><b title="${reportSafe(def.name)}">${reportSafe(def.name)}</b><small>${weapon.players.size} player${weapon.players.size===1?'':'s'}</small></div><div class="pgcr-weapon-kills">${reportNumber(weapon.kills)}<small>kills</small></div></div>`;
 }).join('')}</div>`).join('')}</div><p class="pgcr-data-footnote">Weapon-kill totals don't include every ability or damage source; some weapons can lack identifiers in older reports.</p></section>`;
}
const PGCR_ROWS_PER_PAGE=12;
let pgcrRowsPage=0;
function changePgcrRowsPage(delta){
  if(!reportData?.entries?.length)return;
  const max=Math.max(0,Math.ceil(reportData.entries.length/PGCR_ROWS_PER_PAGE)-1);
  pgcrRowsPage=Math.min(max,Math.max(0,pgcrRowsPage+delta));
  render();
  document.querySelector('.pgcr-panel')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function reportPage(){
 const id=activeReportId;
 const back=`<div class="pgcr-toolbar"><button type="button" class="pgcr-back" onclick="returnFromReport()">← Back to ${new URL(location.href).searchParams.has('profile')?'Guardian profile':'DungeonHub'}</button><div class="pgcr-toolbar-right"><span>PGCR #${reportSafe(id)}</span><button class="pill" type="button" onclick="navigator.clipboard?.writeText(location.href).then(()=>{this.textContent='✓ Copied'})">Copy report link</button><a class="pill pgcr-external" href="https://www.bungie.net/en/PGCR/${encodeURIComponent(id)}" target="_blank" rel="noopener noreferrer">View on Bungie.net ↗</a></div></div>`;
 if(reportLoading)return back+`<div class="pgcr-center"><span class="spinner"></span><div class="eyebrow">LOADING ACTIVITY</div><h1>Loading report #${reportSafe(id)}</h1><p>Getting the activity details…</p></div>`;
 if(reportError)return back+`<div class="pgcr-center"><div class="eyebrow">REPORT UNAVAILABLE</div><h1>Couldn't load this report</h1><p>${reportSafe(reportError)}</p><button class="primary" onclick="openActivityReport('${id}')">Retry report ↻</button><p><a href="https://www.bungie.net/en/PGCR/${encodeURIComponent(id)}" target="_blank" rel="noopener noreferrer" class="pgcr-textlink">Open the original on Bungie.net ↗</a></p></div>`;
 if(!reportData)return back+'<div class="pgcr-center">No activity loaded.</div>';
 const entries=reportData.entries||[];const name=reportActivityName(reportData);
 const anomalousReport=entries.length>24;
 const uniquePlayers=new Set(entries.map(e=>{
   const u=e?.player?.destinyUserInfo;
   return u?.membershipId&&u?.membershipType ? `${u.membershipType}:${u.membershipId}` : '';
 }).filter(Boolean));
 const maxPgcrPage=Math.max(0,Math.ceil(entries.length/PGCR_ROWS_PER_PAGE)-1);
 pgcrRowsPage=Math.min(maxPgcrPage,pgcrRowsPage);
 const visibleReportRowsStart=pgcrRowsPage*PGCR_ROWS_PER_PAGE;

 const bg=matchDungeonArt(name);
 const allNumbers=entries.map(e=>({e,kills:reportStat(e,'kills'),deaths:reportStat(e,'deaths'),assists:reportStat(e,'assists'),duration:reportStat(e,'timePlayedSeconds'),completed:reportStat(e,'completed')}));
 const sum=(field)=>allNumbers.some(r=>r[field]!==null)?allNumbers.reduce((n,r)=>n+(r[field]||0),0):null;
 const totalKills=sum('kills'),totalDeaths=sum('deaths'),totalAssists=sum('assists');
 const mvp=allNumbers.filter(x=>x.kills!==null).sort((a,b)=>b.kills-a.kills)[0];
 const overallTime=entries.map(e=>reportStat(e,'activityDurationSeconds')).find(x=>x!==null)??Math.max(0,...allNumbers.map(x=>x.duration||0));
 const allCompleted=entries.length>0&&allNumbers.every(x=>x.completed===1);
 const someCompleted=allNumbers.some(x=>x.completed===1);
 const completeLabel=allCompleted?'Completed':someCompleted?'Mixed outcomes':'Incomplete / unverified';
 const killShare=value=>value===null||!totalKills?'—':(value/totalKills*100).toFixed(1)+'%';
 const maxKills=allNumbers.length?Math.max(...allNumbers.map(x=>x.kills||0)):0;
 const totals=[['KILLS',anomalousReport?'—':reportNumber(totalKills)],['DEATHS',anomalousReport?'—':reportNumber(totalDeaths)],['ASSISTS',anomalousReport?'—':reportNumber(totalAssists)],['K/D',anomalousReport?'—':totalKills!==null&&totalDeaths!==null?(totalKills/Math.max(totalDeaths,1)).toFixed(2):'—'],['IDENTIFIED PLAYERS',reportNumber(uniquePlayers.size)],['ACTIVITY TIME',anomalousReport?'—':overallTime?duration(overallTime):'—']];
 const visibleReportRows=allNumbers.slice(visibleReportRowsStart,visibleReportRowsStart+PGCR_ROWS_PER_PAGE);
 const pgcrWarning=anomalousReport?`<div class="pgcr-anomaly"><b>Unusual activity report</b><p>Bungie returned ${entries.length.toLocaleString()} entries for this activity. That is not a normal dungeon fireteam. Player totals and completion verification are withheld until the underlying report can be checked. The list below is paginated so the page remains usable.</p></div>`:'';
 const pgcrPagination=entries.length>PGCR_ROWS_PER_PAGE?`<div class="pgcr-pagination"><span>Entries ${visibleReportRowsStart+1}–${Math.min(entries.length,visibleReportRowsStart+PGCR_ROWS_PER_PAGE)} of ${entries.length.toLocaleString()}</span><div><button type="button" onclick="changePgcrRowsPage(-1)" ${pgcrRowsPage===0?'disabled':''}>Previous</button><span>Page ${pgcrRowsPage+1} / ${maxPgcrPage+1}</span><button type="button" onclick="changePgcrRowsPage(1)" ${pgcrRowsPage===maxPgcrPage?'disabled':''}>Next</button></div></div>`:'';
 return `${back}<div class="pgcr-hero" style="${bg?`background-image:linear-gradient(90deg,#091018ef,#0b101aa5 60%,#081018d4),url('${bg}')`:''}"><div class="pgcr-hero-label">ACTIVITY REPORT</div><h1>${reportSafe(name)}</h1><div class="pgcr-hero-details"><span>◷ ${reportDate(reportData.period)}</span><span>♙ ${uniquePlayers.size?`${uniquePlayers.size} identified players`:`${entries.length} report entries`}</span><span>⏱ ${overallTime?duration(overallTime):'—'}</span><span class="${allCompleted?'pgcr-completed':'pgcr-incomplete'}">● ${completeLabel}</span></div><div class="pgcr-hero-id">ACTIVITY ID ${reportSafe(id)}</div></div>
 ${pgcrWarning}<section class="pgcr-panel"><div class="pgcr-section-top"><div><div class="eyebrow">FIRETEAM</div><h2>Activity summary</h2></div><span class="pgcr-section-hint">Player stats</span></div>
 <div class="pgcr-table-scroll"><table class="pgcr-score-table"><thead><tr><th>Guardian</th><th>Kills</th><th>Deaths</th><th>Assists</th><th>Kill share</th><th>Time played</th></tr></thead><tbody>${visibleReportRows.map(({e,kills,deaths,assists,duration:played,completed})=>{
  const name=reportMemberName(e);const user=e?.player?.destinyUserInfo||{};const type=user.membershipType,id=user.membershipId;
  const profileLink=/^\d+$/.test(String(type||''))&&/^\d+$/.test(String(id||''))?`?profile=${encodeURIComponent(type+'-'+id)}`:null;
  const selected=liveProfile?.account?.membershipId&&String(id)===String(liveProfile.account.membershipId);
  return `<tr class="${selected?'pgcr-selected':''}"><td><div class="pgcr-guardian"><span class="pgcr-guardian-avatar">${reportSafe(name.slice(0,1).toUpperCase())}</span><div class="pgcr-guardian-text">${profileLink?`<a href="${profileLink}">${reportSafe(name)}</a>`:`<b>${reportSafe(name)}</b>`}<small>${reportSafe(e?.player?.characterClass||'Guardian')} ${completed===1?' · Completed':completed===0?' · Incomplete':''}</small></div>${mvp?.e===e&&maxKills>0?'<span class="pgcr-mvp">Top kills</span>':''}</div></td><td class="pgcr-number">${reportNumber(kills)}</td><td class="pgcr-number">${reportNumber(deaths)}</td><td class="pgcr-number">${reportNumber(assists)}</td><td class="pgcr-number">${killShare(kills)}</td><td class="pgcr-number">${played===null?'—':duration(played)}</td></tr>`;
 }).join('')}</tbody></table></div>${pgcrPagination}<div class="pgcr-totals">${totals.map(([label,value])=>`<div><strong>${reportSafe(value)}</strong><span>${label}</span></div>`).join('')}</div><div class="pgcr-panel-foot"><span>✦ Activity data from Bungie.net</span><span>${mvp?`Top kills: ${reportSafe(reportMemberName(mvp.e))} (${reportNumber(mvp.kills)})`:''}</span></div></section>
 ${anomalousReport?'':reportWeaponRows()}
 <div class="pgcr-caveat">Stats are from Bungie. A checkpoint completion does not count as a verified full clear or speedrun.</div>`;
}

const THEME_CHOICES=[
 {id:'neon',label:'Neon / Lime',color:'#b6f77a'},
 {id:'abyss',label:'Abyss / Blue',color:'#69d9ff'},
 {id:'violet',label:'Void / Violet',color:'#d29bff'},
 {id:'ember',label:'Ember / Coral',color:'#ff9575'},
 {id:'solar',label:'Solar / Gold',color:'#ffcb67'},
 {id:'ice',label:'Frost / Teal',color:'#91e8e7'}
];
function currentTheme(){let id='neon';try{id=localStorage.getItem('dungeonhub.theme')||'neon'}catch{};return THEME_CHOICES.some(x=>x.id===id)?id:'neon';}
function applyTheme(id){const chosen=THEME_CHOICES.find(x=>x.id===id)||THEME_CHOICES[0];document.body.dataset.theme=chosen.id;const label=document.getElementById('themeLabel');if(label)label.textContent=chosen.label;
 const choices=document.getElementById('themeChoices');if(choices)choices.innerHTML=THEME_CHOICES.map(x=>`<button type="button" class="theme-choice" aria-pressed="${x.id===chosen.id}" onclick="applyTheme('${x.id}')"><span class="theme-swatch" style="--swatch:${x.color}"></span>${escapeHtml(x.label)}</button>`).join('');
 try{localStorage.setItem('dungeonhub.theme',chosen.id)}catch{}
 const menu=document.getElementById('themeMenu');if(menu&&!menu.hidden){menu.hidden=true;document.getElementById('themeTrigger')?.setAttribute('aria-expanded','false')}
}
function toggleThemeMenu(){const menu=document.getElementById('themeMenu');if(!menu)return;menu.hidden=!menu.hidden;document.getElementById('themeTrigger')?.setAttribute('aria-expanded',String(!menu.hidden));}
document.addEventListener('click',event=>{if(!event.target.closest?.('.theme-settings')){const menu=document.getElementById('themeMenu');if(menu&&!menu.hidden){menu.hidden=true;document.getElementById('themeTrigger')?.setAttribute('aria-expanded','false')}}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const menu=document.getElementById('themeMenu');if(menu&&!menu.hidden){menu.hidden=true;document.getElementById('themeTrigger')?.setAttribute('aria-expanded','false')}}});
function scannerMessage(){if(historyScan.active)return `Scanning public dungeon history… ${formatInt(historyScan.loaded)} runs across ${historyScan.pages} pages`;if(historyScan.cancelled)return `Scan stopped · ${formatInt(historyScan.loaded)} runs retrieved`;if(historyScan.complete&&!historyScan.issues.length&&!historyScan.capped)return `Available history loaded · ${formatInt(historyScan.loaded)} dungeon runs`;return `Partial history · ${formatInt(historyScan.loaded)} runs retrieved`;}
function scanStatusHtml(){if(!historyScan.pages&&!historyScan.active)return '';
 const note=historyScan.issues.length?historyScan.issues.slice(0,2).join(' · '):historyScan.capped?'Page safety limit reached; totals may be incomplete':historyScan.active?'This scan continues while this browser page stays open. Private or Bungie-unavailable history cannot be retrieved.':'Results are based on Bungie’s accessible activity history, not verified full-dungeon clears.';
 return `<div class="scan-status" data-scan-status><span><strong>${escapeHtml(scannerMessage())}</strong><small>${historyScan.doneCharacters}/${historyScan.totalCharacters} characters scanned · ${escapeHtml(note)}</small></span>${historyScan.active?'<button type="button" onclick="stopHistoryScan()">Stop scan</button>':''}</div>`;
}
function updateScanStatus(){const target=document.querySelector('[data-scan-status]');if(!target)return;const wrapped=document.createElement('div');wrapped.innerHTML=scanStatusHtml();if(wrapped.firstElementChild)target.replaceWith(wrapped.firstElementChild)}
function stopHistoryScan(){historyScan.cancelled=true;historyScan.active=false;historyScan.issues.push('Stopped by user');render()}
function refreshProfileView(){if(['guardian','dungeonprofile','history'].includes(current)){render();}else updateScanStatus()}
function scanHistoryDate(input){const date=new Date(input);return Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}
function reportLinkLocal(id){return /^\d{6,25}$/.test(String(id||''))?`<button class="smalllink" type="button" onclick="openActivityReport('${id}')">View report ↗</button>`:'—'}
function openDungeonProfile(name){if(!liveProfile)return;const match=data.find(d=>d.name===name);if(!match)return;
 selectedProfileDungeon=match.name;dungeonStatusFilter='all';dungeonDisplayCount=50;current='dungeonprofile';
 const u=new URL(location.href);u.searchParams.set('dungeon',match.name);u.searchParams.delete('pgcr');history.pushState({dungeon:match.name},'',u.pathname+u.search);
 document.getElementById('breadcrumb').textContent='Dungeon History';window.scrollTo({top:0});render();
}
function closeDungeonProfile(){selectedProfileDungeon='';current='guardian';const u=new URL(location.href);u.searchParams.delete('dungeon');history.pushState({profile:true},'',u.pathname+u.search);document.getElementById('breadcrumb').textContent='Guardian Profile';window.scrollTo({top:0});render()}
function expandDungeonHistory(){dungeonDisplayCount+=50;render()}
function dungeonHistoryPage(){if(liveLoading)return `<div class="profileloading"><span class="spinner"></span><h2>Loading Guardian's dungeon history…</h2></div>`;
 if(!liveProfile)return `<div class="empty">Open a Guardian profile first.</div>`;
 const d=data.find(x=>x.name===selectedProfileDungeon);if(!d)return '<div class="empty">Dungeon not found.</div>';
 const all=liveProfile.activities.filter(x=>matchDungeon(x.name)?.name===d.name);
 const filtered=all.filter(x=>dungeonStatusFilter==='all'||(dungeonStatusFilter==='complete'?x.completed:!x.completed));
 const clears=all.filter(x=>x.completed);const full=clears.filter(confirmedFullStart);const timed=full.filter(x=>Number.isFinite(x.duration)&&x.duration>0);const fastest=timed.length?timed.reduce((a,b)=>a.duration<b.duration?a:b):null;
 const artwork=CUSTOM_DUNGEON_IMAGES[d.name]||'';
 const safeArt=artwork?`linear-gradient(0deg,#080d17bb,#1119270b),url('${artwork}')`:`linear-gradient(110deg,${d.c1},${d.c2})`;
 const rows=filtered.slice(0,dungeonDisplayCount);
 return `<button class="dungeon-detail-back" onclick="closeDungeonProfile()">← Back to ${escapeHtml(liveProfile.displayName)}</button><div class="dungeon-detail-hero" style="background-image:${safeArt}"><span class="eyebrow">DUNGEON HISTORY</span><h1>${escapeHtml(d.name)}</h1><p>${escapeHtml(liveProfile.displayName)} · ${escapeHtml(d.place)} · ${d.year}</p></div>${scanStatusHtml()}
 <div class="dungeon-detail-stats"><div><small>Recorded runs</small><strong>${formatInt(all.length)}</strong></div><div><small>Recorded / full start</small><strong>${formatInt(clears.length)} / ${formatInt(full.length)}</strong></div><div><small>Best confirmed start</small><strong>${fastest?duration(fastest.duration):'—'}</strong></div><div><small>Latest run</small><strong>${all.length?scanHistoryDate(all[0].date):'—'}</strong></div></div>
 <div class="history-tools"><div><h2>Dungeon activity history</h2><p class="lookup-caption">${formatInt(filtered.length)} matching runs · live Bungie data</p></div><select class="select" aria-label="Filter activity status" onchange="dungeonStatusFilter=this.value;dungeonDisplayCount=50;render()"><option value="all" ${dungeonStatusFilter==='all'?'selected':''}>All runs</option><option value="complete" ${dungeonStatusFilter==='complete'?'selected':''}>Completed</option><option value="incomplete" ${dungeonStatusFilter==='incomplete'?'selected':''}>Incomplete</option></select></div>
 <div class="tablepanel" style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Result</th><th>Start</th><th>Duration</th><th>Kills / Deaths</th><th>Report</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><b>${escapeHtml(scanHistoryDate(x.date))}</b></td><td>${dotStatusForRun(x)==='checkpoint'?'<span class="badge">Checkpoint completion</span>':x.completed?'<span class="badge">Completed</span>':dotStatusForRun(x)==='incomplete'?'Incomplete':'Not confirmed'}</td><td>${escapeHtml(runStartLabel(x))}</td><td>${duration(x.duration)}</td><td>${formatInt(x.kills)} / ${formatInt(x.deaths)}</td><td>${reportLinkLocal(x.instanceId)}</td></tr>`).join(''):'<tr><td colspan="6">No records found in accessible history.</td></tr>'}</tbody></table></div>${filtered.length>rows.length?`<button class="history-more" onclick="expandDungeonHistory()">Show 50 more (${formatInt(filtered.length-rows.length)} remaining)</button>`:''}
 <p class="note">${historyScan.active?'More older activities will appear as Bungie pages are fetched.':'Bungie can limit or omit older/private activity history.'} Recorded completions may include checkpoints. Only explicit PGCR full-start confirmations count toward the displayed best time; this does not certify speedruns.</p>`;
}

function profileURL(type,id,preserveDungeon=false){const u=new URL(location.href);u.searchParams.set('profile',`${type}-${id}`);u.searchParams.delete('pgcr');if(!preserveDungeon)u.searchParams.delete('dungeon');return u.pathname+u.search;}
function openGuardian(type,id,name,account,preserveDungeon=false){
  playerName=name||playerName||'Guardian';profileTab='overview';dungeonFilter='all';egResetRaidState();
  timelineDistanceFromNewest.clear();timelineRunsByDungeon.clear();++verifyGeneration;verifyProgress={active:false,checked:0,total:0,failed:0};
  selectedProfileDungeon=preserveDungeon&&data.find(d=>d.name===new URL(location.href).searchParams.get('dungeon'))?.name||'';
  dungeonDisplayCount=50;dungeonStatusFilter='all';
  historyScan={active:false,complete:false,cancelled:false,loaded:0,pages:0,doneCharacters:0,totalCharacters:0,issues:[],capped:false};
  liveProfile=null;liveError='';liveLoading=true;const version=++requestVersion;
  const newUrl=profileURL(type,id,preserveDungeon);if(location.pathname+location.search!==newUrl)history.pushState({profile:true},'',newUrl);
  current=selectedProfileDungeon?'dungeonprofile':'guardian';document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
  document.getElementById('breadcrumb').textContent=selectedProfileDungeon?'Dungeon History':'Guardian Profile';window.scrollTo({top:0});render();
  loadAccount(type,id,version,account);
}
function copyProfileLink(){navigator.clipboard?.writeText(location.href).then(()=>{const el=document.getElementById('copyLinkBtn');if(el){el.textContent='✓ Copied';setTimeout(()=>{if(el)el.textContent='Copy profile link';},1700)}}).catch(()=>window.prompt('Copy profile URL:',location.href));}
function formatInt(n){return Number(n||0).toLocaleString('en-US')}
function guardianPage(){
 if(liveLoading)return `<div class="eyebrow">GUARDIAN PROFILE</div><div class="profileloading"><span class="spinner"></span><h1>Loading Guardian profile</h1><p>Fetching character data and beginning the activity history scan…</p></div>`;
 if(liveError)return `<div class="eyebrow">GUARDIAN PROFILE</div><div class="profileloading"><h1>Could not load this profile</h1><p>${escapeHtml(liveError)}</p><button class="primary" onclick="navigate('profile')">Search again</button></div>`;
 if(!liveProfile)return '<div class="empty">No Guardian loaded.</div>';
 const {activities:a,account,characters,displayName,memberType}=liveProfile;
 const done=a.filter(x=>x.completed);const confirmed=done.filter(confirmedFullStart);const validClears=confirmed.filter(x=>Number.isFinite(x.duration)&&x.duration>0);const bestRecentRun=validClears.length?validClears.reduce((best,run)=>run.duration<best.duration?run:best):null;const fastest=bestRecentRun?.duration??null;
 const kills=a.reduce((n,x)=>n+(x.kills||0),0),deaths=a.reduce((n,x)=>n+(x.deaths||0),0);
 const last=a.length?new Date(a[0].date).toLocaleDateString():'—';
 const initials=escapeHtml(displayName.trim().slice(0,1).toUpperCase());
 
 let tabContent='';
 if(['raids','pantheon','lowmans'].includes(profileTab)){
  tabContent=egProfilePanel(profileTab);
 }else if(profileTab==='overview'){
  const recent=a.slice(0,8);tabContent=`<section><div class="panel-title sectionhead"><div><h2>Dungeons</h2><p class="profile-section-caption">Select a dungeon to view its runs</p>${achievementVerificationStatus()}</div><select class="select" aria-label="Filter dungeons" onchange="dungeonFilter=this.value;render()"><option value="all" ${dungeonFilter==='all'?'selected':''}>All dungeons</option><option value="played" ${dungeonFilter==='played'?'selected':''}>Played only</option></select></div>${dungeonRows(a,false)}</section><div class="panel-title sectionhead"><h2>Latest dungeon runs</h2><button class="smalllink" onclick="profileTab='runs';render()">View all recent runs →</button></div>${historyTable(recent)}`;
 }else if(profileTab==='dungeons'){
  tabContent=`<div class="panel-title sectionhead"><div><h2>Dungeon statistics</h2><p>Completions and fastest times within fetched activity history</p></div><select class="select" onchange="dungeonFilter=this.value;render()"><option value="all" ${dungeonFilter==='all'?'selected':''}>All dungeons</option><option value="played" ${dungeonFilter==='played'?'selected':''}>Played only</option></select></div>${dungeonRows(a,false)}`;
 }else{
  tabContent=`<div class="panel-title sectionhead"><div><h2>Activity history</h2><p>${a.length} recent dungeon activities across ${characters.length} characters</p></div></div>${historyTable(a)}`;
 }
 return `<div class="profile-cover"><div class="profile-cover-art">✧</div><div class="eyebrow">GUARDIAN PROFILE <span style="color:#cdd5df;font-weight:600;letter-spacing:normal;margin-left:14px"></span></div><div class="profile-mainline"><div class="profilebigavatar">${initials}</div><div class="profileidentity"><h1>${escapeHtml(displayName)}</h1><div class="profilemeta"><span class="badge">Bungie profile</span><span>${escapeHtml(memberType)}</span><a class="profile-bungie-link" href="https://www.bungie.net/7/en/User/Profile/${encodeURIComponent(account.membershipType)}/${encodeURIComponent(account.membershipId)}" target="_blank" rel="noopener noreferrer" title="Open this Guardian on Bungie.net">Bungie.net profile ↗</a></div></div><div class="profileactions"><button class="pill" id="copyLinkBtn" onclick="copyProfileLink()">Copy profile link</button><button class="pill" onclick="navigate('profile')">New search ↗</button></div></div></div>
 <div class="profilemetrics"><div><small>Dungeon runs</small><strong>${formatInt(a.length)}</strong><span>Available activity history</span></div><div><small>Recorded completions</small><strong>${formatInt(done.length)}</strong><span>${formatInt(confirmed.length)} PGCR full-start confirmed</span></div><div><small>Best confirmed full-start</small><strong>${bestRecentRun?.instanceId?`<a class="profile-best-report" href="https://www.bungie.net/en/PGCR/${encodeURIComponent(bestRecentRun.instanceId)}" target="_blank" rel="noopener noreferrer">${duration(bestRecentRun.duration)} ↗</a>`:(fastest!==null?duration(fastest):'—')}</strong><span>${bestRecentRun?escapeHtml(new Date(bestRecentRun.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})):'Awaiting PGCR checks'}</span></div><div><small>Dungeon kills</small><strong>${formatInt(kills)}</strong><span>${formatInt(deaths)} deaths in fetched runs</span></div><div><small>Last played</small><strong class="smaller">${last}</strong><span>Latest recorded run</span></div></div>
 ${scanStatusHtml()}${egProfileTeaser()}<div class="profile-warning">ⓘ <span><b>Some runs may be missing.</b> Bungie may not provide all activity history. Checkpoint completions are separate from PGCR-confirmed full starts. Times shown here are not speedrun-certified.</span></div>
 <div class="profiletabs">${egTabButton('overview','Overview')}${egTabButton('raids','Raids')}${egTabButton('pantheon','Pantheon')}${egTabButton('lowmans','Lowmans')}${egTabButton('runs','Dungeon History')}</div>${tabContent}`;
}
function relativeRunTime(iso){
 const when=new Date(iso).getTime(); if(!Number.isFinite(when))return 'Date unknown';
 const elapsed=Math.max(0,Date.now()-when);const minutes=Math.floor(elapsed/60000);
 if(minutes<1)return 'just now';if(minutes<60)return `${minutes}m ago`;
 const hours=Math.floor(minutes/60);if(hours<24)return `${hours}h ago`;
 const days=Math.floor(hours/24);if(days<30)return `${days}d ago`;
 const months=Math.floor(days/30);if(months<12)return `${months}mo ago`;
 const years=Math.floor(days/365);return `${years}y ago`;
}
let visibleRunDot=null;
function runTooltipNode(){let el=document.getElementById('run-tooltip');
 if(!el){el=document.createElement('div');el.id='run-tooltip';el.className='run-tooltip';el.setAttribute('role','tooltip');document.body.appendChild(el)}return el;}
function hideRunTooltip(){const el=document.getElementById('run-tooltip');if(el)el.classList.remove('visible');visibleRunDot=null;}
function moveRunTooltip(target){const el=document.getElementById('run-tooltip');if(!el||!target?.isConnected)return;
 const rect=target.getBoundingClientRect();
 const w=el.offsetWidth||142,h=el.offsetHeight||100;
 const left=Math.max(8,Math.min(window.innerWidth-w-8,rect.left+rect.width/2-w/2));
 let top=rect.top-h-10; if(top<8)top=rect.bottom+10;
 el.style.left=`${left}px`;el.style.top=`${Math.min(top,window.innerHeight-h-8)}px`;
}
function showRunTooltip(target){
 if(!target?.matches?.('.record-dot-hit'))return;
 const el=runTooltipNode();visibleRunDot=target;
 const durationText=target.dataset.runTime||'—';const when=target.dataset.runDate||'';
 const date=new Date(when);const precise=Number.isNaN(date.getTime())?'Unknown date':date.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
 const status=target.dataset.runStatus||'Unknown';
 el.dataset.status=status;
 // text nodes only: no HTML from remote Bungie data is inserted into the tooltip.
 el.replaceChildren();
 const big=document.createElement('strong');big.textContent=durationText;el.appendChild(big);
 const ago=document.createElement('span');ago.className='run-tooltip-ago';ago.textContent=relativeRunTime(when);el.appendChild(ago);
 const dateText=document.createElement('span');dateText.className='run-tooltip-date';dateText.textContent=precise;el.appendChild(dateText);
 const classification=target.dataset.runClass||'';if(classification){const type=document.createElement('span');type.className='run-tooltip-date';type.textContent=classification;el.appendChild(type)}
 const award=target.dataset.runAward||'';
 if(award){const star=document.createElement('span');star.className='run-tooltip-ago';star.textContent='★ Verified '+award;el.appendChild(star)}
 const result=document.createElement('span');result.className='run-tooltip-status';result.textContent=status+' · View report';el.appendChild(result);
 el.classList.add('visible');moveRunTooltip(target);
}
document.addEventListener('pointerover',e=>{const hit=e.target.closest?.('.record-dot-hit');if(hit&&hit!==visibleRunDot)showRunTooltip(hit)});
document.addEventListener('pointerout',e=>{if(visibleRunDot&&e.target.closest?.('.record-dot-hit')===visibleRunDot&&!visibleRunDot.contains(e.relatedTarget))hideRunTooltip()});
document.addEventListener('focusin',e=>{if(e.target.matches?.('.record-dot-hit'))showRunTooltip(e.target)});
document.addEventListener('focusout',e=>{if(e.target.matches?.('.record-dot-hit'))hideRunTooltip()});
document.addEventListener('click',e=>{if(e.target.closest?.('.record-dot-hit'))hideRunTooltip()});
window.addEventListener('scroll',()=>{if(visibleRunDot)moveRunTooltip(visibleRunDot)},{passive:true});
window.addEventListener('resize',()=>{if(visibleRunDot)moveRunTooltip(visibleRunDot)});

function normalizeDungeonText(value){return String(value||'').normalize('NFKD').replace(/[’‘`´]/g,"'").replace(/[^a-zA-Z0-9]+/g,' ').trim().toLowerCase()}
function dungeonAliases(d){const set=new Set([d.name, d.name.replace(/^The\s+/i,''), d.name.replace(/’/g,"'"), d.name.replace(/'/g,''), d.name.replace(/’/g,'')]);if(d.name==='The Shattered Throne')set.add('Shattered Throne');if(d.name==='Warlord’s Ruin'){set.add("Warlord's Ruin");set.add('Warlords Ruin')}if(d.name==='Vesper’s Host')set.add("Vesper's Host");return [...set].map(normalizeDungeonText).filter(Boolean)}
function matchDungeon(activityName){const normalized=normalizeDungeonText(activityName);if(!normalized)return null;for(const d of data){const aliases=dungeonAliases(d);if(aliases.some(alias=>normalized.includes(alias)))return d;}return null}
const VERIFIED_RUN_CACHE_KEY='dungeonhub.pgcr-achievements-v2';
const VERIFIED_RUN_CACHE_MAX=1000;
const verifiedRunCache=new Map();
let verifyProgress={active:false,checked:0,total:0,failed:0};
let verifyGeneration=0;
function cacheKeyForRun(id){const a=liveProfile?.account;return `${a?.membershipType||0}:${a?.membershipId||'0'}:${String(id)}`}
function initVerifiedRunCache(){
 try{const raw=JSON.parse(localStorage.getItem(VERIFIED_RUN_CACHE_KEY)||'[]');
  if(Array.isArray(raw))for(const [key,v] of raw.slice(-VERIFIED_RUN_CACHE_MAX))if(typeof key==='string'&&v&&Array.isArray(v.tags))verifiedRunCache.set(key,v);
 }catch{}
}
function persistVerifiedRunCache(){
 try{const records=[...verifiedRunCache.entries()].slice(-VERIFIED_RUN_CACHE_MAX);
  localStorage.setItem(VERIFIED_RUN_CACHE_KEY,JSON.stringify(records));}catch{}
}
function verifiedTagsForRun(run){return verifiedRunCache.get(cacheKeyForRun(run.instanceId))?.tags||[]}
function primaryAchievementForRun(run){const tags=verifiedTagsForRun(run);return ['sf','solo','flawless'].find(x=>tags.includes(x))||''}
function accurateAchievementFromReport(report,run,account){
 const entries=Array.isArray(report?.entries)?report.entries:[];
 if(entries.length>24)return {tags:[],fullStart:false,status:'anomalous',outcome:'unknown',checked:true};
 const status=report?.activityWasStartedFromBeginning===true?'full_start':
  report?.activityWasStartedFromBeginning===false?'checkpoint':'unknown';
 const memberId=String(account.membershipId),type=String(account.membershipType);
 const person=entries.find(e=>String(e?.characterId||'')===String(run.characterId))||
  entries.find(e=>String(e?.player?.destinyUserInfo?.membershipId||'')===memberId&&
   String(e?.player?.destinyUserInfo?.membershipType||'')===type);
 const completedValue=person?person?.values?.completed?.basic?.value:null;
 const finished=completedValue!==null&&completedValue!==undefined&&Number(completedValue)===1;
 const explicitIncomplete=completedValue!==null&&completedValue!==undefined&&Number(completedValue)===0;
 const outcome=finished?'completed':explicitIncomplete?'incomplete':'unknown';
 const result={tags:[],fullStart:status==='full_start'&&finished,status,outcome,checked:true};
 if(!result.fullStart||!entries.length)return result;
 const accounts=new Set(entries.map(e=>{const u=e?.player?.destinyUserInfo;return u?.membershipId?`${u.membershipType}:${u.membershipId}`:''}).filter(Boolean));
 const solo=accounts.size===1&&entries.every(e=>String(e?.player?.destinyUserInfo?.membershipId||'')===memberId);
 const deathValues=entries.map(e=>e?.values?.deaths?.basic?.value);
 const flawless=deathValues.length>0&&deathValues.every(n=>n!==null&&n!==undefined&&Number.isFinite(Number(n))&&Number(n)===0);
 if(solo&&flawless)result.tags.push('sf');
 else{if(solo)result.tags.push('solo');if(flawless)result.tags.push('flawless')}
 return result;
}
function dotStatusForRun(run){
 const checked=verifiedRunCache.get(cacheKeyForRun(run.instanceId));
 if(checked?.outcome==='completed')return checked.status==='checkpoint'?'checkpoint':'complete';
 if(checked?.outcome==='incomplete')return 'incomplete';
 // A positive completion flag from Bungie's history is a recorded completion.
 if(run.completed)return checked?.status==='checkpoint'?'checkpoint':'complete';
 // No positive completion flag does not prove a failed attempt.
 return 'unknown';
}
function dotStatusLabel(run){
 const value=dotStatusForRun(run);
 return ({checkpoint:'Checkpoint completion',complete:'Completed',incomplete:'Incomplete (PGCR confirmed)',unknown:'Not yet confirmed'})[value];
}

function confirmedFullStart(run){return run?.completed&&verifiedRunCache.get(cacheKeyForRun(run.instanceId))?.fullStart===true;}
function runStartLabel(run){
 const c=verifiedRunCache.get(cacheKeyForRun(run.instanceId));
 return c?.fullStart?'Full-start confirmed':c?.status==='checkpoint'?'Checkpoint completion':c?.status==='unknown'?'Start unknown':'Not checked';
}

function achievementVerificationStatus(){
 if(!verifyProgress.active&&!verifyProgress.checked)return '';
 if(verifyProgress.active)return `<span class="achievement-status" aria-live="polite">Checking activity results: <b>${verifyProgress.checked}/${verifyProgress.total}</b></span>`;
 return `<span class="achievement-status">${verifyProgress.checked-verifyProgress.failed} reports checked${verifyProgress.failed?` · ${verifyProgress.failed} unavailable`:''}</span>`;
}
async function verifyProfileAchievements(version){
 const profile=liveProfile;if(!profile)return;
 const generation=++verifyGeneration;
 // Verify all activity outcomes, not just completed history entries.
 // Incomplete and ambiguous records must not be labeled as confirmed failures.
 const reports=[...new Map(profile.activities.filter(a=>/^\d{6,25}$/.test(String(a.instanceId))&&matchDungeon(a.name))
  .map(a=>[String(a.instanceId),a])).values()];
 const todo=reports.filter(run=>{const c=verifiedRunCache.get(cacheKeyForRun(run.instanceId));return !c||!('outcome' in c)}).slice(0,180);
 verifyProgress={active:todo.length>0,checked:0,total:todo.length,failed:0};
 if(!todo.length){refreshTrackedGuardianAchievements();refreshProfileView();return}
 let index=0,lastRender=0;
 async function worker(){
  while(index<todo.length){
   const run=todo[index++];
   if(version!==requestVersion||generation!==verifyGeneration||liveProfile!==profile)return;
   try{
    const report=await fetchActivityPGCR(run.instanceId);
    if(version!==requestVersion||generation!==verifyGeneration||liveProfile!==profile)return;
    verifiedRunCache.set(cacheKeyForRun(run.instanceId),accurateAchievementFromReport(report,run,profile.account));
   }catch(e){verifyProgress.failed++}
   verifyProgress.checked++;
   if(verifyProgress.checked%12===0||Date.now()-lastRender>2000){persistVerifiedRunCache();refreshProfileView();lastRender=Date.now()}
   await new Promise(r=>setTimeout(r,280));
  }
 }
 // Two requests at a time to avoid flooding Bungie or the public Worker.
 await Promise.all(Array.from({length:Math.min(2,todo.length)},worker));
 if(version!==requestVersion||generation!==verifyGeneration||liveProfile!==profile)return;
 verifyProgress.active=false;persistVerifiedRunCache();refreshTrackedGuardianAchievements();refreshProfileView();
}

function badgeMarkup(label,kind,fastest){
 if(!fastest?.instanceId)return '';
 const runId=String(fastest.instanceId);
 return `<button type="button" class="record-badge ${kind}" onclick="event.stopPropagation();openActivityReport('${runId}')" title="Open fastest verified ${label} run (${duration(fastest.duration)})">★ ${label} ↗</button>`;
}


const DUNGEON_TIMELINE_WINDOW = 20;
// Only the visible 20 dots are in the DOM. The underlying dataset remains fully browsable.
const timelineRunsByDungeon = new Map();
const timelineDistanceFromNewest = new Map();
function timelineStart(dungeonId, total){
 const max = Math.max(0,total-DUNGEON_TIMELINE_WINDOW);
 return Math.max(0,max-Math.min(max,timelineDistanceFromNewest.get(dungeonId)||0));
}
function timelineDotsMarkup(runs){
 if(!runs.length)return '<span class="record-chart-empty">No recorded runs</span>';
 return runs.map((run,i)=>{
   const date=run.date?new Date(run.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Unknown date';
   const award=primaryAchievementForRun(run),awardLabel=({sf:'Solo Flawless',solo:'Solo',flawless:'Flawless'})[award]||'';
   const state=dotStatusForRun(run),resultLabel=dotStatusLabel(run);
   const label=`${date} • ${duration(run.duration)} • ${resultLabel}${awardLabel?' • ★ '+awardLabel:''}${run.instanceId?' • Open activity report':''}`;
   const position=`grid-column:${i%10+1};grid-row:${Math.floor(i/10)+1}`;
   const shared=`class="record-dot-hit ${state}${award?' has-achievement':''}" style="${position}" data-run-time="${escapeHtml(duration(run.duration))}" data-run-date="${escapeHtml(String(run.date||''))}" data-run-status="${escapeHtml(resultLabel)}" data-run-award="${escapeHtml(awardLabel)}" data-run-class="${escapeHtml(runStartLabel(run))}" aria-label="${escapeHtml(label)}"`;
   const star=award?`<span class="record-dot-star ${award}" aria-hidden="true">★</span>`:'';
   return /^\d{6,25}$/.test(String(run.instanceId||''))
      ?`<button type="button" ${shared} onclick="hideRunTooltip();openActivityReport('${run.instanceId}')"><span class="record-dot-pip" aria-hidden="true"></span>${star}</button>`
      :`<span ${shared}><span class="record-dot-pip" aria-hidden="true"></span>${star}</span>`;
 }).join('');
}

function seekDungeonTimeline(input){
 const wrap=input.closest('.record-timeline');if(!wrap)return;
 const id=Number(wrap.dataset.timelineId),runs=timelineRunsByDungeon.get(id)||[];
 const max=Math.max(0,runs.length-DUNGEON_TIMELINE_WINDOW);
 const start=Math.max(0,Math.min(max,Number(input.value)||0));
 timelineDistanceFromNewest.set(id,max-start);
 const segment=runs.slice(start,start+DUNGEON_TIMELINE_WINDOW);
 const chart=wrap.querySelector('.record-chart');
 if(chart){chart.classList.toggle('dense',segment.length>10);chart.innerHTML=`<div class="record-chart-line" aria-hidden="true"></div>${timelineDotsMarkup(segment)}`;}
 const count=wrap.querySelector('.record-timeline-count');if(count)count.textContent=`${start+1}–${Math.min(runs.length,start+DUNGEON_TIMELINE_WINDOW)} / ${runs.length}`;
 const prev=wrap.querySelector('[data-timeline-step="older"]'),next=wrap.querySelector('[data-timeline-step="newer"]');
 if(prev)prev.disabled=start===0;if(next)next.disabled=start===max;
 hideRunTooltip();
}
function stepDungeonTimeline(button,change){
 const range=button.closest('.record-timeline')?.querySelector('.record-timeline-range');if(!range)return;
 const next=Math.max(0,Math.min(Number(range.max),Number(range.value)+change));
 range.value=next;seekDungeonTimeline(range);
}

function dungeonRows(activities,compact){
 // A record card shows the complete recent sample of run results for its dungeon.
 const byName=new Map(data.map(d=>[d.name,{d,runs:[],clears:[],image:CUSTOM_DUNGEON_IMAGES[d.name]||''}]));
 for(const a of activities){
  const match=matchDungeon(a.name);
  if(!match)continue;
  const r=byName.get(match.name);r.runs.push(a);
  if(a.completed)r.clears.push(a);
  if(!r.image && a.image)r.image=a.image; // use Bungie art only if no custom image exists
 }
 let rows=[...byName.values()];
 if(dungeonFilter==='played'&&!compact)rows=rows.filter(x=>x.runs.length>0);
 if(compact)rows=rows.filter(x=>x.runs.length>0).slice(0,8);
 if(!rows.length)return `<div class="empty">No recognized dungeon activities found in the recent Bungie activity sample.</div>`;
 const tile=r=>{
  const done=r.clears;
  const fullStarts=done.filter(confirmedFullStart);
  const full=fullStarts.filter(x=>Number.isFinite(x.duration)&&x.duration>0);
  const fastest=full.length?full.reduce((best,run)=>run.duration<best.duration?run:best):null;
  const latest=done[0]||null;
  const avg=full.length?full.reduce((t,x)=>t+x.duration,0)/full.length:null;
  const fastestByTag=tag=>done.filter(run=>verifiedTagsForRun(run).includes(tag))
   .sort((a,b)=>a.duration-b.duration)[0]||null;
  const tileBadges=[badgeMarkup('Solo Flawless','sf',fastestByTag('sf')),
   badgeMarkup('Solo','solo',fastestByTag('solo')),
   badgeMarkup('Flawless','flawless',fastestByTag('flawless'))].join('');
  const validDate=d=>d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
  const times=[latest?.duration,fastest?.duration,avg].map(n=>Number.isFinite(n)?duration(n):'N/A');

const sorted=[...r.runs].sort((a,b)=>new Date(a.date)-new Date(b.date));
const timelineId=data.indexOf(r.d);
timelineRunsByDungeon.set(timelineId,sorted);
const maxStart=Math.max(0,sorted.length-DUNGEON_TIMELINE_WINDOW);
const windowStart=timelineStart(timelineId,sorted.length);
const sample=sorted.slice(windowStart,windowStart+DUNGEON_TIMELINE_WINDOW);
const timeline=timelineDotsMarkup(sample);
const chartClass=sample.length>10?'record-chart dense':'record-chart';
const canSlide=sorted.length>DUNGEON_TIMELINE_WINDOW;
const scrubber=canSlide?`<div class="record-timeline-scrubber">
  <button type="button" class="record-timeline-step" data-timeline-step="older" onclick="stepDungeonTimeline(this,-10)" aria-label="Earlier ${escapeHtml(r.d.name)} runs" ${windowStart===0?'disabled':''}>‹</button>
  <input type="range" class="record-timeline-range" min="0" max="${maxStart}" value="${windowStart}" step="1" aria-label="Browse ${escapeHtml(r.d.name)} runs, oldest to newest" oninput="seekDungeonTimeline(this)">
  <button type="button" class="record-timeline-step" data-timeline-step="newer" onclick="stepDungeonTimeline(this,10)" aria-label="Later ${escapeHtml(r.d.name)} runs" ${windowStart===maxStart?'disabled':''}>›</button>
 </div><div class="record-timeline-caption"><span class="record-timeline-hint">Older ← → Newer</span><span class="record-timeline-count">${windowStart+1}–${Math.min(sorted.length,windowStart+DUNGEON_TIMELINE_WINDOW)} / ${sorted.length}</span></div>`:
 `<div class="record-timeline-no-slider">${sorted.length?`${sorted.length} run${sorted.length!==1?'s':''} loaded`:'No recent runs'}</div>`;
  const image=r.image?`background-image:linear-gradient(0deg,#0a0b1466,#0a0b1415),url('${r.image}')`:'';
  const bestLink=fastest?.instanceId?`<a class="record-bestlink" href="https://www.bungie.net/en/PGCR/${encodeURIComponent(fastest.instanceId)}" target="_blank" rel="noopener noreferrer" title="Open Bungie activity report">${times[1]} ↗</a>`:`<strong>${times[1]}</strong>`;
  return `<article class="record-tile"><div class="record-tile-cover" style="--c1:${r.d.c1};--c2:${r.d.c2};${image}"><button type="button" class="record-cover-link" data-profile-dungeon="${escapeHtml(r.d.name)}" aria-label="View ${escapeHtml(r.d.name)} activity history"></button>${tileBadges?`<div class="record-badges">${tileBadges}</div>`:''}<small>${r.d.year} · ${escapeHtml(r.d.place)}</small><h3>${escapeHtml(r.d.name)}</h3></div><div class="record-tile-content"><div class="record-chart-row"><div class="record-timeline" data-timeline-id="${timelineId}"><div class="${chartClass}"><div class="record-chart-line" aria-hidden="true"></div>${timeline}</div>${scrubber}</div><div class="record-total"><strong>${done.length}</strong><span>Recorded<br>completions</span><small class="verified-full-count">${fullStarts.length} confirmed full starts</small></div></div><div class="record-times"><div><strong>${times[0]}</strong><span>Recent</span></div><div>${bestLink}<span>Best full start</span>${fastest?`<small class="record-best-date">${escapeHtml(validDate(fastest.date))}</small>`:""}</div><div><strong>${times[2]}</strong><span>Full-start avg</span></div></div></div></article>`;
 };
 const legend=`<div class="run-status-legend" aria-label="Activity timeline colors"><span class="legend-item"><i class="legend-dot" style="--dot:#4fc975"></i>Completed</span><span class="legend-item"><i class="legend-dot" style="--dot:#f0ac42"></i>Checkpoint completion</span><span class="legend-item"><i class="legend-dot" style="--dot:#ff625f"></i>PGCR-confirmed incomplete</span><span class="legend-item"><i class="legend-dot" style="--dot:#8794aa"></i>Not yet confirmed</span></div>`;
 return `${legend}<div class="profile-dungeon-gallery">${rows.map(tile).join('')}</div><p class="subnote">Hover or focus a dot to see its time, age, and status; click for its Bungie-backed report. Drag the slider or use the arrows to browse all currently fetched runs for each dungeon, 20 dots at a time. Green = completed, orange = checkpoint completion, red = PGCR-confirmed incomplete, gray = unconfirmed outcome. For performance, the 180 most recent unchecked reports are verified automatically per visit; older reports can remain gray. Stars and achievement badges are shown only after a Bungie report confirms the run began from the start. Older reports or inaccessible runs may have no star. Recorded completion counts can include checkpoints. Best times and averages only use PGCR-confirmed full starts; this is not official speedrun verification.</p>`;
}
function toHistoryActivity(x,characterId){const raw=x?.activityDetails||{};const values=x?.values||{};
 const count=values.playerCount?.basic?.value??values.playerCount?.basic?.displayValue;
 return {date:x.period,hash:Number(raw.referenceId||raw.directorActivityHash||0),directorHash:Number(raw.directorActivityHash||0),instanceId:String(raw.instanceId||''),duration:Number(values.activityDurationSeconds?.basic?.value??NaN),completed:Number(values.completed?.basic?.value)===1,kills:Number(values.kills?.basic?.value||0),deaths:Number(values.deaths?.basic?.value||0),assists:Number(values.assists?.basic?.value||0),playerCount:count==null?NaN:Number(count),characterId:String(characterId),name:'',image:''};
}
async function resolveAllActivityNames(activities,version){
 const hashes=[...new Set(activities.map(a=>a.hash).filter(Boolean))].filter(h=>!activityNames.has(h));
 for(let i=0;i<hashes.length;i+=4){if(version!==requestVersion||historyScan.cancelled)return;
  await Promise.all(hashes.slice(i,i+4).map(async h=>{await getActivityName(h);if(!activityNames.has(h))activityNames.set(h,`Activity ${h}`)}));
 }
 const alternates=[...new Set(activities.filter(a=>a.directorHash&&a.directorHash!==a.hash&&
 !matchDungeon(activityNames.get(a.hash))).map(a=>a.directorHash))].filter(h=>!activityNames.has(h));
 for(let i=0;i<alternates.length;i+=4){if(version!==requestVersion||historyScan.cancelled)return;
  await Promise.all(alternates.slice(i,i+4).map(h=>getActivityName(h)));
 }
 for(const a of activities){
   const first=activityNames.get(a.hash),alternate=activityNames.get(a.directorHash);
   a.name=matchDungeon(first)?first:matchDungeon(alternate)?alternate:(first||alternate||`Dungeon activity (${a.hash||'unknown'})`);
   a.image=activityArt.get(a.hash)||activityArt.get(a.directorHash)||'';
 }
}
async function bungieHistoryPage(type,id,characterId,page){
 const uri=`/Destiny2/${type}/Account/${id}/Character/${characterId}/Stats/Activities/?mode=82&count=${HISTORY_PAGE_SIZE}&page=${page}`;
 let lastError=null;for(let attempt=0;attempt<3;attempt++){try{return await bungie(uri)}catch(e){lastError=e;if(attempt<2)await new Promise(r=>setTimeout(r,750*(attempt+1)))} }
 throw lastError;
}
async function loadAccount(type,id,version,knownAccount){
 try{
  const result=await bungie(`/Destiny2/${type}/Profile/${id}/?components=100,200`);
  if(version!==requestVersion)return;
  const profileData=result?.profile?.data||{},userInfo=profileData.userInfo||{};
  const chars=Object.entries(result?.characters?.data||{});
  if(!chars.length)throw new Error('No public Destiny 2 characters found for this Guardian.');
  const memberships={1:'Xbox',2:'PlayStation',3:'Steam',4:'Blizzard',5:'Stadia',6:'Epic Games',10:'Demon',254:'Bungie'};
  const characters=chars.map(([characterId,c])=>({characterId,classType:c.classType,classLabel:['Titan','Hunter','Warlock'][c.classType]||'Guardian',light:c.light,raceLabel:['Human','Awoken','Exo'][c.raceType]||'',genderLabel:['Male','Female'][c.genderType]||''}));
  const resolvedName=userInfo.bungieGlobalDisplayName?`${userInfo.bungieGlobalDisplayName}#${String(userInfo.bungieGlobalDisplayNameCode).padStart(4,'0')}`:(userInfo.displayName||playerName||'Guardian');
  playerName=resolvedName;
  liveProfile={account:knownAccount||{membershipId:String(id),membershipType:Number(type)},activities:[],characters,displayName:resolvedName,memberType:memberships[type]||'Destiny 2'};
  liveLoading=false;liveError='';
  historyScan={active:true,complete:false,cancelled:false,loaded:0,pages:0,doneCharacters:0,totalCharacters:chars.length,issues:[],capped:false};
  refreshProfileView();
  const all=[],seen=new Set();let lastPaint=0;
  async function doCharacter(characterId){
   let ended=false;
   for(let page=0;page<MAX_HISTORY_PAGES;page++){
    if(version!==requestVersion||historyScan.cancelled)return;
    let result;
    try{result=await bungieHistoryPage(type,id,characterId,page)}catch(e){historyScan.issues.push(`${characterId.slice(-4)}: ${String(e.message||e).slice(0,75)}`);break;}
    if(version!==requestVersion||historyScan.cancelled)return;
    const list=Array.isArray(result?.activities)?result.activities:[];if(!list.length){ended=true;break;}
    let added=0;
    for(const x of list){const a=toHistoryActivity(x,characterId);if(!a.date)continue;
     const identity=a.instanceId||`${characterId}:${a.date}:${a.hash}`;if(seen.has(identity))continue;seen.add(identity);all.push(a);added++;
    }
    historyScan.pages++;historyScan.loaded=all.length;
    if(page===0||page%4===3||Date.now()-lastPaint>2600){
     await resolveAllActivityNames(all,version);if(version!==requestVersion||historyScan.cancelled)return;
     all.sort((a,b)=>new Date(b.date)-new Date(a.date));liveProfile.activities=[...all];lastPaint=Date.now();refreshProfileView();
    }else updateScanStatus();
    if(list.length<HISTORY_PAGE_SIZE){ended=true;break;}
    if(added===0){historyScan.issues.push(`${characterId.slice(-4)}: repeated history page`);ended=true;break;}
   }
   if(!ended&&version===requestVersion&&!historyScan.cancelled){historyScan.capped=true}
   historyScan.doneCharacters++;updateScanStatus();
  }
  // Two concurrent character history scans keeps large accounts usable and reduces API pressure.
  for(let i=0;i<chars.length;i+=2){await Promise.all(chars.slice(i,i+2).map(([charId])=>doCharacter(charId)));if(version!==requestVersion||historyScan.cancelled)break;}
  if(version!==requestVersion)return;
  await resolveAllActivityNames(all,version);if(version!==requestVersion)return;
  all.sort((a,b)=>new Date(b.date)-new Date(a.date));liveProfile.activities=[...all];
  const recognized=all.filter(a=>matchDungeon(a.name)).length;
  if(recognized>0)rememberGuardian({name:resolvedName,membershipId:String(id),membershipType:Number(type),statsCount:recognized});
  else{try{const previous=readRecentGuardians().filter(x=>!(x.membershipId===String(id)&&x.membershipType===Number(type)));localStorage.setItem(GUARDIAN_HISTORY_KEY,JSON.stringify(previous))}catch{}}
  historyScan.active=false;historyScan.complete=!historyScan.cancelled&&!historyScan.capped&&!historyScan.issues.length;historyScan.loaded=all.length;
  if(all.length)saveTrackedGuardian(liveProfile,'profile');
  refreshProfileView();
  if(all.some(a=>matchDungeon(a.name)))void verifyProfileAchievements(version);
 }catch(e){if(version!==requestVersion)return;liveError=e.message||String(e);liveLoading=false;historyScan.active=false;refreshProfileView();}
}
async function bungie(path,options={}){
 let apiResponse;
 try{
   apiResponse=await fetch(BUNGIE_API_BASE+path,{
     method:options.method||'GET',
     body:options.body,
     headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{})}
   });
 }catch(e){throw new Error('Could not connect to Bungie. Check your connection and try again.');}
 let json;
 try{json=await apiResponse.json();}catch(e){throw new Error('DungeonHub API returned an invalid response.');}
 if(!apiResponse.ok)throw new Error(json?.Message||json?.error||`DungeonHub API HTTP ${apiResponse.status}`);
 if(json.ErrorCode!==1)throw new Error(json.Message||json.ErrorStatus||'Bungie returned an error');
 return json.Response;
}
async function getActivityName(hash){if(!hash)return 'Unknown dungeon';if(activityNames.has(hash))return activityNames.get(hash);try{const def=await bungie(`/Destiny2/Manifest/DestinyActivityDefinition/${hash}/`);let title=def?.displayProperties?.name||def?.originalDisplayProperties?.name||`Activity ${hash}`;activityNames.set(hash,title);if(def?.pgcrImage && /^\/[a-zA-Z0-9_\/.-]+$/.test(def.pgcrImage))activityArt.set(hash,'https://www.bungie.net'+def.pgcrImage);return title;}catch(e){return `Activity ${hash}`;}}
async function loadGuardian(name,version){
 try{
  const m=name.match(/^(.+)#(\d{1,4})$/);
  if(!m)throw new Error('Enter a complete Bungie Name to open directly, or select a matching result below.');
  const memberships=await bungie('/Destiny2/SearchDestinyPlayerByBungieName/-1/',{method:'POST',body:JSON.stringify({displayName:m[1],displayNameCode:Number(m[2])})});
  if(version!==requestVersion)return;
  if(!memberships?.length)throw new Error('That exact Bungie Name was not found. Here are similar public names, if available.');
  const account=memberships[0];openGuardian(account.membershipType,account.membershipId,name,account);
 }catch(e){
  if(version!==requestVersion)return;
  liveError=e.message||String(e);liveLoading=false;lookupError=liveError;
  await fetchLookupSuggestions(name,true);
 }
}


// Real Bungie Name prefix suggestions. Results are account memberships, never fabricated Guardians.
function sanitizeGuardianRecord(record){
 const id=String(record?.membershipId||''); const type=Number(record?.membershipType);
 const name=String(record?.name||'').slice(0,100);
 return /^\d{10,25}$/.test(id)&&Number.isInteger(type)&&type>=1&&type<=254&&name?{name,membershipId:id,membershipType:type}:null;
}
function readRecentGuardians(){
 try{
  const list=JSON.parse(localStorage.getItem(GUARDIAN_HISTORY_KEY)||'[]');
  return Array.isArray(list)?list.filter(x=>x?.hasDungeonStats===true&&Number(x?.statsCount)>0)
   .map(x=>({...sanitizeGuardianRecord(x),hasDungeonStats:true,statsCount:Number(x.statsCount)}))
   .filter(x=>x.name&&x.membershipId).slice(0,6):[];
 }catch{return []}
}
function rememberGuardian(record){
 const safe=sanitizeGuardianRecord(record);
 if(!safe||!(Number(record?.statsCount)>0))return;
 try{const before=readRecentGuardians().filter(x=>!(x.membershipId===safe.membershipId&&x.membershipType===safe.membershipType));
 localStorage.setItem(GUARDIAN_HISTORY_KEY,JSON.stringify([{...safe,hasDungeonStats:true,statsCount:Number(record.statsCount)},...before].slice(0,6)))}catch{}
}
function clearStoredGuardianHistory(){
 try{localStorage.removeItem(GUARDIAN_HISTORY_KEY)}catch{}
 renderHeaderResults();updateLookupResults();
 const status=document.getElementById('historyClearStatus');
 if(status)status.textContent='Recent profiles cleared from this browser.';
}
function matchSearchResult(r){
 if(!r||typeof r!=='object')return null;
 const base=String(r.bungieGlobalDisplayName||'').trim();if(!base)return null;
 const code=r.bungieGlobalDisplayNameCode;
 const name=base+(code===undefined||code===null?'':'#'+String(code).padStart(4,'0'));
 const members=Array.isArray(r.destinyMemberships)?r.destinyMemberships.filter(x=>x&&/^\d{10,25}$/.test(String(x.membershipId||''))):[];
 if(!members.length)return null; // No Destiny profile to open
 const active=members.find(x=>Number(x.crossSaveOverride)>0&&Number(x.crossSaveOverride)===Number(x.membershipType))||members.find(x=>Number(x.membershipType)===3)||members[0];
 return sanitizeGuardianRecord({name,membershipId:active.membershipId,membershipType:active.membershipType});
}
function similarNameRank(item,term){const name=item.name.toLowerCase();const query=String(term||'').toLowerCase();const prefix=query.split('#')[0];return name===query?0:name.startsWith(query)?1:name.startsWith(prefix+'#')?2:name.startsWith(prefix)?3:name.includes(prefix)?4:5}
async function getPrefixResults(prefix){
 const key=String(prefix||'').trim().slice(0,40).toLowerCase();if(key.length<2)return [];
 const cached=guardianPrefixCache.get(key);if(cached&&Date.now()-cached.at<180000)return cached.list;
 const result=await bungie('/User/Search/GlobalName/0/',{method:'POST',body:JSON.stringify({displayNamePrefix:key})});
 const raw=Array.isArray(result?.searchResults)?result.searchResults:[];
 const ids=new Set();const list=[];
 for(const entry of raw){const item=matchSearchResult(entry);if(!item)continue;const unique=`${item.membershipType}:${item.membershipId}`;if(ids.has(unique))continue;ids.add(unique);list.push(item)}
 guardianPrefixCache.set(key,{at:Date.now(),list});
 if(guardianPrefixCache.size>35)guardianPrefixCache.delete(guardianPrefixCache.keys().next().value);
 return list;
}
async function getGuardianSuggestions(query,broaden=false){
 const parts=String(query||'').trim().match(/^(.+?)(?:#(\d{0,4}))?$/);if(!parts)return [];
 const stem=parts[1].trim();if(stem.length<2)return [];
 let list=await getPrefixResults(stem);
 if(!list.length&&broaden&&stem.length>=5)list=await getPrefixResults(stem.slice(0,Math.max(3,stem.length-2)));
 const wantedCode=parts[2]||'';
 const filtered=list.filter(item=>!wantedCode||item.name.split('#')[1]?.startsWith(wantedCode));
 return filtered.sort((a,b)=>similarNameRank(a,query)-similarNameRank(b,query)||a.name.localeCompare(b.name)).slice(0,12);
}
function guardianRowHtml(item,index,source){
 const label=escapeHtml(String(item.name));const initial=escapeHtml(item.name.slice(0,1).toUpperCase());
 const provider=({1:'Xbox',2:'PlayStation',3:'Steam',6:'Epic Games'})[item.membershipType]||'Destiny 2';
 return `<button type="button" class="guardian-suggestion" onclick="chooseSuggestedGuardian(${index},'${source}')" aria-label="Open ${label} profile"><span class="suggestion-avatar">${initial}</span><span class="suggestion-meta"><b>${label}</b><small>${provider} · public Guardian profile</small></span><span class="suggestion-open">View profile ↗</span></button>`;
}
function lookupResultsHtml(){
 const query=lookupQuery.trim();
 if(!query){const recent=readRecentGuardians();return recent.length?`<section class="lookup-results"><div class="lookup-results-head"><h2>Recently viewed Guardians</h2><small>Saved on this device</small></div><div class="guardian-suggestion-list">${recent.map((r,i)=>guardianRowHtml(r,i,'recent')).join('')}</div></section>`:'<div class="lookup-state">Type at least two letters to browse matching Bungie Names.</div>'}
 if(lookupPhase==='typing')return '<div class="lookup-state">Enter at least two letters to find Guardians.</div>';
 if(lookupPhase==='loading'||lookupPhase==='checking')return `<section class="lookup-results"><div class="lookup-state">${lookupPhase==='checking'?'Checking that Bungie Name…':'Searching Bungie for matching Guardians…'}</div></section>`;
 const notice=lookupError?`<p class="lookup-alert">${escapeHtml(lookupError)}</p>`:'';
 if(lookupMatches.length)return `<section class="lookup-results"><div class="lookup-results-head"><h2>Matching Guardians</h2><small>${lookupMatches.length} result${lookupMatches.length===1?'':'s'} · Bungie Name search</small></div>${notice}<div class="guardian-suggestion-list">${lookupMatches.map((r,i)=>guardianRowHtml(r,i,'lookup')).join('')}</div><p class="lookup-caption">Results are based on Bungie's available public name matches. Select a result to open its dedicated profile.</p></section>`;
 return `<section class="lookup-results"><div class="lookup-state">${notice||'No public matching Guardian found. Check spelling, or try the beginning of the name without the # code.'}</div></section>`;
}
function updateLookupResults(){const node=document.getElementById('lookupResults');if(node)node.innerHTML=lookupResultsHtml()}
async function fetchLookupSuggestions(query,broaden=false){
 const seq=++lookupSeq; lookupPhase='loading';updateLookupResults();
 try{const list=await getGuardianSuggestions(query,broaden);if(seq!==lookupSeq)return;lookupMatches=list;lookupPhase='results';updateLookupResults()}
 catch(error){if(seq!==lookupSeq)return;lookupMatches=[];lookupPhase='error';lookupError=error.message||'Bungie Name search unavailable';updateLookupResults()}
}
function scheduleLookup(raw){
 lookupQuery=String(raw||'').trimStart().slice(0,70);lookupError='';lookupMatches=[];clearTimeout(lookupDelay);
 ++lookupSeq;lookupPhase=lookupQuery.split('#')[0].trim().length<2?'typing':'loading';updateLookupResults();
 if(lookupPhase==='loading')lookupDelay=setTimeout(()=>fetchLookupSuggestions(lookupQuery),420);
}
function chooseSuggestedGuardian(index,source){
 const list=source==='recent'?readRecentGuardians():source==='header'?headerMatches:source==='headerRecent'?filteredHeaderRecent():lookupMatches;
 const item=list[Number(index)];const valid=sanitizeGuardianRecord(item);if(!valid)return;
 clearTimeout(lookupDelay);clearTimeout(headerDelay);++lookupSeq;++headerSeq;
 lookupQuery=valid.name;lookupMatches=[];lookupError='';lookupPhase='idle';
 headerMatches=[];headerQuery='';document.getElementById('searchResults')?.classList.add('hidden');
 const header=document.getElementById('globalSearch');if(header)header.value='';
 openGuardian(valid.membershipType,valid.membershipId,valid.name,valid);
}
// V12: Most recently opened Guardian profiles, stored only on this browser.
function filteredHeaderRecent(){
 const term=headerQuery.trim().toLowerCase();
 const recent=readRecentGuardians();
 return term?recent.filter(r=>r.name.toLowerCase().includes(term)):recent;
}
function clearHeaderRecent(){clearStoredGuardianHistory()}
function renderHeaderResults(){
 const res=document.getElementById('searchResults');if(!res)return;
 const value=headerQuery.trim();
 const recent=filteredHeaderRecent();
 let html='';
 if(recent.length){
  html+=`<div class="header-lookup-title"><span>${value?'Previously viewed matches':'Recently viewed Guardians'}</span><button class="header-recent-clear" type="button" id="clearHeaderRecent">Clear history</button></div>`;
  html+=recent.map((item,i)=>`<button type="button" class="header-recent-item" onclick="chooseSuggestedGuardian(${i},'headerRecent')"><span class="header-recent-avatar" aria-hidden="true">${escapeHtml(item.name.slice(0,1).toUpperCase())}</span><span class="header-recent-name">${escapeHtml(item.name)}</span><span class="header-recent-arrow">View ↗</span></button>`).join('');
 }
 if(!value){
  if(!recent.length)html='<div class="header-empty-state">Your recently opened Guardian profiles will show here. Search for a Bungie Name to get started.</div>';
  res.innerHTML=html;res.classList.remove('hidden');
  res.querySelector('#clearHeaderRecent')?.addEventListener('click',clearHeaderRecent);
  return;
 }
 const dungeons=data.filter(d=>d.name.toLowerCase().includes(value.toLowerCase())).slice(0,4);
 if(dungeons.length)html+='<div class="header-lookup-title">Dungeons</div>';
 html+=dungeons.map(d=>`<button data-dungeon="${escapeHtml(d.name)}">✧ ${escapeHtml(d.name)} <small style="float:right">Dungeon</small></button>`).join('');
 const raidMatches=RAID_CATALOG.map((raid,i)=>({raid,i})).filter(({raid})=>raid.name.toLowerCase().includes(value.toLowerCase())).slice(0,4);
 if(raidMatches.length)html+='<div class="header-lookup-title">Raids</div>';
 html+=raidMatches.map(({raid,i})=>`<button data-raid-index="${i}">${escapeHtml(raid.name)} <small style="float:right">Raid</small></button>`).join('');
 const queryStem=value.split('#')[0].trim();
 if(queryStem.length>=2){
  html+='<div class="header-lookup-title">Matching Bungie Names</div>';
  const cachedIds=new Set(recent.map(r=>`${r.membershipType}:${r.membershipId}`));
  const newMatches=headerMatches.map((x,i)=>({x,i})).filter(({x})=>!cachedIds.has(`${x.membershipType}:${x.membershipId}`)).slice(0,6);
  html+=newMatches.map(({x,i})=>`<button class="header-guardian" onclick="chooseSuggestedGuardian(${i},'header')"><span class="header-recent-avatar" aria-hidden="true">${escapeHtml(x.name.slice(0,1).toUpperCase())}</span><span class="header-recent-name">${escapeHtml(x.name)}</span><span class="header-recent-arrow">View ↗</span></button>`).join('');
  if(!newMatches.length)html+=`<div class="lookup-state">${headerPhase==='loading'?'Searching Bungie…':headerPhase==='error'?'Bungie search unavailable':recent.length?'No additional matches':'No matches yet'}</div>`;
 }
 html+='<button id="searchGuardian" class="header-guardian">⌕ &nbsp; See all Guardian matches ↗</button>';
 res.innerHTML=html;res.classList.remove('hidden');
 res.querySelector('#clearHeaderRecent')?.addEventListener('click',clearHeaderRecent);
 res.querySelectorAll('[data-dungeon]').forEach(b=>b.addEventListener('click',()=>{res.classList.add('hidden');openDungeon(b.dataset.dungeon)}));
 res.querySelectorAll('[data-raid-index]').forEach(b=>b.addEventListener('click',()=>{res.classList.add('hidden');egOpenRaid(Number(b.dataset.raidIndex))}));
 res.querySelector('#searchGuardian')?.addEventListener('click',()=>showProfile(headerQuery));
}
function scheduleHeaderLookup(query){
 headerQuery=String(query||'').trimStart().slice(0,70);clearTimeout(headerDelay);headerMatches=[];
 const seq=++headerSeq;headerPhase=headerQuery.split('#')[0].trim().length<2?'idle':'loading';renderHeaderResults();
 if(headerPhase!=='loading')return;
 headerDelay=setTimeout(async()=>{try{const matches=await getGuardianSuggestions(headerQuery);if(seq!==headerSeq)return;headerMatches=matches;headerPhase='results';renderHeaderResults()}catch{if(seq!==headerSeq)return;headerMatches=[];headerPhase='error';renderHeaderResults()}},430);
}

function showProfile(name){
 playerName=String(name||'').trim();if(!playerName)return;
 lookupQuery=playerName;lookupMatches=[];lookupError='';clearTimeout(lookupDelay);++lookupSeq;
 liveProfile=null;liveError='';liveLoading=true;const version=++requestVersion;
 document.getElementById('globalSearch').value='';headerQuery='';headerMatches=[];
 document.getElementById('searchResults').classList.add('hidden');
 lookupPhase=/^.+#\d{1,4}$/.test(playerName)?'checking':'loading';
 navigate('profile');
 if(lookupPhase==='checking')loadGuardian(playerName,version);
 else{liveLoading=false;fetchLookupSuggestions(playerName,true)}
}

function openDungeon(name){
 const selected=data.find(d=>d.name===name);
 if(!selected)return;
 // No old promotional/demo dungeon popup. Show this dungeon's shared records instead.
 chosen=selected.name;
 metric='clears';
 navigate('leaderboards');
}
function hideModal(){const modal=document.getElementById('modal');if(modal)modal.classList.add('hidden')}
function escapeHtml(t){return t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
document.addEventListener('click',e=>{const cover=e.target.closest?.('[data-profile-dungeon]');if(cover)openDungeonProfile(cover.dataset.profileDungeon)});
initVerifiedRunCache();applyTheme(currentTheme());
const search=document.getElementById('globalSearch');
search.addEventListener('focus',()=>{headerQuery=search.value;renderHeaderResults()});
search.addEventListener('click',()=>{headerQuery=search.value;renderHeaderResults()});
search.addEventListener('input',()=>scheduleHeaderLookup(search.value));
search.addEventListener('keydown',e=>{if(e.key==='Escape'){document.getElementById('searchResults').classList.add('hidden');search.blur();return}if(e.key==='ArrowDown'){const first=document.getElementById('searchResults').querySelector('button.header-recent-item,button.header-guardian');if(first){e.preventDefault();first.focus()}return}if(e.key==='Enter'){e.preventDefault();const match=data.find(d=>d.name.toLowerCase()===search.value.toLowerCase());if(match){document.getElementById('searchResults').classList.add('hidden');openDungeon(match.name)}else showProfile(search.value)}});
document.addEventListener('click',e=>{if(!e.target.closest('.searchwrap'))document.getElementById('searchResults').classList.add('hidden')});
window.addEventListener('popstate',()=>{
 const u=new URL(location.href);const pgcr=u.searchParams.get('pgcr');const p=u.searchParams.get('profile');
 if(pgcr&&/^\d{6,25}$/.test(pgcr)){openActivityReport(pgcr,{skipHistory:true});return;}
 reportGeneration++;activeReportId='';
 const match=p?.match(/^(\d+)-(\d+)$/);
 if(match){const dungeon=u.searchParams.get('dungeon');selectedProfileDungeon=data.find(d=>d.name===dungeon)?.name||'';if(liveProfile&&String(liveProfile.account?.membershipId)===match[2]){current=selectedProfileDungeon?'dungeonprofile':'guardian';document.getElementById('breadcrumb').textContent=selectedProfileDungeon?'Dungeon History':'Guardian Profile';render()}else{openGuardian(match[1],match[2],null,null,!!selectedProfileDungeon)}}else if(['raids','pantheon','lowmans','raid-detail'].includes(u.searchParams.get('view'))){current=u.searchParams.get('view');egSelectedRaidSlug=u.searchParams.get('raid')||'';document.getElementById('breadcrumb').textContent=current==='raid-detail'?'Raid Records':current[0].toUpperCase()+current.slice(1);document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.page===current||(current==='raid-detail'&&n.dataset.page==='raids')));render()}else if(u.searchParams.get('view')==='leaderboards'){chosen=data.find(d=>d.name===u.searchParams.get('dungeon'))?.name||'All Dungeons';current='leaderboards';document.getElementById('breadcrumb').textContent='Leaderboards';render()}else if(u.searchParams.get('view')==='profile'){current='profile';document.getElementById('breadcrumb').textContent='Player Lookup';render()}else{current='overview';document.getElementById('breadcrumb').textContent='Overview';render()}
});
const startingURL=new URL(location.href);const requestedReport=startingURL.searchParams.get('pgcr');const requestedProfile=startingURL.searchParams.get('profile');
if(requestedReport&&/^\d{6,25}$/.test(requestedReport))openActivityReport(requestedReport,{skipHistory:true});
else if(requestedProfile){const match=requestedProfile.match(/^(\d+)-(\d+)$/);if(match)openGuardian(match[1],match[2],null,null,!!startingURL.searchParams.get('dungeon'));else render();}else if(['raids','pantheon','lowmans','raid-detail'].includes(startingURL.searchParams.get('view'))){current=startingURL.searchParams.get('view');egSelectedRaidSlug=startingURL.searchParams.get('raid')||'';document.getElementById('breadcrumb').textContent=current==='raid-detail'?'Raid Records':current[0].toUpperCase()+current.slice(1);document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.page===current||(current==='raid-detail'&&n.dataset.page==='raids')));render();}else if(startingURL.searchParams.get('view')==='leaderboards'){const wanted=startingURL.searchParams.get('dungeon');chosen=data.find(d=>d.name===wanted)?.name||'All Dungeons';current='leaderboards';document.getElementById('breadcrumb').textContent='Leaderboards';document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.page==='leaderboards'));render();}else if(startingURL.searchParams.get('view')==='profile'){current='profile';document.getElementById('breadcrumb').textContent='Player Lookup';document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.page==='profile'));render();}else {render();}
