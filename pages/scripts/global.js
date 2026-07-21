var consoleMessage = `
If you're here to scrutinize the logic of my code, reconsider before your head stars hurting.\n
It'd be a big mistake trying to read my HTML and Javascript. The opposite can be said about my css however.\n
I actually encourage you to go ahead and check my stylings, maybe you'll learn something new. Visit sources to see.\n
Seriously though, if you just want to see some JS functions or see how I styled my elements, this project is an open repository in my github.\n
find it on: https://github.com/Jideeh\n
Just don't start complaining when you see how ass I code. ーｗ－\n
Yours Truly,\nJideeh\n\n
`

console.log(consoleMessage);

const CONFIG = {
  sheetName: null
};
const SUPPORTS_FS_ACCESS = false;

const NEEDED_COLS = [
  'PIN','Patient Name','Visit No','Invoice No','Invoice Date','SOA Status',
  'ItemCode','Item Name','Payor Code','Payor Name','Requesting Doctor',
  'Qty','Unit Price','Tax','Payor Discount Type','Payor Discount',
  'Special Discount Type','Special Discount','Total Discount','Amount',
  'OR No','Payor Agreement','OR Status'
];

let RAW_RECORDS = [];
let CHARTS = {};
let LAST_PARSED_ROWS = null;
let SITE_INFO = { title:'', period:'', site:'' };

function excelSerialToMs(serial){ return Math.round((serial - 25569) * 86400000); }

function dateValueMs(v){
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return excelSerialToMs(v);
  if (typeof v === 'string'){
    const trimmed = v.trim();
    if (trimmed === '') return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return excelSerialToMs(parseFloat(trimmed));
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.getTime();
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)?$/i);
    if (m){
      let [, mo, da, yr, hh, mi, ap] = m;
      hh = parseInt(hh,10); mi = parseInt(mi,10);
      if (ap){
        ap = ap.toUpperCase();
        if (ap==='PM' && hh<12) hh += 12;
        if (ap==='AM' && hh===12) hh = 0;
      }
      d = new Date(parseInt(yr,10), parseInt(mo,10)-1, parseInt(da,10), hh, mi);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    return null;
  }
  return null;
}

function num(v){
  if (v===null || v===undefined || v==='') return 0;
  if (typeof v==='number') return v;
  const n = parseFloat(String(v).replace(/,/g,''));
  return isNaN(n) ? 0 : n;
}

