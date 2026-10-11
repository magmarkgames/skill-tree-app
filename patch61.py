from pathlib import Path
p=Path('/mnt/data/bodypath-dev-01161')
app=p/'app.js';s=app.read_text()
def replace1(old,new):
 global s
 assert old in s, old[:110]
 s=s.replace(old,new,1)

replace1('  journeyStandardTotal: 0,','  journeyStandardTotal: 0,\n  journeyStars: {},')
replace1('  wall: { label: "Wall", shortLabel: "Wall", color: "#6C9CFF" },','  wall: { label: "Wall", shortLabel: "Wall", color: "#6C9CFF" },\n  knee: { label: "Knee", shortLabel: "Knee", color: "#A994FF" },')
replace1('  wall: 1,\n  incline: 1.5,','  wall: 1,\n  knee: 1.25,\n  incline: 1.5,')
replace1('  wall: null,\n  wide:', '  wall: null,\n  knee: null,\n  wide:')
replace1('    wall: "variant-wall-v1134.webp",','    wall: "variant-wall-v1134.webp",\n    knee: "variant-knee-v01161.svg",')
replace1('    challengeCompletions: value?.challengeCompletions && typeof value.challengeCompletions === "object" ? value.challengeCompletions : {},','    challengeCompletions: value?.challengeCompletions && typeof value.challengeCompletions === "object" ? value.challengeCompletions : {},\n    journeyStars: value?.journeyStars && typeof value.journeyStars === "object" ? Object.fromEntries(Object.entries(value.journeyStars).filter(([k,v]) => /^([AHKSW]\\d+)$/.test(k) && Number.isFinite(Number(v))).map(([k,v])=>[k,Math.max(0, Math.min(3, Math.floor(Number(v))))])) : {},')
replace1('appVersion: "0.11.60"','appVersion: "0.11.61"')
replace1('let activeChallengeId = null;','let activeChallengeId = null;\nlet activeJourneyLevelId = null;')
replace1('  activeChallengeId = null;\n  countdownActive = false;','  activeChallengeId = null;\n  activeJourneyLevelId = null;\n  countdownActive = false;')
replace1('  const challengeWasActive = activeChallengeId;\n  let challengeResult = null;', '  const challengeWasActive = activeChallengeId;\n  const journeyWasActive = activeJourneyLevelId;\n  let journeyResult = null;\n  let challengeResult = null;')
replace1('  if (assessmentWasActive) {\n    progress.entrySetupDone = true;','  if (journeyWasActive) {\n    const level = BP61_LEVELS[journeyWasActive];\n    if (level) {\n      journeyResult = evaluateBP61Level(level, sets);\n      if (journeyResult.stars > 0) {\n        progress.journeyStars = progress.journeyStars || {};\n        progress.journeyStars[level.id] = Math.max(Number(progress.journeyStars[level.id]) || 0, journeyResult.stars);\n      }\n    }\n    activeJourneyLevelId = null;\n  }\n\n  if (assessmentWasActive) {\n    progress.entrySetupDone = true;')
replace1('  if (assessmentWasActive) addSuccessLine(`⚡ Assessment complete', '  if (journeyWasActive && BP61_LEVELS[journeyWasActive]) {\n    const level = BP61_LEVELS[journeyWasActive];\n    addSuccessLine(`${journeyResult?.stars ? "★".repeat(journeyResult.stars) + "☆".repeat(3 - journeyResult.stars) : "☆☆☆"} ${level.title} · ${journeyResult?.stars ? "Challenge progress saved" : "Try again to earn stars"}`, !!journeyResult?.stars);\n  }\n  if (assessmentWasActive) addSuccessLine(`⚡ Assessment complete')
replace1('function isV012VariantAvailable(variant) {\n  // v0.11.59 alpha test: all Push-Up variants are intentionally available.\n  return Boolean(VARIANT_META[variant]);\n}', '''function isV012VariantAvailable(variant) {
  if (!VARIANT_META[variant]) return false;
  const required = V012_VARIANT_UNLOCK_RANK[variant];
  // Previously trained variants remain usable when importing old saves.
  const legacy = progress?.variantStats?.[variant];
  if ((Number(legacy?.max) || 0) > 0 || (Number(legacy?.total) || 0) > 0) return true;
  if (!required) return false;
  return isV012RankAtLeast(getV012CurrentRankName(), required);
}''')
old='''const V012_VARIANT_UNLOCK_RANK = {
  standard: "Starter",
  wall: "Starter",
  incline: "Starter",
  wide: "Holz",
  diamond: "Stein",
  military: "Silber",
  decline: "Gold",
  pike: "Gold",
  explosive: "Platin",
  archer: "Platin",
  handstand: "Diamant II",
  pseudoPlanche: "Diamant III"
};'''
new='''const V012_VARIANT_UNLOCK_RANK = {
  standard: "Starter", wall: "Starter", incline: "Starter",
  knee: "Holz", wide: "Stein", pike: "Bronze",
  diamond: "Silber", military: "Silber", decline: "Gold",
  explosive: "Gold", archer: "Platin", handstand: "Diamant II",
  pseudoPlanche: "Diamant III"
};'''
replace1(old,new)

