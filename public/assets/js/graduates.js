/* Halaman wisuda: katalog dari API, estimasi realtime, booking ke API. Harga final = server. */
(function () {
  "use strict";
  var SERVICE = "graduates";
  var $ = function (id) { return document.getElementById(id); };
  var state = { pkg: null, catalogReady: false, lastCode: null };

  // Phase 7 (perf): cache respons katalog dalam memory — halaman yang sama tidak
  // meminta ulang /api/packages & /api/addons saat user menekan "Coba lagi".
  var catalogCache = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function rupiah(n) { return "Rp " + (Number.isFinite(n) ? n : 0).toLocaleString("id-ID"); }
  function waFallback() { return SM.waUrl("Halo SUKA MOTO, saya ingin bertanya mengenai paket wisuda."); }
  var HUMAN_ERR = "Terjadi kesalahan. Silakan coba lagi atau hubungi kami melalui WhatsApp.";

  /* ---------- Katalog ---------- */
  function renderPackages(list) {
    var box = $("packageList");
    box.textContent = "";
    list.forEach(function (p) {
      var card = el("div", "option-card" + (p.badge && /promo/i.test(p.badge) ? " promo-card" : ""));
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", "false");
      card.tabIndex = 0;
      card.dataset.id = String(p.id);
      if (p.badge) card.appendChild(el("span", "badge-promo", p.badge));
      var top = el("div", "card-top");
      top.appendChild(el("span", "card-title", p.name));
      top.appendChild(el("span", "card-price", rupiah(p.price)));
      card.appendChild(top);
      if (p.description) card.appendChild(el("div", "card-desc", p.description));
      var feats = el("div", "features-list");
      p.features.forEach(function (f) { feats.appendChild(el("div", null, "• " + f)); });
      card.appendChild(feats);
      if (p.terms) card.appendChild(el("div", "promo-terms", p.terms));
      card.addEventListener("click", function () { choose(card, p); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(card, p); }
      });
      box.appendChild(card);
    });
  }

  function renderAddons(list) {
    var box = $("addonList");
    box.textContent = "";
    list.forEach(function (a) {
      var label = el("label", "checkbox-card");
      var info = el("div", "checkbox-info");
      var cb = el("input", "addon-checkbox");
      cb.type = "checkbox";
      cb.value = String(a.id);
      cb.dataset.price = String(a.price);
      cb.dataset.name = a.name;
      cb.addEventListener("change", render);
      info.appendChild(cb);
      info.appendChild(el("span", null, a.name));
      label.appendChild(info);
      label.appendChild(el("span", "addon-price", "+ " + rupiah(a.price)));
      box.appendChild(label);
    });
  }

  function catalogError() {
    var box = $("packageList");
    box.textContent = "";
    var p = el("p", "field-error", "Paket belum dapat dimuat. ");
    var retry = el("button", "btn-wa", "Coba lagi");
    retry.type = "button";
    retry.addEventListener("click", loadCatalog);
    var wa = el("a", "wa-note", "Atau hubungi kami melalui WhatsApp");
    wa.href = waFallback(); wa.target = "_blank"; wa.rel = "noopener";
    box.appendChild(p); box.appendChild(retry); box.appendChild(wa);
  }

  async function loadCatalog() {
    if (catalogCache) { // hit cache: 0 request jaringan tambahan
      renderPackages(catalogCache[0].data);
      renderAddons(catalogCache[1].data);
      if (!catalogCache[0].data.length) { catalogError(); return; }
      state.catalogReady = true;
      $("bookBtn").disabled = false;
      return;
    }
    $("packageList").textContent = "Memuat paket...";
    try {
      var res = await Promise.all([
        SM.api("/api/packages?service=" + SERVICE),
        SM.api("/api/addons?service=" + SERVICE)
      ]);
      catalogCache = res;
      renderPackages(res[0].data);
      renderAddons(res[1].data);
      if (!res[0].data.length) { catalogError(); return; }
      state.catalogReady = true;
      $("bookBtn").disabled = false;
    } catch (e) {
      catalogError();
    }
  }

  /* ---------- Estimasi (hanya tampilan; server menghitung ulang) ---------- */
  function checkedAddons() {
    return Array.prototype.map.call(document.querySelectorAll(".addon-checkbox:checked"), function (cb) {
      var price = parseInt(cb.dataset.price, 10);
      return { id: parseInt(cb.value, 10), name: cb.dataset.name, price: Number.isFinite(price) ? price : 0 };
    });
  }

  function render() {
    var addons = checkedAddons();
    var total = (state.pkg ? state.pkg.price : 0) + addons.reduce(function (s, a) { return s + a.price; }, 0);
    $("summaryPackage").textContent = state.pkg ? state.pkg.name + " (" + rupiah(state.pkg.price) + ")" : "Belum ada paket dipilih";
    $("summaryAddons").textContent = addons.length ? addons.map(function (a) { return a.name; }).join(", ") : "Belum ada add-on";
    $("summaryTotal").textContent = rupiah(total);
  }

  function choose(card, pkg) {
    document.querySelectorAll(".option-card").forEach(function (c) { c.classList.remove("selected"); c.setAttribute("aria-checked", "false"); });
    card.classList.add("selected");
    card.setAttribute("aria-checked", "true");
    state.pkg = pkg;
    $("formError").textContent = "";
    render();
  }

  /* ---------- Form ---------- */
  var FIELD_MAP = {
    "customer.name": "clientName", "customer.phone": "clientPhone", "customer.email": "clientEmail",
    eventDate: "clientDate", eventTime: "clientTime", location: "clientLocation"
  };
  function setFieldError(id, msg) {
    var input = $(id), err = $("err-" + id);
    if (err) err.textContent = msg || "";
    if (input) { input.classList.toggle("invalid", !!msg); input.setAttribute("aria-invalid", String(!!msg)); }
  }
  function clearErrors() { Object.keys(FIELD_MAP).forEach(function (k) { setFieldError(FIELD_MAP[k], ""); }); }

  function validate() {
    var ok = true;
    function need(id, msg, bad) { var v = $(id).value.trim(); if (!v || bad) { setFieldError(id, v && bad ? bad : msg); ok = false; } else setFieldError(id, ""); }
    need("clientName", "Nama wajib diisi");
    need("clientPhone", "Nomor WhatsApp wajib diisi", /^\+?[\d\s\-()]{8,20}$/.test($("clientPhone").value.trim()) ? null : "Nomor WhatsApp tidak valid");
    var email = $("clientEmail").value.trim();
    setFieldError("clientEmail", email && !/^\S+@\S+\.\S+$/.test(email) ? "Email tidak valid" : "");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) ok = false;
    var min = $("clientDate").min;
    need("clientDate", "Tanggal wajib dipilih", $("clientDate").value && min && $("clientDate").value < min ? "Tanggal tidak boleh sebelum hari ini" : null);
    need("clientTime", "Jam wajib dipilih");
    need("clientLocation", "Lokasi wajib diisi");
    return ok;
  }

  function waMessage(data) {
    return "Halo SUKA MOTO,\n\nSaya sudah membuat booking dengan kode: " + data.bookingCode + "\n\n" +
      "Paket: " + data.package + "\n" +
      "Add-on: " + (data.addons.length ? data.addons.join(", ") : "Tidak ada") + "\n" +
      "Tanggal: " + data.eventDate + " pukul " + data.eventTime + "\n" +
      "Lokasi: " + $("clientLocation").value.trim() + "\n" +
      "Total: " + rupiah(data.totalPrice) + "\n\nMohon konfirmasi ketersediaan jadwalnya. Terima kasih.";
  }

  async function submit() {
    var btn = $("bookBtn"), err = $("formError");
    err.textContent = "";
    if (state.lastCode) return; // sudah terkirim; cegah kirim ganda (mis. klik/refresh state)
    if (!state.pkg) { err.textContent = "Silakan pilih paket utama terlebih dahulu."; return; }
    if (!validate()) { err.textContent = "Lengkapi data yang ditandai di atas."; return; }

    var label = btn.textContent;
    btn.disabled = true; btn.textContent = "Mengirim...";
    try {
      var res = await SM.api("/api/bookings", { method: "POST", body: {
        customer: { name: $("clientName").value.trim(), phone: $("clientPhone").value.trim(), email: $("clientEmail").value.trim() || undefined },
        service: SERVICE,
        packageId: state.pkg.id,
        addonIds: checkedAddons().map(function (a) { return a.id; }),
        eventDate: $("clientDate").value,
        eventTime: $("clientTime").value,
        location: $("clientLocation").value.trim(),
        notes: $("clientNotes").value.trim() || undefined
      }});
      state.lastCode = res.data.bookingCode;
      $("okCode").textContent = res.data.bookingCode;
      $("okTotal").textContent = rupiah(res.data.totalPrice);
      $("okWa").href = SM.waUrl(waMessage(res.data));
      $("summaryBox").hidden = true;
      $("successBox").hidden = false;
      $("successBox").focus();
    } catch (e) {
      clearErrors();
      var shown = false;
      (e.errors || []).forEach(function (x) {
        if (FIELD_MAP[x.field]) { setFieldError(FIELD_MAP[x.field], x.message); shown = true; }
        else if (x.message) { err.textContent = x.message; shown = true; }
      });
      if (!shown) err.textContent = e.status && e.status < 500 && e.status !== 429 ? e.message : HUMAN_ERR;
      btn.disabled = false; btn.textContent = label;
    }
  }

  var d = new Date();
  $("clientDate").min = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  $("bookBtn").addEventListener("click", submit);
  render();
  loadCatalog();
})();
