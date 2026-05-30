import {state} from './state.js';
import {$} from './utils.js';

export function renderSettings(){
  setValue('storeName',state.settings.name||state.settings.storeName||'');
  setValue('supportPhone',state.settings.supportPhone||'');
  setValue('supportWhatsapp',state.settings.supportWhatsapp||'');
  setValue('storeOpenSchedule',state.settings.storeOpenSchedule||'');
  setValue('orderCutoffTime',state.settings.orderCutoffTime||'');
  setValue('preparationMinutes',state.settings.preparationMinutes||state.settings.prepMinutes||'');
  setValue('prepRegularMinutes',state.settings.prepRegularMinutes||'');
  setValue('prepProteinMinutes',state.settings.prepProteinMinutes||'');
  setValue('deliveryFee',state.settings.deliveryFee||'');
  setValue('taxRate',state.settings.taxRate||'');
  setValue('packingCharge',state.settings.packingCharge||'');
  setValue('minimumOrder',state.settings.minimumOrder||'');
  setValue('serviceRadiusKm',state.settings.serviceRadiusKm||'');
  setValue('restaurantLat',state.settings.restaurantLat||'');
  setValue('restaurantLng',state.settings.restaurantLng||'');
  setValue('restaurantAddress',state.settings.restaurantAddress||'');
  setValue('closedMessage',state.settings.closedMessage||'');
  setValue('serviceAreas',state.settings.serviceAreas||'');
  setValue('categoryRules',state.settings.categoryRules||'');
  setValue('refundPolicy',state.settings.refundPolicy||'');
  setValue('rolePermissions',state.settings.rolePermissions||'');
  setChecked('kitchenOpen',state.settings.kitchenOpen!==false);
  setChecked('kitchenPaused',!!state.settings.kitchenPaused);
  setChecked('soundNewOrder',state.settings.soundNewOrder!==false);
  setChecked('soundIssue',!!state.settings.soundIssue);
  renderKitchenPill();
}

function setValue(id,value){const el=$(id);if(el)el.value=value}
function setChecked(id,value){const el=$(id);if(el)el.checked=!!value}

export function renderKitchenPill(){
  const pill=$('kitchenStatusPill');
  if(!pill)return;
  pill.classList.remove('closed','paused','on');
  if(state.settings.kitchenOpen===false){
    pill.innerHTML='<span class="toggle-track"><i></i></span><b>Kitchen off</b>';
    pill.classList.add('closed');
  }else if(state.settings.kitchenPaused){
    pill.innerHTML='<span class="toggle-track"><i></i></span><b>Orders paused</b>';
    pill.classList.add('paused');
  }else{
    pill.innerHTML='<span class="toggle-track"><i></i></span><b>Kitchen on</b>';
    pill.classList.add('on');
  }
}
