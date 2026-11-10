
(()=>{const c=document.getElementById('stars'),x=c.getContext('2d');let w,h,s=[];const R=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rs(){w=c.width=innerWidth;h=c.height=innerHeight;s=Array.from({length:Math.min(220,w*h/6000|0)},()=>({x:Math.random()*w,y:Math.random()*h,z:Math.random()*.9+.1}))}
function f(){x.clearRect(0,0,w,h);for(const p of s){x.fillStyle=`rgba(${p.z>.8?'255,211,110':'180,240,255'},${p.z})`;x.fillRect(p.x,p.y,p.z*2,p.z*2);if(!R){p.y+=p.z*.35;if(p.y>h){p.y=0;p.x=Math.random()*w}}}if(!R)requestAnimationFrame(f)}
if(getComputedStyle(c).display!=='none'){addEventListener('resize',()=>{rs();if(R)f()});rs();f();}
const m=document.querySelector('.menu'),n=document.getElementById('nav');m.onclick=()=>{const o=n.classList.toggle('open');m.setAttribute('aria-expanded',o)};
document.querySelectorAll('.holo').forEach(fg=>{const v=fg.querySelector('video'),b=fg.querySelector('.snd');
 const io=new IntersectionObserver(e=>e.forEach(en=>{if(en.isIntersecting&&!R){v.play().catch(()=>{})}else v.pause()}),{threshold:.35});io.observe(v);
 b.onclick=()=>{v.muted=!v.muted;if(!v.muted){v.currentTime=0;v.play().catch(()=>{})}b.setAttribute('aria-pressed',!v.muted);b.textContent=v.muted?'🔊 Play with sound':'🔇 Mute'}});
const cp=document.getElementById('copy');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText('hello@wardconsulting.ai');cp.textContent='Copied!'}catch(e){cp.textContent='Select and copy'}setTimeout(()=>cp.textContent='Copy address',1600)};
const D={funnel:[
 ['Reach','A stranger sees you',{'What moves them on':'Being found: search, social posts, events, word of mouth','Pipeline':'Marketing pipeline (draft → your yes → publish)','Workflows':'Weekly post drafts; listing check','Metric':'Views or visitors per week (or NO DATA until measured)'}],
 ['Interest','They engage',{'What moves them on':'A fast, friendly answer to a visit, call, demo or booking request','Pipeline':'Lead pipeline','Workflows':'Inquiry reply draft; follow-up reminder','Metric':'Visitors → inquiries %'}],
 ['Buy','First purchase or signed',{'What moves them on':'A clear quote and an easy way to say yes','Pipeline':'Quote-to-order pipeline','Workflows':'Quote draft; invoice draft (you approve)','Metric':'Inquiries → buyers %'}],
 ['Repeat / Refer','They come back and tell friends',{'What moves them on':'A thank-you, a check-in, a reason to rebook','Pipeline':'Customer care pipeline','Workflows':'Thank-you draft; rebook reminder; review request','Metric':'Repeat or referral %. Most funnels stop at Buy, so this stage is where hidden leaks live.'}]],
 pipe:[
 ['Intake','A request arrives',{'Owner':'Intake helper','Handoff':'A short form: who, what, by when','Time limit':'Same day','Gate':'Is everything needed there? If not, ask one question.'}],
 ['Draft','The work is prepared',{'Owner':'Drafting helper','Handoff':'The draft plus the sources it used','Time limit':'Within a day','Gate':'Checked against your rules and tone'}],
 ['Approve','You say yes',{'Owner':'You (the owner)','Handoff':'Your daily yes-list','Time limit':'Your pace. Silence is never a yes.','Gate':'Anything one-way (send, spend, publish) needs your typed yes.'}],
 ['Deliver','It goes out',{'Owner':'Delivery helper','Handoff':'A confirmation saved to the log','Time limit':'Right after approval','Gate':'Did it actually arrive? The proof is saved.'}],
 ['Check','Daily check',{'Owner':'Check-in helper','Handoff':'Status: GREEN / WATCH / MISS / BLOCKED','Time limit':'Daily','Gate':'Miss once: re-run. Twice in a week: a person looks. Three times: rebuild the step.'}]],
 flow:[
 ['Trigger','What starts it',{'Example':'A new quote request email arrives','Approval level':'T0: reading only'}],
 ['Step 1','Read & sort',{'Example':'Pull the name, the job and the date. Mark anything missing.','Two-way or one-way':'Two-way (undoable)'}],
 ['Step 2','Draft',{'Example':'Write the reply from your price sheet and tone guide','Two-way or one-way':'Two-way (it\'s only a draft)'}],
 ['Approval','Your yes',{'Example':'The draft waits on your yes-list','Approval level':'T3: one-way, so you approve it'}],
 ['Done','Finished & logged',{'Example':'The reply is sent and the log is updated','Success metric':'Reply time, with a baseline first (or NO DATA)','Day 7 / Day 30':'Quick reviews: keep, change or retire it'}]]};
document.querySelectorAll('.track').forEach(t=>{const set=D[t.dataset.set];set.forEach((d,i)=>{if(i){const a=document.createElement('span');a.className='arrow';a.textContent='➜';a.setAttribute('aria-hidden','true');t.append(a)}
 const b=document.createElement('button');b.className='node';b.type='button';b.setAttribute('aria-pressed','false');b.innerHTML=`<b>${d[0]}</b><span>${d[1]}</span>`;
 b.onclick=()=>{document.querySelectorAll('.node').forEach(z=>z.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');document.getElementById('d-title').textContent=d[0]+' · '+d[1];
  document.getElementById('d-body').innerHTML='<table>'+Object.entries(d[2]).map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('')+'</table><p class="small">A generic example from our template kit.</p>'};t.append(b)})});
const tabs=[...document.querySelectorAll('[role=tab]')];tabs.forEach((tb,i)=>{tb.onclick=()=>{tabs.forEach(o=>{const on=o===tb;o.setAttribute('aria-selected',on);o.tabIndex=on?0:-1;document.getElementById(o.getAttribute('aria-controls')).hidden=!on});const first=document.querySelector('#'+tb.getAttribute('aria-controls')+' .node');first&&first.click()};
 tb.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const j=(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[j].focus();tabs[j].click()}}});
const f0=document.querySelector('.node');f0&&f0.click();
const book=document.getElementById('book');
if(book&&(new URLSearchParams(location.search).get('interest')||'').toLowerCase()==='managed'){
 const k=document.getElementById('channel');if(k)k.textContent='Managed service — coming soon / inquiry';
 const lead=document.querySelector('#main .lead');if(lead)lead.textContent='You are asking about the hosted managed AI service. It is not open yet. Email us and a person will reply. This page will not charge you or create an account.';
 const note=document.getElementById('interest-note');if(note)note.hidden=false;
 book.href='mailto:hello@wardconsulting.ai?subject='+encodeURIComponent('Managed AI service inquiry');book.textContent='Email about the managed service';
}})();