function mean(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; }
function fmt1(n){ return (n==null || isNaN(n)) ? '—' : n.toFixed(1); }
function fmtPct(n){ return (n==null || isNaN(n)) ? '—' : (n*100).toFixed(1)+'%'; }
function fmtInt(n){ return (n==null || isNaN(n)) ? '—' : Math.round(n).toLocaleString(); }
function fmtMoney(n){ return (n==null || isNaN(n)) ? '—' : '₱'+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtMoneyShort(n){
  if (n==null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1000000) return '₱'+(n/1000000).toFixed(2)+'M';
  if (Math.abs(n) >= 1000) return '₱'+(n/1000).toFixed(1)+'K';
  return '₱'+n.toFixed(0);
}

function setLoading(text, sub){
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingSteps').textContent = sub || '';
}
function showError(msg){
  const box = document.getElementById('errorBox');
  box.style.display = 'block';
  box.innerHTML = msg;
  document.getElementById('loadingOverlay').style.display = 'none';
}

const ACCEPTED_FILE_EXT = /\.(csv|xlsx)$/i;

const FILE_CACHE_DB_NAME = 'proserDailyCensusCache';
const FILE_CACHE_DB_VERSION = 1;
const FILE_CACHE_STORE = 'files';
const FILE_CACHE_KEY = 'lastFile';

function openFileCacheDb(){
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)){ reject(new Error('IndexedDB is not available in this browser')); return; }
    const req = indexedDB.open(FILE_CACHE_DB_NAME, FILE_CACHE_DB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(FILE_CACHE_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFileToCache(buf, fileName, lastModified){
  try{
    const db = await openFileCacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_CACHE_STORE, 'readwrite');
      tx.objectStore(FILE_CACHE_STORE).put({ buf, fileName, lastModified, cachedAt: Date.now() }, FILE_CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }catch(e){
    console.warn('Could not cache the imported file locally:', e);
  }
}

async function loadFileFromCache(){
  try{
    const db = await openFileCacheDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_CACHE_STORE, 'readonly');
      const req = tx.objectStore(FILE_CACHE_STORE).get(FILE_CACHE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }catch(e){
    console.warn('Could not read the cached file:', e);
    return null;
  }
}

async function clearFileCache(){
  try{
    const db = await openFileCacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_CACHE_STORE, 'readwrite');
      tx.objectStore(FILE_CACHE_STORE).delete(FILE_CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }catch(e){
    console.warn('Could not clear the cached file:', e);
  }
}

function showPickButton(text){
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('pickZone').style.display = 'flex';
  document.getElementById('pickFileBtn').textContent = text || '📂 Select Daily Census file (.xlsx/.csv)';
}
function hidePickButton(){
  document.getElementById('loadingSpinner').style.display = 'block';
  document.getElementById('pickZone').style.display = 'none';
}

function showToast(msg, isError){
  const toast = document.getElementById('toast');
  if (!toast){ console.log(msg); return; }
  toast.textContent = msg;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

let pendingAcquire = null;

function acquireFile(){
  return new Promise((resolve, reject) => {
    const input = document.getElementById('fileInput');
    const btn = document.getElementById('pickFileBtn');
    input.value = '';

    const cleanup = () => {
      input.removeEventListener('change', onChange);
      btn.removeEventListener('click', onBtnClick);
      pendingAcquire = null;
    };

    const settle = async (file) => {
      cleanup();
      if (!file) { reject(new Error('No file selected')); return; }
      hidePickButton();
      setLoading('Reading the file…', '');
      try {
        resolve({ buf: await file.arrayBuffer(), fileName: file.name, lastModified: file.lastModified });
      } catch (e) {
        reject(e);
      }
    };

    const onChange = () => settle(input.files[0]);
    const onBtnClick = () => input.click();

    input.addEventListener('change', onChange);
    btn.addEventListener('click', onBtnClick);

    pendingAcquire = { settle };
  });
}

async function getWorkbookArrayBuffer({ forcePick = false } = {}){
  hidePickButton();
  showPickButton(forcePick ? '📂 Change file' : '📂 Select Daily Census file (.xlsx/.csv)');
  setLoading('Point this at your Proser Daily Census export', 'e.g. …\\Downloads\\ProserDailyCensus.xlsx');

  return acquireFile();
}

let globalDragCounter = 0;

function hasFilesPayload(e){
  return !!(e.dataTransfer && Array.prototype.includes.call(e.dataTransfer.types || [], 'Files'));
}

function setGlobalDragActive(active){
  const overlay = document.getElementById('dragOverlay');
  if (overlay) overlay.classList.toggle('active', active);
}

document.addEventListener('dragenter', (e) => {
  if (!hasFilesPayload(e)) return;
  e.preventDefault();
  globalDragCounter++;
  setGlobalDragActive(true);
});
document.addEventListener('dragover', (e) => {
  if (!hasFilesPayload(e)) return;
  e.preventDefault();
});
document.addEventListener('dragleave', (e) => {
  if (!hasFilesPayload(e)) return;
  e.preventDefault();
  globalDragCounter = Math.max(0, globalDragCounter - 1);
  if (globalDragCounter === 0) setGlobalDragActive(false);
});
document.addEventListener('drop', async (e) => {
  if (!hasFilesPayload(e)) return;
  e.preventDefault();
  globalDragCounter = 0;
  setGlobalDragActive(false);
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  if (!ACCEPTED_FILE_EXT.test(file.name)){
    showToast('Please drop a .csv or .xlsx file', true);
    return;
  }
  if (pendingAcquire){
    pendingAcquire.settle(file);
  } else {
    await importFile(file);
  }
});

function parseCsv(buf){
  const text = new TextDecoder('utf-8').decode(buf);
  const result = Papa.parse(text, { header:false, skipEmptyLines:false, dynamicTyping:false });
  return result.data;
}

function parseXlsx(buf){
  const wb = XLSX.read(new Uint8Array(buf), { type:'array', cellDates:true, dense:true });
  const sheetName = CONFIG.sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws || ws === '') throw new Error(`Could not read a sheet from this workbook. SheetNames=${JSON.stringify(wb.SheetNames)}`);
  return XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:null });
}

function parseWorkbook(buf, fileName){
  const isCsv = /\.csv$/i.test(fileName || '');
  return isCsv ? parseCsv(buf) : parseXlsx(buf);
}

function findHeaderRowIndex(rows){
  const limit = Math.min(rows.length, 10);
  for (let i=0; i<limit; i++){
    const row = rows[i] || [];
    const norm = row.map(c => (c==null ? '' : String(c).trim()));
    if (norm.includes('PIN') && norm.some(c => /invoice no/i.test(c))) return i;
  }
  return -1;
}

function parseSiteInfo(rows, headerIdx){
  const info = { title:'', period:'', site:'' };
  for (let i=0; i<headerIdx; i++){
    const row = rows[i] || [];
    for (const cell of row){
      if (cell == null) continue;
      const s = String(cell).trim();
      if (!s) continue;
      const lines = s.split(/\n/).map(l=>l.trim()).filter(Boolean);
      lines.forEach(line => {
        if (/^for the period/i.test(line)) info.period = line;
        else if (/daily census/i.test(line)) info.title = line;
        else if (!info.site) info.site = line;
      });
    }
  }
  return info;
}

