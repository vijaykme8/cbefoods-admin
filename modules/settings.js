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
