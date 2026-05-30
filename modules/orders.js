import {state} from './state.js';
import {$,assignedRiderName,attentionReasons,customerName,customerPhone,dateKey,dateStripDays,deliveryAddress,escapeHtml,formatTime,isActiveStatus,isDelayed,isToday,itemCount,money,orderId,orderTotal,shortId,orderTimerInfo,statusLabel,statusOf} from './utils.js';

const columns=[
  {key:'confirmed',label:'New'},
  {key:'preparing',label:'Preparing'},
  {key:'out_for_delivery',label:'Out for delivery'},
  {key:'delivered',label:'Delivered'},
  {key:'cancelled',label:'Cancelled'}
];

export function filteredOrders(){
  const query=($('globalSearch')?.value||'').trim().toLowerCase();
  let list=state.orders.filter(order=>order.paymentStatus==='paid'||order.adminVisible===true);
  if(state.selectedDateKey){
    list=list.filter(order=>dateKey(order.createdAt||order.paidAt||order.createdAtClient)===state.selectedDateKey);
  }
  if(state.filter==='active')list=list.filter(order=>isActiveStatus(statusOf(order)));
  if(state.filter==='today')list=list.filter(order=>isToday(order.createdAt||order.paidAt));
  if(state.filter==='unassigned')list=list.filter(order=>isActiveStatus(statusOf(order))&&!assignedRiderName(order));
  if(state.filter==='delayed')list=list.filter(isDelayed);
  if(query){
    list=list.filter(order=>[
      orderId(order),
      customerName(order),
      customerPhone(order),
      assignedRiderName(order),
      deliveryAddress(order)
    ].join(' ').toLowerCase().includes(query));
  }
  return list;
}

export function renderOrdersBoard(){
  renderDateStrip();
  const list=filteredOrders();
  $('ordersBoard').innerHTML=columns.map(column=>{
    const colOrders=list.filter(order=>statusOf(order)===column.key);
    return `<section class="order-column">
      <div class="column-head"><h3>${column.label}</h3><div class="count-pill">${colOrders.length}</div></div>
      <div class="order-stack">${colOrders.map(orderCard).join('')||'<div class="empty-state">No orders</div>'}</div>
    </section>`;
  }).join('');
}

function orderCard(order){
  const id=orderId(order);
  const status=statusOf(order);
  const rider=assignedRiderName(order);
  const reasons=attentionReasons(order);
  const timer=orderTimerInfo(order);
  return `<article class="order-card ${reasons.length?'danger-zone':''}">
    <div class="order-top">
      <div><div class="order-id">#${shortId(id)}</div><div class="muted">${escapeHtml(formatTime(order.createdAt||order.paidAt))}</div></div>
      <div class="price">${money(orderTotal(order))}</div>
    </div>
    <div class="timer-chip ${escapeHtml(timer.level)}">
      <strong>${escapeHtml(timer.label)}</strong>
      <span>${escapeHtml(timer.detail)}</span>
    </div>
    <div class="badge-row">
      <span class="badge ${statusClass(status)}">${escapeHtml(statusLabel(status))}</span>
      ${rider?`<span class="badge green">${escapeHtml(rider)}</span>`:'<span class="badge red">No rider</span>'}
      ${order.priority&&order.priority!=='normal'?`<span class="badge purple">${escapeHtml(order.priority)}</span>`:''}
      ${order.hold?'<span class="badge amber">On hold</span>':''}
      ${isDelayed(order)?'<span class="badge red">Delayed</span>':''}
      ${reasons.length?`<span class="badge red">${escapeHtml(reasons[0])}</span>`:''}
    </div>
    <div class="order-meta">
      <div>${escapeHtml(customerName(order))} · ${escapeHtml(customerPhone(order)||'No phone')}</div>
      <div>${itemCount(order)} items · ${escapeHtml(order.etaDisplay||order.eta||'ETA —')}</div>
      <div>${escapeHtml(deliveryAddress(order)||'No address')}</div>
    </div>
    <div class="order-actions">
      <button class="small-btn" data-open-order="${escapeHtml(id)}" type="button">Details</button>
      ${nextActionButton(order)}
      <button class="small-btn" data-assign-quick="${escapeHtml(id)}" type="button">Assign</button>
      <button class="small-btn amber" data-open-order="${escapeHtml(id)}" type="button">More</button>
      <button class="small-btn red" data-cancel-order="${escapeHtml(id)}" type="button">Cancel</button>
    </div>
  </article>`;
}

function statusClass(status){
  if(status==='delivered')return 'green';
  if(status==='cancelled'||status==='canceled')return 'red';
  if(status==='out_for_delivery')return 'purple';
  return 'amber';
}

function nextActionButton(order){
  const status=statusOf(order);
  const id=escapeHtml(orderId(order));
  if(status==='confirmed')return `<button class="small-btn primary" data-status="${id}" data-value="preparing" type="button">Preparing</button>`;
  if(status==='preparing')return `<button class="small-btn green" data-status="${id}" data-value="out_for_delivery" type="button">On way</button>`;
  if(status==='out_for_delivery')return `<button class="small-btn green" data-status="${id}" data-value="delivered" type="button">Delivered</button>`;
  return `<button class="small-btn" data-status="${id}" data-value="confirmed" type="button">Reopen</button>`;
}


function renderDateStrip(){
  const wrap=$('orderDateStrip');
  if(!wrap)return;
  const selected=state.selectedDateKey||dateKey(new Date());
  const center=selected?new Date(`${selected}T12:00:00`):new Date();
  const monthLabel=$('dateMonthLabel');
  if(monthLabel){
    monthLabel.textContent=state.selectedDateKey
      ? center.toLocaleDateString('en-IN',{month:'long',year:'numeric'})
      : 'All dates';
  }
  const days=dateStripDays(center,3,4);
  wrap.innerHTML=days.map(day=>{
    const active=day.key===state.selectedDateKey;
    const count=state.orders.filter(order=>(order.paymentStatus==='paid'||order.adminVisible===true)&&dateKey(order.createdAt||order.paidAt||order.createdAtClient)===day.key).length;
    return `<button class="date-pill ${active?'active':''}" data-date-key="${escapeHtml(day.key)}" type="button">
      <span class="date-day">${escapeHtml(day.day)}</span>
      <span class="date-core"><strong>${escapeHtml(day.date)}</strong><small>${escapeHtml(day.month)}</small></span>
      ${count?`<em>${count}</em>`:''}
    </button>`;
  }).join('');
}

