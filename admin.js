import {initFirebase} from './modules/firebase.js';
import {setupAuth,login} from './modules/auth.js';
import {state} from './modules/state.js';
import {$,deliveryAddress,orderId,todayDateKey} from './modules/utils.js';
import {showView,renderAll} from './modules/render.js';
import {openDrawer,closeDrawer} from './modules/drawer.js';
import {updateOrder,cancelOrder,saveMenuItem,resetMenuForm,saveRider,resetRiderForm,saveSettings,toggleKitchen} from './modules/operations.js';
import {editMenu} from './modules/menu.js';
import {editRider} from './modules/riders.js';
import {requestNotifications,toast} from './modules/notifications.js';
import {initTheme,toggleTheme} from './modules/theme.js';
import {exportOrdersCsv} from './modules/exports.js';
import {printKitchenSlip} from './modules/print.js';

function bindGlobal(){
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-view]');
    if(nav)showView(nav.dataset.view);

    const open=event.target.closest('[data-open-order]');
    if(open)openDrawer(open.dataset.openOrder);

    const status=event.target.closest('[data-status]');
    if(status)updateOrder(status.dataset.status,{status:status.dataset.value},'status_changed');

    const cancel=event.target.closest('[data-cancel-order]');
    if(cancel)cancelOrder(cancel.dataset.cancelOrder);

    const assign=event.target.closest('[data-assign-quick]');
    if(assign)openDrawer(assign.dataset.assignQuick);

    const editMenuBtn=event.target.closest('[data-edit-menu]');
    if(editMenuBtn){editMenu(editMenuBtn.dataset.editMenu);openMenuEditor();}

    const editRiderBtn=event.target.closest('[data-edit-rider]');
    if(editRiderBtn)editRider(editRiderBtn.dataset.editRider);

    const copyAddress=event.target.closest('[data-copy-address]');
    if(copyAddress){
      const order=state.orders.find(item=>orderId(item)===copyAddress.dataset.copyAddress);
      if(order){
        navigator.clipboard.writeText(deliveryAddress(order)||'');
        toast('Address copied');
      }
    }

    const printSlip=event.target.closest('[data-print-slip]');
    if(printSlip)printKitchenSlip(printSlip.dataset.printSlip);

    const datePill=event.target.closest('[data-date-key]');
    if(datePill){state.selectedDateKey=datePill.dataset.dateKey;renderAll();}
  });

  $('closeDrawer').addEventListener('click',closeDrawer);
  $('loginBtn').addEventListener('click',login);
  $('loginPassword').addEventListener('keydown',event=>{if(event.key==='Enter')login()});
  $('logoutBtn').addEventListener('click',()=>state.auth.signOut());
  $('globalSearch').addEventListener('input',renderAll);
  $('orderFilters').addEventListener('click',event=>{
    const button=event.target.closest('[data-filter]');
    if(!button)return;
    state.filter=button.dataset.filter;
    document.querySelectorAll('#orderFilters .filter').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    renderAll();
  });
  $('menuForm').addEventListener('submit',saveMenuItem);
  $('resetMenuForm').addEventListener('click',resetMenuForm);
  const openMenuFormBtn=$('openMenuFormBtn');
  if(openMenuFormBtn)openMenuFormBtn.addEventListener('click',()=>{resetMenuForm();openMenuEditor();});
  const closeMenuEditorBtn=$('closeMenuEditor');
  if(closeMenuEditorBtn)closeMenuEditorBtn.addEventListener('click',closeMenuEditor);
  $('riderForm').addEventListener('submit',saveRider);
  $('resetRiderForm').addEventListener('click',resetRiderForm);
  $('settingsForm').addEventListener('submit',saveSettings);
  $('kitchenStatusPill').addEventListener('click',toggleKitchen);
  $('notifyBtn').addEventListener('click',requestNotifications);
  const themeToggle=$('themeToggle');
  if(themeToggle)themeToggle.addEventListener('click',toggleTheme);
  const sidebarToggle=$('sidebarToggle');
  if(sidebarToggle){
    const savedSidebar=localStorage.getItem('cbe_admin_sidebar_collapsed')==='1';
    document.body.classList.toggle('sidebar-collapsed',savedSidebar);
    sidebarToggle.setAttribute('aria-label',savedSidebar?'Expand sidebar':'Minimize sidebar');
    sidebarToggle.title=savedSidebar?'Expand sidebar':'Minimize sidebar';
    sidebarToggle.addEventListener('click',()=>{
      const collapsed=!document.body.classList.contains('sidebar-collapsed');
      document.body.classList.toggle('sidebar-collapsed',collapsed);
      localStorage.setItem('cbe_admin_sidebar_collapsed',collapsed?'1':'0');
      sidebarToggle.setAttribute('aria-label',collapsed?'Expand sidebar':'Minimize sidebar');
      sidebarToggle.title=collapsed?'Expand sidebar':'Minimize sidebar';
    });
  }
  const sidebarThemeShortcut=$('sidebarThemeShortcut');
  if(sidebarThemeShortcut)sidebarThemeShortcut.addEventListener('click',toggleTheme);
  $('exportOrdersBtn').addEventListener('click',exportOrdersCsv);
  $('clearDateFilterBtn').addEventListener('click',()=>{state.selectedDateKey='';renderAll()});
  const todayDateBtn=$('todayDateBtn');
  if(todayDateBtn)todayDateBtn.addEventListener('click',()=>{state.selectedDateKey=todayDateKey();renderAll()});

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeDrawer();closeMenuEditor();}
    if(event.key==='/'&&document.activeElement!==$('globalSearch')){
      event.preventDefault();
      $('globalSearch').focus();
    }
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();
      $('globalSearch').focus();
    }
    if(!event.target.matches('input,textarea,select')){
      const key=event.key.toLowerCase();
      if(key==='n')showView('orders');
      if(key==='p'){state.filter='active';showView('orders')}
      if(key==='o'){state.filter='unassigned';showView('orders')}
      if(key==='d'){state.filter='delayed';showView('orders')}
    }
  });
}

function openMenuEditor(){
  const drawer=$('menuEditorDrawer');
  if(!drawer)return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
}

function closeMenuEditor(){
  const drawer=$('menuEditorDrawer');
  if(!drawer)return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
}

function registerServiceWorker(){
  if('serviceWorker'in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

function start(){
  initTheme();
  if(!initFirebase())return;
  bindGlobal();
  setupAuth();
  registerServiceWorker();
}

start();
