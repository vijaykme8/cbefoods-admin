import {$} from './utils.js';

export function initTheme(){
  const saved=localStorage.getItem('cbe_admin_theme')||'dark';
  applyTheme(saved);
}

export function toggleTheme(){
  const current=document.body.dataset.theme==='light'?'light':'dark';
  applyTheme(current==='light'?'dark':'light');
}

export function applyTheme(theme){
  const value=theme==='light'?'light':'dark';
  document.body.dataset.theme=value;
  localStorage.setItem('cbe_admin_theme',value);
  const btn=$('themeToggle');
  if(btn)btn.textContent=value==='light'?'Dark':'Light';
}
