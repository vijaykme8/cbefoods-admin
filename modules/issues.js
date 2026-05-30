import {state} from './state.js';
import {$,customerName,escapeHtml,orderId,shortId,statusLabel,statusOf} from './utils.js';

export function renderIssues(){
  const rows=state.orders.filter(order=>order.issueStatus==='open'||order.issue?.status==='open'||order.refundStatus==='requested'||order.hold===true);
  $('issuesTable').innerHTML=rows.map(order=>{
    const latestIssue=Array.isArray(order.issueHistory)&&order.issueHistory.length?order.issueHistory[order.issueHistory.length-1]:order.issue;
    const label=order.hold?'Order hold':latestIssue?.type||order.refundStatus||'Needs attention';
    const note=order.holdReason||latestIssue?.note||order.cancelReason||order.supportLastNote||'';
    return `<tr>
      <td>#${shortId(orderId(order))}<br><span class="muted">${escapeHtml(statusLabel(statusOf(order)))}</span></td>
      <td>${escapeHtml(customerName(order))}</td>
      <td><strong>${escapeHtml(label)}</strong><br><span class="muted">${escapeHtml(note)}</span></td>
      <td><span class="badge red">${escapeHtml(order.issueStatus||order.refundStatus||(order.hold?'hold':'open'))}</span></td>
      <td><button class="small-btn" data-open-order="${escapeHtml(orderId(order))}" type="button">Open</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="5"><div class="empty-state">No unresolved issues</div></td></tr>';
}
