import {state} from './state.js';
import {$,escapeHtml,formatTime,orderId,shortId,statusOf} from './utils.js';

export function renderRiders(){
  const rows=state.riders.map(rider=>{
    const current=state.orders.find(order=>order.assignedRiderDocId===rider.docId&&!['delivered','cancelled','canceled'].includes(statusOf(order)));
    const status=current?'busy':(rider.active===false?'inactive':(rider.status||'available'));
    return `<tr>
      <td><strong>${escapeHtml(rider.name||'Rider')}</strong><br><span class="muted">${rider.authUid?'Verified UID':'Pending UID'}</span></td>
      <td>${escapeHtml(rider.phone||rider.phoneE164||'—')}</td>
      <td><span class="badge ${status==='busy'?'amber':status==='available'?'green':'red'}">${escapeHtml(status)}</span></td>
      <td>${current?`#${shortId(orderId(current))}`:'—'}</td>
      <td>${escapeHtml(formatTime(rider.lastLocationAt||rider.locationUpdatedAt||rider.updatedAt))}</td>
      <td><button class="small-btn" data-edit-rider="${escapeHtml(rider.docId)}" type="button">Edit</button></td>
    </tr>`;
  }).join('');
  $('riderTable').innerHTML=rows||'<tr><td colspan="6"><div class="empty-state">No riders</div></td></tr>';
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
}
