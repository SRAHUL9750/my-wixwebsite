// ===== SETTINGS =====
const WHATSAPP = "919946662984";           // your number, country code, no +
const SHEET_URL = "https://script.google.com/macros/s/AKfycbwJxYPzSc3kN8ZoprJ1WVC4JJu4poc4ripEc-yrSmursklHu9CK_ro9zP1E_sFopm4/exec"; // Google Apps Script web app that adds rows to the enquiries sheet
// ====================
const S=[["🤖","Automation: UiPath & Power Automate","RPA bots, Power Automate flows and Microsoft apps automation that remove repetitive work."],
["💻","Custom & Web Apps","Custom web and mobile apps, portals and dashboards built for your process."],
["🌐","Networking & Structured Cabling","Network design, Cat6/fibre cabling, racks and clean installations."],
["📹","CCTV & Security Systems","IP cameras, DVR/NVR, biometric and access control."],
["☎️","IP Telephony & Call Centres","EPABX/intercom, IP PBX, call-centre setup and telephony."],
["🎥","Video Conferencing & Smart Classrooms","Meeting rooms, audio/video conferencing, interactive whiteboards."],
["📶","Enterprise WiFi, Firewalls & WAN","Access points, firewalls, load balancing and WAN routers."],
["🗄️","Servers, Backup & Storage","Windows/Linux servers, virtualisation, backup and recovery."],
["🛡️","Cyber Security & Linux","Hardening, endpoint security, audits, Linux and Mac support."],
["🏫","Solutions for Schools, Hospitals & Shops","Hardware, software and billing/management systems for your industry."],
["🛠️","Managed IT Support & AMC","Helpdesk, ITSM/ServiceNow-style processes, on-site and remote support."],
["📣","Digital Marketing","WhatsApp, Facebook, Instagram, LinkedIn marketing, SEO and email."]];
const g=document.getElementById('grid'),sel=document.getElementById('sel');
sel.innerHTML='<option>General enquiry</option>'+S.map(s=>`<option>${s[1]}</option>`).join('');
S.forEach(s=>{const t=document.createElement('div');t.className='tile';t.innerHTML=`<i>${s[0]}</i><h3>${s[1]}</h3><p>${s[2]}</p><a href="#" data-enq="${s[1]}">Enquire →</a>`;g.appendChild(t)});
new IntersectionObserver((e,o)=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');o.unobserve(x.target)}}),{threshold:.1}).observe&&document.querySelectorAll('.tile').forEach(t=>{const o=new IntersectionObserver(([x])=>{if(x.isIntersecting){t.classList.add('in');o.disconnect()}},{threshold:.1});o.observe(t)});
document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>document.body.classList.remove('open'));
document.getElementById('y').textContent=new Date().getFullYear();
// WhatsApp tiles/button: ask for the visitor's mobile number first, save it, then open WhatsApp
const waAsk=document.getElementById('waAsk'),waForm=document.getElementById('waForm');let waService='General enquiry';
document.addEventListener('click',e=>{const a=e.target.closest('[data-enq]');if(!a)return;e.preventDefault();document.body.classList.remove('open');
waService=a.dataset.enq==='General'?'General enquiry':a.dataset.enq;document.getElementById('waSvc').textContent=waService;document.getElementById('waErr').textContent='';
try{const me=JSON.parse(localStorage.getItem('ntas_me')||'{}');waForm.name.value=me.name||'';waForm.mobile.value=me.mobile||''}catch(_){}
if(waAsk.showModal){waAsk.showModal();setTimeout(()=>(waForm.mobile.value?waForm.querySelector('[type=submit]'):waForm.mobile).focus(),50)}else{openWhatsApp('','')}});
document.getElementById('waCancel').onclick=()=>waAsk.close();
waAsk.addEventListener('click',e=>{if(e.target===waAsk)waAsk.close()}); // tap outside closes
waForm.addEventListener('submit',e=>{e.preventDefault();const name=waForm.name.value.trim(),mobile=waForm.mobile.value.trim();
if(!/^[+0-9 ]{10,15}$/.test(mobile)){document.getElementById('waErr').textContent='Please enter a valid mobile number (10 digits).';waForm.mobile.focus();return}
try{localStorage.setItem('ntas_me',JSON.stringify({name,mobile}))}catch(_){}
waAsk.close();openWhatsApp(name,mobile)});
function openWhatsApp(name,mobile){
logEnquiry({source:'WhatsApp button',service:waService,name,mobile},'ntas_wa_'+waService+mobile,30000);
const t=encodeURIComponent(`Hello NTAS, I'd like to enquire about: ${waService==='General enquiry'?'your IT services':waService}.${name?`\nName: ${name}`:''}${mobile?`\nMobile: ${mobile}`:''}\nPlease contact me.`);
window.open(`https://wa.me/${WHATSAPP}?text=${t}`,'_blank','noopener')}
// Save an enquiry row to the Google Sheet (at most once per `gap` ms for the same key on this device)
function logEnquiry(d,key,gap){if(!SHEET_URL)return;try{const l=+localStorage.getItem(key)||0;if(Date.now()-l<gap)return;localStorage.setItem(key,Date.now())}catch(_){}
d.time=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});d.page=location.href;
fetch(SHEET_URL,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify(d)}).catch(()=>{})}
document.getElementById('f').addEventListener('submit',e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f)),m=document.getElementById('msg');
if(d.website){f.reset();return} // hidden field: only bots fill it
const last=+localStorage.getItem('ntas_enq')||0;if(Date.now()-last<60000){m.textContent='Please wait a minute before sending another enquiry.';return}
try{localStorage.setItem('ntas_enq',Date.now())}catch(_){}
delete d.website;d.time=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});d.page=location.href;
d.source='Website form';if(SHEET_URL){fetch(SHEET_URL,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify(d)}).catch(()=>{})} // saved to the Google Sheet
m.textContent='Thanks! Your enquiry is saved. Opening WhatsApp so we can reply quickly…';
const t=encodeURIComponent(`New enquiry\nName: ${d.name}\nMobile: ${d.mobile}\nService: ${d.service}\nMessage: ${d.message}`);
window.open(`https://wa.me/${WHATSAPP}?text=${t}`,'_blank','noopener');f.reset()});
// Scroll Reveal Transitions for Sections
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.sec').forEach(section => {
  observer.observe(section);
});
