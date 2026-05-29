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
  return isActiveStatus(statusOf(order))&&orderAgeMinutes(order)>45;
}

export function hasIssue(order){
  return clean(order?.issueStatus)==='open'||order?.needsAttention===true||!!(order?.issue&&clean(order.issue.status)!=='resolved');
}

export function attentionReasons(order){
  const reasons=[];
  if(hasIssue(order))reasons.push('Open issue');
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
