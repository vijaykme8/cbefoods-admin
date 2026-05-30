import {state} from './state.js';
import {clean,e164,nowIso,orderId,phone10,shortId,statusOf,customerPhone} from './utils.js';
import {toast} from './notifications.js';

export async function updateOrder(id,patch,eventType='order_updated'){
  if(!id)return;
  const by=state.admin?.name||state.user?.email||'Admin';
  const base={
    ...patch,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy:state.user?.uid||'admin'
  };
  const event={
    type:eventType,
    at:nowIso(),
    by,
    byUid:state.user?.uid||'admin',
    patch:Object.keys(patch),
    message:timelineMessage(eventType,patch)
  };
  base.timeline=firebase.firestore.FieldValue.arrayUnion(event);
  try{
    await state.db.collection('orders').doc(id).set(base,{merge:true});
    logAdminActivity({type:eventType,orderId:id,message:event.message,patch:Object.keys(patch)});
    toast('Order updated',`#${shortId(id)}`);
  }catch(error){
    console.error('Admin order update failed',error);
    toast('Order update failed',error.message||'Check Firestore rules');
    throw error;
  }
}

function logAdminActivity(entry){
  if(!state.db)return;
  const data={
    ...entry,
    storeId:state.storeId,
    by:state.admin?.name||state.user?.email||'Admin',
    byUid:state.user?.uid||'admin',
    at:firebase.firestore.FieldValue.serverTimestamp(),
    atClient:nowIso()
  };
  state.db.collection('adminActivity').add(data).catch(()=>{});
}

function timelineMessage(type,patch={}){
  const statusLabels={confirmed:'New',preparing:'Preparing',out_for_delivery:'On the way',delivered:'Delivered',cancelled:'Cancelled'};
  if(type==='status_changed')return `Status changed to ${statusLabels[patch.status]||patch.status||'updated'}`;
  if(type==='priority_changed')return `Priority changed to ${patch.priority||'Normal'}`;
  if(type==='order_held')return `Order held${patch.holdReason?`: ${patch.holdReason}`:''}`;
  if(type==='order_released')return 'Order hold released';
  if(type==='rider_assigned')return `Rider assigned: ${patch.assignedRiderName||'Rider'}`;
  if(type==='rider_removed')return 'Rider removed';
  if(type==='order_cancelled')return `Order cancelled${patch.cancelReason?`: ${patch.cancelReason}`:''}`;
  if(type==='issue_added')return `Issue added: ${patch.issue?.type||'Issue'}`;
  if(type==='issue_resolved')return 'Issue resolved';
  if(type==='refund_requested')return 'Refund requested';
  if(type==='refund_processed')return 'Refund marked processed manually';
  if(type==='support_note_added')return 'Support note added';
  if(type==='support_action_logged')return patch.supportActionLabel||'Support action logged';
  if(type==='customer_watchlisted')return 'Customer added to watchlist';
  if(type==='customer_unwatchlisted')return 'Customer removed from watchlist';
  return 'Order updated';
}