function buildRecords(rows){
  setLoading('Parsing line items…', `${rows.length.toLocaleString()} rows to process`);
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx === -1) throw new Error('Could not find the header row (expected columns like "PIN" and "Invoice No") in the first 10 rows of this sheet — check the file structure.');

  SITE_INFO = parseSiteInfo(rows, headerIdx);

  const header = rows[headerIdx].map(h => (h==null ? '' : String(h).trim()));
  const idx = {};
  NEEDED_COLS.forEach(name => { idx[name] = header.indexOf(name); });
  if (idx['PIN'] === -1) throw new Error('Column "PIN" not found in the header row — check the file structure.');
  if (idx['Invoice No'] === -1) throw new Error('Column "Invoice No" not found in the header row — check the file structure.');

  const records = [];
  for (let i=headerIdx+1; i<rows.length; i++){
    const row = rows[i];
    if (!row) continue;
    const itemCode = row[idx['ItemCode']];
    const invoiceNo = row[idx['Invoice No']];
    if (itemCode == null || itemCode === '' || invoiceNo == null || invoiceNo === '') continue;

    records.push({
      pin: row[idx['PIN']],
      patientName: row[idx['Patient Name']],
      visitNo: row[idx['Visit No']],
      invoiceNo: invoiceNo,
      invoiceDate: dateValueMs(row[idx['Invoice Date']]),
      soaStatus: (row[idx['SOA Status']] || '').toString().trim() || 'Active',
      itemCode: itemCode,
      itemName: (row[idx['Item Name']] || '').toString().trim(),
      payorCode: row[idx['Payor Code']],
      payorName: (row[idx['Payor Name']] || '').toString().trim() || 'Unspecified',
      doctor: (row[idx['Requesting Doctor']] || '').toString().trim() || 'Unspecified',
      qty: num(row[idx['Qty']]),
      unitPrice: num(row[idx['Unit Price']]),
      tax: num(row[idx['Tax']]),
      payorDiscountType: row[idx['Payor Discount Type']] || null,
      payorDiscount: num(row[idx['Payor Discount']]),
      specialDiscountType: row[idx['Special Discount Type']] || null,
      specialDiscount: num(row[idx['Special Discount']]),
      totalDiscount: num(row[idx['Total Discount']]),
      amount: num(row[idx['Amount']]),
      orNo: row[idx['OR No']],
      payorAgreement: row[idx['Payor Agreement']],
      orStatus: row[idx['OR Status']]
    });
  }
  return records;
}

function populateFilterOptions(records){
  const uniq = (f) => [...new Set(records.map(f).filter(v => v!=null && v!==''))].sort();
  MSEL_OPTIONS.payor = uniq(r=>r.payorName);
  MSEL_OPTIONS.doctor = uniq(r=>r.doctor);
  MSEL_OPTIONS.item = uniq(r=>r.itemName);
  Object.keys(SELECTED).forEach(key=>{
    const valid = new Set(MSEL_OPTIONS[key]);
    [...SELECTED[key]].forEach(v=>{ if (!valid.has(v)) SELECTED[key].delete(v); });
  });
  renderMselChips('payor'); renderMselChips('doctor'); renderMselChips('item');
}
function fillSelect(id, values){
  const sel = document.getElementById(id);
  const current = sel.value;
  sel.innerHTML = '<option value="">All</option>' + values.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  sel.value = current;
}

const SELECTED = { payor: new Set(), doctor: new Set(), item: new Set() };
const MSEL_OPTIONS = { payor: [], doctor: [], item: [] };
const MSEL_FIELDS = {
  payor:  { inputId:'fPayorInput',  chipsId:'mselPayorChips',  dropdownId:'mselPayorDropdown' },
  doctor: { inputId:'fDoctorInput', chipsId:'mselDoctorChips', dropdownId:'mselDoctorDropdown' },
  item:   { inputId:'fItemInput',   chipsId:'mselItemChips',   dropdownId:'mselItemDropdown' }
};

function renderMselChips(key){
  const { chipsId } = MSEL_FIELDS[key];
  const chipsEl = document.getElementById(chipsId);
  chipsEl.innerHTML = [...SELECTED[key]].map(v=>
    `<span class="msel-chip"><span class="label">${escapeHtml(v)}</span><span class="x" data-key="${key}" data-val="${escapeHtml(v)}">×</span></span>`
  ).join('');
  chipsEl.querySelectorAll('.x').forEach(x=>{
    x.addEventListener('click', ()=>{
      SELECTED[x.dataset.key].delete(x.dataset.val);
      renderMselChips(x.dataset.key);
      renderAll(applyFilters(RAW_RECORDS));
    });
  });
}

function renderMselDropdown(key){
  const { inputId, dropdownId } = MSEL_FIELDS[key];
  const input = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);
  const q = input.value.trim().toLowerCase();
  const matches = MSEL_OPTIONS[key].filter(v => !SELECTED[key].has(v) && (!q || v.toLowerCase().includes(q))).slice(0, 50);
  if (!matches.length){
    dropdownEl.innerHTML = `<div class="msel-empty">${q ? 'No matches' : 'Start typing to search…'}</div>`;
  } else {
    dropdownEl.innerHTML = matches.map(v=>`<div class="msel-option" data-key="${key}" data-val="${escapeHtml(v)}">${escapeHtml(v)}</div>`).join('');
    dropdownEl.querySelectorAll('.msel-option').forEach(opt=>{
      opt.addEventListener('mousedown', (e)=>{
        e.preventDefault();
        SELECTED[opt.dataset.key].add(opt.dataset.val);
        input.value = '';
        renderMselChips(opt.dataset.key);
        renderMselDropdown(opt.dataset.key);
        renderAll(applyFilters(RAW_RECORDS));
      });
    });
  }
  dropdownEl.classList.add('open');
}

