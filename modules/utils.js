import {state} from './state.js';
export const $=id=>document.getElementById(id);

export function clean(value){
  return value===null||value===undefined?'':String(value).trim();
}

export function escapeHtml(value){
  return clean(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

export function money(value){
  return `₹${Math.round(Number(value||0)).toLocaleString('en-IN')}`;
}

export function phone10(value){
  const digits=clean(value).replace(/\D/g,'');
  return digits.length>10?digits.slice(-10):digits;
}

export function e164(value){
  const phone=phone10(value);
  return phone?`+91${phone}`:'';
}

export function nowIso(){
  return new Date().toISOString();
}

export function toDate(value){
  if(!value)return new Date(0);
  if(typeof value.toDate==='function')return value.toDate();
  if(value.seconds)return new Date(value.seconds*1000);
  const date=new Date(value);
  return Number.isNaN(date.getTime())?new Date(0):date;
}

export function isToday(value){
  const date=toDate(value);
  return date.toDateString()===new Date().toDateString();
}

export function formatTime(value){
  const date=toDate(value);
  if(date.getTime()<=0)return '—';
  return date.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
}

export function shortId(id){
  return clean(id).slice(-6)||'—';
}

export function statusOf(order){
  return clean(order?.status||order?.currentStatus||order?.adminStatus||order?.orderStatus||'confirmed').toLowerCase().replace(/[\s-]+/g,'_');
}

export function orderId(order){
  return clean(order?.id||order?.orderId||order?.receipt||order?.razorpayOrderId||order?.docId);
}

export function orderTotal(order){
  return Number(order?.total??order?.totals?.total??0);
}

export function customerName(order){
  return clean(order?.customerName||order?.customer?.name||'Customer');
}

export function customerPhone(order){
  return phone10(order?.customerPhone||order?.customer?.phone||order?.customer?.contact||order?.phone);
}

export function customerId(order){
  return clean(order?.customerId||order?.customer?.uid||order?.customer?.id);
}

export function orderItems(order){
  const items=order?.items||order?.cartItems||order?.orderItems||[];
  return Array.isArray(items)?items:Object.values(items||{});
}

export function itemCount(order){
  return orderItems(order).reduce((sum,item)=>sum+(Number(item.qty??item.quantity??1)||1),0);
}

export function deliveryAddress(order){
  return clean(order?.deliveryAddress||order?.address||order?.deliveryLocation?.fullAddress||order?.deliveryLocation?.displayAddress||order?.customer?.address||'');
}

export function assignedRiderName(order){
  return clean(order?.assignedRiderName||order?.riderName||order?.rider?.name);
}

export function assignedRiderPhone(order){
  return phone10(order?.assignedRiderPhone||order?.riderPhone||order?.rider?.phone);
}

export function isActiveStatus(status){
  return !['delivered','cancelled','canceled','payment_failed'].includes(status);
}

export function orderAgeMinutes(order){
  const date=toDate(order?.createdAt||order?.createdAtClient||order?.paidAt);
  if(date.getTime()<=0)return 0;
  return Math.max(0,(Date.now()-date.getTime())/60000);
}

export function isDelayed(order){
  if(!isActiveStatus(statusOf(order)))return false;
  const status=statusOf(order);
  const base=Number(state.settings?.preparationMinutes||45)||45;
  const prepRegular=Number(state.settings?.prepRegularMinutes||base)||base;
  const prepProtein=Number(state.settings?.prepProteinMinutes||base)||base;
  const category=clean(order?.category||orderItems(order)[0]?.category).toLowerCase();
  const prepLimit=category.includes('protein')?prepProtein:prepRegular;
  if(status==='preparing')return stageAgeMinutes(order)>prepLimit;
  if(status==='confirmed')return orderAgeMinutes(order)>15;
  if(status==='out_for_delivery')return stageAgeMinutes(order)>60;
  return orderAgeMinutes(order)>base;
}

export function hasIssue(order){
  return clean(order?.issueStatus)==='open'||order?.needsAttention===true||!!(order?.issue&&clean(order.issue.status)!=='resolved');
}

export function attentionReasons(order){
  const reasons=[];
  if(order?.hold)reasons.push('On hold');
  if(hasIssue(order))reasons.push('Open issue');
  if(clean(order?.priority)==='issue')reasons.push('Priority issue');
  if(isDelayed(order))reasons.push('Delayed');
  if(isActiveStatus(statusOf(order))&&!assignedRiderName(order)&&orderAgeMinutes(order)>10)reasons.push('No rider');
  if(statusOf(order)==='preparing'&&orderAgeMinutes(order)>30)reasons.push('Kitchen delay');
  if(statusOf(order)==='out_for_delivery'&&orderAgeMinutes(order)>60)reasons.push('Delivery delay');
  if(clean(order?.refundStatus)==='requested')reasons.push('Refund requested');
  return reasons;
}

export function statusLabel(status){
  const labels={confirmed:'New',preparing:'Preparing',out_for_delivery:'On the way',delivered:'Delivered',cancelled:'Cancelled',canceled:'Cancelled',payment_failed:'Payment failed'};
  return labels[status]||status||'New';
}

export function csvEscape(value){
  const text=clean(value);
  return `"${text.replaceAll('"','""')}"`;
}

export function downloadText(filename,content,type='text/plain'){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}


export function activeStageStartedAt(order){
  const timeline=Array.isArray(order?.timeline)?order.timeline:[];
  const status=statusOf(order);
  const wanted={
    confirmed:['payment_finalized','order_created','order_confirmed','status_changed'],
    preparing:['status_changed','preparing_started'],
    out_for_delivery:['status_changed','rider_assigned','picked_up','out_for_delivery'],
    delivered:['status_changed','delivered']
  }[status]||[];
  for(let i=timeline.length-1;i>=0;i--){
    const row=timeline[i]||{};
    const patch=Array.isArray(row.patch)?row.patch:[];
    const type=clean(row.type);
    const changedStatus=patch.includes('status')||patch.includes('orderStatus')||patch.includes('adminStatus');
    if(wanted.includes(type)||changedStatus)return row.at||row.createdAt||order.updatedAt||order.createdAt||order.paidAt;
  }
  return order.updatedAt||order.createdAt||order.createdAtClient||order.paidAt;
}

export function stageAgeMinutes(order){
  const start=toDate(activeStageStartedAt(order));
  if(start.getTime()<=0)return orderAgeMinutes(order);
  return Math.max(0,(Date.now()-start.getTime())/60000);
}

export function formatMinutesLabel(minutes){
  const value=Math.max(0,Math.floor(Number(minutes)||0));
  if(value<60)return `${value} min`;
  const h=Math.floor(value/60);
  const m=value%60;
  return m?`${h}h ${m}m`:`${h}h`;
}

export function orderTimerInfo(order){
  const status=statusOf(order);
  const age=orderAgeMinutes(order);
  const stageAge=stageAgeMinutes(order);
  const reasons=attentionReasons(order);
  let label=`Paid ${formatMinutesLabel(age)} ago`;
  let level='green';
  let detail='On time';
  if(status==='preparing'){
    label=`Preparing ${formatMinutesLabel(stageAge)}`;
    if(stageAge>=30){level='red';detail='Kitchen delayed'}
    else if(stageAge>=20){level='amber';detail='Kitchen warning'}
  }else if(status==='out_for_delivery'){
    label=`On the way ${formatMinutesLabel(stageAge)}`;
    if(stageAge>=60){level='red';detail='Delivery delayed'}
    else if(stageAge>=40){level='amber';detail='Delivery warning'}
  }else if(status==='confirmed'){
    label=`New ${formatMinutesLabel(age)}`;
    if(age>=15){level='red';detail='Not accepted'}
    else if(age>=8){level='amber';detail='Accept soon'}
  }
  if(isActiveStatus(status)&&!assignedRiderName(order)&&age>=10){
    level=level==='red'?'red':'amber';
    detail='Rider needed';
  }
  if(reasons.length){
    if(reasons.includes('Delayed')||reasons.includes('Open issue')||reasons.includes('Refund requested'))level='red';
    detail=reasons[0];
  }
  return {label,level,detail,ageMinutes:age,stageAgeMinutes:stageAge,reasons};
}


export function dateKey(value){
  const date=toDate(value);
  if(date.getTime()<=0)return '';
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export function todayDateKey(){
  return dateKey(new Date());
}

export function addDays(date,days){
  const copy=new Date(date);
  copy.setDate(copy.getDate()+days);
  return copy;
}

export function dateStripDays(center=new Date(),before=3,after=4){
  const out=[];
  for(let i=-before;i<=after;i++){
    const date=addDays(center,i);
    out.push({
      key:dateKey(date),
      day:date.toLocaleDateString('en-IN',{weekday:'short'}),
      date:String(date.getDate()).padStart(2,'0'),
      month:date.toLocaleDateString('en-IN',{month:'short'})
    });
  }
  return out;
}
