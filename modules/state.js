export const state={
  storeId:window.TIFFIN_STORE_ID||'main',
  auth:null,
  db:null,
  user:null,
  admin:null,
  orders:[],
  menuItems:[],
  riders:[],
  settings:{},
  selectedOrderId:'',
  view:'dashboard',
  filter:'active',
  bootedOrders:false,
  lastOrderIds:new Set(),
  unsubs:[]
};

export function clearUnsubs(){
  state.unsubs.forEach(fn=>{
    try{fn()}catch(e){}
  });
  state.unsubs=[];
}