function setupMultiSelect(key){
  const { inputId, dropdownId } = MSEL_FIELDS[key];
  const input = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);
  input.addEventListener('focus', ()=> renderMselDropdown(key));
  input.addEventListener('input', ()=> renderMselDropdown(key));
  input.addEventListener('blur', ()=> setTimeout(()=> dropdownEl.classList.remove('open'), 150));
}
Object.keys(MSEL_FIELDS).forEach(setupMultiSelect);
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function discountBucket(r){
  if (r.specialDiscountType && /senior|pwd/i.test(r.specialDiscountType) === false && r.specialDiscountType.trim()!=='') {
  }
  if (r.payorDiscountType === 'SENIOR CITIZEN DISCOUNT') return 'SENIOR CITIZEN DISCOUNT';
  if (r.payorDiscountType === 'PWD DISCOUNT') return 'PWD DISCOUNT';
  if (r.specialDiscountType) return 'other';
  if (r.totalDiscount > 0) return 'other';
  return 'none';
}

function applyFilters(records){
  const from = document.getElementById('fDateFrom').value;
  const to = document.getElementById('fDateTo').value;
  const soa = document.getElementById('fSoa').value;
  const discount = document.getElementById('fDiscount').value;
  const seniorOnly = document.getElementById('fSeniorOnly').checked;

  const fromMs = from ? new Date(from+'T00:00:00').getTime() : null;
  const toMs = to ? new Date(to+'T23:59:59').getTime() : null;

  return records.filter(r=>{
    if (fromMs!=null && (r.invoiceDate==null || r.invoiceDate<fromMs)) return false;
    if (toMs!=null && (r.invoiceDate==null || r.invoiceDate>toMs)) return false;
    if (SELECTED.payor.size && !SELECTED.payor.has(r.payorName)) return false;
    if (SELECTED.doctor.size && !SELECTED.doctor.has(r.doctor)) return false;
    if (SELECTED.item.size && !SELECTED.item.has(r.itemName)) return false;
    if (soa && r.soaStatus!==soa) return false;
    if (discount){
      const bucket = discountBucket(r);
      if (discount==='none' && bucket!=='none') return false;
      if (discount==='other' && bucket!=='other') return false;
      if ((discount==='SENIOR CITIZEN DISCOUNT'||discount==='PWD DISCOUNT') && bucket!==discount) return false;
    }
    if (seniorOnly && r.payorDiscountType!=='SENIOR CITIZEN DISCOUNT') return false;
    return true;
  });
}

function renderAll(records){
  const active = records.filter(r=>r.soaStatus==='Active');
  const cancelled = records.filter(r=>r.soaStatus==='Cancelled');

  const totalRevenue = active.reduce((s,r)=>s+r.amount,0);
  const totalTax = active.reduce((s,r)=>s+r.tax,0);
  const totalDiscount = active.reduce((s,r)=>s+r.totalDiscount,0);
  const totalQty = active.reduce((s,r)=>s+r.qty,0);
  const visits = new Set(active.map(r=>r.visitNo).filter(v=>v!=null));
  const patients = new Set(active.map(r=>r.pin).filter(v=>v!=null));
  const avgPerVisit = visits.size ? totalRevenue/visits.size : null;
  const avgItemsPerVisit = visits.size ? active.length/visits.size : null;
  const cancelledAmount = cancelled.reduce((s,r)=>s+r.amount,0);
  const seniorCount = active.filter(r=>r.payorDiscountType==='SENIOR CITIZEN DISCOUNT').length;

  document.getElementById('kpiRow').innerHTML = `
    ${kpiCard('Total Revenue','',fmtMoney(totalRevenue),'Active line items, billed amount','')}
    ${kpiCard('Total Quantity','teal',fmtInt(totalQty),'Sum of Qty across active line items','')}
    ${kpiCard('Total Visits','teal',fmtInt(visits.size),'Distinct visit numbers','')}
    ${kpiCard('Total Patients','',fmtInt(patients.size),'Distinct PINs','')}
    ${kpiCard('Avg Revenue / Visit','green',fmtMoney(avgPerVisit),'Total revenue ÷ visits','')}
    ${kpiCard('Avg Items / Visit','',fmt1(avgItemsPerVisit),'Line items ÷ visits','')}
    ${kpiCard('Total Discounts Given','amber',fmtMoney(totalDiscount),'Payor + special discounts','')}
    ${kpiCard('Senior Citizen Items','amber',fmtInt(seniorCount),'Line items with senior citizen discount','')}
    ${kpiCard('Total Tax Collected','',fmtMoney(totalTax),'Active line items','')}
    ${kpiCard('Cancelled Items','red',fmtInt(cancelled.length),`${fmtMoney(cancelledAmount)} in cancelled amount`,'')}
  `;

  renderTopItemsChart(active);
  renderPayorMixChart(active);
  renderDoctorsChart(active);
  renderTrendChart(active);
  renderDiscountsChart(active);
  renderPayorTable(active);
  renderItemTable(active);
  renderDetailTable(records);
}

