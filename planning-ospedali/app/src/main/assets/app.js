const KEY='planningOspedaliDataV2';
const HISTORY_KEY='planningOspedaliHistoryV1';
const HISTORY_LIMIT=30;

let data=load();
let currentCity=null;
let brushName='MARINA';
let brushMode=false;
let search='';
let undoStack=[];
let redoStack=[];
loadHistory();

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
  try{
    const x=localStorage.getItem(KEY);
    return x?JSON.parse(x):clone(DEFAULTS);
  }catch(e){return clone(DEFAULTS)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function loadHistory(){
  try{
    const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}');
    undoStack=Array.isArray(h.undo)?h.undo:[];
    redoStack=Array.isArray(h.redo)?h.redo:[];
  }catch(e){undoStack=[];redoStack=[]}
}
function saveHistory(){
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify({undo:undoStack.slice(-HISTORY_LIMIT),redo:redoStack.slice(-HISTORY_LIMIT)}))}catch(e){}
}
function remember(label){
  undoStack.push({label,data:clone(data)});
  if(undoStack.length>HISTORY_LIMIT)undoStack.shift();
  redoStack=[];
  saveHistory();
  updateUndoUI();
}
function commit(label,fn){
  remember(label);
  fn();
  save();
  updateUndoUI();
}
function undoAction(){
  if(!undoStack.length){toast('Nessuna azione da annullare');return}
  const entry=undoStack.pop();
  redoStack.push({label:entry.label,data:clone(data)});
  if(redoStack.length>HISTORY_LIMIT)redoStack.shift();
  data=clone(entry.data);
  save();saveHistory();closeModal();
  refreshCurrentView();
  toast('Annullato: '+entry.label);
}
function redoAction(){
  if(!redoStack.length){toast('Nessuna azione da ripetere');return}
  const entry=redoStack.pop();
  undoStack.push({label:entry.label,data:clone(data)});
  if(undoStack.length>HISTORY_LIMIT)undoStack.shift();
  data=clone(entry.data);
  save();saveHistory();closeModal();
  refreshCurrentView();
  toast('Ripristinato: '+entry.label);
}
function refreshCurrentView(){currentCity?renderCity():renderHome()}
function updateUndoUI(){
  const u=document.getElementById('undoBtn'),r=document.getElementById('redoBtn');
  if(u){u.disabled=!undoStack.length;u.title=undoStack.length?'Annulla: '+undoStack[undoStack.length-1].label:'Niente da annullare'}
  if(r){r.disabled=!redoStack.length;r.title=redoStack.length?'Ripeti: '+redoStack[redoStack.length-1].label:'Niente da ripetere'}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function clsAssign(v){
  const x=String(v||'').toUpperCase();
  if(x.includes('MARINA')&&x.includes('NATALIA'))return'mix';
  if(x.includes('MARINA'))return'marina';
  if(x.includes('NATALIA'))return'natalia';
  if(x.includes('ANTONIO'))return'antonio';
  return'';
}
function toast(msg){
  document.querySelectorAll('.toast').forEach(x=>x.remove());
  const t=document.createElement('div');
  t.className='toast';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1700);
}

function renderHome(){
  currentCity=null;search='';
  document.getElementById('app').innerHTML=`
    <main class="home">
      <section class="hero">
        <div class="brand-mark">✚</div>
        <div>
          <div class="eyebrow">GESTIONE TERRITORIO</div>
          <h1>Planning Ospedali</h1>
          <div class="subtitle">Consulta e aggiorna rapidamente reparti, referenti e assegnazioni.</div>
        </div>
      </section>
      <div class="city-grid">
        ${cityCard('BERGAMO','Ospedali e reparti della provincia','BG')}
        ${cityCard('BRESCIA','Ospedali e reparti della provincia','BS')}
      </div>
      <div class="info">
        <div class="info-icon">✓</div>
        <div><b>Salvataggio automatico</b>Ogni modifica resta memorizzata sul tablet. Le ultime ${HISTORY_LIMIT} modifiche possono essere annullate con la freccia Indietro.</div>
      </div>
    </main>`;
}
function cityCard(city,desc,tag){
  return`<button class="city-card" onclick="openCity('${city}')">
    <span class="city-tag">${tag}</span>
    <span class="count">${data[city].length} ospedali</span>
    <span class="name">${city}</span>
    <span class="desc">${desc}</span>
    <span class="open-label">Apri planning <b>→</b></span>
  </button>`;
}
function openCity(city){
  history.pushState({city},'','#'+city.toLowerCase());
  currentCity=city;search='';renderCity();
}
window.onpopstate=e=>{if(e.state&&e.state.city){currentCity=e.state.city;renderCity()}else renderHome()};
history.replaceState({city:null},'',location.pathname);
function goHome(){history.back()}

