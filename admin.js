/* =========================================================
   Tiffin CBE Admin PWA
   Collections used:
   - admins/{uid}
   - orders/{orderId}
   - menuItems/{itemId}
   - deliveryPartners/{partnerId}
   - storeSettings/main
========================================================= */
(function () {
  const STORE_ID = window.TIFFIN_STORE_ID || "main";
  const $ = id => document.getElementById(id);
  const ORDER_STATUS = ["confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];
  const STATUS_LABELS = {
    confirmed: "Confirmed",
    preparing: "Preparing",
    out_for_delivery: "On the way",
    delivered: "Delivered",
    cancelled: "Cancelled",
    payment_failed: "Payment failed"
  };

  let auth;
  let db;
  let adminUnsubs = [];
  let orders = [];
  let menuItems = [];
  let riders = [];
  let settings = {};
  let adminMaps = new Map();
  let mapLibreLoadingPromise = null;
  const OLA_PROXY_URL = "/.netlify/functions/ola-maps";
  let currentFilter = "active";
  let soundEnabled = true;
  let lastSeenOrderIds = new Set();
  let bootedOrdersOnce = false;

  function initFirebase() {
    if (!window.firebase || !window.TIFFIN_FIREBASE_CONFIG) {
      showFatal("Firebase config is missing. Check firebase-config.js and internet connection.");
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.TIFFIN_FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      try { db.enablePersistence({ synchronizeTabs: true }); } catch (_) {}
      return true;
    } catch (error) {
      showFatal(error.message || "Firebase failed to start.");
      return false;
    }
  }

  function showFatal(message) {
    $("connectionText").textContent = message;
    toast(message);
  }

  function clean(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function phone10(value) {
    const digits = clean(value).replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  function e164(value) {
    const p = phone10(value);
    return p ? `+91${p}` : "";
  }

  function riderAssignmentId(rider) {
    return clean(rider?.authUid || rider?.id);
  }

  function isVerifiedRider(rider) {
    return !!clean(rider?.authUid);
  }

  function escapeHTML(value) {
    return clean(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }

  function toDate(value) {
    if (!value) return new Date();
    if (typeof value.toDate === "function") return value.toDate();
    if (value.seconds) return new Date(value.seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function isToday(value) {
    return toDate(value).toDateString() === new Date().toDateString();
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status || "Confirmed";
  }

  function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => { el.style.display = "none"; }, 2400);
  }

  function playNewOrderSound() {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.10);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.30);
    } catch (_) {}
  }

  function unsubscribeAll() {
    adminUnsubs.forEach(unsub => {
      try { unsub(); } catch (_) {}
    });
    adminUnsubs = [];
  }

  async function checkAdmin(user) {
    if (!user) return false;
    const snap = await db.collection("admins").doc(user.uid).get();
    if (!snap.exists) {
      $("loginHelp").hidden = false;
      $("loginHelp").innerHTML =
        `Logged in, but this user is not an admin yet.<br><br>` +
        `Create this Firestore document:<br>` +
        `<b>admins/${escapeHTML(user.uid)}</b><br>` +
        `{ name: "Owner", role: "owner" }`;
      return false;
    }
    const data = snap.data() || {};
    $("adminName").textContent = data.name || user.email || "Owner";
    return true;
  }

  async function login() {
    const email = clean($("adminEmail").value);
    const password = clean($("adminPassword").value);
    if (!email || !password) return toast("Enter email and password.");
    $("loginBtn").disabled = true;
    $("loginBtn").textContent = "Logging in...";
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      toast(error.message || "Login failed.");
    } finally {
      $("loginBtn").disabled = false;
      $("loginBtn").textContent = "Login";
    }
  }

  function setupAuth() {
    $("loginBtn").addEventListener("click", login);
    $("adminPassword").addEventListener("keydown", event => {
      if (event.key === "Enter") login();
    });
    $("logoutBtn").addEventListener("click", () => auth.signOut());

    auth.onAuthStateChanged(async user => {
      unsubscribeAll();
      $("loginHelp").hidden = true;
      if (!user) {
        $("loginCard").hidden = false;
        $("adminPanel").hidden = true;
        $("connectionText").textContent = "Firebase live control panel";
        return;
      }
      const allowed = await checkAdmin(user);
      $("loginCard").hidden = allowed;
      $("adminPanel").hidden = !allowed;
      $("connectionText").textContent = allowed ? "Connected to Firebase" : "Admin permission needed";
      if (allowed) bootAdmin();
    });
  }

  function bootAdmin() {
    listenOrders();
    listenMenu();
    listenRiders();
    listenSettings();
  }

  function listenOrders() {
    const unsub = db.collection("orders")
      .orderBy("createdAt", "desc")
      .limit(120)
      .onSnapshot(snapshot => {
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const ids = new Set(orders.map(order => order.id));
        if (bootedOrdersOnce) {
          const newOrders = orders.filter(order => !lastSeenOrderIds.has(order.id));
          if (newOrders.length) {
            playNewOrderSound();
            toast(`New order received: #${String(newOrders[0].id).slice(-6)}`);
          }
        }
        lastSeenOrderIds = ids;
        bootedOrdersOnce = true;
        renderOrders();
      }, error => toast(error.message || "Orders sync failed."));
    adminUnsubs.push(unsub);
  }

  function listenMenu() {
    const unsub = db.collection("menuItems")
      .orderBy("sort", "asc")
      .onSnapshot(snapshot => {
        menuItems = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        renderMenu();
      }, error => toast(error.message || "Menu sync failed."));
    adminUnsubs.push(unsub);
  }

  function listenRiders() {
    const unsub = db.collection("deliveryPartners")
      .orderBy("name", "asc")
      .onSnapshot(snapshot => {
        riders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRiders();
        renderOrders();
      }, error => toast(error.message || "Rider sync failed."));
    adminUnsubs.push(unsub);
  }

  function listenSettings() {
    const unsub = db.collection("storeSettings").doc(STORE_ID).onSnapshot(snapshot => {
      settings = snapshot.exists ? snapshot.data() : {};
      renderSettings();
    }, error => toast(error.message || "Settings sync failed."));
    adminUnsubs.push(unsub);
  }

  function setupTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
        tab.classList.add("active");
        document.querySelectorAll(".tab-section").forEach(section => section.classList.remove("active"));
        $(`${tab.dataset.tab}Section`).classList.add("active");
      });
    });

    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip").forEach(item => item.classList.remove("active"));
        chip.classList.add("active");
        currentFilter = chip.dataset.filter;
        renderOrders();
      });
    });
  }

  function orderTotal(order) {
    return Number(order.totals?.total ?? order.total ?? 0);
  }

  function orderCustomerPhone(order) {
    return clean(order.customerPhone || order.customer?.phone || order.customer?.contact || order.phone);
  }

  function orderCustomerName(order) {
    return clean(order.customerName || order.customer?.name || order.name || "Customer");
  }

  function orderAddress(order) {
    return clean(order.address || order.deliveryLocation?.fullAddress || order.deliveryLocation?.displayAddress || order.customer?.address || "");
  }


  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function normalizeLatLng(source) {
    if (!source || typeof source !== "object") return null;
    const lat = toNumber(source.lat ?? source.latitude);
    const lng = toNumber(source.lng ?? source.lon ?? source.longitude);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }

  function orderPoint(order) {
    return normalizeLatLng(order.deliveryLocation) || normalizeLatLng(order.location) || null;
  }

  function riderPoint(order) {
    return normalizeLatLng(order.riderLocation || { lat: order.riderLat, lng: order.riderLng });
  }

  function initAdminOrderMaps() {
    const mapCards = Array.from(document.querySelectorAll("[data-admin-map-order]"));
    if (!mapCards.length || !window.CBEMapV2) return;

    mapCards.forEach(container => {
      const order = orders.find(item => item.id === container.dataset.adminMapOrder);
      const customer = orderPoint(order);
      if (!order || !customer) return;
      const rider = riderPoint(order);
      window.CBEMapV2.renderRouteMap({
        container,
        customer,
        rider,
        customerColor: "#8806CE",
        riderColor: "#08A045",
        routeColor: "#08A045",
        padding: 38,
        maxZoom: 15,
        onRoute: route => {
          const meta = document.getElementById(`adminMapMeta-${order.id}`);
          if (meta && rider) meta.textContent = `${route.distanceText || "—"} · ${route.durationText || "—"}`;
        }
      }).catch(() => toast("Ola map preview failed. Check Netlify function and OLA_MAPS_API_KEY."));
    });
  }

  function filterOrders() {
    if (currentFilter === "all") return orders;
    if (currentFilter === "today") return orders.filter(order => isToday(order.createdAt || order.createdAtClient));
    if (currentFilter === "delivered") return orders.filter(order => order.status === "delivered");
    return orders.filter(order => !["delivered", "cancelled", "payment_failed"].includes(order.status));
  }

  function renderOrders() {
    const todayOrders = orders.filter(order => isToday(order.createdAt || order.createdAtClient));
    $("statOrders").textContent = todayOrders.length;
    $("statRevenue").textContent = money(todayOrders.filter(order => order.paymentStatus === "paid").reduce((sum, order) => sum + orderTotal(order), 0));
    $("statActive").textContent = orders.filter(order => !["delivered", "cancelled", "payment_failed"].includes(order.status)).length;
    $("statPreparing").textContent = orders.filter(order => order.status === "preparing").length;

    const shown = filterOrders();
    $("ordersList").innerHTML = shown.length ? shown.map(renderOrderCard).join("") : `<div class="empty-card">No ${currentFilter} orders yet.</div>`;

    document.querySelectorAll("[data-order-status]").forEach(select => {
      select.addEventListener("change", () => updateOrder(select.dataset.orderStatus, { status: select.value }));
    });
    document.querySelectorAll("[data-order-rider]").forEach(select => {
      select.addEventListener("change", () => {
        const rider = riders.find(item => item.id === select.value);
        const riderPhone = phone10(rider?.phone || rider?.phoneE164 || "");
        updateOrder(select.dataset.orderRider, {
          assignedRiderDocId: rider?.id || "",
          assignedRiderId: rider ? riderAssignmentId(rider) : "",
          assignedRiderAuthUid: rider?.authUid || "",
          assignedRiderName: rider?.name || "",
          assignedRiderPhone: riderPhone,
          assignedRiderPhoneE164: e164(riderPhone),
          assignedRiderVerified: rider ? isVerifiedRider(rider) : false
        });
      });
    });
    document.querySelectorAll("[data-next-status]").forEach(btn => {
      btn.addEventListener("click", () => updateOrder(btn.dataset.nextStatus, { status: btn.dataset.nextValue }));
    });
    setTimeout(initAdminOrderMaps, 80);
  }

  function renderOrderCard(order) {
    const id = escapeHTML(order.id);
    const status = clean(order.status || "confirmed");
    const created = toDate(order.createdAt || order.createdAtClient).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const items = Array.isArray(order.items) && order.items.length
      ? order.items.map(item => `${Number(item.qty || 1)}× ${escapeHTML(item.name || "Item")}`).join(", ")
      : "—";
    const phone = escapeHTML(orderCustomerPhone(order));
    const address = escapeHTML(orderAddress(order) || "—");
    const next = nextStatus(status);
    const riderOptions = `<option value="">Not assigned</option>` + riders.map(rider => {
      const assignmentId = riderAssignmentId(rider);
      const selected = rider.id === order.assignedRiderDocId || assignmentId === order.assignedRiderId;
      const label = `${rider.name || "Rider"}${isVerifiedRider(rider) ? " · verified" : " · pending login"}`;
      return `<option value="${escapeHTML(rider.id)}" ${selected ? "selected" : ""}>${escapeHTML(label)}</option>`;
    }).join("");
    const statusOptions = ORDER_STATUS.map(value => `<option value="${value}" ${value === status ? "selected" : ""}>${STATUS_LABELS[value]}</option>`).join("");

    return `<article class="order-card">
      <div class="order-top">
        <div>
          <div class="order-id">#${escapeHTML(String(order.id).slice(-6))}</div>
          <div class="muted">${escapeHTML(created)}</div>
        </div>
        <div class="price">${money(orderTotal(order))}</div>
      </div>
      <div class="status-pill ${escapeHTML(status)}">${escapeHTML(statusLabel(status))}</div>
      <div class="row"><span>Customer</span><strong>${escapeHTML(orderCustomerName(order))}<br>${phone || "—"}</strong></div>
      <div class="row"><span>Items</span><strong>${items}</strong></div>
      <div class="row"><span>Address</span><strong>${address}</strong></div>
      <div class="row"><span>Payment</span><strong>${escapeHTML(order.paymentStatus || "—")} · ${escapeHTML(order.paymentProvider || "Razorpay")}</strong></div>
      ${order.assignedRiderName ? `<div class="row"><span>Rider</span><strong>${escapeHTML(order.assignedRiderName)}<br>${escapeHTML(order.assignedRiderPhone || "")}</strong></div>` : ""}
      ${orderPoint(order) ? `<div class="admin-order-map" id="adminMap-${id}" data-admin-map-order="${id}" aria-label="Ola Maps order location preview"></div><div class="map-note">Purple pin: customer. Green pin: rider live location. <span id="adminMapMeta-${id}">Route will appear when rider GPS is live.</span></div>` : ""}
      <label class="field"><span>Status</span><select class="input" data-order-status="${id}">${statusOptions}</select></label>
      <label class="field"><span>Assign rider</span><select class="input" data-order-rider="${id}">${riderOptions}</select></label>
      <div class="actions-grid ${next ? "three" : ""}">
        <a class="btn soft small" href="tel:${phone}">Call</a>
        <a class="btn soft small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orderAddress(order))}">Map</a>
        ${next ? `<button class="btn brand small" data-next-status="${id}" data-next-value="${next}" type="button">${escapeHTML(statusLabel(next))}</button>` : ""}
      </div>
    </article>`;
  }

  function nextStatus(status) {
    if (status === "confirmed") return "preparing";
    if (status === "preparing") return "out_for_delivery";
    if (status === "out_for_delivery") return "delivered";
    return "";
  }

  async function updateOrder(orderId, patch) {
    if (!orderId) return;
    await db.collection("orders").doc(orderId).set({
      ...patch,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "admin"
    }, { merge: true });
    toast("Order updated.");
  }

  function renderMenu() {
    $("menuList").innerHTML = menuItems.length ? menuItems.map(renderMenuCard).join("") : `<div class="empty-card">No menu in Firestore. Tap Seed to create default items.</div>`;

    document.querySelectorAll("[data-save-menu]").forEach(btn => {
      btn.addEventListener("click", () => saveMenuItem(btn.dataset.saveMenu));
    });
    document.querySelectorAll("[data-delete-menu]").forEach(btn => {
      btn.addEventListener("click", () => deleteMenuItem(btn.dataset.deleteMenu));
    });
  }

  function renderMenuCard(item) {
    const id = escapeHTML(item.docId);
    return `<article class="menu-card">
      <div class="order-top">
        <div>
          <div class="item-name">${escapeHTML(item.name || "Menu item")}</div>
          <div class="muted">${escapeHTML(item.category || "")}${item.protein ? ` · ${escapeHTML(item.protein)}` : ""}</div>
        </div>
        <div class="status-pill ${item.available === false ? "cancelled" : "delivered"}">${item.available === false ? "Sold out" : "Available"}</div>
      </div>
      <div class="menu-edit-grid">
        <label class="field"><span>Name</span><input class="input" data-name="${id}" value="${escapeHTML(item.name || "")}" /></label>
        <label class="field"><span>Price</span><input class="input" data-price="${id}" type="number" min="0" value="${Number(item.price || 0)}" /></label>
      </div>
      <div class="two-col">
        <label class="field"><span>Category</span><select class="input" data-category="${id}"><option value="protein" ${item.category === "protein" ? "selected" : ""}>Protein</option><option value="regular" ${item.category === "regular" ? "selected" : ""}>Regular</option></select></label>
        <label class="field"><span>Availability</span><select class="input" data-available="${id}"><option value="true" ${item.available !== false ? "selected" : ""}>Available</option><option value="false" ${item.available === false ? "selected" : ""}>Sold out</option></select></label>
      </div>
      <label class="field"><span>Description</span><textarea class="input textarea" data-desc="${id}">${escapeHTML(item.description || item.detail || "")}</textarea></label>
      <div class="actions-grid">
        <button class="btn soft small" data-delete-menu="${id}" type="button">Delete</button>
        <button class="btn brand small" data-save-menu="${id}" type="button">Save</button>
      </div>
    </article>`;
  }

  async function saveMenuItem(id) {
    const name = clean(document.querySelector(`[data-name="${CSS.escape(id)}"]`)?.value);
    const price = Number(document.querySelector(`[data-price="${CSS.escape(id)}"]`)?.value || 0);
    const category = clean(document.querySelector(`[data-category="${CSS.escape(id)}"]`)?.value || "regular");
    const available = document.querySelector(`[data-available="${CSS.escape(id)}"]`)?.value === "true";
    const description = clean(document.querySelector(`[data-desc="${CSS.escape(id)}"]`)?.value);
    if (!name) return toast("Item name is required.");
    await db.collection("menuItems").doc(id).set({
      id,
      name,
      price,
      category,
      description,
      available,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    toast("Menu item saved.");
  }

  async function deleteMenuItem(id) {
    const item = menuItems.find(menu => menu.docId === id);
    if (!confirm(`Delete ${item?.name || "this item"}?`)) return;
    await db.collection("menuItems").doc(id).delete();
    toast("Menu item deleted.");
  }

  async function seedMenu() {
    const defaults = [
      { id: "1", name: "Protein egg lunch", category: "protein", price: 89, protein: "45g", available: true, sort: 1, description: "Egg, rice, soya chunks, veggies, chappati, channa gravy" },
      { id: "2", name: "Regular meal", category: "regular", price: 65, available: true, sort: 2, description: "Rice, sambar, egg, veggies, pappad, rasam" },
      { id: "3", name: "Protein chicken dinner", category: "protein", price: 109, protein: "50g", available: true, sort: 3, description: "Chicken, rice, soya chunks, egg, veggies, chappati" },
      { id: "4", name: "Chappati & gravy", category: "regular", price: 89, protein: "45g", available: true, sort: 4, description: "Chappati with gravy" }
    ];
    for (const item of defaults) {
      await db.collection("menuItems").doc(item.id).set({
        ...item,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    toast("Default menu seeded.");
  }

  async function addMenuItem() {
    const name = clean($("newItemName").value);
    if (!name) return toast("Enter item name.");
    const ref = db.collection("menuItems").doc();
    await ref.set({
      id: ref.id,
      name,
      price: Number($("newItemPrice").value || 0),
      category: $("newItemCategory").value,
      protein: clean($("newItemProtein").value),
      description: clean($("newItemDesc").value),
      available: true,
      sort: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ["newItemName", "newItemPrice", "newItemProtein", "newItemDesc"].forEach(id => { $(id).value = ""; });
    toast("Item added.");
  }

  function renderRiders() {
    $("riderList").innerHTML = riders.length ? riders.map(renderRiderCard).join("") : `<div class="empty-card">No delivery partners added.</div>`;
    document.querySelectorAll("[data-toggle-rider]").forEach(btn => {
      btn.addEventListener("click", () => toggleRider(btn.dataset.toggleRider));
    });
    document.querySelectorAll("[data-delete-rider]").forEach(btn => {
      btn.addEventListener("click", () => deleteRider(btn.dataset.deleteRider));
    });
  }

  function renderRiderCard(rider) {
    return `<article class="rider-card">
      <div class="order-top">
        <div>
          <div class="rider-name">${escapeHTML(rider.name || "Rider")}</div>
          <div class="muted">${escapeHTML(rider.phone || "")}</div>
        </div>
        <div class="status-pill ${isVerifiedRider(rider) ? (rider.busy ? "preparing" : "delivered") : "cancelled"}">${isVerifiedRider(rider) ? (rider.busy ? "Busy" : "Verified") : "Pending login"}</div>
      </div>
      <div class="actions-grid">
        <button class="btn soft small" data-delete-rider="${escapeHTML(rider.id)}" type="button">Delete</button>
        <button class="btn brand small" data-toggle-rider="${escapeHTML(rider.id)}" type="button">${rider.busy ? "Mark free" : "Mark busy"}</button>
      </div>
    </article>`;
  }

  async function addRider() {
    const name = clean($("riderName").value);
    const phone = phone10($("riderPhone").value);
    if (!name) return toast("Enter rider name.");
    if (!phone) return toast("Enter rider mobile number.");
    await db.collection("deliveryPartners").add({
      name,
      phone,
      phoneE164: e164(phone),
      authUid: "",
      pendingLogin: true,
      busy: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    $("riderName").value = "";
    $("riderPhone").value = "";
    toast("Rider added.");
  }

  async function toggleRider(id) {
    const rider = riders.find(item => item.id === id);
    if (!rider) return;
    await db.collection("deliveryPartners").doc(id).set({
      busy: !rider.busy,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function deleteRider(id) {
    const rider = riders.find(item => item.id === id);
    if (!confirm(`Delete ${rider?.name || "this rider"}?`)) return;
    await db.collection("deliveryPartners").doc(id).delete();
    toast("Rider deleted.");
  }

  function renderSettings() {
    $("kitchenOpen").checked = settings.kitchenOpen !== false;
    $("storeName").value = settings.storeName || "Tiffin CBE";
    $("cutoffTime").value = settings.cutoffTime || "11:00 AM";
    $("eta").value = settings.eta || "15 - 25 mins";
    $("deliveryFee").value = settings.deliveryFee ?? 0;
    $("minOrder").value = settings.minimumOrderAmount ?? 0;
    $("closedMessage").value = settings.closedMessage || "Kitchen closed. Orders open tomorrow.";
    $("storeStatusText").textContent = settings.kitchenOpen === false ? "Kitchen is closed" : "Kitchen is open";
  }

  async function saveSettings() {
    await db.collection("storeSettings").doc(STORE_ID).set({
      storeName: clean($("storeName").value) || "Tiffin CBE",
      kitchenOpen: $("kitchenOpen").checked,
      cutoffTime: clean($("cutoffTime").value) || "11:00 AM",
      eta: clean($("eta").value) || "15 - 25 mins",
      deliveryFee: Number($("deliveryFee").value || 0),
      minimumOrderAmount: Number($("minOrder").value || 0),
      closedMessage: clean($("closedMessage").value) || "Kitchen closed. Orders open tomorrow.",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "admin"
    }, { merge: true });
    toast("Settings saved.");
  }

  function setupActions() {
    $("refreshBtn").addEventListener("click", () => window.location.reload());
    $("soundBtn").addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      $("soundBtn").textContent = soundEnabled ? "Sound on" : "Sound off";
      toast(soundEnabled ? "New order sound enabled." : "New order sound disabled.");
    });
    $("seedMenuBtn").addEventListener("click", seedMenu);
    $("addItemBtn").addEventListener("click", addMenuItem);
    $("addRiderBtn").addEventListener("click", addRider);
    $("saveSettingsBtn").addEventListener("click", saveSettings);
  }

  function boot() {
    if (!initFirebase()) return;
    setupAuth();
    setupTabs();
    setupActions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
