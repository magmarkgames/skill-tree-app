const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const journey=src.slice(src.indexOf('// BodyPath v0.11.61'), src.indexOf('function syncTreeCanvasHeight() {',src.indexOf('// BodyPath v0.11.61')));
const defs=src.slice(src.indexOf('const V012_CHAPTERS = ['),src.indexOf('function getV114LandmarkState('));
const additional=src.slice(src.indexOf('function getV012PathState(path) {'),src.indexOf('function getV012VariantState(node) {'));
const oldFunc=['getV012PathNodes','getV012NodeValue','getV012MetricValue','getV012PathState','isV012ChapterComplete','getV012CurrentRankName'];
const ctx={console,formatTreeNumber:n=>String(n),getVariantStats(v){return ctx.progress.variantStats[v]||{max:0,total:0};},getBestWorkoutTotal:()=>0,getBestWorkoutSetCount:()=>0,getBestWorkoutVariantCount:()=>0,getTrainingDayCount:()=>0, getRankDisplayName:s=>s,isV012RankAtLeast:(actual,required)=>['Starter','Holz','Stein','Bronze','Silber'].indexOf(actual)>=['Starter','Holz','Stein','Bronze','Silber'].indexOf(required), VARIANT_META:{standard:{label:'Standard'},wall:{label:'Wall'},incline:{label:'Incline'},knee:{label:'Knee'},wide:{label:'Wide'},pike:{label:'Pike'}},V012_RANKS:['Starter','Holz','Stein','Bronze','Silber'],getVariantIconSvg:s=>`<img src="${s}">`,progress:{pushupMax:0,journeyStandardTotal:0,journeyStars:{},variantStats:{}}};
vm.createContext(ctx);
// Only actual rank chapter constants and implementation, not later unused old methods.
vm.runInContext(defs+ '\n'+additional+'\n'+journey+'\nthis.getV012CurrentRankName=getV012CurrentRankName;this.getBP61State=getBP61State;this.getBP61CoreDone=bp61CoreDone;this.getBP61EarnedStars=bp61EarnedStars;this.evaluateBP61Level=evaluateBP61Level;this.bp61SessionMeets=bp61SessionMeets;this.BP61_LEVELS_=BP61_LEVELS;this.BP61_LAYOUT_=BP61_LAYOUT;this.BP61_EDGES_=BP61_EDGES;',ctx);
function state(max=0,total=0,variantStats={}){ctx.progress={pushupMax:max,journeyStandardTotal:total,journeyStars:{},variantStats};return ctx.getBP61State()}
assert.equal(Object.keys(ctx.BP61_LEVELS_).length,19);
assert.equal(ctx.BP61_LAYOUT_.filter(a=>ctx.BP61_LEVELS_[a.id]).length,19);
assert.equal(state().rank,'Starter');
assert.equal(state().available.A1,true);
assert.equal(state().available.A5,true);
assert.equal(state().available.A2,false);
assert.equal(state(0,0,{wall:{max:10,total:50},incline:{max:8,total:50}}).rank,'Starter');
assert.equal(state(1,1).rank,'Holz');
assert.equal(state(1,1).available.K1,true);
assert.equal(state(1,1).available.W1,false);
assert.equal(state(3,3).rank,'Stein');
assert.equal(state(3,3).available.W1,true);
assert.equal(state(1,15).rank,'Stein');
assert.equal(state(10,10).rank,'Bronze');
assert.equal(state(1,100).rank,'Bronze');
assert.equal(state(1,100).finished.pike,true);
state(1,1,{wall:{max:8,total:55}});
assert.equal(ctx.getBP61CoreDone('A2'),true);
let l=ctx.BP61_LEVELS_.A2;
assert.equal(ctx.evaluateBP61Level(l,[{variant:'wall',reps:8}]).stars,2);
assert.equal(ctx.evaluateBP61Level(l,[{variant:'wall',reps:8},{variant:'wall',reps:8}]).stars,3);
assert.equal(ctx.evaluateBP61Level(l,[{variant:'standard',reps:20}]).stars,1); // core already fulfilled, bonuses variant-specific
state();assert.equal(ctx.evaluateBP61Level(ctx.BP61_LEVELS_.S6,[{variant:'standard',reps:3}]).stars,0);
state(10,100);assert.equal(ctx.evaluateBP61Level(ctx.BP61_LEVELS_.S6,[{variant:'standard',reps:10},{variant:'standard',reps:10},{variant:'standard',reps:10}]).stars,3);
for(let [s,t,cross] of ctx.BP61_EDGES_)assert.ok(ctx.BP61_LAYOUT_.some(x=>x.id===s)&&ctx.BP61_LAYOUT_.some(x=>x.id===t),`${s} -> ${t}`);
assert.equal(new Set(ctx.BP61_LAYOUT_.map(x=>x.id)).size,ctx.BP61_LAYOUT_.length);
console.log('PASS: 19 levels, 57 possible stars, graph integrity, both rank paths, variants, 3-tier challenge criteria');