function renderCity(){
  document.getElementById('app').innerHTML=`
    <div class="toolbar">
      <button class="back-btn" onclick="goHome()" aria-label="Indietro">‹</button>
      <div class="toolbar-title"><small>PLANNING OSPEDALI</small><h2>${currentCity}</h2></div>
      <div class="undo-group">
        <button id="undoBtn" class="undo-btn" onclick="undoAction()" aria-label="Annulla"><span class="undo-arrow">↶</span><span class="undo-text">Annulla</span></button>
        <button id="redoBtn" class="undo-btn icon-only" onclick="redoAction()" aria-label="Ripeti">↷</button>
      </div>
    </div>
    <main class="content">
      <section class="panel brush-panel">
        <div class="brush-top">
          <div>
            <div class="section-kicker">MODIFICA VELOCE</div>
            <strong>Assegnazione rapida</strong>
          </div>
          <label class="toggle">
            <input type="checkbox" ${brushMode?'checked':''} onchange="brushMode=this.checked;toast(brushMode?'Pennello attivo: '+brushName:'Pennello disattivato')">
            <span class="switch"></span><span>Pennello</span>
          </label>
        </div>
        <div class="brush-body">
          <div class="active-name"><span>Nome attivo</span><b id="brushStatus">${esc(brushName)}</b></div>
          <div class="chips">
            <button class="chip marina-chip" onclick="setBrush('MARINA')">MARINA</button>
            <button class="chip natalia-chip" onclick="setBrush('NATALIA')">NATALIA</button>
            <button class="chip antonio-chip" onclick="setBrush('ANTONIO')">ANTONIO</button>
          </div>
          <div class="custom-row">
            <input id="customBrush" class="field" placeholder="Altro nome">
            <button class="btn primary" onclick="useCustomBrush()">Imposta</button>
          </div>
        </div>
        <div class="help">Con il Pennello attivo, tocca una casella nella colonna <b>Assegnazione</b> per sostituirla. Se sbagli, usa ↶ Annulla anche più volte.</div>
      </section>

      <div class="search-row">
        <div class="search-box">
          <span>⌕</span>
          <input class="field" value="${esc(search)}" placeholder="Cerca ospedale, reparto o nome…" oninput="search=this.value;renderHospitals()">
        </div>
        <button class="btn primary add-hospital" onclick="addHospital()">＋ Nuovo ospedale</button>
      </div>

      <div id="hospitals"></div>
      <div class="bottom-actions"><button class="btn danger soft-danger" onclick="resetCity()">Ripristina dati iniziali di ${currentCity}</button></div>
    </main>`;
  updateUndoUI();
  renderHospitals();
}

function setBrush(n){
  brushName=n;
  const el=document.getElementById('brushStatus');
  if(el)el.textContent=brushName;
  toast('Nome attivo: '+brushName);
}
function useCustomBrush(){
  const e=document.getElementById('customBrush'),n=e.value.trim();
  if(!n)return;
  setBrush(n.toUpperCase());e.value='';
}
function matchHospital(h,q){return[h.name,...h.rows.flatMap(r=>[r.a,r.b,r.c])].join(' ').toLowerCase().includes(q)}