export async function cancelOrder(id,reasonValue='',noteValue=''){
  const order=state.orders.find(item=>orderId(item)===id)||{};
  const defaultReason=reasonValue||'customer_request';
  const reason=clean(reasonValue)||clean(prompt('Cancellation reason: customer_request / item_unavailable / kitchen_issue / rider_issue / payment_issue / other',defaultReason));
  if(!reason)return;
  const note=clean(noteValue)||clean(prompt('Cancellation note (optional)',''));
  const ok=confirm(`Cancel order #${shortId(id)}? This is a dangerous action.`);
  if(!ok)return;
  const issueEntry={type:'Order cancelled',reason,note,status:'open',at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'};
  await updateOrder(id,{
    status:'cancelled',
    cancelReason:reason,
    cancelNote:note,
    cancelledAt:nowIso(),
    issueStatus:'open',
    needsAttention:true,
    issue:{type:issueEntry.type,note:note||reason,status:'open',updatedAt:issueEntry.at,by:issueEntry.by},
    issueHistory:firebase.firestore.FieldValue.arrayUnion(issueEntry)
  },'order_cancelled');
  if(order.assignedRiderDocId){
    await syncRiderWorkload(order.assignedRiderDocId).catch(()=>{});
  }
}

export async function assignRider(id,riderDocId){
  const rider=state.riders.find(item=>item.docId===riderDocId);
  const patch=rider?{
    assignedRiderDocId:rider.docId,
    assignedRiderId:clean(rider.authUid||rider.id||rider.docId),
    assignedRiderAuthUid:clean(rider.authUid),
    assignedRiderName:clean(rider.name),
    assignedRiderPhone:phone10(rider.phone||rider.phoneE164),
    assignedRiderPhoneE164:e164(rider.phone||rider.phoneE164),
    assignedRiderVerified:!!rider.authUid,
    riderAssignedAt:nowIso()
  }:{
    assignedRiderDocId:'',assignedRiderId:'',assignedRiderAuthUid:'',assignedRiderName:'',assignedRiderPhone:'',assignedRiderPhoneE164:'',assignedRiderVerified:false
  };
  await updateOrder(id,patch,rider?'rider_assigned':'rider_removed');
  if(rider)await syncRiderWorkload(rider.docId).catch(()=>{});
}

async function syncRiderWorkload(riderDocId){
  if(!riderDocId)return;
  const active=state.orders.filter(order=>order.assignedRiderDocId===riderDocId&&!['delivered','cancelled','canceled'].includes(statusOf(order))).length;
  await state.db.collection('deliveryPartners').doc(riderDocId).set({activeOrderCount:active,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}

export async function saveMenuItem(event){
  event.preventDefault();
  const docId=clean(document.getElementById('menuDocId').value)||state.db.collection('menuItems').doc().id;
  const previous=state.menuItems.find(item=>item.docId===docId)||{};
  const stock=Number(document.getElementById('menuStock').value||0);
  const data={
    id:docId,
    name:clean(document.getElementById('menuName').value),
    price:Number(document.getElementById('menuPrice').value||0),
    category:clean(document.getElementById('menuCategory').value||'regular'),
    description:clean(document.getElementById('menuDescription').value),
    protein:clean(document.getElementById('menuProtein').value),
    calories:Number(document.getElementById('menuCalories').value||0),
    stock,
    sort:Number(document.getElementById('menuSort').value||Date.now()),
    available:document.getElementById('menuAvailable').checked&&stock!==0,
    bestseller:document.getElementById('menuBestseller').checked,
    veg:document.getElementById('menuVeg').checked,
    hidden:document.getElementById('menuHidden').checked,
    availableTime:clean(document.getElementById('menuAvailableTime').value),
    addons:clean(document.getElementById('menuAddons')?.value),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy:state.user?.uid||'admin'
  };
  if(!data.name)return toast('Item name required');
  const payload={...data};
  if(previous.price!==undefined&&Number(previous.price)!==data.price){
    payload.priceHistory=firebase.firestore.FieldValue.arrayUnion({oldPrice:Number(previous.price||0),newPrice:data.price,at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'});
  }
  await state.db.collection('menuItems').doc(docId).set(payload,{merge:true});
  logAdminActivity({type:'menu_saved',message:`Menu item saved: ${data.name}`,menuDocId:docId});
  toast('Menu item saved',data.name);
  resetMenuForm();
  const drawer=document.getElementById('menuEditorDrawer');
  if(drawer){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true')}
}

export function resetMenuForm(){
  document.getElementById('menuForm').reset();
  document.getElementById('menuDocId').value='';
  document.getElementById('menuFormTitle').textContent='Add menu item';
  document.getElementById('menuAvailable').checked=true;
}

export async function toggleMenuAvailability(docId){
  const item=state.menuItems.find(row=>row.docId===docId);
  if(!item)return;
  const available=!(item.available!==false&&Number(item.stock??1)!==0);
  await state.db.collection('menuItems').doc(docId).set({available,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:state.user?.uid||'admin'},{merge:true});
  logAdminActivity({type:'menu_availability_changed',message:`${item.name||'Item'} ${available?'enabled':'disabled'}`,menuDocId:docId});
}

export async function adjustMenuStock(docId,delta){
  const item=state.menuItems.find(row=>row.docId===docId);
  if(!item)return;
  const stock=Math.max(0,Number(item.stock||0)+Number(delta||0));
  await state.db.collection('menuItems').doc(docId).set({stock,available:stock>0&&item.hidden!==true,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:state.user?.uid||'admin'},{merge:true});
  logAdminActivity({type:'menu_stock_changed',message:`${item.name||'Item'} stock ${stock}`,menuDocId:docId});
}

export async function saveRider(event){
  event.preventDefault();
  const docId=clean(document.getElementById('riderDocId').value)||state.db.collection('deliveryPartners').doc().id;
  const name=clean(document.getElementById('riderName').value);
  if(!name)return toast('Rider name required');
  const authUid=clean(document.getElementById('riderAuthUid').value);
  const data={
    id:docId,
    name,
    phone:phone10(document.getElementById('riderPhone').value),
    phoneE164:e164(document.getElementById('riderPhone').value),
    authUid,
    status:clean(document.getElementById('riderStatus').value||'available'),
    maxActiveOrders:Number(document.getElementById('riderMaxActiveOrders')?.value||2),
    area:clean(document.getElementById('riderArea')?.value),
    active:document.getElementById('riderActive').checked,
    verified:document.getElementById('riderVerified').checked||!!authUid,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  await state.db.collection('deliveryPartners').doc(docId).set(data,{merge:true});
  logAdminActivity({type:'rider_saved',message:`Rider saved: ${name}`,riderDocId:docId});
  toast('Rider saved',name);
  resetRiderForm();
}

export function resetRiderForm(){
  document.getElementById('riderForm').reset();
  document.getElementById('riderDocId').value='';
  document.getElementById('riderFormTitle').textContent='Add rider';
  document.getElementById('riderActive').checked=true;
  document.getElementById('riderStatus').value='available';
  if(document.getElementById('riderMaxActiveOrders'))document.getElementById('riderMaxActiveOrders').value='2';
}

export async function saveSettings(event){
  event.preventDefault();
  const data={
    name:clean(document.getElementById('storeName').value),
    supportPhone:phone10(document.getElementById('supportPhone').value),
    supportWhatsapp:phone10(document.getElementById('supportWhatsapp')?.value),
    storeOpenSchedule:clean(document.getElementById('storeOpenSchedule')?.value),
    orderCutoffTime:clean(document.getElementById('orderCutoffTime')?.value),
    preparationMinutes:Number(document.getElementById('preparationMinutes').value||0),
    prepRegularMinutes:Number(document.getElementById('prepRegularMinutes')?.value||0),
    prepProteinMinutes:Number(document.getElementById('prepProteinMinutes')?.value||0),
    deliveryFee:Number(document.getElementById('deliveryFee').value||0),
    taxRate:Number(document.getElementById('taxRate')?.value||0),
    packingCharge:Number(document.getElementById('packingCharge')?.value||0),
    minimumOrder:Number(document.getElementById('minimumOrder').value||0),
    serviceRadiusKm:Number(document.getElementById('serviceRadiusKm').value||0),
    restaurantLat:Number(document.getElementById('restaurantLat')?.value||0),
    restaurantLng:Number(document.getElementById('restaurantLng')?.value||0),
    restaurantAddress:clean(document.getElementById('restaurantAddress')?.value),
    closedMessage:clean(document.getElementById('closedMessage').value),
    serviceAreas:clean(document.getElementById('serviceAreas').value),
    categoryRules:clean(document.getElementById('categoryRules')?.value),
    refundPolicy:clean(document.getElementById('refundPolicy')?.value),
    rolePermissions:clean(document.getElementById('rolePermissions')?.value),
    kitchenOpen:document.getElementById('kitchenOpen').checked,
    kitchenPaused:document.getElementById('kitchenPaused').checked,
    soundNewOrder:document.getElementById('soundNewOrder')?.checked!==false,
    soundIssue:!!document.getElementById('soundIssue')?.checked,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  await state.db.collection('storeSettings').doc(state.storeId).set(data,{merge:true});
  logAdminActivity({type:'settings_saved',message:'Store settings saved'});
  toast('Settings saved');
}

export async function addIssue(id){
  const type=clean(document.getElementById('issueType')?.value);
  const note=clean(document.getElementById('issueNote')?.value);
  if(!type)return toast('Select issue type');
  const entry={type,note,status:'open',at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'};
  await updateOrder(id,{
    issue:{type,note,status:'open',updatedAt:entry.at,by:entry.by},
    issueStatus:'open',needsAttention:true,
    issueHistory:firebase.firestore.FieldValue.arrayUnion(entry),
    adminNotes:note?firebase.firestore.FieldValue.arrayUnion({type:'issue_note',note,at:entry.at,by:entry.by}):firebase.firestore.FieldValue.arrayUnion({type:'issue_added',note:type,at:entry.at,by:entry.by})
  },'issue_added');
}

export async function resolveIssue(id){
  const order=state.orders.find(item=>orderId(item)===id)||{};
  const entry={type:order.issue?.type||'Issue',note:'Resolved',status:'resolved',at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'};
  await updateOrder(id,{
    issue:{...(order.issue||{}),status:'resolved',resolvedAt:entry.at},
    issueStatus:'resolved',needsAttention:false,
    issueHistory:firebase.firestore.FieldValue.arrayUnion(entry)
  },'issue_resolved');
}

export async function addSupportNote(id){
  const note=clean(document.getElementById('supportNote')?.value);
  if(!note)return toast('Enter support note');
  const entry={type:'support_note',note,at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'};
  await updateOrder(id,{adminNotes:firebase.firestore.FieldValue.arrayUnion(entry),supportLastNote:note,supportLastUpdatedAt:entry.at},'support_note_added');
  const input=document.getElementById('supportNote');
  if(input)input.value='';
}

export async function addSupportAction(id,action,label){
  const entry={type:'support_action',action,label,at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'};
  await updateOrder(id,{supportActions:firebase.firestore.FieldValue.arrayUnion(entry),supportLastAction:label,supportLastUpdatedAt:entry.at,supportActionLabel:label},'support_action_logged');
}

export async function updatePriority(id,priority){
  await updateOrder(id,{priority:clean(priority||'normal')},'priority_changed');
}

export async function holdOrder(id,reason){
  const holdReason=clean(reason)||'Manual hold';
  await updateOrder(id,{hold:true,holdReason,holdAt:nowIso(),needsAttention:true,issueStatus:'open'},'order_held');
}

export async function releaseHold(id){
  await updateOrder(id,{hold:false,holdReason:'',needsAttention:false,issueStatus:'resolved'},'order_released');
}

export async function toggleWatchlist(id){
  const order=state.orders.find(item=>orderId(item)===id)||{};
  const enabled=!order.customerWatchlisted;
  await updateOrder(id,{customerWatchlisted:enabled,watchlistPhone:customerPhone(order),watchlistedAt:enabled?nowIso():''},enabled?'customer_watchlisted':'customer_unwatchlisted');
}

export async function toggleKitchen(){
  await state.db.collection('storeSettings').doc(state.storeId).set({kitchenOpen:state.settings.kitchenOpen===false,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}