function kpiCard(label, cls, value, hint){
  return `<div class="kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
}

function destroyChart(key){ if (CHARTS[key]) { CHARTS[key].destroy(); delete CHARTS[key]; } }

function renderTopItemsChart(active){
  destroyChart('topItems');
  const byItem = new Map();
  for (const r of active){
    if (!byItem.has(r.itemName)) byItem.set(r.itemName, {revenue:0, qty:0});
    const g = byItem.get(r.itemName);
    g.revenue += r.amount; g.qty += r.qty;
  }
  const top = [...byItem.entries()].sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,10);
  const ctx = document.getElementById('chartTopItems');
  CHARTS.topItems = new Chart(ctx, {
    type:'bar',
    data:{ labels: top.map(t=>t[0]), datasets:[{ label:'Revenue', data: top.map(t=>+t[1].revenue.toFixed(2)), backgroundColor:'#1466c0' }] },
    options:{ indexAxis:'y', responsive:true, plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true}} }
  });
}

function renderPayorMixChart(active){
  destroyChart('payorMix');
  const byPayor = new Map();
  for (const r of active) byPayor.set(r.payorName, (byPayor.get(r.payorName)||0) + r.amount);
  const sorted = [...byPayor.entries()].sort((a,b)=>b[1]-a[1]);
  const top = sorted.slice(0,8);
  const otherTotal = sorted.slice(8).reduce((s,[,v])=>s+v,0);
  const labels = top.map(t=>t[0]).concat(otherTotal>0 ? ['Other'] : []);
  const data = top.map(t=>+t[1].toFixed(2)).concat(otherTotal>0 ? [+otherTotal.toFixed(2)] : []);
  const palette = ['#1466c0','#0e9594','#1f9d55','#e8a33d','#d0453c','#7c5cd0','#c0567f','#5c8ad0','#64748b'];
  const ctx = document.getElementById('chartPayorMix');
  CHARTS.payorMix = new Chart(ctx, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor: palette }] },
    options:{ responsive:true, plugins:{legend:{position:'bottom', labels:{boxWidth:10, font:{size:10}}}} }
  });
}

function renderDoctorsChart(active){
  destroyChart('doctors');
  const byDoc = new Map();
  for (const r of active) byDoc.set(r.doctor, (byDoc.get(r.doctor)||0) + r.amount);
  const top = [...byDoc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ctx = document.getElementById('chartDoctors');
  CHARTS.doctors = new Chart(ctx, {
    type:'bar',
    data:{ labels: top.map(t=>t[0]), datasets:[{ label:'Revenue', data: top.map(t=>+t[1].toFixed(2)), backgroundColor:'#0e9594' }] },
    options:{ indexAxis:'y', responsive:true, plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true}} }
  });
}

function renderTrendChart(active){
  destroyChart('trend');
  const daily = new Map();
  for (const r of active){
    if (r.invoiceDate==null) continue;
    const key = new Date(r.invoiceDate).toISOString().slice(0,10);
    if (!daily.has(key)) daily.set(key, {revenue:0, visits:new Set()});
    const rec = daily.get(key);
    rec.revenue += r.amount;
    if (r.visitNo!=null) rec.visits.add(r.visitNo);
  }
  const keys = [...daily.keys()].sort();
  const revenue = keys.map(k=>+daily.get(k).revenue.toFixed(2));
  const visitCounts = keys.map(k=>daily.get(k).visits.size);
  const ctx = document.getElementById('chartTrend');
  CHARTS.trend = new Chart(ctx, {
    data:{ labels: keys, datasets:[
      { type:'bar', label:'Revenue', data:revenue, backgroundColor:'#1466c0', yAxisID:'y' },
      { type:'line', label:'Visits', data:visitCounts, borderColor:'#e8a33d', backgroundColor:'#e8a33d', yAxisID:'y1', tension:.25 }
    ]},
    options:{ responsive:true, interaction:{mode:'index',intersect:false},
      scales:{ y:{ position:'left', title:{display:true,text:'Revenue'} }, y1:{ position:'right', grid:{drawOnChartArea:false}, title:{display:true,text:'Visits'} } },
      plugins:{ legend:{position:'bottom'} }
    }
  });
}

function renderDiscountsChart(active){
  destroyChart('discounts');
  const buckets = { 'None':0, 'Senior Citizen':0, 'PWD':0, 'Other':0 };
  for (const r of active){
    const b = discountBucket(r);
    if (b==='SENIOR CITIZEN DISCOUNT') buckets['Senior Citizen'] += r.totalDiscount;
    else if (b==='PWD DISCOUNT') buckets['PWD'] += r.totalDiscount;
    else if (b==='other') buckets['Other'] += r.totalDiscount;
    else buckets['None'] += r.totalDiscount;
  }
  const labels = Object.keys(buckets).filter(k=>k!=='None');
  const ctx = document.getElementById('chartDiscounts');
  CHARTS.discounts = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{ label:'Discount Amount', data: labels.map(l=>+buckets[l].toFixed(2)), backgroundColor:['#e8a33d','#d0453c','#7c5cd0'] }] },
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
  });
}

let PAYOR_TABLE_DATA = [];
let PAYOR_SORT = { key:'revenue', dir:-1 };

function renderPayorTable(active){
  const byPayor = new Map();
  for (const r of active){
    if (!byPayor.has(r.payorName)) byPayor.set(r.payorName, { lineItems:0, visits:new Set(), revenue:0, discount:0 });
    const g = byPayor.get(r.payorName);
    g.lineItems += 1;
    if (r.visitNo!=null) g.visits.add(r.visitNo);
    g.revenue += r.amount;
    g.discount += r.totalDiscount;
  }
  PAYOR_TABLE_DATA = [...byPayor.entries()].map(([payor,g])=>({
    payor,
    lineItems: g.lineItems,
    visits: g.visits.size,
    revenue: g.revenue,
    avgTicket: g.lineItems ? g.revenue/g.lineItems : null,
    discount: g.discount,
    discountPct: (g.revenue+g.discount) ? g.discount/(g.revenue+g.discount) : null
  }));
  sortAndRenderPayorTable();
}

function sortAndRenderPayorTable(){
  const {key, dir} = PAYOR_SORT;
  const data = [...PAYOR_TABLE_DATA].sort((a,b)=>{
    let av = a[key], bv = b[key];
    if (av==null) av = -Infinity; if (bv==null) bv = -Infinity;
    if (typeof av === 'string') return dir * av.localeCompare(bv);
    return dir * (av-bv);
  });
  const tbody = document.querySelector('#payorTable tbody');
  tbody.innerHTML = data.map(r=>{
    const dCls = r.discountPct>0.15 ? 'hi' : (r.discountPct>0.05 ? 'mid' : 'lo');
    return `<tr>
      <td>${escapeHtml(r.payor)}</td>
      <td>${fmtInt(r.lineItems)}</td>
      <td>${fmtInt(r.visits)}</td>
      <td>${fmtMoney(r.revenue)}</td>
      <td>${fmtMoney(r.avgTicket)}</td>
      <td>${fmtMoney(r.discount)}</td>
      <td><span class="pill ${dCls}">${fmtPct(r.discountPct)}</span></td>
    </tr>`;
  }).join('');
}

document.querySelectorAll('#payorTable th').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if (PAYOR_SORT.key === key) PAYOR_SORT.dir *= -1;
    else PAYOR_SORT = { key, dir:-1 };
    sortAndRenderPayorTable();
  });
});

let ITEM_TABLE_DATA = [];
let ITEM_SORT = { key:'qty', dir:-1 };

function renderItemTable(active){
  const byItem = new Map();
  let grandQty = 0;
  for (const r of active){
    const key = r.itemName || 'Unspecified';
    if (!byItem.has(key)) byItem.set(key, { qty:0, lineItems:0, revenue:0 });
    const g = byItem.get(key);
    g.qty += r.qty;
    g.lineItems += 1;
    g.revenue += r.amount;
    grandQty += r.qty;
  }
  ITEM_TABLE_DATA = [...byItem.entries()].map(([itemName,g])=>({
    itemName,
    qty: g.qty,
    lineItems: g.lineItems,
    revenue: g.revenue,
    avgUnitPrice: g.qty ? g.revenue/g.qty : null,
    qtyShare: grandQty ? g.qty/grandQty : null
  }));
  sortAndRenderItemTable();
}

function sortAndRenderItemTable(){
  const {key, dir} = ITEM_SORT;
  const data = [...ITEM_TABLE_DATA].sort((a,b)=>{
    let av = a[key], bv = b[key];
    if (av==null) av = -Infinity; if (bv==null) bv = -Infinity;
    if (typeof av === 'string') return dir * av.localeCompare(bv);
    return dir * (av-bv);
  });
  const tbody = document.querySelector('#itemTable tbody');
  tbody.innerHTML = data.map(r=>`<tr>
      <td>${escapeHtml(r.itemName)}</td>
      <td>${fmtInt(r.qty)}</td>
      <td>${fmtInt(r.lineItems)}</td>
      <td>${fmtMoney(r.revenue)}</td>
      <td>${fmtMoney(r.avgUnitPrice)}</td>
      <td>${fmtPct(r.qtyShare)}</td>
    </tr>`).join('');
}

document.querySelectorAll('#itemTable th').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if (ITEM_SORT.key === key) ITEM_SORT.dir *= -1;
    else ITEM_SORT = { key, dir:-1 };
    sortAndRenderItemTable();
  });
});

const DETAIL_DISPLAY_LIMIT = 500;
let DETAIL_TABLE_DATA = [];
let DETAIL_SORT = { key:'invoiceDate', dir:-1 };

function renderDetailTable(records){
  DETAIL_TABLE_DATA = records.map(r => ({
    invoiceDate: r.invoiceDate,
    invoiceNo: r.invoiceNo,
    patientName: r.patientName || '—',
    visitNo: r.visitNo || '—',
    itemName: r.itemName || '—',
    payorName: r.payorName || '—',
    doctor: r.doctor || '—',
    qty: r.qty,
    amount: r.amount,
    totalDiscount: r.totalDiscount,
    soaStatus: r.soaStatus || '—'
  }));
  sortAndRenderDetailTable();
}

function sortAndRenderDetailTable(){
  const {key, dir} = DETAIL_SORT;
  const data = [...DETAIL_TABLE_DATA].sort((a,b)=>{
    let av = a[key], bv = b[key];
    if (av==null) av = -Infinity; if (bv==null) bv = -Infinity;
    if (typeof av === 'string') return dir * av.localeCompare(bv);
    return dir * (av-bv);
  });
  const note = document.getElementById('detailTableNote');
  note.textContent = data.length > DETAIL_DISPLAY_LIMIT
    ? `Showing first ${DETAIL_DISPLAY_LIMIT.toLocaleString()} of ${data.length.toLocaleString()} filtered rows on screen — click Export CSV to download all ${data.length.toLocaleString()}.`
    : `${data.length.toLocaleString()} filtered rows.`;
  const tbody = document.querySelector('#detailTable tbody');
  tbody.innerHTML = data.slice(0, DETAIL_DISPLAY_LIMIT).map(r=>{
    const statusCls = r.soaStatus==='Cancelled' ? 'hi' : 'lo';
    return `<tr>
      <td>${r.invoiceDate!=null ? escapeHtml(new Date(r.invoiceDate).toLocaleString()) : '—'}</td>
      <td>${escapeHtml(r.invoiceNo)}</td>
      <td>${escapeHtml(r.patientName)}</td>
      <td>${escapeHtml(r.visitNo)}</td>
      <td>${escapeHtml(r.itemName)}</td>
      <td>${escapeHtml(r.payorName)}</td>
      <td>${escapeHtml(r.doctor)}</td>
      <td>${fmtInt(r.qty)}</td>
      <td>${fmtMoney(r.amount)}</td>
      <td>${fmtMoney(r.totalDiscount)}</td>
      <td><span class="pill ${statusCls}">${escapeHtml(r.soaStatus)}</span></td>
    </tr>`;
  }).join('');
}

document.querySelectorAll('#detailTable th').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if (DETAIL_SORT.key === key) DETAIL_SORT.dir *= -1;
    else DETAIL_SORT = { key, dir: key==='invoiceDate' ? -1 : 1 };
    sortAndRenderDetailTable();
  });
});

function csvEscape(v){
  const s = v==null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}

function recordsToCsv(records){
  const headers = ['Invoice Date','Invoice No','Patient Name','Visit No','Item','Payor','Doctor','Qty','Amount','Discount','SOA Status'];
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of records){
    const dateStr = r.invoiceDate!=null ? new Date(r.invoiceDate).toLocaleString() : '';
    const row = [dateStr, r.invoiceNo, r.patientName||'', r.visitNo||'', r.itemName||'', r.payorName||'', r.doctor||'', r.qty, r.amount.toFixed(2), r.totalDiscount.toFixed(2), r.soaStatus||''];
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\r\n');
}

function downloadCsv(filename, csvText){
  const blob = new Blob(['﻿' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const filtered = applyFilters(RAW_RECORDS);
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadCsv(`proser_census_export_${stamp}.csv`, recordsToCsv(filtered));
});

function renderFromBuffer(buf, fileName, lastModified, fromCache){
  document.getElementById('sourceLabel').textContent =
    'File: ' + fileName +
    (lastModified ? ' · last modified ' + new Date(lastModified).toLocaleString() : '') +
    (fromCache ? ' · loaded from local cache' : '');

  const rows = parseWorkbook(buf, fileName);
  LAST_PARSED_ROWS = rows;
  RAW_RECORDS = buildRecords(rows);
  document.getElementById('siteLabel').textContent = [SITE_INFO.site, SITE_INFO.period].filter(Boolean).join(' · ');
  populateFilterOptions(RAW_RECORDS);
  setLoading('Rendering dashboard…','');
  renderAll(applyFilters(RAW_RECORDS));
  document.getElementById('lastRefreshed').textContent = 'Last refreshed: ' + new Date().toLocaleString();
  document.getElementById('changeFileBtn').style.display = 'inline-block';
}

async function loadAndRender(opts){
  const { forcePick = false } = opts || {};
  document.getElementById('loadingOverlay').style.display = 'flex';
  document.getElementById('errorBox').style.display = 'none';
  hidePickButton();
  let usingCachedFile = false;
  try{
    let buf, fileName, lastModified;

    if (!forcePick){
      setLoading('Checking for a cached file…', '');
      const cached = await loadFileFromCache();
      if (cached && cached.buf){
        buf = cached.buf;
        fileName = cached.fileName;
        lastModified = cached.lastModified;
        usingCachedFile = true;
      }
    }

    if (!buf){
      const picked = await getWorkbookArrayBuffer({ forcePick });
      buf = picked.buf;
      fileName = picked.fileName;
      lastModified = picked.lastModified;
      await saveFileToCache(buf, fileName, lastModified);
    } else {
      setLoading('Loading cached file…', fileName);
    }

    renderFromBuffer(buf, fileName, lastModified, usingCachedFile);
    document.getElementById('loadingOverlay').style.display = 'none';
  }catch(e){
    showError(`
      <strong>Couldn't load the data.</strong><br>
      ${escapeHtml(e.message)}<br><br>
      Things to check:<br>
      &nbsp;&nbsp;• Make sure this is the "Proser Daily Census" export with columns like PIN, Invoice No, Item Name, Amount.<br>
      &nbsp;&nbsp;• Use <b>Change file</b> above to point at a different export (e.g. next month's file).<br>
      &nbsp;&nbsp;• This dashboard remembers your last imported file in this browser and reuses it on refresh/reload automatically.
      ${usingCachedFile ? '<br>&nbsp;&nbsp;• If the cached file itself is the problem, click <a href="#" id="forgetCacheLink">forget the cached file</a> and reload.' : ''}
    `);
    if (usingCachedFile){
      const link = document.getElementById('forgetCacheLink');
      if (link) link.addEventListener('click', async (e) => {
        e.preventDefault();
        await clearFileCache();
        location.reload();
      });
    }
    console.error(e);
  }
}

async function importFile(file){
  document.getElementById('loadingOverlay').style.display = 'flex';
  document.getElementById('errorBox').style.display = 'none';
  hidePickButton();
  setLoading('Reading the file…', file.name);
  try{
    const buf = await file.arrayBuffer();
    await saveFileToCache(buf, file.name, file.lastModified);
    renderFromBuffer(buf, file.name, file.lastModified, false);
    document.getElementById('loadingOverlay').style.display = 'none';
    showToast('Imported ' + file.name);
  }catch(e){
    document.getElementById('loadingOverlay').style.display = 'none';
    showToast("Couldn't import " + file.name + ' — ' + e.message, true);
    console.error(e);
  }
}

document.getElementById('refreshBtn').addEventListener('click', () => loadAndRender());
document.getElementById('changeFileBtn').addEventListener('click', () => loadAndRender({ forcePick: true }));
document.getElementById('clearCacheBtn').addEventListener('click', async () => {
  await clearFileCache();
  showToast('Cached file removed — next refresh or reload will ask you to import again.');
});
document.getElementById('applyFilters').addEventListener('click', ()=> renderAll(applyFilters(RAW_RECORDS)));
document.getElementById('clearFilters').addEventListener('click', ()=>{
  document.querySelectorAll('#filterBar input[type=text], #filterBar input[type=date]').forEach(i=>i.value='');
  document.querySelectorAll('#filterBar select').forEach(s=>s.value='');
  document.getElementById('fSeniorOnly').checked = false;
  Object.keys(SELECTED).forEach(key=>{ SELECTED[key].clear(); renderMselChips(key); });
  DETAIL_SORT = { key:'invoiceDate', dir:-1 };
  renderAll(applyFilters(RAW_RECORDS));
});

function loadScriptWithFallback(urls, checkFn, label){
  return new Promise((resolve, reject) => {
    let i = 0;
    function tryNext(){
      if (i >= urls.length){
        reject(new Error(`Couldn't load ${label} from any source (tried ${urls.length} URL(s)). Check your internet connection.`));
        return;
      }
      const url = urls[i++];
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => {
        if (!checkFn || checkFn()) resolve();
        else { console.warn(`[diag] ${label} loaded from ${url} but sanity check failed, trying next source`); tryNext(); }
      };
      s.onerror = () => { console.warn(`[diag] ${label} failed to load from ${url}, trying next source`); tryNext(); };
      document.head.appendChild(s);
    }
    tryNext();
  });
}

