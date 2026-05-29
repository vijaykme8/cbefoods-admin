import {state} from './state.js';
import {renderDashboard} from './dashboard.js';
import {renderOrdersBoard} from './orders.js';
import {renderIssues} from './issues.js';
import {renderMenu} from './menu.js';
import {renderRiders} from './riders.js';
import {renderSettings} from './settings.js';
import {renderDrawer} from './drawer.js';
import {$} from './utils.js';

export function renderAll(){
  renderDashboard();
  renderOrdersBoard();
  renderIssues();
  renderMenu();
  renderRiders();
  renderSettings();
  renderDrawer();
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
