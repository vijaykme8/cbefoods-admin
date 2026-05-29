import {state} from './state.js';
import {clean,e164,nowIso,orderId,phone10,shortId} from './utils.js';
import {toast} from './notifications.js';

export async function updateOrder(id,patch,eventType='order_updated'){
  if(!id)return;
  const base={
    ...patch,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy:state.user?.uid||'admin'
  };
  const event={
    type:eventType,
    at:nowIso(),
    by:state.admin?.name||state.user?.email||'Admin',
    patch:Object.keys(patch)
  };
  base.timeline=firebase.firestore.FieldValue.arrayUnion(event);
  try{
    await state.db.collection('orders').doc(id).set(base,{merge:true});
    toast('Order updated',`#${shortId(id)}`);
  }catch(error){
    console.error('Admin order update failed',error);
    toast('Order update failed',error.message||'Check Firestore rules');
    throw error;
  }
}

export async function cancelOrder(id){
  const reason=prompt('Cancel reason');
  if(reason===null)return;
  const note=clean(reason);
  await updateOrder(id,{
    status:'cancelled',
    cancelReason:note,
    cancelledAt:nowIso(),
    issueStatus:'open',
    needsAttention:true,
    issue:{type:'Order cancelled by restaurant',note,status:'open',updatedAt:nowIso()}
  },'order_cancelled');
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
    assignedRiderVerified:!!rider.authUid
  }:{
    assignedRiderDocId:'',
    assignedRiderId:'',
    assignedRiderAuthUid:'',
    assignedRiderName:'',
    assignedRiderPhone:'',
    assignedRiderPhoneE164:'',
    assignedRiderVerified:false
  };
  await updateOrder(id,patch,rider?'rider_assigned':'rider_removed');
}

export async function saveMenuItem(event){
  event.preventDefault();
  const docId=clean(document.getElementById('menuDocId').value)||state.db.collection('menuItems').doc().id;
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
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(!data.name)return toast('Item name required');
  await state.db.collection('menuItems').doc(docId).set(data,{merge:true});
  toast('Menu item saved',data.name);
  resetMenuForm();
}

export function resetMenuForm(){
  document.getElementById('menuForm').reset();
  document.getElementById('menuDocId').value='';
  document.getElementById('menuFormTitle').textContent='Add menu item';
  document.getElementById('menuAvailable').checked=true;
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
    active:document.getElementById('riderActive').checked,
    verified:document.getElementById('riderVerified').checked||!!authUid,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  await state.db.collection('deliveryPartners').doc(docId).set(data,{merge:true});
  toast('Rider saved',name);
  resetRiderForm();
}

export function resetRiderForm(){
  document.getElementById('riderForm').reset();
  document.getElementById('riderDocId').value='';
  document.getElementById('riderFormTitle').textContent='Add rider';
  document.getElementById('riderActive').checked=true;
  document.getElementById('riderStatus').value='available';
}

export async function saveSettings(event){
  event.preventDefault();
  const data={
    name:clean(document.getElementById('storeName').value),
    supportPhone:phone10(document.getElementById('supportPhone').value),
    preparationMinutes:Number(document.getElementById('preparationMinutes').value||0),
    deliveryFee:Number(document.getElementById('deliveryFee').value||0),
    minimumOrder:Number(document.getElementById('minimumOrder').value||0),
    serviceRadiusKm:Number(document.getElementById('serviceRadiusKm').value||0),
    closedMessage:clean(document.getElementById('closedMessage').value),
    serviceAreas:clean(document.getElementById('serviceAreas').value),
    kitchenOpen:document.getElementById('kitchenOpen').checked,
    kitchenPaused:document.getElementById('kitchenPaused').checked,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  await state.db.collection('storeSettings').doc(state.storeId).set(data,{merge:true});
  toast('Settings saved');
}

export async function addIssue(id){
  const type=clean(document.getElementById('issueType')?.value);
  const note=clean(document.getElementById('issueNote')?.value);
  if(!type)return toast('Select issue type');
  await updateOrder(id,{
    issue:{type,note,status:'open',updatedAt:nowIso(),by:state.admin?.name||state.user?.email||'Admin'},
    issueStatus:'open',
    needsAttention:true,
    adminNotes:firebase.firestore.FieldValue.arrayUnion({type,note,at:nowIso(),by:state.admin?.name||state.user?.email||'Admin'})
  },'issue_added');
}

export async function resolveIssue(id){
  const order=state.orders.find(item=>orderId(item)===id)||{};
  await updateOrder(id,{
    issue:{...(order.issue||{}),status:'resolved',resolvedAt:nowIso()},
    issueStatus:'resolved',
    needsAttention:false
  },'issue_resolved');
}

export async function toggleKitchen(){
  await state.db.collection('storeSettings').doc(state.storeId).set({
    kitchenOpen:state.settings.kitchenOpen===false,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  },{merge:true});
}
