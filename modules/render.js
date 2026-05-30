import {state} from './state.js';
import {renderDashboard} from './dashboard.js';
import {renderOrdersBoard} from './orders.js';
import {renderIssues} from './issues.js';
import {renderMenu} from './menu.js';
import {renderRiders} from './riders.js';
import {renderSettings} from './settings.js';
import {renderDrawer} from './drawer.js';
import {$,assignedRiderName,attentionReasons,dateKey,isActiveStatus,isDelayed,isToday,statusOf,todayDateKey} from './utils.js';

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
  let paid=state.orders.filter(order=>order.paymentStatus==='paid'||order.adminVisible===true);
  if(state.selectedDateKey)paid=paid.filter(order=>dateKey(order.createdAt||order.paidAt||order.createdAtClient)===state.selectedDateKey);
  const active=paid.filter(order=>isActiveStatus(statusOf(order)));
  const today=paid.filter(order=>isToday(order.createdAt||order.paidAt));
  const issues=paid.filter(order=>order.issueStatus==='open'||order.issue?.status==='open'||order.refundStatus==='requested').length;
  setBadge('navOrdersBadge',0);
  setBadge('navIssuesBadge',issues);
  setBadge('attentionCountBadge',0);
  setBadge('filterActiveBadge',0);
  setBadge('filterTodayBadge',0);
  setBadge('filterUnassignedBadge',0);
  setBadge('filterDelayedBadge',0);
  updateTodayFilterLabel();
  document.title=issues?`(${issues}) CBE Admin`:'Tiffin CBE Admin';
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


function updateTodayFilterLabel(){
  const label=$('filterTodayLabel');
  if(!label)return;
  if(!state.selectedDateKey||state.selectedDateKey===todayDateKey()){
    label.textContent='Today';
    return;
  }
  const date=new Date(`${state.selectedDateKey}T12:00:00`);
  label.textContent=date.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}
