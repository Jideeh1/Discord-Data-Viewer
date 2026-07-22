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

"use strict";
(function(){

const ICON = {
  account:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  activities:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 12h4M10 10v4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="14" r="1"/></svg>',
  activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/></svg>',
  ads:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6"/></svg>',
  messages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>',
  servers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="17" r="1"/></svg>',
  support:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/></svg>',
  files:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>',
  hash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>'
};

const state = {
  zip:null,
  paths:[],
  lower:{},
  textCache:{},
  blobCache:{},
  sections:[],
  current:null,
  jsonStore:[],
};

const $ = s=>document.querySelector(s);
const el = (t,c,html)=>{const e=document.createElement(t);if(c)e.className=c;if(html!=null)e.innerHTML=html;return e;};
const esc = s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

function seg(path){ return path.split('/').filter(Boolean); }

function firstSeg(path){ return seg(path)[0]||''; }

async function getText(path){
  if(state.textCache[path]!=null) return state.textCache[path];
  const real = state.lower[path.toLowerCase()] || path;
  const f = state.zip.file(real);
  if(!f) return null;
  const t = await f.async('text');
  state.textCache[path]=t;
  return t;
}
async function getJSON(path){
  const t = await getText(path);
  if(t==null) return null;
  try{ return JSON.parse(t); }catch(e){ return {__parseError:e.message, __raw:t.slice(0,4000)}; }
}
async function getBlobURL(path){
  if(state.blobCache[path]) return state.blobCache[path];
  const real = state.lower[path.toLowerCase()] || path;
  const f = state.zip.file(real);
  if(!f) return null;
  const blob = await f.async('blob');
  const url = URL.createObjectURL(blob);
  state.blobCache[path]=url;
  return url;
}

function filesUnder(prefix){
  const p = prefix.toLowerCase();
  return state.paths.filter(x=>x.toLowerCase().startsWith(p));
}
function baseName(p){ const s=seg(p); return s[s.length-1]; }
function prettyFromFile(name){
  return name.replace(/\.json$/i,'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function prettySchema(name){
  return name.replace(/^discord[_-]?/i,'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim();
}

function pushJSON(v){ state.jsonStore.push(v); return state.jsonStore.length-1; }

function jsonTree(value, key){
  const wrap = el('div');
  wrap.appendChild(nodeFor(value, key));
  return wrap;
}
function nodeFor(value, key){
  const keyHtml = key!=null ? '<span class="jk">'+esc(key)+'</span>: ' : '';
  if(value===null) return el('div',null,keyHtml+'<span class="jnull">null</span>');
  const t = typeof value;
  if(t==='string') return el('div',null,keyHtml+'<span class="js">"'+esc(value)+'"</span>');
  if(t==='number') return el('div',null,keyHtml+'<span class="jn">'+esc(value)+'</span>');
  if(t==='boolean') return el('div',null,keyHtml+'<span class="jb">'+value+'</span>');
  if(Array.isArray(value)){
    if(value.length===0) return el('div',null,keyHtml+'<span class="jcount">[ ] empty</span>');
    const d = el('details'); if(value.length<=20 && JSON.stringify(value).length<400) d.open=true;
    const sum = el('summary',null,keyHtml+'<span class="jcount">Array('+value.length+')</span>');
    d.appendChild(sum);
    const ch = el('div','children');
    value.forEach((v,i)=>ch.appendChild(nodeFor(v, String(i))));
    d.appendChild(ch); return d;
  }
  if(t==='object'){
    const keys = Object.keys(value);
    if(keys.length===0) return el('div',null,keyHtml+'<span class="jcount">{ } empty</span>');
    const d = el('details'); if(keys.length<=12 && JSON.stringify(value).length<400) d.open=true;
    const sum = el('summary',null,keyHtml+'<span class="jcount">Object('+keys.length+')</span>');
    d.appendChild(sum);
    const ch = el('div','children');
    keys.forEach(k=>ch.appendChild(nodeFor(value[k], k)));
    d.appendChild(ch); return d;
  }
  return el('div',null,keyHtml+esc(String(value)));
}

function cellHTML(v, enumMap){
  if(v===null||v===undefined) return '<span class="muted">—</span>';
  const t = typeof v;
  if(t==='object'){
    const idx = pushJSON(v);
    const preview = Array.isArray(v)? 'Array('+v.length+')' : '{'+Object.keys(v).length+' fields}';
    return '<button class="cell-json" data-json="'+idx+'">'+preview+'</button>';
  }
  let base = esc(String(v));
  if(t==='string' && v.length>60) base = '<span class="cellclip" title="'+esc(v)+'">'+base+'</span>';
  if(enumMap && (t==='number'||/^\d+$/.test(v)) && enumMap[v]!=null){
    base += ' <span class="enum-tag">('+esc(enumMap[v])+')</span>';
  }

  if(t==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v)){
    const d = new Date(v);
    if(!isNaN(d)) base = '<span title="'+esc(v)+'">'+esc(d.toLocaleString())+'</span>';
  }
  return base;
}
function parseEnumMap(desc){
  if(!desc || desc.indexOf('{')<0) return null;
  const map={}; let found=false;
  const re=/(\d+)\s*:\s*'([^']*)'/g; let m;
  while((m=re.exec(desc))){ map[m[1]]=m[2]; found=true; }
  return found?map:null;
}

function openModal(title, value){
  $('#modal-title').textContent = title||'Value';
  const body = $('#modal-body'); body.innerHTML='';
  const tree = el('div','jtree'); tree.appendChild(jsonTree(value));
  body.appendChild(tree);
  $('#modal-bg').classList.add('show');
}
$('#modal-close').onclick = ()=>$('#modal-bg').classList.remove('show');
$('#modal-bg').onclick = e=>{ if(e.target===$('#modal-bg')) $('#modal-bg').classList.remove('show'); };
document.addEventListener('click', e=>{
  const b = e.target.closest('.cell-json');
  if(b){ const v = state.jsonStore[+b.dataset.json]; openModal('Details', v); }
});

function buildTable(records, opts){
  opts = opts||{};
  const wrap = el('div');
  if(!records || records.length===0){
    wrap.appendChild(emptyState('No records','This section is present but contains no entries.'));
    return wrap;
  }

  let cols;
  if(opts.columnsMeta){ cols = opts.columnsMeta; }
  else {
    const set=[]; const seen={};
    const sample = records.slice(0, 500);
    sample.forEach(r=>{ if(r&&typeof r==='object'&&!Array.isArray(r)) Object.keys(r).forEach(k=>{ if(!seen[k]){seen[k]=1;set.push(k);} }); });
    cols = set.map(k=>({key:k,label:k}));
  }

  const toolbar = el('div','table-toolbar');
  const searchInput = el('input'); searchInput.type='text'; searchInput.placeholder='Filter rows…';
  toolbar.appendChild(searchInput);
  let filterField=null, filterSelect=null;
  if(opts.filterKey){
    const vals = Array.from(new Set(records.map(r=>r && r[opts.filterKey]).filter(v=>v!=null))).sort();
    if(vals.length>1 && vals.length<400){
      filterSelect = el('select');
      filterSelect.appendChild(new Option('All '+opts.filterKey+' ('+vals.length+')',''));
      vals.forEach(v=>filterSelect.appendChild(new Option(String(v),String(v))));
      toolbar.appendChild(filterSelect); filterField=opts.filterKey;
    }
  }
  const count = el('span','muted'); count.style.marginLeft='auto';
  toolbar.appendChild(count);
  wrap.appendChild(toolbar);

  const tableWrap = el('div','table-wrap');
  const table = el('table');
  const thead = el('thead');
  const htr = el('tr');
  cols.forEach(c=>{ const th=el('th',null,esc(c.label)); if(c.desc) th.title=c.desc; htr.appendChild(th); });
  thead.appendChild(htr); table.appendChild(thead);
  const tbody = el('tbody'); table.appendChild(tbody);
  tableWrap.appendChild(table); wrap.appendChild(tableWrap);

  const pager = el('div','pager');
  const prev = el('button',null,'Prev'); const next=el('button',null,'Next');
  const pageInfo = el('span'); const jump = el('input'); jump.type='number'; jump.min='1'; jump.style.width='64px';
  pager.appendChild(prev); pager.appendChild(pageInfo); pager.appendChild(next);
  pager.appendChild(el('span','muted','Go to')); pager.appendChild(jump);
  wrap.appendChild(pager);

  const PAGE=100; let page=0; let filtered=records;
  function applyFilter(){
    const q=searchInput.value.trim().toLowerCase();
    const fv=filterSelect?filterSelect.value:'';
    filtered = records.filter(r=>{
      if(!r) return false;
      if(fv && String(r[filterField])!==fv) return false;
      if(!q) return true;
      return JSON.stringify(r).toLowerCase().indexOf(q)>=0;
    });
    page=0; render();
  }
  function render(){
    const total=filtered.length; const pages=Math.max(1,Math.ceil(total/PAGE));
    if(page>=pages) page=pages-1; if(page<0) page=0;
    const start=page*PAGE; const rows=filtered.slice(start,start+PAGE);
    tbody.innerHTML='';
    rows.forEach(r=>{
      const tr=el('tr');
      cols.forEach(c=>{
        const td=el('td');
        td.innerHTML=cellHTML(r?r[c.key]:null, c.enumMap);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    count.textContent = total.toLocaleString()+' record'+(total===1?'':'s');
    pageInfo.textContent = 'Page '+(page+1)+' / '+pages;
    prev.disabled = page===0; next.disabled = page>=pages-1;
    jump.max=String(pages);
  }
  searchInput.oninput = debounce(applyFilter,180);
  if(filterSelect) filterSelect.onchange=applyFilter;
  prev.onclick=()=>{page--;render();};
  next.onclick=()=>{page++;render();};
  jump.onchange=()=>{const p=parseInt(jump.value)-1; if(!isNaN(p)){page=p;render();}};
  render();
  return wrap;
}
function debounce(fn,ms){let t;return function(){clearTimeout(t);const a=arguments,c=this;t=setTimeout(()=>fn.apply(c,a),ms);};}

function emptyState(title,desc){
  return el('div','empty','<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#949ba4" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg><div style="color:var(--text-strong);font-weight:600;margin-bottom:4px">'+esc(title)+'</div><div>'+esc(desc||'')+'</div>');
}

function renderEnveloped(obj){
  const wrap=el('div');
  const meta = obj.metadata||{};
  const recs = obj.records||[];
  const title = obj.section || (meta.name) || 'Records';
  const desc = meta.description || meta.schema_description || '';
  const head = el('div');
  head.appendChild(el('div','page-title',esc(title)));
  if(desc) head.appendChild(el('div','page-desc',esc(desc)));
  wrap.appendChild(head);

  let columnsMeta=null;
  const recKeys = recs.length? Object.keys(recs.find(r=>r&&typeof r==='object')||{}) : [];
  const cols = meta.columns||[];
  if(cols.length && recKeys.length && cols.length===recKeys.length){
    columnsMeta = recKeys.map((k,i)=>({
      key:k,
      label:cols[i] && cols[i].name ? cols[i].name : k,
      desc:cols[i] && cols[i].description ? cols[i].description : '',
      enumMap: cols[i] ? parseEnumMap(cols[i].description) : null
    }));
  } else if(cols.length && recKeys.length){

    columnsMeta = recKeys.map(k=>{
      const match = cols.find(c=>c.name && c.name.toLowerCase().replace(/[^a-z0-9]/g,'')===k.toLowerCase().replace(/[^a-z0-9]/g,''));
      return {key:k,label:match?match.name:k,desc:match?match.description:'',enumMap:match?parseEnumMap(match.description):null};
    });
  }
  wrap.appendChild(buildTable(recs,{columnsMeta}));

  if(columnsMeta){
    const withInfo = columnsMeta.filter(c=>c.desc);
    if(withInfo.length){
      const card=el('div','card'); card.style.marginTop='16px';
      card.appendChild(el('h3',null,'Column reference'));
      const kv=el('div','kv');
      withInfo.forEach(c=>{ kv.appendChild(el('div','k',esc(c.label))); kv.appendChild(el('div','v',esc(c.desc))); });
      card.appendChild(kv); wrap.appendChild(card);
    }
  }
  return wrap;
}

function isEnveloped(obj){ return obj && typeof obj==='object' && Array.isArray(obj.records) && obj.metadata; }

function isScalar(v){ return v===null || typeof v!=='object'; }
function prettyKey(k){
  return String(k).replace(/[_-]+/g,' ').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase()).trim();
}
function isPlainObject(v){ return v && typeof v==='object' && !Array.isArray(v); }
function objectToRows(obj){
  return Object.keys(obj).map(k=>{
    const v=obj[k];
    const row=isPlainObject(v)?Object.assign({},v):{Value:v};
    return Object.assign({Key:k}, row);
  });
}
function renderValue(value, depth){
  depth=depth||0;
  if(isScalar(value)){ const d=el('div','val-scalar'); d.innerHTML=cellHTML(value); return d; }
  if(Array.isArray(value)){
    if(value.length===0) return el('div','muted','None');
    if(value.every(Array.isArray)){
      const flat=[]; value.forEach(a=>a.forEach(x=>flat.push(x)));
      if(flat.length===0) return el('div','muted','None');
      return renderValue(flat, depth);
    }
    if(value.every(v=>isPlainObject(v))) return buildTable(value,{});
    if(value.every(isScalar)){
      const box=el('div','chips'); const LIM=150;
      value.slice(0,LIM).forEach(v=>box.appendChild(el('span','pill',esc(String(v)))));
      if(value.length>LIM) box.appendChild(el('span','muted','+'+(value.length-LIM)+' more'));
      return box;
    }
    const list=el('div','vlist');
    value.forEach((v,i)=>{ const row=el('div','vrow'); row.appendChild(el('div','vrow-k','['+i+']')); const vc=el('div','vrow-v'); vc.appendChild(renderValue(v,depth+1)); row.appendChild(vc); list.appendChild(row); });
    return list;
  }
  const keys=Object.keys(value);
  if(keys.length===0) return el('div','muted','Empty');
  if(depth>=6){ const t=el('div','jtree'); t.appendChild(jsonTree(value)); return t; }
  const allObjVals = keys.every(k=>isPlainObject(value[k]));
  if(allObjVals && keys.length>=3 && depth>=1) return buildTable(objectToRows(value),{});
  const frag=el('div');
  const scalarKeys=keys.filter(k=>isScalar(value[k]));
  const complexKeys=keys.filter(k=>!isScalar(value[k]));
  if(scalarKeys.length){
    const kv=el('div','kv');
    scalarKeys.forEach(k=>{ kv.appendChild(el('div','k',esc(prettyKey(k)))); const v=el('div','v'); v.innerHTML=cellHTML(value[k]); kv.appendChild(v); });
    frag.appendChild(kv);
  }
  complexKeys.forEach(k=>{
    const sec=el('div','subsec');
    sec.appendChild(el('div','subsec-h',esc(prettyKey(k))));
    const bodyWrap=el('div','subsec-b'); bodyWrap.appendChild(renderValue(value[k], depth+1)); sec.appendChild(bodyWrap);
    frag.appendChild(sec);
  });
  return frag;
}
function renderAnyJSON(obj, title){
  const wrap=el('div');
  if(obj && obj.__parseError){
    if(title) wrap.appendChild(el('div','page-title',esc(title)));
    wrap.appendChild(emptyState('Could not parse JSON', obj.__parseError));
    return wrap;
  }
  if(isEnveloped(obj)) return renderEnveloped(obj);
  if(title) wrap.appendChild(el('div','page-title',esc(title)));

  if(isPlainObject(obj)){
    const keys=Object.keys(obj);
    const scalarKeys=keys.filter(k=>isScalar(obj[k]));
    const complexKeys=keys.filter(k=>!isScalar(obj[k]));
    if(scalarKeys.length){
      const card=el('div','card'); card.appendChild(el('h3',null,'Details'));
      const kv=el('div','kv');
      scalarKeys.forEach(k=>{ kv.appendChild(el('div','k',esc(prettyKey(k)))); const v=el('div','v'); v.innerHTML=cellHTML(obj[k]); kv.appendChild(v); });
      card.appendChild(kv); wrap.appendChild(card);
    }
    complexKeys.forEach(k=>{
      const card=el('div','card'); card.appendChild(el('h3',null,esc(prettyKey(k))));
      card.appendChild(renderValue(obj[k],1)); wrap.appendChild(card);
    });
    if(!keys.length) wrap.appendChild(emptyState('Empty','This file has no data.'));
    return wrap;
  }
  const card=el('div','card'); card.appendChild(renderValue(obj,0)); wrap.appendChild(card);
  return wrap;
}
function renderReadable(obj){
  if(isEnveloped(obj)) return renderEnveloped(obj);
  if(obj && obj.__parseError) return emptyState('Could not parse JSON', obj.__parseError);
  return renderValue(obj,1);
}

const PREMIUM_TYPES={0:'No Nitro',1:'Nitro Classic',2:'Nitro',3:'Nitro Basic'};
const USER_FLAGS=[[0,'Discord Staff'],[1,'Partner'],[2,'HypeSquad Events'],[3,'Bug Hunter'],[6,'HypeSquad Bravery'],[7,'HypeSquad Brilliance'],[8,'HypeSquad Balance'],[9,'Early Supporter'],[14,'Bug Hunter Gold'],[17,'Early Verified Bot Developer'],[18,'Moderator Programs Alumni'],[22,'Active Developer']];

function snowflakeToDate(id){
  try{
    if(id==null) return null;
    const s=String(id).replace(/[^0-9]/g,''); if(!s) return null;
    const ms=(BigInt(s)>>22n)+1420070400000n;
    const d=new Date(Number(ms));
    return isNaN(d.getTime())?null:d;
  }catch(e){ return null; }
}
function decodeUserFlags(v){
  const out=[]; let n; try{ n=BigInt(v); }catch(e){ return out; }
  for(const pair of USER_FLAGS){ if((n>>BigInt(pair[0]))&1n) out.push(pair[1]); }
  return out;
}
function hexColor(v){
  if(v==null) return null;
  if(typeof v==='string') return /^#/.test(v)?v:('#'+v.replace(/[^0-9a-fA-F]/g,'').slice(0,6));
  if(typeof v==='number') return '#'+(v>>>0).toString(16).padStart(6,'0').slice(-6);
  return null;
}
function pickField(obj){
  if(!obj||typeof obj!=='object') return undefined;
  const low={}; Object.keys(obj).forEach(k=>low[k.toLowerCase()]=k);
  for(let i=1;i<arguments.length;i++){ const k=low[String(arguments[i]).toLowerCase()]; if(k!=null && obj[k]!=null && obj[k]!=='') return obj[k]; }
  return undefined;
}
function renderProfile(obj, avatarUrl){
  const wrap=el('div');
  if(!obj || obj.__parseError){ wrap.appendChild(emptyState('Could not read profile', (obj&&obj.__parseError)||'user.json missing')); return wrap; }
  const src=(obj.user&&typeof obj.user==='object')?Object.assign({},obj,obj.user):obj;
  const username=pickField(src,'username');
  const globalName=pickField(src,'global_name','display_name');
  const disc=pickField(src,'discriminator');
  const id=pickField(src,'id','user_id');
  const bio=pickField(src,'bio','about_me');
  const email=pickField(src,'email');
  const phone=pickField(src,'phone');
  const premium=pickField(src,'premium_type');
  const flagsVal=pickField(src,'public_flags','flags');
  const accent=hexColor(pickField(src,'banner_color','accent_color'));
  const verified=pickField(src,'verified');
  const mfa=pickField(src,'mfa_enabled');
  const display=globalName||username||'Unknown User';
  const handle=username?('@'+username+((disc&&disc!=='0')?('#'+disc):'')):null;
  const created=snowflakeToDate(id);
  const badges=flagsVal!=null?decodeUserFlags(flagsVal):[];
  if(premium!=null && premium!==0 && PREMIUM_TYPES[premium]) badges.unshift(PREMIUM_TYPES[premium]);

  const card=el('div','profile-card');
  const banner=el('div','profile-banner'); if(accent) banner.style.background=accent; card.appendChild(banner);
  const top=el('div','profile-top');
  const headrow=el('div','profile-headrow');
  let av;
  if(avatarUrl){ av=el('img','profile-avatar'); av.src=avatarUrl; av.alt=display; }
  else { av=el('div','profile-avatar'); av.textContent=display.slice(0,1).toUpperCase(); }
  headrow.appendChild(av);
  if(badges.length){ const bd=el('div','profile-badges'); badges.forEach(b=>bd.appendChild(el('span','profile-badge',esc(b)))); headrow.appendChild(bd); }
  top.appendChild(headrow);

  const inner=el('div','profile-inner');
  inner.appendChild(el('div','profile-dn',esc(display)));
  if(handle) inner.appendChild(el('div','profile-un',esc(handle)));
  inner.appendChild(el('div','profile-divider'));
  function addSec(title,val){ const s=el('div','profile-section'); s.appendChild(el('h5',null,esc(title))); s.appendChild(el('div','profile-val',esc(val))); inner.appendChild(s); }
  if(bio) addSec('About Me', bio);
  if(created) addSec('Discord Member Since', created.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}));
  if(id) addSec('User ID', id);
  if(email) addSec('Email', email);
  if(phone) addSec('Phone', phone);
  const sec=[]; if(verified!=null) sec.push('Email '+(verified?'verified':'not verified')); if(mfa!=null) sec.push('2FA '+(mfa?'enabled':'disabled'));
  if(sec.length) addSec('Security', sec.join('  •  '));
  top.appendChild(inner);
  card.appendChild(top);
  const holder=el('div','profile-wrap'); holder.appendChild(card); wrap.appendChild(holder);

  const raw=el('details','profile-raw');
  raw.appendChild(el('summary',null,'All profile fields'));
  const tree=el('div','jtree'); tree.appendChild(jsonTree(obj)); raw.appendChild(tree);
  wrap.appendChild(raw);
  return wrap;
}

const STOPWORDS=new Set("a an the and or but if then so of to in on at for from with without into onto is are was were be been being am do does did done have has had having i you he she it we they me him her us them my your his its our their this that these those there here what which who whom whose when where why how not no yes just like get got go going im ive id ill youre dont cant wont didnt isnt oh ok okay yeah yep nah lol lmao xd http https www com gg amp really very much some any all one two can will now new out up down off over about as by".split(/\s+/));
function tokenize(s){
  if(!s) return [];
  return String(s).toLowerCase().replace(/https?:\/\/\S+/g,' ').replace(/<[^>]+>/g,' ').replace(/[^a-z0-9']+/g,' ').split(/\s+/).filter(w=>w.length>=3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}
function evDate(ev){
  const v=ev.timestamp||ev.client_track_timestamp||ev.ts||ev.day||ev.created_at||ev.event_timestamp;
  if(v==null) return null;
  if(typeof v==='number'){ const ms=v>1e12?v:(v>1e9?v*1000:v); const d=new Date(ms); return isNaN(d.getTime())?null:d; }
  const d=new Date(v); return isNaN(d.getTime())?null:d;
}
function categorizeEvent(et){
  et=String(et).toLowerCase();
  if(/notif.*(click|open|action|tap)/.test(et)) return 'notif';
  if(/(app.?(open|launch|start))|(open.?app)|session_start|^launch/.test(et)) return 'open';
  if(/(add|create).?reaction|reaction.?add|reaction_added/.test(et)) return 'reaction';
  if(/message.?edit|edit.?message/.test(et)) return 'edit';
  if(/slash|application_command|command_used/.test(et)) return 'slash';
  if(/voice.*(join|connect)|join.*voice/.test(et)) return 'voice';
  if(/call.*(accept|join|connect|start|ring)|accept.*call/.test(et)) return 'call';
  if(/message.?(sent|send|create)|send_message/.test(et)) return 'msg';
  return null;
}
async function computeStats(){
  const stats={
    totalMessages:0,totalChars:0,byHour:new Array(24).fill(0),
    dayCount:{},words:{},perChannel:{},perDM:{},dmUsers:new Set(),
    firstTs:null,lastTs:null,
    analytics:{open:0,notif:0,reaction:0,edit:0,slash:0,voice:0,call:0,msg:0},
    eventTypes:{},openDays:{},spend:{}
  };
  const msgTop=filesUnder('messages/');
  const chanDirs={};
  msgTop.forEach(p=>{ const parts=seg(p); if(parts.length>=3)(chanDirs[parts[1]]=chanDirs[parts[1]]||[]).push(p); });
  for(const cid of Object.keys(chanDirs)){
    try{
      const files=chanDirs[cid];
      const chFile=files.find(p=>/channel\.json$/i.test(p));
      const msgFile=files.find(p=>/messages\.json$/i.test(p));
      const ch=chFile?await getJSON(chFile):null;
      const name=(ch&&ch.name)||null;
      const isDM=!!(ch&&ch.type&&/dm/i.test(String(ch.type)));
      if(!msgFile) continue;
      const o=await getJSON(msgFile);
      const msgs=Array.isArray(o)?o:(o&&Array.isArray(o.messages)?o.messages:[]);
      if(!msgs.length) continue;
      const k=detectMsgKeys(msgs[0]);
      let chanCount=0;
      for(const msg of msgs){
        stats.totalMessages++; chanCount++;
        const content=k.content?(msg[k.content]||''):'';
        stats.totalChars+=String(content).length;
        const toks=tokenize(content);
        for(const w of toks) stats.words[w]=(stats.words[w]||0)+1;
        if(k.ts&&msg[k.ts]){
          const d=new Date(msg[k.ts]);
          if(!isNaN(d.getTime())){
            stats.byHour[d.getHours()]++;
            const day=d.toISOString().slice(0,10);
            stats.dayCount[day]=(stats.dayCount[day]||0)+1;
            const t=d.getTime();
            if(stats.firstTs==null||t<stats.firstTs) stats.firstTs=t;
            if(stats.lastTs==null||t>stats.lastTs) stats.lastTs=t;
          }
        }
      }
      stats.perChannel[cid]={name:name||cid,count:chanCount,dm:isDM};
      if(isDM){
        stats.perDM[cid]={name:name||cid,count:chanCount};
        stats.dmUsers.add(cid);
        if(ch&&Array.isArray(ch.recipients)) ch.recipients.forEach(r=>stats.dmUsers.add(typeof r==='string'?r:(r&&r.id)));
      }
    }catch(e){}
  }
  try{
    const idxPath=msgTop.find(p=>/\/index\.json$/i.test(p)&&seg(p).length===2);
    if(idxPath){
      const idx=await getJSON(idxPath);
      if(idx&&!idx.__parseError){
        Object.keys(stats.perChannel).forEach(cid=>{
          const nm=idx[cid]||idx[cid.replace(/^c/,'')];
          if(nm){ stats.perChannel[cid].name=nm; if(stats.perDM[cid]) stats.perDM[cid].name=nm; }
        });
      }
    }
  }catch(e){}
  const actFiles=filesUnder('activity/').filter(p=>/\.json$/i.test(p));
  for(const f of actFiles){
    try{
      const rows=parseEventFile(await getText(f));
      for(const ev of rows){
        if(!ev||typeof ev!=='object') continue;
        const et=ev.event_type||ev.type||ev.event||ev.name;
        if(!et) continue;
        stats.eventTypes[et]=(stats.eventTypes[et]||0)+1;
        const cat=categorizeEvent(et);
        if(cat){ stats.analytics[cat]++; if(cat==='open'){ const d=evDate(ev); if(d) stats.openDays[d.toISOString().slice(0,10)]=1; } }
      }
    }catch(e){}
  }
  try{
    const payPath=state.paths.find(p=>/discord_billing\/payments\.json$/i.test(p));
    if(payPath){
      const pj=await getJSON(payPath);
      const recs=(pj&&pj.records)||[];
      recs.forEach(r=>{
        const amt=r.amount!=null?r.amount:(r.total!=null?r.total:null);
        const cur=String(r.currency||'').toUpperCase()||'USD';
        if(typeof amt==='number') stats.spend[cur]=(stats.spend[cur]||0)+amt;
      });
    }
  }catch(e){}
  return stats;
}
function nf(n){ return Number(n||0).toLocaleString(); }
function spanDays(stats){
  if(stats.firstTs!=null&&stats.lastTs!=null){ return Math.max(1, Math.round((stats.lastTs-stats.firstTs)/86400000)); }
  const d=Object.keys(stats.dayCount).length; return Math.max(1,d);
}
function formatSpend(spend){
  const sym={USD:'$',EUR:'€',GBP:'£',PHP:'₱',JPY:'¥',AUD:'A$',CAD:'C$'};
  const parts=Object.keys(spend).map(cur=>{ const val=spend[cur]/100; const s=sym[cur]||''; return s?(s+val.toFixed(2)):(val.toFixed(2)+' '+cur); });
  return parts.length?parts.join(' + '):null;
}
function statCard(num,label,accent){
  const c=el('div','stat'+(accent?' accent':''));
  c.appendChild(el('div','num',esc(num)));
  c.appendChild(el('div','lbl',esc(label)));
  return c;
}
function rankList(items,max){
  const box=el('div','rank');
  items.forEach((it,i)=>{
    const row=el('div','row');
    row.appendChild(el('div','rk','#'+(i+1)));
    row.appendChild(el('div','nm',esc(it.name)));
    const track=el('div','track'); const fill=el('div','fill'); fill.style.width=(max?Math.max(4,it.count/max*100):0)+'%'; track.appendChild(fill); row.appendChild(track);
    row.appendChild(el('div','ct',nf(it.count)));
    box.appendChild(row);
  });
  return box;
}
function renderWrapped(stats){
  const wrap=el('div','wrapped');
  wrap.appendChild(el('div','wrap-h','Your Discord in numbers'));

  const grid=el('div','stat-grid');
  grid.appendChild(statCard(nf(stats.dmUsers.size),'distinct users you talked to',true));
  grid.appendChild(statCard(nf(stats.totalMessages),'messages sent on Discord'));
  if(stats.analytics.open>0) grid.appendChild(statCard(nf(stats.analytics.open),'times you opened Discord'));
  const spend=formatSpend(stats.spend);
  if(spend) grid.appendChild(statCard(spend,'spent on Discord'));
  grid.appendChild(statCard(nf(stats.totalChars),'characters typed'));
  if(stats.analytics.notif>0) grid.appendChild(statCard(nf(stats.analytics.notif),'notifications clicked'));
  wrap.appendChild(grid);

  const days=spanDays(stats);
  const msgPerDay=Math.round(stats.totalMessages/days);
  wrap.appendChild(el('div','hl','That\u2019s about <b>~'+nf(msgPerDay)+'</b> messages per day!'));
  if(stats.analytics.open>0){
    const od=Object.keys(stats.openDays).length||days;
    wrap.appendChild(el('div','hl','You are opening Discord <b>~'+nf(Math.round(stats.analytics.open/Math.max(1,od)))+'</b> times per day!'));
  }

  const topWords=Object.keys(stats.words).sort((a,b)=>stats.words[b]-stats.words[a]).slice(0,5);
  if(topWords.length){
    const card=el('div','card');
    card.appendChild(el('h3',null,'Your favorite words'));
    const chips=el('div','chips');
    topWords.forEach(w=>{ const p=el('span','pill b',esc(w)+' \u00b7 '+nf(stats.words[w])); chips.appendChild(p); });
    card.appendChild(chips);
    wrap.appendChild(card);
  }

  const maxHour=Math.max.apply(null,stats.byHour.concat([1]));
  const gcard=el('div','card');
  gcard.appendChild(el('h3',null,'When you\u2019re active \u2014 messages by hour'));
  const bars=el('div','bars');
  for(let h=0;h<24;h++){
    const bar=el('div','bar'); bar.style.height=(stats.byHour[h]/maxHour*100)+'%';
    bar.appendChild(el('span',null,h+':00 \u2014 '+nf(stats.byHour[h])));
    bars.appendChild(bar);
  }
  gcard.appendChild(bars);
  const axis=el('div','bar-axis');
  ['12am','6am','12pm','6pm','11pm'].forEach(l=>axis.appendChild(el('span',null,l)));
  gcard.appendChild(axis);
  wrap.appendChild(gcard);

  const topChannels=Object.values(stats.perChannel).sort((a,b)=>b.count-a.count).slice(0,8);
  if(topChannels.length){
    const card=el('div','card'); card.appendChild(el('h3',null,'Top channels'));
    card.appendChild(rankList(topChannels, topChannels[0].count));
    wrap.appendChild(card);
  }
  const topUsers=Object.values(stats.perDM).sort((a,b)=>b.count-a.count).slice(0,8);
  if(topUsers.length){
    const card=el('div','card'); card.appendChild(el('h3',null,'People you chat with most'));
    card.appendChild(rankList(topUsers, topUsers[0].count));
    wrap.appendChild(card);
  }

  const textChannels=Object.values(stats.perChannel).filter(c=>!c.dm).length;
  const ach=[];
  if(stats.analytics.voice>0) ach.push(['You joined ', stats.analytics.voice, ' voice channels']);
  if(stats.analytics.call>0) ach.push(['You accepted ', stats.analytics.call, ' calls']);
  if(stats.analytics.reaction>0) ach.push(['You added ', stats.analytics.reaction, ' reactions on messages']);
  if(stats.analytics.edit>0) ach.push(['You edited ', stats.analytics.edit, ' of your messages']);
  if(stats.analytics.slash>0) ach.push(['You used ', stats.analytics.slash, ' slash commands']);
  if(textChannels>0) ach.push(['You have spoken in ', textChannels, ' different text channels']);
  if(ach.length){
    const card=el('div','card'); card.appendChild(el('h3',null,'Along the way\u2026'));
    const list=el('div','ach');
    ach.forEach(a=>{ const item=el('div','item'); item.appendChild(el('span','ic','\u25C6')); const txt=el('span'); txt.innerHTML=esc(a[0])+'<b>'+nf(a[1])+'</b>'+esc(a[2]); item.appendChild(txt); list.appendChild(item); });
    card.appendChild(list);
    wrap.appendChild(card);
  }

  const evKeys=Object.keys(stats.eventTypes);
  const anyAnalytics=Object.values(stats.analytics).some(v=>v>0);
  if(evKeys.length && !anyAnalytics){
    wrap.appendChild(el('div','hl','Some action stats couldn\u2019t be matched to your analytics event names. Expand below to see what\u2019s in your data.'));
  }
  if(evKeys.length){
    const det=el('details','profile-raw');
    det.appendChild(el('summary',null,'Detected analytics events ('+evKeys.length+' types)'));
    const rows=evKeys.map(k=>({Event:k,Count:stats.eventTypes[k]})).sort((a,b)=>b.Count-a.Count);
    det.appendChild(buildTable(rows,{}));
    wrap.appendChild(det);
  } else {
    wrap.appendChild(el('div','hl','No analytics events were found in this package, so open/reaction/voice stats aren\u2019t available.'));
  }
  return wrap;
}

function pretttyChannelId(p){ return p; }

async function buildSections(){
  const sections=[];
  const top = {};
  state.paths.forEach(p=>{ const s=firstSeg(p).toLowerCase(); (top[s]=top[s]||[]).push(p); });

  if(top['account']){
    const items=[];
    const acc = top['account'];

    const userFile = acc.find(p=>/\/user\.json$/i.test(p) && seg(p).length===2);
    if(userFile) items.push({id:'profile',label:'Profile',icon:ICON.hash,render:async(m)=>{
      const o=await getJSON(userFile);
      const avPath=acc.find(p=>/\/avatar\.(png|jpe?g|gif|webp)$/i.test(p) && seg(p).length===2);
      let avatarUrl=null; if(avPath) avatarUrl=await getBlobURL(avPath);
      m.appendChild(renderProfile(o, avatarUrl));
      const statWrap=el('div');
      statWrap.appendChild(el('div','empty','<span class="spinner"></span>Crunching your Discord stats\u2026'));
      m.appendChild(statWrap);
      try{
        const stats = state.stats || await computeStats();
        state.stats = stats;
        statWrap.innerHTML=''; statWrap.appendChild(renderWrapped(stats));
      }catch(e){
        statWrap.innerHTML=''; statWrap.appendChild(emptyState('Could not compute stats', e.message||String(e)));
      }
    }});

    const avatars = acc.filter(p=>/\.(png|jpe?g|gif|webp)$/i.test(p));
    if(avatars.length) items.push({id:'avatars',label:'Avatars',icon:ICON.hash,render:async(m)=>{
      m.appendChild(el('div','page-title','Avatars'));
      m.appendChild(el('div','page-desc','Your current and recently used avatars.'));
      const g=el('div','gallery');
      for(const a of avatars){ const url=await getBlobURL(a); const fig=el('figure'); const img=el('img'); img.src=url; img.loading='lazy'; fig.appendChild(img); fig.appendChild(el('figcaption',null,esc(baseName(a)))); g.appendChild(fig); }
      m.appendChild(g);
    }});

    const appFiles = acc.filter(p=>/\/applications\/[^/]+\/application\.json$/i.test(p));
    if(appFiles.length) items.push({id:'apps',label:'Applications',hash:true,icon:ICON.hash,badge:appFiles.length,render:async(m)=>{
      m.appendChild(el('div','page-title','Applications'));
      m.appendChild(el('div','page-desc','Bots and apps you own.'));
      const list=el('div','applist');
      for(const af of appFiles){
        const o=await getJSON(af)||{};
        const dir=af.replace(/application\.json$/i,'');
        const iconPath = state.paths.find(p=>p.toLowerCase().startsWith(dir.toLowerCase()) && /icon\.(png|jpe?g|webp|gif)$/i.test(p));
        const botAv = state.paths.find(p=>p.toLowerCase().startsWith(dir.toLowerCase()) && /bot-?avatar\.(png|jpe?g|webp|gif)$/i.test(p));
        const row=el('div','approw');
        const imgPath = iconPath||botAv;
        if(imgPath){ const url=await getBlobURL(imgPath); const img=el('img'); img.src=url; row.appendChild(img); }
        else { const ph=el('div'); ph.style.cssText='width:56px;height:56px;border-radius:14px;background:var(--card-2);flex-shrink:0'; row.appendChild(ph); }
        const info=el('div');
        info.appendChild(el('div','an',esc(o.name||'Unknown app')));
        if(o.id) info.appendChild(el('div','ad','ID: '+esc(o.id)));
        if(o.description) info.appendChild(el('div','ad',esc(o.description)));
        const btn=el('button','pill','View full JSON'); btn.style.marginTop='8px';
        btn.onclick=()=>openModal(o.name||'Application', o);
        info.appendChild(btn);
        row.appendChild(info); list.appendChild(row);
      }
      m.appendChild(list);
    }});

    const exp = acc.filter(p=>/\/user_data_exports\//i.test(p) && /\.json$/i.test(p));
    const schemas={};
    exp.forEach(p=>{ const parts=seg(p); const i=parts.findIndex(x=>x.toLowerCase()==='user_data_exports'); if(i>=0&&parts[i+1]){ (schemas[parts[i+1]]=schemas[parts[i+1]]||[]).push(p);} });
    Object.keys(schemas).forEach(sc=>{
      items.push({id:'exp_'+sc,label:prettySchema(sc),icon:ICON.hash,render:async(m)=>{
        m.appendChild(el('div','page-title',prettySchema(sc)));
        m.appendChild(el('div','page-desc',esc(sc)));
        for(const f of schemas[sc].sort()){
          const o=await getJSON(f);
          const card=el('div');
          card.appendChild(renderAnyJSON(o, prettyFromFile(baseName(f))));
          m.appendChild(card);
        }
      }});
    });
    sections.push({id:'account',label:'Account',icon:ICON.account,items});
  }

  if(top['activities']){
    const dirs={};
    top['activities'].forEach(p=>{ const parts=seg(p); if(parts[1]) (dirs[parts[1]]=dirs[parts[1]]||[]).push(p); });
    const items=Object.keys(dirs).sort((a,b)=>naturalCmp(a,b)).map(d=>({
      id:'act_'+d, label:d.replace(/_/g,' '), icon:ICON.hash,
      render:async(m)=>{
        m.appendChild(el('div','page-title',esc(d.replace(/_/g,' '))));
        const jfiles=dirs[d].filter(p=>/\.json$/i.test(p));
        for(const f of jfiles.sort()){
          const o=await getJSON(f);
          const card=el('div','card');
          const rel=seg(f).slice(2).join(' / ');
          card.appendChild(el('h3',null,esc(rel)));
          card.appendChild(renderReadable(o));
          m.appendChild(card);
        }
        const imgs=dirs[d].filter(p=>/\.(png|jpe?g|gif|webp)$/i.test(p));
        if(imgs.length){ const g=el('div','gallery'); for(const im of imgs){const url=await getBlobURL(im);const fig=el('figure');const img=el('img');img.src=url;img.loading='lazy';fig.appendChild(img);fig.appendChild(el('figcaption',null,esc(baseName(im))));g.appendChild(fig);} m.appendChild(g); }
      }
    }));
    sections.push({id:'activities',label:'Activities',icon:ICON.activities,items});
  }

  if(top['activity']){
    const dirs={};
    top['activity'].forEach(p=>{ const parts=seg(p); if(parts[1]) (dirs[parts[1]]=dirs[parts[1]]||[]).push(p.match(/\.json$/i)?p:null); });
    const items=Object.keys(dirs).sort().map(d=>({
      id:'anl_'+d, label:d, icon:ICON.hash,
      render:async(m)=>{
        m.appendChild(el('div','page-title',esc(prettyFromFile(d))));
        m.appendChild(el('div','page-desc','Event log — large file, parsed line by line and paginated.'));
        const jfiles = top['activity'].filter(p=>seg(p)[1]===d && /\.json$/i.test(p));
        if(!jfiles.length){ m.appendChild(emptyState('No data file','No JSON found in this folder.')); return; }
        const loading=el('div','empty','<span class="spinner"></span>Parsing events…');
        m.appendChild(loading);
        let allRows=[];
        for(const f of jfiles){
          const txt=await getText(f);
          allRows=allRows.concat(parseEventFile(txt));
        }
        loading.remove();
        const filterKey = detectEventKey(allRows);
        m.appendChild(buildTable(allRows,{filterKey}));
      }
    }));
    sections.push({id:'activity',label:'Analytics',icon:ICON.activity,items});
  }

  if(top['ads']){
    const jfiles=top['ads'].filter(p=>/\.json$/i.test(p));
    const items=jfiles.sort().map(f=>({
      id:'ads_'+baseName(f), label:prettyFromFile(baseName(f)), icon:ICON.hash,
      render:async(m)=>{ const o=await getJSON(f); m.appendChild(renderAnyJSON(o,prettyFromFile(baseName(f)))); }
    }));
    sections.push({id:'ads',label:'Ads',icon:ICON.ads,items});
  }

  if(top['messages']){
    let index={};
    const idxPath = top['messages'].find(p=>/\/index\.json$/i.test(p) && seg(p).length===2);
    if(idxPath){ const o=await getJSON(idxPath); if(o&&!o.__parseError) index=o; }

    const chans={};
    top['messages'].forEach(p=>{ const parts=seg(p); if(parts.length>=3){ (chans[parts[1]]=chans[parts[1]]||[]).push(p); } });
    const items=[];
    for(const cid of Object.keys(chans)){
      const files=chans[cid];
      const chFile=files.find(p=>/channel\.json$/i.test(p));
      const msgFile=files.find(p=>/messages\.json$/i.test(p));

      let name=null;
      const cleanId=cid.replace(/^c/,'');
      if(index[cid]) name=index[cid]; else if(index[cleanId]) name=index[cleanId];
      items.push({id:'ch_'+cid, label:name||cid, hash:true, icon:ICON.hash, _cid:cid, _chFile:chFile, _msgFile:msgFile,
        render:async(m)=>{ await renderChannel(m, cid, chFile, msgFile, name); }});
    }

    items.sort((a,b)=>{ const an=/^\d+$/.test(a.label), bn=/^\d+$/.test(b.label); if(an!==bn) return an?1:-1; return String(a.label).localeCompare(String(b.label)); });
    sections.push({id:'messages',label:'Messages',icon:ICON.messages,items,searchable:true});
  }

  if(top['servers']){
    let index={};
    const idxPath = top['servers'].find(p=>/\/index\.json$/i.test(p) && seg(p).length===2);
    if(idxPath){ const o=await getJSON(idxPath); if(o&&!o.__parseError) index=o; }
    const guilds={};
    top['servers'].forEach(p=>{ const parts=seg(p); if(parts.length>=3){ (guilds[parts[1]]=guilds[parts[1]]||[]).push(p); } });
    const items=Object.keys(guilds).map(gid=>({
      id:'g_'+gid, label:index[gid]||gid, icon:ICON.hash, searchable:true,
      render:async(m)=>{
        const files=guilds[gid];
        const gFile=files.find(p=>/guild\.json$/i.test(p));
        const aFile=files.find(p=>/audit-?log\.json$/i.test(p));
        const g=gFile?await getJSON(gFile):null;
        m.appendChild(el('div','page-title',esc((g&&g.name)||index[gid]||'Server')));
        m.appendChild(el('div','page-desc','Guild ID: '+esc(gid)));
        if(g){ const card=el('div','card'); card.appendChild(el('h3',null,'Guild')); const kv=el('div','kv');
          Object.keys(g).forEach(k=>{ kv.appendChild(el('div','k',esc(k))); const v=el('div','v mono'); v.innerHTML=cellHTML(g[k]); kv.appendChild(v); });
          card.appendChild(kv); m.appendChild(card);
        }
        if(aFile){ const a=await getJSON(aFile);
          const card=el('div','card'); card.appendChild(el('h3',null,'Audit log'));
          if(Array.isArray(a)&&a.length){ card.appendChild(buildTable(a,{filterKey:detectAuditKey(a)})); }
          else card.appendChild(emptyState('No audit entries','You have no recorded audit-log actions in this server.'));
          m.appendChild(card);
        }
      }
    }));
    items.sort((a,b)=>{ const an=/^\d+$/.test(a.label), bn=/^\d+$/.test(b.label); if(an!==bn) return an?1:-1; return String(a.label).localeCompare(String(b.label)); });
    sections.push({id:'servers',label:'Servers',icon:ICON.servers,items,searchable:true});
  }

  const supKey = Object.keys(top).find(k=>/support/i.test(k));
  if(supKey){
    const jfiles=top[supKey].filter(p=>/\.json$/i.test(p));
    const items=jfiles.sort().map(f=>({
      id:'sup_'+baseName(f), label:prettyFromFile(baseName(f)), icon:ICON.hash,
      render:async(m)=>{ const o=await getJSON(f); m.appendChild(renderAnyJSON(o,prettyFromFile(baseName(f)))); }
    }));
    if(!items.length) items.push({id:'sup_empty',label:'Tickets',icon:ICON.hash,render:async(m)=>m.appendChild(emptyState('No tickets','No support tickets found.'))});
    sections.push({id:'support',label:'Support',icon:ICON.support,items});
  }

  const known = new Set(['account','activities','activity','ads','messages','servers']);
  const knownSup = supKey;
  const otherTops = Object.keys(top).filter(k=>!known.has(k) && k!==knownSup);

  {
    const items=[{id:'allfiles',label:'Browse all',icon:ICON.hash,render:async(m)=>{
      m.appendChild(el('div','page-title','All files'));
      m.appendChild(el('div','page-desc',state.paths.length+' files in this package. Click any JSON to inspect.'));
      const tree=el('div','jtree'); tree.appendChild(fileBrowser()); m.appendChild(tree);
    }}];
    sections.push({id:'files',label:'All files',icon:ICON.files,items});
  }

  return sections;
}

function naturalCmp(a,b){ return String(a).localeCompare(String(b),undefined,{numeric:true}); }

async function renderChannel(m, cid, chFile, msgFile, name){
  let ch=null; if(chFile) ch=await getJSON(chFile);
  const title = (ch&&ch.name) || name || cid;
  m.appendChild(el('div','page-title', '#'+esc(title)));
  const sub=[];
  if(ch&&ch.guild&&ch.guild.name) sub.push('Server: '+ch.guild.name);
  if(ch&&ch.type) sub.push(ch.type);
  sub.push('Channel ID: '+cid);
  m.appendChild(el('div','page-desc',esc(sub.join('  •  '))));

  if(!msgFile){ m.appendChild(emptyState('No messages file','This channel folder has no messages.json.')); return; }
  const o=await getJSON(msgFile);
  let msgs = Array.isArray(o)? o : (o&&Array.isArray(o.messages)? o.messages : null);
  if(!msgs){ m.appendChild(renderAnyJSON(o,'Messages')); return; }
  if(!msgs.length){ m.appendChild(emptyState('No messages','No messages recorded for this channel.')); return; }

  const k = detectMsgKeys(msgs[0]);

  const bar=el('div','table-toolbar'); const search=el('input'); search.type='text'; search.placeholder='Search messages…'; bar.appendChild(search);
  const cnt=el('span','muted'); cnt.style.marginLeft='auto'; bar.appendChild(cnt); m.appendChild(bar);
  const listWrap=el('div'); m.appendChild(listWrap);
  const pager=el('div','pager'); const prev=el('button',null,'Newer'); const next=el('button',null,'Older'); const info=el('span');
  pager.appendChild(prev);pager.appendChild(info);pager.appendChild(next); m.appendChild(pager);

  if(k.ts){ msgs=msgs.slice().sort((a,b)=>new Date(b[k.ts])-new Date(a[k.ts])); }
  const PAGE=100; let page=0; let filtered=msgs;
  function apply(){ const q=search.value.trim().toLowerCase(); filtered=!q?msgs:msgs.filter(x=>JSON.stringify(x).toLowerCase().indexOf(q)>=0); page=0; render(); }
  function render(){
    const pages=Math.max(1,Math.ceil(filtered.length/PAGE)); if(page>=pages)page=pages-1;if(page<0)page=0;
    const rows=filtered.slice(page*PAGE,page*PAGE+PAGE);
    listWrap.innerHTML='';
    rows.forEach(msg=>{
      const row=el('div','msg');
      const initial=(title||'?').slice(0,1).toUpperCase();
      row.appendChild(el('div','av',esc(initial)));
      const body=el('div','body');
      const meta=el('div','meta');
      meta.appendChild(el('span','name','#'+esc(title)));
      if(k.ts&&msg[k.ts]){ const d=new Date(msg[k.ts]); meta.appendChild(el('span','ts',esc(isNaN(d)?msg[k.ts]:d.toLocaleString()))); }
      body.appendChild(meta);
      const content = k.content? msg[k.content] : '';
      if(content) body.appendChild(el('div','text',esc(content)));
      else body.appendChild(el('div','text muted','(no text content)'));
      if(k.att && msg[k.att]){ const attv=msg[k.att]; const att=el('div','att'); const arr=Array.isArray(attv)?attv:String(attv).split(/\s+/).filter(Boolean);
        arr.forEach(a=>{ const url=typeof a==='string'?a:(a&&(a.url||a.link)); if(url){const link=el('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent='Attachment';att.appendChild(link);} });
        if(att.children.length) body.appendChild(att);
      }
      row.appendChild(body); listWrap.appendChild(row);
    });
    cnt.textContent=filtered.length.toLocaleString()+' messages';
    info.textContent='Page '+(page+1)+' / '+pages;
    prev.disabled=page===0; next.disabled=page>=pages-1;
  }
  search.oninput=debounce(apply,180); prev.onclick=()=>{page--;render();}; next.onclick=()=>{page++;render();};
  render();
}
function detectMsgKeys(sample){
  if(!sample||typeof sample!=='object') return {};
  const keys=Object.keys(sample); const low={}; keys.forEach(k=>low[k.toLowerCase()]=k);
  const pick=(...cands)=>{ for(const c of cands){ if(low[c]) return low[c]; } return null; };
  return {
    id: pick('id'),
    ts: pick('timestamp','time','created_at','date'),
    content: pick('contents','content','message','text'),
    att: pick('attachments','attachment')
  };
}
function detectAuditKey(rows){ const s=rows.find(r=>r&&typeof r==='object'); if(!s)return null; const low=Object.keys(s).map(k=>k.toLowerCase()); if(low.includes('action_type'))return Object.keys(s).find(k=>k.toLowerCase()==='action_type'); return null; }

function parseEventFile(txt){
  if(txt==null) return [];
  txt=txt.replace(/^\uFEFF/,'').trim();
  if(!txt) return [];

  if(txt[0]==='['){ try{ const a=JSON.parse(txt); if(Array.isArray(a)) return a; }catch(e){} }
  const rows=[]; const lines=txt.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){ const ln=lines[i].trim(); if(!ln||ln==='['||ln===']') continue; const clean=ln.replace(/,\s*$/,''); try{ rows.push(JSON.parse(clean)); }catch(e){  } }
  return rows;
}
function detectEventKey(rows){
  const s=rows.find(r=>r&&typeof r==='object'); if(!s) return null;
  const low={}; Object.keys(s).forEach(k=>low[k.toLowerCase()]=k);
  return low['event_type']||low['event']||low['type']||low['name']||null;
}

function fileBrowser(){
  const rootD=el('div');
  const treeObj={};
  state.paths.forEach(p=>{ const parts=seg(p); let cur=treeObj; parts.forEach((part,i)=>{ if(i===parts.length-1){ cur[part]=p; } else { cur[part]=cur[part]||{}; if(typeof cur[part]==='string') cur[part]={}; cur=cur[part]; } }); });
  function build(obj){
    const c=el('div','children');
    Object.keys(obj).sort().forEach(k=>{
      const v=obj[k];
      if(typeof v==='string'){
        const isJson=/\.json$/i.test(v); const isImg=/\.(png|jpe?g|gif|webp)$/i.test(v);
        const d=el('div'); const btn=el('button','cell-json'); btn.textContent='📄 '+k; btn.style.color=isJson?'var(--link)':'var(--text)';
        btn.onclick=async()=>{
          if(isJson){ const o=await getJSON(v); openModal(k,o); }
          else if(isImg){ const url=await getBlobURL(v); const w=window.open(); if(w) w.document.write('<img src="'+url+'" style="max-width:100%">'); }
        };
        d.appendChild(btn); c.appendChild(d);
      } else {
        const det=el('details'); const sum=el('summary',null,'<span class="jcount">📁 '+esc(k)+'</span>'); det.appendChild(sum); det.appendChild(build(v)); c.appendChild(det);
      }
    });
    return c;
  }
  rootD.appendChild(build(treeObj));
  return rootD;
}

function renderRail(){
  const rail=$('#rail'); rail.innerHTML='';
  state.sections.forEach((s,i)=>{
    if(s.id==='files'){ const sep=el('div','rail-sep'); rail.appendChild(sep); }
    const b=el('button','rail-item'+(state.current&&state.current.sectionId===s.id?' active':''));
    b.innerHTML=s.icon+'<span class="rail-tip">'+esc(s.label)+'</span>';
    b.onclick=()=>selectSection(s.id);
    rail.appendChild(b);
  });
}
function selectSection(sectionId, itemId){
  const s=state.sections.find(x=>x.id===sectionId); if(!s) return;
  const item = itemId? s.items.find(x=>x.id===itemId) : s.items[0];
  state.current={sectionId, itemId:item?item.id:null};
  renderRail();
  renderSidebar(s);
  if(item) renderItem(s,item);
  else { $('#main').innerHTML=''; $('#main').appendChild(emptyState('Nothing here','This section has no viewable items.')); }
}
function renderSidebar(s){
  $('#sidebar-head').textContent=s.label;
  const searchWrap=$('#sidebar-search'); const filter=$('#sidebar-filter');
  const list=$('#sidebar-list'); list.innerHTML='';
  function paint(q){
    list.innerHTML='';
    const items = q? s.items.filter(it=>it.label.toLowerCase().indexOf(q.toLowerCase())>=0) : s.items;
    items.forEach(it=>{
      const b=el('button','nav-item'+(state.current&&state.current.itemId===it.id?' active':''));
      const inner = (it.hash?'<span class="hash">#</span> ':'')+'<span class="lbl">'+esc(it.label)+'</span>'+(it.badge?'<span class="badge">'+it.badge+'</span>':'');
      b.innerHTML=inner;
      b.onclick=()=>{ selectSection(s.id, it.id); if(window.innerWidth<=768) document.body.classList.remove('nav-open'); };
      list.appendChild(b);
    });
    if(!items.length) list.appendChild(el('div','empty','No matches'));
  }
  if(s.items.length>8 || s.searchable){ searchWrap.style.display='block'; filter.value=''; filter.oninput=()=>paint(filter.value); }
  else { searchWrap.style.display='none'; }
  paint('');
}
async function renderItem(s,item){
  state.current={sectionId:s.id,itemId:item.id};

  document.querySelectorAll('#sidebar-list .nav-item').forEach(n=>n.classList.remove('active'));
  $('#topbar-title').textContent = s.label;
  $('#topbar-icon').innerHTML = s.icon;
  $('#topbar-crumb').textContent = '/ '+item.label;
  const main=$('#main'); main.innerHTML='';
  state.jsonStore=[];
  const loading=el('div','empty','<span class="spinner"></span>Loading…'); main.appendChild(loading);
  try{
    const frag=el('div'); await item.render(frag);
    main.innerHTML=''; main.appendChild(frag);
  }catch(e){
    main.innerHTML=''; main.appendChild(emptyState('Something went wrong', e.message||String(e)));
    console.error(e);
  }
  main.scrollTop=0;

  renderSidebar(s);
}

async function handleFile(file){
  const status=$('#status'); status.className='status';
  if(!file){ return; }
  if(!/\.zip$/i.test(file.name)){ status.className='status err'; status.textContent='Please choose a .zip file (your Discord data package).'; return; }
  status.innerHTML='<span class="spinner"></span>Reading '+esc(file.name)+' ('+fmtBytes(file.size)+')…';
  try{
    const zip=await JSZip.loadAsync(file);
    state.zip=zip; state.paths=[]; state.lower={};
    zip.forEach((rel,f)=>{ if(!f.dir){ state.paths.push(rel); state.lower[rel.toLowerCase()]=rel; } });
    if(!state.paths.length){ status.className='status err'; status.textContent='That ZIP looks empty.'; return; }

    stripCommonRoot();
    status.innerHTML='<span class="spinner"></span>Building your dashboard…';
    state.sections=await buildSections();
    if(!state.sections.length){ status.className='status err'; status.textContent='No recognizable Discord data found in this ZIP.'; return; }
    await loadHeaderIdentity();
    $('#upload-screen').style.display='none';
    $('#app').style.display='block';
    renderRail();
    selectSection(state.sections[0].id);
  }catch(e){
    status.className='status err'; status.textContent='Could not read that ZIP: '+(e.message||e);
    console.error(e);
  }
}
function stripCommonRoot(){
  const firsts=new Set(state.paths.map(p=>firstSeg(p)));
  if(firsts.size===1){
    const root=[...firsts][0];

    if(!/^(account|activities|activity|ads|messages|servers|support)/i.test(root)){
      const np=[]; const nl={};
      state.paths.forEach(p=>{ const stripped=seg(p).slice(1).join('/'); if(stripped){ np.push(stripped); nl[stripped.toLowerCase()]= state.lower[p.toLowerCase()]; } });

      state.paths=np; const map={}; np.forEach(p=>{ map[p.toLowerCase()] = nl[p.toLowerCase()]; });
      state.lower=map;
    }
  }
}
async function loadHeaderIdentity(){
  const foot=$('#sidebar-foot'); foot.innerHTML='';
  let name='You', sub='Discord data package';
  const userPath=state.paths.find(p=>/^account\/user\.json$/i.test(p));
  let obj=null; if(userPath) obj=await getJSON(userPath);
  if(obj&&!obj.__parseError){
    const uname = obj.username || (obj.user&&obj.user.username);
    name = obj.global_name || obj.display_name || uname || 'You';
    if(uname) sub = '@'+uname + (obj.discriminator && obj.discriminator!=='0' ? '#'+obj.discriminator : '');
    else if(obj.id) sub = 'ID '+obj.id;
  }
  const avPath=state.paths.find(p=>/^account\/avatar\.(png|jpe?g|gif|webp)$/i.test(p));
  if(avPath){ const url=await getBlobURL(avPath); const img=el('img'); img.src=url; foot.appendChild(img); }
  else { foot.appendChild(el('div','avatar-fallback',esc(name.slice(0,1).toUpperCase()))); }
  const who=el('div','who'); who.appendChild(el('div','n',esc(name))); who.appendChild(el('div','s',esc(sub))); foot.appendChild(who);
}
function fmtBytes(b){ if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }

const dz=$('#dropzone'), fi=$('#file-input');
dz.onclick=()=>fi.click();
dz.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click();} };
fi.onchange=()=>{ if(fi.files[0]) handleFile(fi.files[0]); };
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
dz.addEventListener('drop',e=>{ const f=e.dataTransfer.files[0]; if(f) handleFile(f); });
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>e.preventDefault());

$('#hamburger').onclick=()=>document.body.classList.toggle('nav-open');

})();