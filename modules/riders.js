import {state} from './state.js';
import {$,escapeHtml,formatTime,formatMinutesLabel,orderId,shortId,statusOf,toDate} from './utils.js';

export function renderRiders(){
  const rows=state.riders.map(rider=>{
    const activeOrders=state.orders.filter(order=>order.assignedRiderDocId===rider.docId&&!['delivered','cancelled','canceled'].includes(statusOf(order)));
    const current=activeOrders[0];
    const delivered=state.orders.filter(order=>order.assignedRiderDocId===rider.docId&&statusOf(order)==='delivered');
    const avg=averageDeliveryMinutes(delivered);
    const status=activeOrders.length?'busy':(rider.active===false?'inactive':(rider.status||'available'));
    return `<tr>
      <td><strong>${escapeHtml(rider.name||'Rider')}</strong><br><span class="muted">${rider.authUid?'Verified UID':'Pending UID'}${rider.area?` · ${escapeHtml(rider.area)}`:''}</span></td>
      <td>${escapeHtml(rider.phone||rider.phoneE164||'—')}</td>
      <td><span class="badge ${status==='busy'?'amber':status==='available'?'green':'red'}">${escapeHtml(status)}</span></td>
      <td>${activeOrders.length?`${activeOrders.length}/${Number(rider.maxActiveOrders||2)} · #${shortId(orderId(current))}`:'—'}</td>
      <td>${escapeHtml(formatTime(rider.lastLocationAt||rider.locationUpdatedAt||rider.updatedAt))}</td>
      <td><div class="table-actions"><span class="badge">${delivered.length} delivered</span><span class="badge purple">${avg?formatMinutesLabel(avg):'—'}</span><button class="small-btn" data-edit-rider="${escapeHtml(rider.docId)}" type="button">Edit</button></div></td>
    </tr>`;
  }).join('');
  $('riderTable').innerHTML=rows||'<tr><td colspan="6"><div class="empty-state">No riders</div></td></tr>';
}

function averageDeliveryMinutes(orders){
  const values=orders.map(order=>{
    const start=toDate(order.riderAssignedAt||order.pickedUpAt||order.createdAt);
    const end=toDate(order.deliveredAt||order.updatedAt);
    if(start.getTime()<=0||end.getTime()<=0)return 0;
    return Math.max(0,(end-start)/60000);
  }).filter(Boolean);
  if(!values.length)return 0;
  return Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
}

export function editRider(id){
  const rider=state.riders.find(row=>row.docId===id);
  if(!rider)return;
  $('riderFormTitle').textContent='Edit rider';
  $('riderDocId').value=rider.docId;
  $('riderName').value=rider.name||'';
  $('riderPhone').value=rider.phone||rider.phoneE164||'';
  $('riderAuthUid').value=rider.authUid||'';
  $('riderStatus').value=rider.status||'available';
  $('riderActive').checked=rider.active!==false;
  $('riderVerified').checked=!!rider.verified||!!rider.authUid;
  if($('riderMaxActiveOrders'))$('riderMaxActiveOrders').value=rider.maxActiveOrders||2;
  if($('riderArea'))$('riderArea').value=rider.area||'';
}
