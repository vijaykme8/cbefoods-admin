import {state} from './state.js';
import {renderDashboard} from './dashboard.js';
import {renderOrdersBoard} from './orders.js';
import {renderIssues} from './issues.js';
import {renderMenu} from './menu.js';
import {renderRiders} from './riders.js';
import {renderSettings} from './settings.js';
import {renderDrawer} from './drawer.js';
import {$,assignedRiderName,attentionReasons,isActiveStatus,isDelayed,isToday,statusOf} from './utils.js';

export function renderAll(){
  renderDashboard();
  renderOrdersBoard();
  renderIssues();
  renderMenu();
  renderRiders();
  renderSettings();
  renderDrawer();
  renderUrgencyBadges();
}

function renderUrgencyBadges(){
  const paid=state.orders.filter(order=>order.paymentStatus==='paid'||order.adminVisible===true);
  const active=paid.filter(order=>isActiveStatus(statusOf(order)));
  const today=paid.filter(order=>isToday(order.createdAt||order.paidAt));
  const unassigned=active.filter(order=>!assignedRiderName(order)).length;
  const delayed=active.filter(isDelayed).length;
  const issues=paid.filter(order=>order.issueStatus==='open'||order.needsAttention===true||order.issue?.status==='open'||order.refundStatus==='requested').length;
  const attention=active.filter(order=>attentionReasons(order).length).length;
  setBadge('navOrdersBadge',attention||unassigned||delayed);
  setBadge('navIssuesBadge',issues);
  setBadge('attentionCountBadge',attention);
  setBadge('filterActiveBadge',active.length);
  setBadge('filterTodayBadge',today.length);
  setBadge('filterUnassignedBadge',unassigned);
  setBadge('filterDelayedBadge',delayed);
  document.title=(attention||issues)?`(${attention+issues}) CBE Admin`:'Tiffin CBE Admin';
}

function setBadge(id,count){
  const el=$(id);
  if(!el)return;
  const value=Number(count||0);
  el.textContent=value>99?'99+':String(value);
  el.hidden=value<=0;
}

export function showView(view){
  const views=['dashboard','orders','issues','menu','riders','settings'];
  if(!views.includes(view))return;
  state.view=view;
  document.querySelectorAll('.view').forEach(item=>item.classList.remove('active'));
  $(`view-${view}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view===view));
  $('pageTitle').textContent={dashboard:'Dashboard',orders:'Live orders',issues:'Issues',menu:'Menu',riders:'Riders',settings:'Store settings'}[view]||'Dashboard';
  renderAll();
}
