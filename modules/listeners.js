import {state} from './state.js';
import {orderId,orderTotal,customerName,money,shortId} from './utils.js';
import {toast,playSound,browserNotify} from './notifications.js';
import {renderAll} from './render.js';

export function bootRealtime(){
  listenOrders();
  listenMenu();
  listenRiders();
  listenSettings();
  renderAll();
  startTimerRefresh();
}

function listenOrders(){
  const unsub=state.db.collection('orders').orderBy('createdAt','desc').limit(250).onSnapshot(snapshot=>{
    state.orders=snapshot.docs.map(doc=>({docId:doc.id,id:doc.id,...doc.data()}));
    const ids=new Set(state.orders.map(orderId));
    if(state.bootedOrders){
      const fresh=state.orders.filter(order=>!state.lastOrderIds.has(orderId(order))&&order.paymentStatus==='paid');
      if(fresh.length){
        playSound();
        toast('New paid order',`#${shortId(orderId(fresh[0]))} · ${money(orderTotal(fresh[0]))}`);
        browserNotify('New paid order',`#${shortId(orderId(fresh[0]))} · ${customerName(fresh[0])}`);
      }
    }
    state.lastOrderIds=ids;
    state.bootedOrders=true;
    renderAll();
  },error=>toast('Orders sync failed',error.message||''));
  state.unsubs.push(unsub);
}

function listenMenu(){
  const unsub=state.db.collection('menuItems').orderBy('sort','asc').onSnapshot(snapshot=>{
    state.menuItems=snapshot.docs.map(doc=>({docId:doc.id,...doc.data()}));
    renderAll();
  },error=>toast('Menu sync failed',error.message||''));
  state.unsubs.push(unsub);
}

function listenRiders(){
  const unsub=state.db.collection('deliveryPartners').orderBy('name','asc').onSnapshot(snapshot=>{
    state.riders=snapshot.docs.map(doc=>({docId:doc.id,id:doc.id,...doc.data()}));
    renderAll();
  },error=>toast('Rider sync failed',error.message||''));
  state.unsubs.push(unsub);
}

function listenSettings(){
  const unsub=state.db.collection('storeSettings').doc(state.storeId).onSnapshot(snapshot=>{
    state.settings=snapshot.exists?snapshot.data():{};
    renderAll();
  },error=>toast('Settings sync failed',error.message||''));
  state.unsubs.push(unsub);
}


let timerRefreshId=null;

export function startTimerRefresh(){
  if(timerRefreshId)return;
  timerRefreshId=setInterval(()=>renderAll(),60000);
}
