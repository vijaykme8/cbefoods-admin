import {state} from './state.js';
import {$} from './utils.js';

export function renderSettings(){
  $('storeName').value=state.settings.name||state.settings.storeName||'';
  $('supportPhone').value=state.settings.supportPhone||'';
  $('preparationMinutes').value=state.settings.preparationMinutes||state.settings.prepMinutes||'';
  $('deliveryFee').value=state.settings.deliveryFee||'';
  $('minimumOrder').value=state.settings.minimumOrder||'';
  $('serviceRadiusKm').value=state.settings.serviceRadiusKm||'';
  $('closedMessage').value=state.settings.closedMessage||'';
  $('serviceAreas').value=state.settings.serviceAreas||'';
  $('kitchenOpen').checked=state.settings.kitchenOpen!==false;
  $('kitchenPaused').checked=!!state.settings.kitchenPaused;
  renderKitchenPill();
}

export function renderKitchenPill(){
  const pill=$('kitchenStatusPill');
  if(!pill)return;
  pill.classList.remove('closed','paused');
  if(state.settings.kitchenOpen===false){
    pill.textContent='Kitchen closed';
    pill.classList.add('closed');
  }else if(state.settings.kitchenPaused){
    pill.textContent='Orders paused';
    pill.classList.add('paused');
  }else{
    pill.textContent='Kitchen open';
  }
}
