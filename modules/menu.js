import {state} from './state.js';
import {$,escapeHtml,money} from './utils.js';

export function renderMenu(){
  const rows=state.menuItems.map(item=>{
    const stock=Number(item.stock??'');
    const soldOut=item.available===false||stock===0;
    const priceChanges=Array.isArray(item.priceHistory)?item.priceHistory.length:0;
    return `<tr>
      <td><strong>${escapeHtml(item.name||'Item')}</strong><br><span class="muted">${escapeHtml(item.description||'')}</span>${item.addons?`<br><span class="muted">Add-ons: ${escapeHtml(item.addons)}</span>`:''}</td>
      <td>${money(item.price||0)}${priceChanges?`<br><span class="muted">${priceChanges} price edits</span>`:''}</td>
      <td>${escapeHtml(item.category||'regular')}<br><span class="muted">${escapeHtml(item.availableTime||'All day')}</span></td>
      <td><div class="stock-control"><button class="mini-icon-btn" data-menu-stock="${escapeHtml(item.docId)}" data-stock-delta="-1" type="button">−</button><strong>${Number.isFinite(stock)?stock:'—'}</strong><button class="mini-icon-btn" data-menu-stock="${escapeHtml(item.docId)}" data-stock-delta="1" type="button">+</button></div></td>
      <td><span class="badge ${soldOut?'red':'green'}">${soldOut?'Sold out':'Available'}</span>${item.bestseller?'<span class="badge purple">Best</span>':''}${item.hidden?'<span class="badge amber">Hidden</span>':''}</td>
      <td><div class="table-actions"><button class="small-btn" data-toggle-menu="${escapeHtml(item.docId)}" type="button">${soldOut?'Enable':'Disable'}</button><button class="small-btn" data-edit-menu="${escapeHtml(item.docId)}" type="button">Edit</button></div></td>
    </tr>`;
  }).join('');
  $('menuTable').innerHTML=rows||'<tr><td colspan="6"><div class="empty-state">No menu items</div></td></tr>';
}

export function editMenu(id){
  const item=state.menuItems.find(row=>row.docId===id);
  if(!item)return;
  $('menuFormTitle').textContent='Edit menu item';
  $('menuDocId').value=item.docId;
  $('menuName').value=item.name||'';
  $('menuPrice').value=item.price||0;
  $('menuCategory').value=item.category||'';
  $('menuDescription').value=item.description||item.detail||'';
  $('menuProtein').value=item.protein||'';
  $('menuCalories').value=item.calories||'';
  $('menuStock').value=item.stock??'';
  $('menuSort').value=item.sort||'';
  $('menuAvailable').checked=item.available!==false;
  $('menuBestseller').checked=!!item.bestseller;
  $('menuVeg').checked=!!item.veg;
  $('menuHidden').checked=!!item.hidden;
  $('menuAvailableTime').value=item.availableTime||'';
  if($('menuAddons'))$('menuAddons').value=item.addons||'';
}