async function loadLibraries(){
  await loadScriptWithFallback([
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
  ], () => typeof XLSX !== 'undefined', 'SheetJS (xlsx)');

  await loadScriptWithFallback([
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
    'https://unpkg.com/chart.js@4.4.4/dist/chart.umd.min.js'
  ], () => typeof Chart !== 'undefined', 'Chart.js');

  await loadScriptWithFallback([
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
    'https://unpkg.com/papaparse@5.4.1/papaparse.min.js'
  ], () => typeof Papa !== 'undefined', 'PapaParse');
}

(async () => {
  try{
    setLoading('Loading required libraries…', 'SheetJS, Chart.js, PapaParse');
    await loadLibraries();
    if (typeof Chart !== 'undefined'){
      Chart.defaults.color = '#c7d0dc';
      Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';
    }
  }catch(e){
    showError(`
      <strong>Couldn't load required JavaScript libraries.</strong><br>
      ${escapeHtml(e.message)}<br><br>
      This dashboard loads three libraries (SheetJS, Chart.js, PapaParse) from a CDN each time it opens — it needs an internet connection to do that, even though your data stays local. Try refreshing (Ctrl+Shift+R), or check whether your network blocks cdnjs.cloudflare.com / cdn.jsdelivr.net / unpkg.com.
    `);
    console.error(e);
    return;
  }
  loadAndRender();
})();