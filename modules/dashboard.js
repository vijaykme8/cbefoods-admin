import {state} from './state.js';
import {$,attentionReasons,customerName,customerPhone,escapeHtml,formatTime,isActiveStatus,isDelayed,isToday,itemCount,money,orderId,orderItems,orderTotal,shortId,orderTimerInfo,statusLabel,statusOf} from './utils.js';

export function renderDashboard(){
  const paid=state.orders.filter(order=>order.paymentStatus==='paid'||order.adminVisible===true);
  const paidToday=paid.filter(order=>isToday(order.createdAt||order.paidAt));
  const active=paid.filter(order=>isActiveStatus(statusOf(order)));
  const deliveredToday=paidToday.filter(order=>statusOf(order)==='delivered');
  const cancelledToday=paidToday.filter(order=>['cancelled','canceled'].includes(statusOf(order)));
  const revenue=paidToday.reduce((sum,order)=>sum+orderTotal(order),0);
  const avg=paidToday.length?revenue/paidToday.length:0;
  const delayed=active.filter(isDelayed);
  const unassigned=active.filter(order=>!order.assignedRiderName&&!order.riderName);
  const preparing=active.filter(order=>statusOf(order)==='preparing');
  const onway=active.filter(order=>statusOf(order)==='out_for_delivery');
  const metrics=[
    ['Revenue today',money(revenue),'Paid orders only'],
    ['Paid orders',paidToday.length,'Today'],
    ['Active',active.length,'Live orders'],
    ['Preparing',preparing.length,'Kitchen queue'],
    ['On the way',onway.length,'With riders'],
    ['Delivered',deliveredToday.length,'Today'],
    ['Cancelled',cancelledToday.length,'Today'],
    ['Unassigned',unassigned.length,'Need rider'],
    ['Delayed',delayed.length,'Over limit'],
    ['Avg order',money(avg),'Today']
  ];
  $('metricGrid').innerHTML=metrics.map(item=>`<div class="metric-card"><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></div>`).join('');
  const attention=active.filter(order=>attentionReasons(order).length).slice(0,8);
  $('attentionList').innerHTML=attention.map(attentionRow).join('')||'<div class="empty-state">No attention needed</div>';
  $('dashboardLiveList').innerHTML=active.slice(0,8).map(miniOrderRow).join('')||'<div class="empty-state">No active orders</div>';
  renderTopItems(paidToday);
  renderClosingSummary(paidToday,deliveredToday,cancelledToday,delayed);
}

function miniOrderRow(order){
  const status=statusOf(order);
  return `<button class="mini-row" type="button" data-open-order="${escapeHtml(orderId(order))}">
    <div><strong>#${shortId(orderId(order))} · ${escapeHtml(customerName(order))}</strong><span>${escapeHtml(orderItems(order).slice(0,2).map(item=>`${Number(item.qty??1)}× ${item.name||'Item'}`).join(', ')||'Items')}</span></div>
    <div><strong>${money(orderTotal(order))}</strong><small>${escapeHtml(statusLabel(status))}</small></div>
  </button>`;
}

function attentionRow(order){
  const timer=orderTimerInfo(order);
  return `<button class="mini-row danger-zone attention-row" type="button" data-open-order="${escapeHtml(orderId(order))}">
    <div><strong>#${shortId(orderId(order))} · ${escapeHtml(customerName(order))}</strong><span>${escapeHtml(timer.reasons.join(', ')||timer.detail)}</span></div>
    <div><strong class="timer-text ${escapeHtml(timer.level)}">${escapeHtml(timer.label)}</strong><small>${escapeHtml(customerPhone(order)||'No phone')}</small></div>
  </button>`;
}


function renderTopItems(list){
  const map=new Map();
  list.forEach(order=>{
    orderItems(order).forEach(item=>{
      const name=String(item.name||item.title||'Item').trim();
      const qty=Number(item.qty??item.quantity??1)||1;
      map.set(name,(map.get(name)||0)+qty);
    });
  });
  const rows=[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  $('topItemsList').innerHTML=rows.map(([name,qty])=>`<div class="mini-row"><strong>${escapeHtml(name)}</strong><span>${qty} sold</span></div>`).join('')||'<div class="empty-state">No item sales today</div>';
}

function renderClosingSummary(paidToday,deliveredToday,cancelledToday,delayed){
  const revenue=paidToday.reduce((sum,order)=>sum+orderTotal(order),0);
  const items=paidToday.reduce((sum,order)=>sum+itemCount(order),0);
  const tiles=[
    ['Orders',paidToday.length],
    ['Revenue',money(revenue)],
    ['Delivered',deliveredToday.length],
    ['Cancelled',cancelledToday.length],
    ['Delayed',delayed.length],
    ['Items sold',items]
  ];
  $('closingSummary').innerHTML=tiles.map(tile=>`<div class="summary-tile"><span>${tile[0]}</span><strong>${tile[1]}</strong></div>`).join('');
}
