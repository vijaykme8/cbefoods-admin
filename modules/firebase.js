import {state} from './state.js';
import {$} from './utils.js';

export function initFirebase(){
  if(!window.firebase||!window.TIFFIN_FIREBASE_CONFIG){
    const help=$('loginHelp');
    if(help){
      help.hidden=false;
      help.textContent='Firebase config missing. Keep firebase-config.js in admin-v1.';
    }
    return false;
  }
  try{
    if(!firebase.apps.length)firebase.initializeApp(window.TIFFIN_FIREBASE_CONFIG);
    state.auth=firebase.auth();
    state.db=firebase.firestore();
    try{state.db.enablePersistence({synchronizeTabs:true})}catch(e){}
    return true;
  }catch(error){
    const help=$('loginHelp');
    if(help){
      help.hidden=false;
      help.textContent=error.message||'Firebase failed.';
    }
    return false;
  }
}