function renderHospitals(){
  const host=document.getElementById('hospitals');if(!host)return;
  const q=(search||'').trim().toLowerCase();
  let out='',shown=0;
  data[currentCity].forEach((h,hi)=>{
    if(q&&!matchHospital(h,q))return;
    shown++;
    out+=`<section class="hospital">
      <div class="h-head">
        <div class="hospital-icon">✚</div>
        <h3>${esc(h.name)}</h3>
        <div class="hospital-actions">
          <button class="head-action" onclick="reorderRows(${hi})">↕ Ordina</button>
          <button class="head-action" onclick="editHospital(${hi})">✎ Modifica</button>
        </div>
      </div>
      <div class="grid-head"><div>REPARTO / UBICAZIONE</div><div>REFERENTE / ATTIVITÀ</div><div>ASSEGNAZIONE</div></div>`;
    h.rows.forEach((r,ri)=>{
      out+=`<div class="row">
        <button onclick="editRow(${hi},${ri})"><span class="edit-hint">✎</span>${esc(r.a)}</button>
        <button onclick="editRow(${hi},${ri})">${esc(r.b)}</button>
        <button class="assign ${clsAssign(r.c)}" onclick="assignmentTap(${hi},${ri})"><span>${esc(r.c||'—')}</span></button>
      </div>`;
    });
    out+=`<div class="h-foot"><button class="add-row-btn" onclick="addRow(${hi})">＋ Aggiungi riga / reparto</button></div></section>`;
  });
  host.innerHTML=shown?out:'<div class="empty"><div>⌕</div>Nessun risultato</div>';
}

function assignmentTap(hi,ri){
  if(brushMode){
    const row=data[currentCity][hi].rows[ri];
    if(row.c===brushName){toast('È già assegnato a '+brushName);return}
    commit('assegnazione '+brushName,()=>{row.c=brushName});
    renderHospitals();
    toast('Assegnato a '+brushName);
  }else editRow(hi,ri);
}

function modal(title,body,actions,wide=false){
  document.getElementById('modalHost').innerHTML=`<div class="modal-back" onclick="if(event.target===this)closeModal()">
    <div class="modal ${wide?'wide':''}">
      <div class="modal-handle"></div>
      <h3>${esc(title)}</h3>
      ${body}
      <div class="modal-actions">${actions}</div>
    </div>
  </div>`;
}
function closeModal(){document.getElementById('modalHost').innerHTML=''}

function editRow(hi,ri){
  const r=data[currentCity][hi].rows[ri],rows=data[currentCity][hi].rows;
  modal('Modifica riga',`
    <label>Reparto / ubicazione</label><textarea id="mA">${esc(r.a)}</textarea>
    <label>Referente / attività</label><textarea id="mB">${esc(r.b)}</textarea>
    <label>Assegnazione</label><input id="mC" value="${esc(r.c)}">
    <div class="order-card">
      <div><b>Ordine della riga</b><small>Posizione ${ri+1} di ${rows.length}</small></div>
      <div class="order-buttons">
        <button class="mini-btn" ${ri===0?'disabled':''} onclick="moveRow(${hi},${ri},-1,true)">↑ Sposta su</button>
        <button class="mini-btn" ${ri===rows.length-1?'disabled':''} onclick="moveRow(${hi},${ri},1,true)">↓ Sposta giù</button>
      </div>
    </div>`,
    `<button class="btn danger" onclick="deleteRow(${hi},${ri})">Elimina</button>
     <button class="btn" onclick="closeModal()">Chiudi</button>
     <button class="btn primary" onclick="saveRow(${hi},${ri})">Salva modifiche</button>`
  );
}
function saveRow(hi,ri){
  const r=data[currentCity][hi].rows[ri];
  const a=document.getElementById('mA').value.trim();
  const b=document.getElementById('mB').value.trim();
  const c=document.getElementById('mC').value.trim();
  if(r.a===a&&r.b===b&&r.c===c){closeModal();return}
  commit('modifica riga',()=>{r.a=a;r.b=b;r.c=c});
  closeModal();renderHospitals();toast('Riga aggiornata');
}
function deleteRow(hi,ri){
  if(confirm('Eliminare questa riga?')){
    commit('elimina riga',()=>data[currentCity][hi].rows.splice(ri,1));
    closeModal();renderHospitals();toast('Riga eliminata');
  }
}
function addRow(hi){
  modal('Aggiungi riga',`
    <label>Reparto / ubicazione</label><textarea id="mA"></textarea>
    <label>Referente / attività</label><textarea id="mB"></textarea>
    <label>Assegnazione</label><input id="mC" value="${esc(brushName)}">`,
    `<button class="btn" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveNewRow(${hi})">Aggiungi riga</button>`
  );
}
function saveNewRow(hi){
  const a=document.getElementById('mA').value.trim(),b=document.getElementById('mB').value.trim(),c=document.getElementById('mC').value.trim();
  commit('aggiungi riga',()=>data[currentCity][hi].rows.push({a,b,c}));
  closeModal();renderHospitals();toast('Riga aggiunta');
}

