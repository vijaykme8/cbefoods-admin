import {state} from './state.js';
import {$,assignedRiderName,assignedRiderPhone,clean,customerName,customerPhone,deliveryAddress,escapeHtml,formatTime,itemCount,money,orderId,orderItems,orderTotal,shortId,orderTimerInfo,statusLabel,statusOf} from './utils.js';
import {addIssue,assignRider,resolveIssue,updateOrder} from './operations.js';

const issueTypes=['Customer not reachable','Address unclear','Food unavailable','Rider delayed','Payment issue','Refund needed','Cancelled by customer','Cancelled by restaurant','Other issue'];

export function openDrawer(id){
  state.selectedOrderId=id;
  renderDrawer();
  $('detailDrawer').classList.add('open');
  $('detailDrawer').setAttribute('aria-hidden','false');
}

export function closeDrawer(){
  $('detailDrawer').classList.remove('open');
  $('detailDrawer').setAttribute('aria-hidden','true');
}

export function renderDrawer(){
  const order=state.orders.find(item=>orderId(item)===state.selectedOrderId);
  if(!order){
    $('drawerTitle').textContent='Order';
    $('drawerSubtitle').textContent='';
    $('drawerBody').innerHTML='<div class="empty-state">Select an order to view details.</div>';
    return;
  }
  const id=orderId(order);
  $('drawerTitle').textContent=`#${shortId(id)}`;
  $('drawerSubtitle').textContent=`${customerName(order)} · ${money(orderTotal(order))}`;
  $('drawerBody').innerHTML=drawerHtml(order);
  bindDrawer(order);
}

function drawerHtml(order){
  const id=orderId(order);
  const status=statusOf(order);
  const timer=orderTimerInfo(order);
  const riderOptions='<option value="">No rider</option>'+state.riders.map(rider=>{
    const selected=rider.docId===order.assignedRiderDocId||rider.authUid===order.assignedRiderAuthUid?'selected':'';
    const busy=state.orders.find(item=>orderId(item)!==id&&item.assignedRiderDocId===rider.docId&&!['delivered','cancelled','canceled'].includes(statusOf(item)));
    const label=`${rider.name||'Rider'}${busy?` · busy #${shortId(orderId(busy))}`:''}`;
    return `<option value="${escapeHtml(rider.docId)}" ${selected}>${escapeHtml(label)}</option>`;
  }).join('');
  const items=orderItems(order).map(item=>`<div class="mini-row"><strong>${escapeHtml(item.name||'Item')}</strong><span>${Number(item.qty??item.quantity??1)} × ${money(item.price||0)}</span></div>`).join('')||'<div class="empty-state">No items</div>';
  const timeline=Array.isArray(order.timeline)?order.timeline:[];
  return `
    <section class="drawer-section">
      <h4>Total taken for order</h4>
      <div class="timer-chip drawer-timer ${escapeHtml(timer.level)}">
        <strong>${escapeHtml(timer.label)}</strong>
        <span>${escapeHtml(timer.detail)}</span>
      </div>
    </section>
    <section class="drawer-section">
      <h4>Quick actions</h4>
      <div class="drawer-actions">
        <label class="field"><span>Status</span><select id="drawerStatus">
          ${['confirmed','preparing','out_for_delivery','delivered','cancelled'].map(value=>`<option value="${value}" ${value===status?'selected':''}>${statusLabel(value)}</option>`).join('')}
        </select></label>
        <label class="field"><span>Rider</span><select id="drawerRider">${riderOptions}</select></label>
        <button id="saveStatusBtn" class="primary-btn" type="button">Save status</button>
        <button id="saveRiderBtn" class="soft-btn" type="button">Save rider</button>
      </div>
    </section>
    <section class="drawer-section">
      <h4>Customer</h4>
      <div class="info-grid">
        <div class="info-item"><span>Name</span><strong>${escapeHtml(customerName(order))}</strong></div>
        <div class="info-item"><span>Phone</span><strong>${escapeHtml(customerPhone(order)||'—')}</strong></div>
        <div class="info-item"><span>Items</span><strong>${itemCount(order)}</strong></div>
        <div class="info-item"><span>Total paid</span><strong>${money(orderTotal(order))}</strong></div>
      </div>
      <p class="muted">${escapeHtml(deliveryAddress(order)||'No delivery address')}</p>
    </section>
    <section class="drawer-section">
      <h4>Order items</h4>
      ${items}
    </section>
    <section class="drawer-section">
      <h4>Payment safety</h4>
      <div class="info-grid">
        <div class="info-item"><span>Status</span><strong>${escapeHtml(order.paymentStatus||'—')}</strong></div>
        <div class="info-item"><span>Provider</span><strong>${escapeHtml(order.paymentProvider||'Razorpay')}</strong></div>
        <div class="info-item"><span>Payment ID</span><strong>${escapeHtml(order.paymentId||order.razorpayPaymentId||'—')}</strong></div>
        <div class="info-item"><span>Razorpay order</span><strong>${escapeHtml(order.razorpayOrderId||'—')}</strong></div>
      </div>
      <div class="button-row">
        <button id="refundRequestedBtn" class="small-btn amber" type="button">Refund requested</button>
        <button id="refundDoneBtn" class="small-btn green" type="button">Refund processed</button>
      </div>
    </section>
    <section class="drawer-section">
      <h4>Issue management</h4>
      <label class="field"><span>Issue type</span><select id="issueType">
        <option value="">Select issue</option>${issueTypes.map(type=>`<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('')}
      </select></label>
      <label class="field"><span>Internal note</span><textarea id="issueNote" rows="3"></textarea></label>
      <div class="button-row">
        <button id="addIssueBtn" class="small-btn red" type="button">Add issue</button>
        <button id="resolveIssueBtn" class="small-btn green" type="button">Resolve issue</button>
      </div>
    </section>
    <section class="drawer-section">
      <h4>Timeline</h4>
      <div class="timeline">
        ${timeline.length?timeline.slice().reverse().map(row=>`<div class="timeline-row"><strong>${escapeHtml(row.type||'update')}</strong><div class="muted">${escapeHtml(row.by||'Admin')} · ${escapeHtml(formatTime(row.at))}</div></div>`).join(''):'<div class="empty-state">No timeline yet</div>'}
      </div>
    </section>
    <section class="drawer-section">
      <h4>Tools</h4>
      <div class="drawer-actions">
        <a class="small-btn" href="tel:${escapeHtml(customerPhone(order))}">Call customer</a>
        <a class="small-btn" href="tel:${escapeHtml(assignedRiderPhone(order))}">Call rider</a>
        <button class="small-btn" data-copy-address="${escapeHtml(id)}" type="button">Copy address</button>
        <button class="small-btn" data-print-slip="${escapeHtml(id)}" type="button">Print slip</button>
      </div>
    </section>
  `;
}

function bindDrawer(order){
  const id=orderId(order);
  $('saveStatusBtn').onclick=()=>updateOrder(id,{status:$('drawerStatus').value},'status_changed');
  $('saveRiderBtn').onclick=()=>assignRider(id,$('drawerRider').value);
  $('addIssueBtn').onclick=()=>addIssue(id);
  $('resolveIssueBtn').onclick=()=>resolveIssue(id);
  $('refundRequestedBtn').onclick=()=>updateOrder(id,{refundStatus:'requested',refundRequestedAt:new Date().toISOString(),needsAttention:true,issueStatus:'open'},'refund_requested');
  $('refundDoneBtn').onclick=()=>updateOrder(id,{refundStatus:'processed_manual',refundProcessedAt:new Date().toISOString()},'refund_processed');
}
