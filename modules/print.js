import {state} from './state.js';
import {customerName,customerPhone,deliveryAddress,escapeHtml,formatTime,money,orderId,orderItems,orderTotal,shortId} from './utils.js';

export function printKitchenSlip(id){
  const order=state.orders.find(item=>orderId(item)===id);
  if(!order)return;
  const items=orderItems(order).map(item=>`<tr><td>${escapeHtml(item.name||'Item')}</td><td>${Number(item.qty??item.quantity??1)}</td><td>${money(item.price||0)}</td></tr>`).join('');
  const win=window.open('','_blank','width=420,height=640');
  win.document.write(`<!DOCTYPE html><html><head><title>Kitchen slip #${shortId(id)}</title><style>body{font-family:system-ui;padding:20px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}.muted{color:#666}</style></head><body><h1>Tiffin CBE</h1><h2>#${shortId(id)}</h2><p class="muted">${escapeHtml(formatTime(order.createdAt||order.paidAt))}</p><p><strong>${escapeHtml(customerName(order))}</strong><br>${escapeHtml(customerPhone(order))}</p><p>${escapeHtml(deliveryAddress(order))}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>${items}</tbody></table><h3>Total: ${money(orderTotal(order))}</h3></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