function moveRow(hi,ri,dir,returnToEdit=false){
  const rows=data[currentCity][hi].rows,to=ri+dir;
  if(to<0||to>=rows.length)return;
  commit('sposta riga',()=>{
    const [item]=rows.splice(ri,1);
    rows.splice(to,0,item);
  });
  renderHospitals();
  if(returnToEdit)editRow(hi,to);else reorderRows(hi);
  toast('Riga spostata');
}

function reorderRows(hi){
  const h=data[currentCity][hi];
  let body=`<div class="reorder-help">Usa le frecce per cambiare l'ordine. Ogni spostamento può essere annullato con ↶.</div><div class="reorder-list">`;
  h.rows.forEach((r,ri)=>{
    const label=(r.a||r.b||r.c||'Riga vuota').replace(/\n/g,' · ');
    body+=`<div class="reorder-item">
      <div class="reorder-index">${ri+1}</div>
      <div class="reorder-label">${esc(label)}</div>
      <button ${ri===0?'disabled':''} onclick="moveRow(${hi},${ri},-1)">↑</button>
      <button ${ri===h.rows.length-1?'disabled':''} onclick="moveRow(${hi},${ri},1)">↓</button>
    </div>`;
  });
  body+='</div>';
  modal('Ordina righe · '+h.name,body,`<button class="btn primary" onclick="closeModal()">Fine</button>`,true);
}

function editHospital(hi){
  const h=data[currentCity][hi];
  modal('Modifica ospedale',`<label>Nome ospedale</label><input id="hName" value="${esc(h.name)}">`,
    `<button class="btn danger" onclick="deleteHospital(${hi})">Elimina ospedale</button>
     <button class="btn" onclick="closeModal()">Annulla</button>
     <button class="btn primary" onclick="saveHospital(${hi})">Salva</button>`);
}
function saveHospital(hi){
  const n=document.getElementById('hName').value.trim(),h=data[currentCity][hi];
  if(!n||n===h.name){closeModal();return}
  commit('rinomina ospedale',()=>{h.name=n});
  closeModal();renderHospitals();toast('Ospedale aggiornato');
}
function deleteHospital(hi){
  if(confirm('Eliminare questo ospedale e tutti i reparti contenuti?')){
    commit('elimina ospedale',()=>data[currentCity].splice(hi,1));
    closeModal();renderCity();toast('Ospedale eliminato');
  }
}
function addHospital(){
  modal('Nuovo ospedale','<label>Nome ospedale</label><input id="hName" placeholder="Nome del nuovo ospedale">',
    '<button class="btn" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveNewHospital()">Aggiungi ospedale</button>');
}
function saveNewHospital(){
  const n=document.getElementById('hName').value.trim();if(!n)return;
  commit('aggiungi ospedale',()=>data[currentCity].push({name:n,rows:[{a:'',b:'',c:brushName}]}));
  closeModal();renderCity();toast('Ospedale aggiunto');
}
function resetCity(){
  if(confirm('Ripristinare '+currentCity+'? Tutte le modifiche fatte in questa sezione verranno sostituite dai dati iniziali importati dal planning.')){
    const city=currentCity;
    commit('ripristino '+city,()=>{data[city]=clone(DEFAULTS[city])});
    renderCity();toast('Dati iniziali ripristinati');
  }
}
renderHome();
