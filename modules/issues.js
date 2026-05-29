import {state} from './state.js';
import {$,customerName,escapeHtml,orderId,shortId,statusLabel,statusOf} from './utils.js';

export function renderIssues(){
  const rows=state.orders.filter(order=>order.issueStatus==='open'||order.needsAttention||order.issue?.status==='open');
  $('issuesTable').innerHTML=rows.map(order=>`<tr>
    <td>#${shortId(orderId(order))}<br><span class="muted">${escapeHtml(statusLabel(statusOf(order)))}</span></td>
    <td>${escapeHtml(customerName(order))}</td>
    <td><strong>${escapeHtml(order.issue?.type||order.refundStatus||'Needs attention')}</strong><br><span class="muted">${escapeHtml(order.issue?.note||order.cancelReason||'')}</span></td>
    <td><span class="badge red">${escapeHtml(order.issueStatus||'open')}</span></td>
    <td><button class="small-btn" data-open-order="${escapeHtml(orderId(order))}" type="button">Open</button></td>
  </tr>`).join('')||'<tr><td colspan="5"><div class="empty-state">No open issues</div></td></tr>';
}
