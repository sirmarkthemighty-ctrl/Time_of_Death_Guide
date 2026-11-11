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
vm.runInContext(code + `\n;globalThis.__T={S,CK,KX,CATS,CI,GROUPS,CASES,CHANGELOG,TICKS,sel,srcRows,estimate,headline,range,fmt,nomoRes,nomoCw,vitRes,parseText,RULES,DX,DR,setRef:m=>{refMode=m;applyRef()},IMM,IMM_M,settingTxt,softTxt,chosen,setIn:o=>{nomoIn=Object.assign({},nomoIn,o)},setVit:o=>{vitIn=Object.assign({},vitIn,o)},setLang:l=>{lang=l},setSetting:v=>{setting=v}};`, ctx);
const T = ctx.__T;
T.setRef('m'); // the checks below are for Madea + Knight; DiMaio mode has its own checks near the end

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
for (const k of Object.keys(T.DX)) { ok(ids.has(k), 'DiMaio row for a sign that does not exist: ' + k); ok(/[\u0E00-\u0E7F]/.test(T.DX[k][1]), 'DiMaio row needs Thai: ' + k); }
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

// ---- weight adjustment (Equation 6.10): the book's own statements and Table 6.20 spot checks
near(T.nomoCw(2.0, 10), 3.2, 0.05, 'factor 2.0 for a 10 kg body (text: about 3.2)');
near(T.nomoCw(2.0, 110), 1.7, 0.05, 'factor 2.0 for a 110 kg body (text: 1.7)');
near(T.nomoCw(2.0, 70), 2.0, 0.05, 'factor 2.0 at 70 kg stays 2.0');
near(T.nomoCw(1.6, 10), 2.0, 0.05, 'Table 6.20, 1.6 row, 10 kg');
near(T.nomoCw(1.6, 4), 2.1, 0.05, 'Table 6.20, 1.6 row, 4 kg');
near(T.nomoCw(2.0, 4), 3.5, 0.05, 'Table 6.20, 2.0 row, 4 kg');
// Table 6.20: the five rows the PDF gives in full (base factor at 70 kg, then values at 4-150 kg)
const W = [4, 6, 8, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const T620 = { 2.2: [4.5, 4.3, 4.1, 3.9, 3.4, 3.0, 2.8, 2.6, 2.4, 2.2, 2.1, 2.0, 1.9, 1.8, 1.7, 1.7, 1.6, 1.6], 2.4: [5.7, 5.3, 5.0, 4.8, 4.0, 3.5, 3.2, 2.9, 2.7, 2.4, 2.3, 2.2, 2.1, 1.9, 1.9, 1.8, 1.7, 1.6], 2.6: [7.1, 6.6, 6.2, 5.8, 4.7, 4.0, 3.6, 3.2, 2.9, 2.6, 2.5, 2.3, 2.2, 2.1, 2.0, 1.9, 1.8, 1.7], 2.8: [8.8, 8.1, 7.5, 7.0, 5.5, 4.6, 3.9, 3.5, 3.2, 2.8, 2.7, 2.5, 2.3, 2.2, 2.0, 1.9, 1.8, 1.7], 3.0: [10.9, 9.8, 8.9, 8.3, 6.2, 5.1, 4.3, 3.8, 3.4, 3.0, 2.8, 2.6, 2.4, 2.3, 2.1, 2.0, 1.9, 1.8] };
for (const c of Object.keys(T620)) T620[c].forEach((v, i) => near(T.nomoCw(+c, W[i]), v, 0.09, 'Table 6.20 row ' + c + ' at ' + W[i] + ' kg'));
T.setIn({ tr: '28.6', ta: '16', bw: '74', cf: '1.2' }); ok(T.nomoRes().adj === false, 'factors below 1.4 are not adjusted');
T.setIn({ tr: '28.6', ta: '16', bw: '110', cf: '2' }); r = T.nomoRes(); ok(r.adj === true && Math.abs(r.ce - T.nomoCw(2, 110)) < 1e-9, 'a factor of 2.0 is adjusted for weight');

// ---- vitreous potassium: Madea 2023 equation (Table 7.22: K = 0.19 t + 5.88, so t = 5.26 K - 30.9) and Zilg model
T.setVit({ k: '15', age: '', tmp: '', urea: '' }); let v = T.vitRes();
near(v.t, 5.26 * 15 - 30.9, 1e-9, 'vitreous K 15 mmol/L'); near(v.hi - v.t, 19.06, 1e-9, 'vitreous K 95% limit'); ok(v.z === null, 'no Zilg value without age and temperature');
near(5.26 * 5.88 - 30.9, 0, 0.05, 'the equation passes through the starting potassium of the data (5.88 mmol/L)');
T.setVit({ k: '10', age: '50', tmp: '10', urea: '80' }); v = T.vitRes(); near(v.z, Math.log(30.04 / 24.44) / (0.135 - 0.056 + 0.0985) * 24, 1e-9, 'Zilg model'); ok(v.renal && v.warm, 'urea above 70 and ambient 10 C or more must be flagged');
T.setVit({ k: '5', age: '', tmp: '', urea: '' }); ok(T.vitRes().msg, 'potassium at the starting level gives no estimate');
T.setVit({ k: '', age: '', tmp: '', urea: '' }); ok(T.vitRes() === null, 'empty potassium gives no result');
ok(T.IMM.length === 5 && T.IMM.every(r => r[2].length === 12) && T.IMM_M.length === 12, "Reh's table rows must have 12 months");

// ---- text box: free text to signs
const ids_ = txt => T.parseText(txt).hits.map(h => h.id).sort().join(',');
ok(ids_('Body warm and flaccid, livor visible and blanches, no rigor') === 'cool1,flac,liv1', 'text: warm, flaccid, livor blanching: ' + ids_('Body warm and flaccid, livor visible and blanches, no rigor'));
ok(ids_('Cold to touch, rigor full in all large joints, livor fixed') === 'cool3,liv3,rig3', 'text: cold, rigor full, livor fixed: ' + ids_('Cold to touch, rigor full in all large joints, livor fixed'));
ok(ids_('ตัวเย็น ศพแข็งเต็มที่ รอยจ้ำเลือดคงที่') === 'cool3,liv3,rig3', 'text (Thai): ' + ids_('ตัวเย็น ศพแข็งเต็มที่ รอยจ้ำเลือดคงที่'));
ok(ids_('Green discolouration of the abdomen with marbling and large maggots') === 'dec1,dec2,ins2', 'text: decomposition: ' + ids_('Green discolouration of the abdomen with marbling and large maggots'));
ok(ids_('livor not fixed, rigor passing') === 'liv1,rig4', 'text: not fixed, passing: ' + ids_('livor not fixed, rigor passing'));
ok(ids_('Rigor only in the jaw') === 'rig1', 'text: jaw only');
ok(ids_('') === '' && ids_('nothing useful here') === '', 'text: empty and unrelated give no signs');
let pr = T.parseText('rigor full and rigor in the jaw'); ok(pr.hits.length === 1 && pr.also.length === 1, 'text: only one stage per choose-one group');
pr = T.parseText('Rectal temperature 28.6, ambient 16, weight 74 kg, vitreous potassium 15 mmol/L'); ok(pr.vals.tr === '28.6' && pr.vals.ta === '16' && pr.vals.bw === '74' && pr.vals.k === '15', 'text: numbers: ' + JSON.stringify(pr.vals));
pr = T.parseText('cornea hazy'); ok(pr.notes.length === 1 && pr.hits.length === 0, 'text: cornea hazy without open or closed needs a question');
pr = T.parseText('cold environment, warm room'); ok(pr.hits.length === 0, 'text: room temperature words must not set the body temperature');
ok(T.RULES.every(r => T.S.some(s => s.id === r[0])), 'every text rule points at a real sign');

// ---- DiMaio mode (the default in the app): his figures only, N/A elsewhere
T.setRef('d');
const dn = T.S.filter(s => !s.na).length; ok(dn === 16, 'DiMaio mode should give 16 signs a figure, got ' + dn);
const R_ = id => { const s = T.S.find(x => x.id === id); return s.na ? 'na' : s.lo + '-' + s.hi + (s.bl ? 'b' : ''); };
ok(R_('rig1') === '2-4' && R_('rig3') === '6-12' && R_('liv0') === '0-2' && R_('liv3') === '8-null' && R_('dec1') === '24-36' && R_('dec3') === '60-72' && R_('eye2') === '24-24b' && R_('ins3') === '144-240b', 'DiMaio figures: ' + ['rig1', 'rig3', 'liv0', 'liv3', 'dec1', 'dec3', 'eye2', 'ins3'].map(R_).join(' '));
ok(['rig5', 'cool1', 'cool3', 'sup1', 'ir1', 'tn1', 'dec2', 'ins2', 'rem1', 'rem2'].every(id => R_(id) === 'na'), 'signs DiMaio gives no figure for must be N/A');
ok(T.S.every(s => T.srcRows(s)[0][0].includes('DiMaio 2022')), 'in DiMaio mode the DiMaio row comes first');
let dw = win_(['rig3', 'liv3']); ok(T.headline(dw) === '8 h - 12 h', 'DiMaio window rigor full + livor fixed: ' + T.headline(dw));
T.setRef('m'); ok(R_('rig3') === '2-85' && R_('cool1') === '0-8', 'switching back restores the Madea and Knight ranges: ' + R_('rig3') + ' ' + R_('cool1'));

// ---- Thai advisory text builds
T.setLang('th'); T.setSetting('hot'); ok(typeof T.settingTxt(T.S.filter(s => s.id === 'rig3')) === 'string', 'Thai setting text');
T.setLang('en');

console.log(fails.length ? 'FAILED ' + fails.length + ' of ' + (pass + fails.length) + ':\n - ' + fails.join('\n - ') : 'OK: ' + pass + ' checks passed');
process.exit(fails.length ? 1 : 0);
