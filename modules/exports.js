import {filteredOrders} from './orders.js';
import {csvEscape,customerName,customerPhone,deliveryAddress,downloadText,formatTime,money,orderId,orderTotal,statusLabel,statusOf} from './utils.js';

export function exportOrdersCsv(){
  const rows=filteredOrders();
  const header=['Order ID','Created','Status','Customer','Phone','Total','Address'];
  const lines=[header.map(csvEscape).join(',')];
  rows.forEach(order=>{
    lines.push([
      orderId(order),
      formatTime(order.createdAt||order.paidAt),
      statusLabel(statusOf(order)),
      customerName(order),
      customerPhone(order),
      money(orderTotal(order)),
      deliveryAddress(order)
    ].map(csvEscape).join(','));
  });
  downloadText(`cbe-orders-${new Date().toISOString().slice(0,10)}.csv`,lines.join('\n'),'text/csv');
}
