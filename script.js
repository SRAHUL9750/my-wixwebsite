// ===== SETTINGS =====
const WHATSAPP = "919946662984";           // your number, country code, no +
const SHEET_URL = "";                       // paste Google Apps Script URL here (see README)
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
document.addEventListener('click',e=>{const a=e.target.closest('[data-enq]');if(!a)return;e.preventDefault();document.body.classList.remove('open');
const s=a.dataset.enq;const t=encodeURIComponent(`Hello NTAS, I'd like to enquire about: ${s==='General'?'your IT services':s}. Please contact me.`);
window.open(`https://wa.me/${WHATSAPP}?text=${t}`,'_blank')});
document.getElementById('f').addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),m=document.getElementById('msg');
d.time=new Date().toLocaleString();
if(SHEET_URL){try{await fetch(SHEET_URL,{method:'POST',mode:'no-cors',body:JSON.stringify(d)})}catch(_){}}
m.textContent='Thanks! Opening WhatsApp so we can reply quickly…';
const t=encodeURIComponent(`New enquiry\nName: ${d.name}\nMobile: ${d.mobile}\nService: ${d.service}\nMessage: ${d.message}`);
window.open(`https://wa.me/${WHATSAPP}?text=${t}`,'_blank');e.target.reset()});
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