# replace BP60 rendering block with new v61 journey implementation
start=s.index('// v0.11.60 — connected, bottom-up Journey (11 milestones until Bronze).')
end=s.index('function syncTreeCanvasHeight() {',start)
bp61=r'''// BodyPath v0.11.61 — 19 real, replayable Journey levels.
// Each level has one lifetime core goal and two optional single-session bonuses.
// Existing v0.11.60 rank logic remains the authority for the three ranks.
function bp61(id,title,variant,kind,core,bonus2,bonus3) {
  return {id,title,variant,kind,core,bonus2,bonus3};
}
const BP61_LEVELS = Object.fromEntries([
  bp61('A1','First Wall','wall','variant',{type:'max',reps:1},{type:'max',reps:3},{type:'sets',count:2,reps:3}),
  bp61('A2','Wall Builder','wall','variant',{type:'max',reps:5},{type:'max',reps:8},{type:'sets',count:2,reps:8}),
  bp61('A3','First Incline','incline','variant',{type:'max',reps:1},{type:'max',reps:3},{type:'sets',count:2,reps:3}),
  bp61('A4','Incline Builder','incline','variant',{type:'max',reps:3},{type:'max',reps:5},{type:'sets',count:2,reps:5}),
  bp61('A5','First Push-Up','standard','power',{type:'max',reps:1},{type:'max',reps:2},{type:'max',reps:3}),
  bp61('H1','Double Up','standard','power',{type:'max',reps:2},{type:'max',reps:3},{type:'sets',count:2,reps:3}),
  bp61('H2','First Five','standard','volume',{type:'total',reps:5},{type:'session',reps:5},{type:'sets',count:2,reps:3}),
  bp61('H3','Triple Up','standard','power',{type:'max',reps:3},{type:'max',reps:4},{type:'sets',count:2,reps:4}),
  bp61('H4','First Fifteen','standard','volume',{type:'total',reps:15},{type:'session',reps:8},{type:'sets',count:2,reps:5}),
  bp61('K1','First Knee','knee','variant',{type:'max',reps:1},{type:'max',reps:5},{type:'sets',count:2,reps:5}),
  bp61('K2','Knee Builder','knee','variant',{type:'max',reps:5},{type:'max',reps:10},{type:'sets',count:2,reps:10}),
  bp61('S1','Five Strong','standard','power',{type:'max',reps:5},{type:'max',reps:6},{type:'sets',count:2,reps:6}),
  bp61('S2','Thirty Total','standard','volume',{type:'total',reps:30},{type:'session',reps:10},{type:'sets',count:2,reps:8}),
  bp61('S3','Seven Strong','standard','power',{type:'max',reps:7},{type:'max',reps:9},{type:'sets',count:2,reps:9}),
  bp61('S4','Sixty Total','standard','volume',{type:'total',reps:60},{type:'session',reps:15},{type:'sets',count:3,reps:6}),
  bp61('S5','Double Digits','standard','power',{type:'max',reps:10},{type:'max',reps:12},{type:'sets',count:2,reps:10}),
  bp61('S6','Century Club','standard','volume',{type:'total',reps:100},{type:'session',reps:25},{type:'sets',count:3,reps:10}),
  bp61('W1','First Wide','wide','variant',{type:'max',reps:1},{type:'max',reps:3},{type:'sets',count:2,reps:3}),
  bp61('W2','Wide Builder','wide','variant',{type:'max',reps:3},{type:'max',reps:5},{type:'sets',count:2,reps:5})
].map(level => [level.id,level]));

// Bottom-up coordinates, 360-wide viewBox. 'unlock' is a reward, not a 20th level.
const BP61_LAYOUT = [
  {id:'start',kind:'start',x:175,y:2450},
  {id:'A1',x:267,y:2320},{id:'A2',x:267,y:2207},
  {id:'A3',x:267,y:2094},{id:'A4',x:267,y:1981},
  {id:'A5',x:175,y:1835},
  {id:'wood',kind:'rank',rank:'Holz',x:175,y:1703},
  {id:'H1',x:86,y:1549},{id:'H2',x:257,y:1549},
  {id:'H3',x:86,y:1399},{id:'H4',x:257,y:1399},
  {id:'K1',x:324,y:1248},{id:'K2',x:324,y:1132},
  {id:'stone',kind:'rank',rank:'Stein',x:175,y:1234},
  {id:'S1',x:85,y:1086},{id:'S2',x:267,y:1086},
  {id:'W1',x:176,y:973},
  {id:'S3',x:85,y:911},{id:'S4',x:267,y:911},
  {id:'W2',x:176,y:788},
  {id:'S5',x:85,y:730},{id:'S6',x:267,y:730},
  {id:'bronze',kind:'rank',rank:'Bronze',x:175,y:567},
  {id:'pike',kind:'reward',variant:'pike',x:175,y:397}
];
const BP61_EDGES = [
  ['start','A1'],['start','A5',true,'shortcut'],
  ['A1','A2'],['A2','A3'],['A3','A4'],['A4','A5'],['A5','wood'],
  ['wood','H1'],['wood','H2'],['wood','K1',true],
  ['H1','H3'],['H2','H4'],['H1','H4',true],['H2','H3',true],
  ['H3','stone'],['H4','stone'],['K1','K2'],
  ['stone','S1'],['stone','S2'],['stone','W1',true],
  ['S1','S3'],['S2','S4'],['S1','S4',true],['S2','S3',true],
  ['S3','S5'],['S4','S6'],['S3','S6',true],['S4','S5',true],
  ['W1','W2'],['S5','bronze'],['S6','bronze'],['bronze','pike']
];
function bp61LifetimeValue(level) {
  const metric = level.core.type;
  if (level.variant === 'standard' && metric === 'max') return Number(progress.pushupMax)||0;
  if (level.variant === 'standard' && metric === 'total') return Number(progress.journeyStandardTotal)||0;
  const stats = getVariantStats(level.variant);
  return Math.max(0,Number(stats[metric])||0);
}
function bp61CoreDone(id) {
  const level = BP61_LEVELS[id];
  if (!level) return false;
  return bp61LifetimeValue(level) >= level.core.reps || Number(progress.journeyStars?.[id]) >= 1;
}
function bp61EarnedStars(id) {
  if (!bp61CoreDone(id)) return 0;
  return Math.max(1,Math.min(3,Math.floor(Number(progress.journeyStars?.[id])||0)));
}
function bp61ObjectiveLabel(objective,variant,first=false) {
  const name = VARIANT_META[variant]?.label || 'Standard';
  const n = objective.reps;
  if (objective.type === 'max') return `${n} ${name} Push-Up${n===1?'':'s'} in one set`;
  if (objective.type === 'total') return `${n} ${name} Push-Ups overall`;
  if (objective.type === 'session') return `${n} ${name} Push-Ups in one challenge`;
  if (objective.type === 'sets') return `${objective.count} sets of ${n} ${name} Push-Ups`;
  return 'Challenge';
}
function bp61SessionMeets(objective,variant,sets) {
  const matched = (sets||[]).filter(set=>set.variant===variant);
  const counts = matched.map(set=>Math.max(0,Number(set.reps)||0));
  if (objective.type==='max') return counts.some(n=>n>=objective.reps);
  if (objective.type==='session') return counts.reduce((a,b)=>a+b,0)>=objective.reps;
  if (objective.type==='sets') return counts.filter(n=>n>=objective.reps).length>=objective.count;
  if (objective.type==='total') return counts.reduce((a,b)=>a+b,0)>=objective.reps;
  return false;
}
function evaluateBP61Level(level,sets) {
  if (!level) return {stars:0};
  // Core can be completed by ANY saved workout, while bonus stars come from
  // one explicitly started challenge. Never evaluate from unrelated workouts.
  const core = bp61CoreDone(level.id) || bp61SessionMeets(level.core,level.variant,sets);
  if (!core) return {stars:0};
  let stars=1;
  if (bp61SessionMeets(level.bonus2,level.variant,sets)) stars=2;
  if (bp61SessionMeets(level.bonus3,level.variant,sets)) stars=3;
  return {stars};
}
function getBP61State() {
  const finished={start:true};
  const available={start:true};
  const rank=getV012CurrentRankName();
  finished.wood=isV012RankAtLeast(rank,'Holz');
  finished.stone=isV012RankAtLeast(rank,'Stein');
  finished.bronze=isV012RankAtLeast(rank,'Bronze');
  finished.pike=finished.bronze;
  for (const id of Object.keys(BP61_LEVELS)) finished[id]=bp61CoreDone(id);
  available.A1=true; available.A2=finished.A1;
  available.A3=finished.A2; available.A4=finished.A3;
  available.A5=true;
  available.H1=available.H2=available.K1=finished.wood;
  available.H3=available.H4=finished.wood&&(finished.H1||finished.H2);
  available.K2=finished.wood&&finished.K1;
  available.S1=available.S2=available.W1=finished.stone;
  available.S3=available.S4=finished.stone&&(finished.S1||finished.S2);
  available.S5=available.S6=finished.stone&&(finished.S3||finished.S4);
  available.W2=finished.stone&&finished.W1;
  available.wood=finished.wood; available.stone=finished.stone;
  available.bronze=finished.bronze;available.pike=finished.pike;
  return {finished,available,rank};
}
function bp61StarsMarkup(earned) {
  return `<span class="bp61-stars" aria-label="${earned} of 3 stars">${[1,2,3].map(n=>`<span class="${n<=earned?'earned':''}">★</span>`).join('')}</span>`;
}
function bp61NodeMarkup(item,state) {
  const done=state.finished[item.id], active=state.available[item.id];
  const status=done?'done':active?'active':'locked';
  if (item.kind==='start') return `<div class="bp61-start" style="left:${item.x/360*100}%;top:${item.y}px"><span>⚑</span><small>START</small></div>`;
  if (item.kind==='rank') {
    const icons={Holz:'✦',Stein:'◆',Bronze:'⬡'};
    const unlocked={Holz:'Knee',Stein:'Wide',Bronze:'Pike'};
    return `<button type="button" class="bp61-rank bp61-rank-${item.id} ${status}" data-bp61-rank="${item.rank}" style="left:${item.x/360*100}%;top:${item.y}px" aria-label="${item.rank} ${done?'unlocked':'locked'}"><span class="bp61-rank-symbol">${icons[item.rank]}</span><strong>${getRankDisplayName(item.rank).toUpperCase()}</strong><small>+ ${unlocked[item.rank]} ↗</small></button>`;
  }
  if(item.kind==='reward') return `<button type="button" class="bp61-reward ${status}" data-bp61-reward="pike" style="left:${item.x/360*100}%;top:${item.y}px"><span class="bp61-reward-icon">${getVariantIconSvg('pike')}</span><span class="bp61-reward-text"><b>PIKE UNLOCK</b><small>${done?'New variant available':'Reach Bronze to unlock'}</small></span></button>`;
  const level=BP61_LEVELS[item.id];const earned=bp61EarnedStars(item.id);
  const kindColor=level.kind==='power'?'#F0808B':level.kind==='volume'?'#7CB6FF':'#B49BFF';
  return `<button type="button" class="bp61-goal ${status} kind-${level.kind}" data-bp61-level="${item.id}" ${active&&!done?'data-tree-current="true"':''} style="left:${item.x/360*100}%;top:${item.y}px;--bp61-kind:${kindColor}" aria-label="${level.title}. ${earned} of 3 stars. ${status}"><span class="bp61-orb"><span class="bp61-orb-icon">${getVariantIconSvg(level.variant)}</span><span class="bp61-kind-tag">${level.kind==='power'?'◆':level.kind==='volume'?'▤':'✧'}</span></span>${bp61StarsMarkup(earned)}<span class="bp61-node-caption">${level.title}</span></button>`;
}
function bp61EdgeMarkup(state) {
  const lookup=Object.fromEntries(BP61_LAYOUT.map(x=>[x.id,x]));
  return `<svg class="bp61-lines" viewBox="0 0 360 2510" preserveAspectRatio="none" aria-hidden="true">${BP61_EDGES.map(([src,dest,cross,kind])=>{
    const a=lookup[src], b=lookup[dest];
    if (!a||!b) return '';
    const done=state.finished[src];
    if(kind==='shortcut')return `<path class="bp61-line ${done?'done':''} shortcut" d="M${a.x} ${a.y-20} Q65 ${a.y-12} 61 ${a.y-95} V${b.y+55} Q61 ${b.y} ${b.x-25} ${b.y}" />`;
    return `<path class="bp61-line ${done?'done':''} ${cross?'cross':''}" d="M${a.x} ${a.y} L${b.x} ${b.y}" />`;
  }).join('')}</svg>`;
}
function renderTree() {
  if(!skillTree)return;
  const state=getBP61State();
  const earned=Object.keys(BP61_LEVELS).reduce((sum,id)=>sum+bp61EarnedStars(id),0);
  const completed=Object.keys(BP61_LEVELS).filter(id=>state.finished[id]).length;
  skillTree.className='skill-tree-v1161';
  skillTree.innerHTML=`<div class="bp61-header"><div><small>BODY<span>PATH</span> · PUSH-UPS</small><h2>YOUR JOURNEY</h2><p>19 challenges · From first rep to Bronze</p></div><div class="bp61-star-balance"><strong>★ ${earned}<small> / 57</small></strong><span>STARS</span></div></div>
    <div class="bp61-progress"><span style="width:${(earned/57*100).toFixed(1)}%"></span></div>
    <div class="bp61-legend"><span><i class="bp61-dot done"></i>Completed</span><span><i class="bp61-dot active"></i>Available</span><span><i class="bp61-dot locked"></i>Locked</span></div>
    <div class="bp61-canvas">${bp61EdgeMarkup(state)}
      <div class="bp61-zone" style="top:280px"><b>BRONZE</b><span>NEW: PIKE PUSH-UPS</span></div>
      <div class="bp61-zone" style="top:1320px"><b>WOOD</b><span>NEW: KNEE PUSH-UPS</span></div>
      <div class="bp61-route-hint" style="top:2186px;left:10%">DIRECT SHORTCUT</div>
      ${BP61_LAYOUT.map(item=>bp61NodeMarkup(item,state)).join('')}
    </div>
    <div class="bp61-footer">${state.finished.bronze?'Bronze achieved! Replay levels to collect missing stars.':'Reach Bronze with 10 Standard Push-Ups in one set OR 100 Standard total.'}<br>${completed}/19 levels finished · Bonus stars in Challenge Mode</div>`;
  skillTree.querySelectorAll('[data-bp61-level]').forEach(btn=>btn.addEventListener('click',()=>openBP61Level(btn.dataset.bp61Level)));
  skillTree.querySelectorAll('[data-bp61-rank]').forEach(btn=>btn.addEventListener('click',()=>openBP61Rank(btn.dataset.bp61Rank)));
  skillTree.querySelectorAll('[data-bp61-reward]').forEach(btn=>btn.addEventListener('click',()=>openBP61Rank('Bronze')));
}
function ensureBP61Sheet(){
  if(document.getElementById('bp61Sheet'))return;
  const el=document.createElement('div');el.id='bp61Sheet';el.className='bp61-sheet hidden';
  el.innerHTML=`<div class="bp61-sheet-card" role="dialog" aria-modal="true" aria-labelledby="bp61SheetTitle"><button type="button" class="bp61-sheet-close" aria-label="Close">×</button><div id="bp61SheetBody"></div><button type="button" id="bp61SheetStart" class="bp61-sheet-primary">START CHALLENGE →</button></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{if(e.target===el)closeBP61Sheet();});
  el.querySelector('.bp61-sheet-close').addEventListener('click',closeBP61Sheet);
  el.querySelector('#bp61SheetStart').addEventListener('click',()=>{if(el.dataset.level)startBP61Challenge(el.dataset.level);});
}
function openBP61Level(id){
  const level=BP61_LEVELS[id];if(!level)return;
  ensureBP61Sheet();const state=getBP61State();const done=state.finished[id];const active=state.available[id];
  const stars=bp61EarnedStars(id);const sheet=document.getElementById('bp61Sheet');sheet.dataset.level=id;
  const cat=level.kind==='power'?'POWER':level.kind==='volume'?'VOLUME':'NEW VARIANT';
  const value=bp61LifetimeValue(level);const max=level.core.reps;
  const descriptions=[level.core,level.bonus2,level.bonus3];
  document.getElementById('bp61SheetBody').innerHTML=`<span class="bp61-sheet-eyebrow">LEVEL ${id} · ${cat}</span><div class="bp61-sheet-hero"><span class="bp61-sheet-icon">${getVariantIconSvg(level.variant)}</span><div><h2 id="bp61SheetTitle">${level.title}</h2><p>${VARIANT_META[level.variant].label} Push-Ups</p></div></div><div class="bp61-sheet-starshow">${bp61StarsMarkup(stars)}<strong>${stars}/3 STARS</strong></div>
   <div class="bp61-sheet-objectives">${descriptions.map((desc,i)=>`<div class="bp61-objective ${i<stars?'achieved':''}"><span class="bp61-objective-star">★</span><div><small>${i===0?'COMPLETE LEVEL':i===1?'BONUS CHALLENGE':'MASTER CHALLENGE'}</small><strong>${bp61ObjectiveLabel(desc,level.variant,i===0)}</strong></div><span class="bp61-objective-check">${i<stars?'✓':i===0?`${Math.min(max,value)}/${max}`:'○'}</span></div>`).join('')}</div><p class="bp61-sheet-tip">${active||done?'★ Core progress counts in free training. Earn bonus stars by playing this challenge.':'🔒 Complete the previous connected level or reach the required rank to start. Existing performances still count.'}</p>`;
  const start=sheet.querySelector('#bp61SheetStart');start.disabled=!(active||done);start.textContent=!(active||done)?'LOCKED':done?'REPLAY CHALLENGE →':'START CHALLENGE →';
  sheet.classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeBP61Sheet(){const sheet=document.getElementById('bp61Sheet');if(sheet)sheet.classList.add('hidden');document.body.style.overflow='';}
function openBP61Rank(rank){
  const states=getBP61State();const id={Holz:'wood',Stein:'stone',Bronze:'bronze'}[rank];
  const reward={Holz:'Knee',Stein:'Wide',Bronze:'Pike'}[rank];
  const requirements={Holz:'1 Standard Push-Up in one set',Stein:'3 Standard in one set OR 15 Standard total',Bronze:'10 Standard in one set OR 100 Standard total'}[rank];
  ensureBP61Sheet();const sheet=document.getElementById('bp61Sheet');sheet.dataset.level='';
  document.getElementById('bp61SheetBody').innerHTML=`<span class="bp61-sheet-eyebrow">RANK REWARD</span><div class="bp61-rank-info">${getRankIconSvg(rank)}<div><h2 id="bp61SheetTitle">${getRankDisplayName(rank)}</h2><p>${states.finished[id]?'✓ Rank unlocked':'🔒 Rank locked'}</p></div></div><div class="bp61-rank-reward"><strong>UNLOCK: ${reward.toUpperCase()} PUSH-UPS</strong><p>${requirements}</p></div>`;
  sheet.querySelector('#bp61SheetStart').disabled=true;sheet.querySelector('#bp61SheetStart').textContent='VIEW THE JOURNEY';
  sheet.classList.remove('hidden');document.body.style.overflow='hidden';
}
function startBP61Challenge(id){
  const level=BP61_LEVELS[id],state=getBP61State();
  if(!level||!(state.available[id]||state.finished[id]))return;
  closeBP61Sheet();openTraining();activeJourneyLevelId=id;
  setSelectedTrainingVariant(level.variant);showStep('quick');showPrepUI();
  trainingTitle.textContent=`Challenge · ${level.title}`;
  prepCameraHint.textContent=bp61ObjectiveLabel(level.core,level.variant);
  updateBP61TrainingBanner();
  showAppToast(`${level.title} · earn up to 3 stars!`);
}
function updateBP61TrainingBanner(){
  const el=document.getElementById('bp61TrainingBanner');if(!el)return;
  const level=BP61_LEVELS[activeJourneyLevelId];
  el.classList.toggle('hidden',!level);
  if(!level)return;
  el.innerHTML=`<span>★ JOURNEY CHALLENGE · ${level.id}</span><strong>${level.title}</strong><small>${bp61ObjectiveLabel(level.core,level.variant)}</small>`;
}

'''
s=s[:start]+bp61+s[end:]
# Training banner update after show prep
replace1('function showPrepUI() {\n  trainingPhase = "prep";', 'function showPrepUI() {\n  updateBP61TrainingBanner();\n  trainingPhase = "prep";')
# header cache
app.write_text(s)
index=p/'index.html';h=index.read_text()
h=h.replace('v0.11.60','v0.11.61').replace('0.11.60','0.11.61')
h=h.replace('''              <button class="workout-variant-btn" data-workout-variant="wall" type="button"><span data-variant-icon="wall"></span><small>Wall</small></button>''','''              <button class="workout-variant-btn" data-workout-variant="wall" type="button"><span data-variant-icon="wall"></span><small>Wall</small></button>
              <button class="workout-variant-btn" data-workout-variant="knee" type="button"><span data-variant-icon="knee"></span><small>Knee</small></button>''')
h=h.replace('''        <div class="quick-stage multi-set-stage">''','''        <div class="quick-stage multi-set-stage">
          <div id="bp61TrainingBanner" class="bp61-training-banner hidden"></div>''')
index.write_text(h)
# Knee SVG as tiny sprite; aligns with other exercise silhouettes
(p/'variant-knee-v01161.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><path fill="none" stroke="#4B75B7" stroke-width="3" stroke-linecap="round" d="M12 73h96"/><circle cx="31" cy="34" r="9" fill="#93B9FC" stroke="#D8E6FF" stroke-width="2"/><path d="M40 38 75 51 92 62" fill="none" stroke="#B2A2FA" stroke-linecap="round" stroke-width="13"/><path d="M74 51 67 68 82 72" fill="none" stroke="#8177CB" stroke-width="10" stroke-linecap="round"/><path d="M45 40 39 68 28 72" fill="none" stroke="#C5B8FF" stroke-width="9" stroke-linecap="round"/><circle cx="67" cy="69" r="6" fill="#B6CBF7"/><path d="M12 76h96" fill="none" stroke="#7488A9" stroke-width="3" stroke-linecap="round"/></svg>''')
print('written',len(s),len(h))
