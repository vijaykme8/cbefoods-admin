import {state,clearUnsubs} from './state.js';
import {$} from './utils.js';
import {bootRealtime} from './listeners.js';
import {toast} from './notifications.js';

export async function login(){
  const email=($('loginEmail').value||'').trim();
  const password=($('loginPassword').value||'').trim();
  if(!email||!password)return showLoginHelp('Enter email and password.');
  $('loginBtn').disabled=true;
  $('loginBtn').textContent='Logging in...';
  try{
    await state.auth.signInWithEmailAndPassword(email,password);
  }catch(error){
    showLoginHelp(error.message||'Login failed.');
  }finally{
    $('loginBtn').disabled=false;
    $('loginBtn').textContent='Login';
  }
}

export function setupAuth(){
  state.auth.onAuthStateChanged(async user=>{
    clearUnsubs();
    state.user=user;
    state.selectedOrderId='';
    if(!user){
      $('loginScreen').hidden=false;
      $('dashboardShell').hidden=true;
      $('connectionText').textContent='Logged out';
      return;
    }
    const allowed=await checkAdmin(user);
    $('loginScreen').hidden=allowed;
    $('dashboardShell').hidden=!allowed;
    if(allowed){
      $('connectionText').textContent='Connected to Firestore';
      bootRealtime();
    }
  });
}

async function checkAdmin(user){
  try{
    const snapshot=await state.db.collection('admins').doc(user.uid).get();
    if(!snapshot.exists){
      showLoginHelp(`Logged in, but this UID is not inside admins/${user.uid}`);
      return false;
    }
    state.admin={uid:user.uid,...snapshot.data()};
    $('adminName').textContent=state.admin.name||user.email||'Admin';
    return true;
  }catch(error){
    showLoginHelp(error.message||'Admin permission check failed.');
    return false;
  }
}

function showLoginHelp(message){
  const help=$('loginHelp');
  help.hidden=false;
  help.textContent=message;
}
