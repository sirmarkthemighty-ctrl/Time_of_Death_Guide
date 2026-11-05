#!/usr/bin/env node
// Regression test for time-of-death-guide.html. No browser needed: the page script runs against a tiny
// fake DOM, then the data and calculator are checked.
// usage: node .claude/test-tod.js [path-to-html]   (in the published repo: node test.js)
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILE = process.argv[2] || [path.resolve(__dirname, 'time-of-death-guide.html'), path.resolve(__dirname, '..', 'time-of-death-guide.html')].find(f => fs.existsSync(f));
const html = fs.readFileSync(FILE, 'utf8');
const m = html.match(/<script>\n\/\* ---------- data[\s\S]*?<\/script>/);
if (!m) throw new Error('main script not found');
const code = m[0].replace(/^<script>|<\/script>$/g, '');

const el = () => ({ innerHTML: '', style: {}, dataset: {}, value: '', classList: { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } }, setAttribute() {}, getBoundingClientRect() { return {}; }, scrollIntoView() {} });
const els = {};
const document = { getElementById: id => els[id] || (els[id] = el()), documentElement: Object.assign(el(), { getAttribute() { return null; } }), addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, createElement: el, head: { appendChild() {} }, body: { appendChild() {} } };
const win = { matchMedia: () => ({ matches: false }), print() {} }; win.self = win.top = win;
const ctx = vm.createContext({ document, window: win, navigator: { language: 'en' }, localStorage: { getItem() { return null; }, setItem() {} }, scrollTo() {}, scrollY: 0, console });
vm.runInContext(code + `\n;globalThis.__T={S,CK,KX,CATS,CI,GROUPS,CASES,CHANGELOG,TICKS,sel,srcRows,estimate,headline,range,fmt,nomoRes,settingTxt,softTxt,chosen,setIn:o=>{nomoIn=Object.assign({},nomoIn,o)},setLang:l=>{lang=l},setSetting:v=>{setting=v}};`, ctx);
const T = ctx.__T;

let pass = 0; const fails = [];
const ok = (cond, msg) => { cond ? pass++ : fails.push(msg); };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} +/- ${tol}`);

// ---- signs
const ids = new Set();
for (const s of T.S) {
  ok(!ids.has(s.id), 'duplicate id ' + s.id); ids.add(s.id);
  ok(s.en && s.th && /[฀-๿]/.test(s.th), 'missing English or Thai text: ' + s.id);
  ok(T.CATS[s.c] && T.CI[s.c], 'unknown category ' + s.c + ' for ' + s.id);
  ok(T.GROUPS.some(g => g.id === s.g && g.cats.includes(s.c)), 'sign not shown in any group: ' + s.id);
  if (!s.na) {
    ok(typeof s.lo === 'number' && (s.hi === null || (typeof s.hi === 'number' && s.hi >= s.lo)), 'bad range for ' + s.id + ': ' + s.lo + ' - ' + s.hi);
  } else ok(s.lo === null && s.hi === null, 'N/A sign must have no range: ' + s.id);
  const rows = T.srcRows(s);
  ok(rows.length >= 1 && rows.every(r => typeof r[0] === 'string' && typeof r[1] === 'string' && /[฀-๿]/.test(r[1])), 'bad source rows (need English and Thai): ' + s.id);
}
for (const k of Object.keys(T.CK)) ok(ids.has(k), 'source check for a sign that does not exist: ' + k);
for (const k of Object.keys(T.KX)) ok(ids.has(k), 'Knight row for a sign that does not exist: ' + k);
ok(T.S.length === 36, 'expected 36 signs, got ' + T.S.length);

// ---- changelog: one EN line per TH line
for (const c of T.CHANGELOG) ok(c.en.length === c.th.length, 'changelog lines differ between EN and TH in v' + c.version);

// ---- window logic and the four teaching examples
const win_ = list => { T.sel.clear(); list.forEach(i => T.sel.add(i)); const e = T.estimate(); T.sel.clear(); return e; };
const exp = ['30 min - 6 h', '8 h - 3.5 d', '5 d - 7 d', 'The signs disagree'];
T.CASES.forEach((c, i) => ok(T.headline(T.estimate(T.S.filter(s => c.ids.includes(s.id)))) === exp[i], `teaching example ${i + 1} gives "${T.headline(T.estimate(T.S.filter(s => c.ids.includes(s.id))))}", expected "${exp[i]}"`));
let e = win_(['rig3', 'dec1']); ok(!e.conflict && e.soft === null, 'a firm decomposition range must not be a soft bound');
e = win_(['rt1', 'rig3']); ok(e.soft === 0 && !e.conflict && e.x === 1, 'baseline sign must add a soft bound and not set the window');
e = win_(['rem3']); ok(e.onlyBl === true, 'baseline only must be flagged');
e = win_(['tn1']); ok(e.onlyNa === true, 'N/A only must be flagged');
e = win_(['rig1', 'cool3']); ok(e.conflict === true, 'warm-rigor-start plus cold body must conflict');
e = win_(['rig3', 'liv3']); near(e.lo, 4, 0, 'rigor full + livor fixed lower bound');

// ---- Henssge calculator: Madea 2023 worked examples
T.setIn({ tr: '28.6', ta: '16', bw: '74', cf: '1.2' });
let r = T.nomoRes(); near(r.t, 14.9, 0.06, 'Figure 6.31 time'); near(r.lo, 12.1, 0.06, 'Figure 6.31 lower'); near(r.hi, 17.7, 0.06, 'Figure 6.31 upper');
T.setIn({ tr: '29.2', ta: '18', bw: '62.5', cf: '1.2' });
r = T.nomoRes(); near(r.t, 13.0, 0.1, 'Figure 6.32 time (Schweitzer example)');
T.setIn({ tr: '40', ta: '16', bw: '74', cf: '1' }); ok(T.nomoRes().msg, 'rectal temperature above 37.2 must be refused');
T.setIn({ tr: '15', ta: '16', bw: '74', cf: '1' }); ok(T.nomoRes().msg, 'body at or below ambient must be refused');
T.setIn({ tr: '16.5', ta: '16', bw: '74', cf: '1' }); r = T.nomoRes(); ok(r && r.v === null && r.q < 0.2, 'Q below 0.2 must give no range');
T.setIn({ tr: '30', ta: '16', bw: '74', cf: '1' }); const t1 = T.nomoRes().t; T.setIn({ tr: '26', ta: '16', bw: '74', cf: '1' }); ok(T.nomoRes().t > t1, 'a colder body must give a later time');
T.setIn({ tr: '28', ta: '25', bw: '70', cf: '1' }); r = T.nomoRes(); ok(r && r.t > 0, 'ambient above 23 C uses the second equation');
T.setIn({ tr: '', ta: '16', bw: '74', cf: '1' }); ok(T.nomoRes() === null, 'missing value gives no result');

// ---- Thai advisory text builds
T.setLang('th'); T.setSetting('hot'); ok(typeof T.settingTxt(T.S.filter(s => s.id === 'rig3')) === 'string', 'Thai setting text');
T.setLang('en');

console.log(fails.length ? 'FAILED ' + fails.length + ' of ' + (pass + fails.length) + ':\n - ' + fails.join('\n - ') : 'OK: ' + pass + ' checks passed');
process.exit(fails.length ? 1 : 0);
