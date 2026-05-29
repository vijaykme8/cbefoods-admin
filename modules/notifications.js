import {$,escapeHtml} from './utils.js';

export function toast(title,body=''){
  const stack=$('toastStack');
  if(!stack)return;
  const el=document.createElement('div');
  el.className='toast';
  el.innerHTML=`<strong>${escapeHtml(title)}</strong>${body?`<span>${escapeHtml(body)}</span>`:''}`;
  stack.appendChild(el);
  setTimeout(()=>{
    el.style.opacity='0';
    el.style.transform='translateY(8px)';
    setTimeout(()=>el.remove(),180);
  },3600);
}

export function playSound(){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    const ctx=new AudioContext();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(880,ctx.currentTime);
    osc.frequency.setValueAtTime(1180,ctx.currentTime+.1);
    gain.gain.setValueAtTime(.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.2,ctx.currentTime+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime+.34);
  }catch(e){}
}

export function browserNotify(title,body){
  if(!('Notification'in window)||Notification.permission!=='granted')return;
  try{new Notification(title,{body,tag:'cbe-admin-order'})}catch(e){}
}

export async function requestNotifications(){
  if(!('Notification'in window)){
    toast('Notifications unavailable');
    return;
  }
  const permission=await Notification.requestPermission();
  toast('Alerts updated',`Browser notification: ${permission}`);
}
