import {state} from './state.js';
import {$,customerName,escapeHtml,orderId,shortId,statusLabel,statusOf} from './utils.js';

export function renderIssues(){
  const rows=state.orders.filter(order=>order.issueStatus==='open'||order.needsAttention||order.issue?.status==='open'||order.refundStatus==='requested');
  $('issuesTable').innerHTML=rows.map(order=>{
    const latestIssue=Array.isArray(order.issueHistory)&&order.issueHistory.length?order.issueHistory[order.issueHistory.length-1]:order.issue;
    return `<tr>
      <td>#${shortId(orderId(order))}<br><span class="muted">${escapeHtml(statusLabel(statusOf(order)))}</span></td>
      <td>${escapeHtml(customerName(order))}</td>
      <td><strong>${escapeHtml(latestIssue?.type||order.refundStatus||'Needs attention')}</strong><br><span class="muted">${escapeHtml(latestIssue?.note||order.cancelReason||order.supportLastNote||'')}</span></td>
      <td><span class="badge red">${escapeHtml(order.issueStatus||order.refundStatus||'open')}</span></td>
      <td><button class="small-btn" data-open-order="${escapeHtml(orderId(order))}" type="button">Open</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="5"><div class="empty-state">No open issues</div></td></tr>';
}
