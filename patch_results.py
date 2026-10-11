from pathlib import Path
p=Path('/mnt/data/bodypath-dev-01161/app.js');s=p.read_text()
def r(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b,1)
r('let activeJourneyLevelId = null;', 'let activeJourneyLevelId = null;\nlet lastBP61Result = null;')
r('''  const journeyWasActive = activeJourneyLevelId;
  let journeyResult = null;''','''  const journeyWasActive = activeJourneyLevelId;
  const priorJourneyStars = journeyWasActive ? bp61EarnedStars(journeyWasActive) : 0;
  let journeyResult = null;''')
r('''  if (rankUp) addSuccessLine(`⭐ Neuer Rang: ${newRank}`, true);
  else addSuccessLine(`Rang: ${newRank}`);
  if (showSuccess) showStep("success");''','''  if (rankUp) addSuccessLine(`⭐ Neuer Rang: ${newRank}`, true);
  else addSuccessLine(`Rang: ${newRank}`);
  lastBP61Result = journeyWasActive && BP61_LEVELS[journeyWasActive]
    ? { id:journeyWasActive,stars:bp61EarnedStars(journeyWasActive),prior:priorJourneyStars,rankUp:rankUp?newRank:null }
    : null;
  if (showSuccess) showStep("success");''')
r('''    const saved = completedSets.length > 0 ? saveTrainingResult({ showSuccess: false }) : false;
    closeTraining();
    showView("tree");
    if (saved) showAppToast("Training gespeichert");
    return;''','''    const saved = completedSets.length > 0 ? saveTrainingResult({ showSuccess: false }) : false;
    const resultCard = lastBP61Result;
    closeTraining();
    showView("tree");
    if (saved) {
      if (resultCard) showBP61Result(resultCard);
      else showAppToast("Training gespeichert");
    }
    return;''')
# No previous challenge results carrying over after closing training
r('''  workoutActive = false;
  activeChallengeId = null;
  activeJourneyLevelId = null;
  countdownActive = false;''','''  workoutActive = false;
  activeChallengeId = null;
  activeJourneyLevelId = null;
  lastBP61Result = null;
  countdownActive = false;''')
# appended result popup before existing syncTreeCanvasHeight
needle='function syncTreeCanvasHeight() {'
assert needle in s
html=r'''function showBP61Result(result) {
  if(!result||!BP61_LEVELS[result.id])return;
  document.getElementById('bp61Result')?.remove();
  const level=BP61_LEVELS[result.id];
  const popup=document.createElement('div');popup.id='bp61Result';popup.className='bp61-result';
  const gain=Math.max(0,result.stars-result.prior);
  popup.innerHTML=`<div class="bp61-result-card" role="dialog" aria-modal="true" aria-label="Challenge results"><small class="bp61-result-eyebrow">${gain?'LEVEL PROGRESS!':'CHALLENGE COMPLETE'}</small><span class="bp61-result-icon">${getVariantIconSvg(level.variant)}</span><h2>${level.title}</h2><div class="bp61-result-stars">${bp61StarsMarkup(result.stars)}</div><p>${result.stars}/3 stars earned ${gain?`· +${gain} new`:''}</p>${result.rankUp?`<div class="bp61-result-rank">✦ NEW RANK: ${getRankDisplayName(result.rankUp).toUpperCase()}</div>`:''}<button type="button" id="bp61ResultClose">CONTINUE JOURNEY →</button></div>`;
  document.body.appendChild(popup);
  document.body.style.overflow='hidden';
  popup.querySelector('button').addEventListener('click',()=>{popup.remove();document.body.style.overflow='';});
}

'''
s=s.replace(needle,html+needle,1)
# layout fix for knee nodes
s=s.replace("{id:'K1',x:324,y:1248},{id:'K2',x:324,y:1132}", "{id:'K1',x:327,y:1330},{id:'K2',x:327,y:1200}")
s=s.replace("{id:'H3',x:86,y:1399},{id:'H4',x:257,y:1399}","{id:'H3',x:86,y:1399},{id:'H4',x:237,y:1399}")
s=s.replace("if(kind==='shortcut')return", "if(src==='wood'&&dest==='K1') return `<path class=\"bp61-line ${done?'done':''} cross\" d=\"M${a.x} ${a.y} C330 ${a.y-60} 327 ${b.y+100} ${b.x} ${b.y}\" />`;\n    if(kind==='shortcut')return")
p.write_text(s)
style=Path('/mnt/data/bodypath-dev-01161/style.css')
style.write_text(style.read_text()+'''
/* End-of-training Journey celebration (only for targeted camera challenges). */
.bp61-result{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;background:rgba(6,10,19,.86);backdrop-filter:blur(8px)}
.bp61-result-card{width:100%;max-width:340px;padding:26px 22px 24px;background:linear-gradient(160deg,#263856,#172237 80%);border:1px solid #65728c;border-radius:20px;text-align:center;box-shadow:0 22px 55px rgba(0,0,0,.5);color:#edf4ff}
.bp61-result-eyebrow{display:block;color:#f6c65c;font-size:11px;font-weight:900;letter-spacing:.14em;margin-bottom:17px}
.bp61-result-icon{width:85px;height:85px;padding:10px;border-radius:50%;border:5px solid #31c98d;background:#193734;display:block;box-sizing:border-box;margin:0 auto 13px}
.bp61-result-icon img{height:100%;width:100%;object-fit:contain}
.bp61-result-card h2{font-size:22px;margin:0 0 13px;color:#ecf3ff}
.bp61-result-stars .bp61-stars{gap:12px}.bp61-result-stars .bp61-stars span{font-size:36px}
.bp61-result-card p{color:#bac8df;font-size:12px;margin:12px 0 22px}
.bp61-result-rank{color:#eec47b;font-size:13px;font-weight:900;letter-spacing:.075em;background:#394033;border-radius:9px;padding:12px;margin:-5px 0 17px}
#bp61ResultClose{width:100%;height:49px;border:0;border-radius:11px;background:#447add;color:white;font-size:12px;font-weight:850;letter-spacing:.075em;cursor:pointer}
''')
print('result UI applied')
