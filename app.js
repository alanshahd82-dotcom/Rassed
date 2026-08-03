(function () {
  const store = window.RassedStore;
  const state = { currentView: "dashboard", dashboardFilter: "all", scanMode: "dispatch", scanner: null, pendingBarcode: null, lastScanned: "", lastScannedAt: 0 };
  const labels = { dashboard: "لوحة التحكم", orders: "كل الطلبات", scan: "مسح الباركود", analytics: "التحليلات", alerts: "التنبيهات", settings: "الإعدادات", reports: "التقارير والتصدير" };
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }
  function formatDate(date) {
    return new Intl.DateTimeFormat("ar-MA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
  }
  function formatTime(date) {
    return new Intl.DateTimeFormat("ar-MA", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
  }
  function statusBadge(status) {
    const text = { Sorti: "Sorti · خارج", Livré: "Livré · تم التسليم", Retour: "Retour · مرتجع" }[status] || status;
    return `<span class="status-badge status-${status.toLowerCase()}"><i></i>${text}</span>`;
  }
  function companyLogo(name) {
    const initials = { Amana: "A", Cathedis: "C", "Ozone Express": "O", Jibli: "J" };
    return `<span class="company-logo company-${name.toLowerCase().replace(/\s/g, "-")}">${initials[name] || "•"}</span>`;
  }
  function orderRow(order, large = false) {
    const days = store.getDaysInStatus(order);
    const stuck = order.status === "Sorti" && days >= store.getThreshold() && !order.resolved;
    return `<tr class="${stuck ? "is-stuck" : ""}" data-barcode="${escapeHtml(order.barcode)}">
      <td><button class="order-link" data-order="${escapeHtml(order.barcode)}"><span class="barcode-mini">▥</span><span><strong>${escapeHtml(order.barcode)}</strong><small>${escapeHtml(order.city)}</small></span></button></td>
      <td>${formatDate(order.dispatchDate)}</td>
      <td>${statusBadge(order.status)}</td>
      <td><span class="${stuck ? "duration-stuck" : "duration"}">${days === 0 ? "اليوم" : `${days} ${days === 1 ? "يوم" : "أيام"}`}${stuck ? " !" : ""}</span></td>
      <td><span class="company-cell">${companyLogo(order.deliveryCompany)}${escapeHtml(order.deliveryCompany)}</span></td>
      ${large ? `<td><span class="last-updated">${formatDate(order.lastUpdated)}<small>${formatTime(order.lastUpdated)}</small></span></td>` : ""}
      <td><button class="row-menu" data-order="${escapeHtml(order.barcode)}" aria-label="فتح الطلب">⋮</button></td>
    </tr>`;
  }
  function renderDashboard() {
    const stats = store.getStats();
    $("#stat-dispatched").textContent = stats.dispatchedToday;
    $("#stat-delivered-rate").textContent = `${stats.deliveredRate}%`;
    $("#stat-return-rate").textContent = `${stats.returnedRate}%`;
    $("#stat-stuck").textContent = stats.stuck;
    $("#orders-nav-count").textContent = stats.total;
    $("#alerts-nav-count").textContent = stats.stuck;
    $("#heading-alert-count").textContent = `${stats.stuck} طلبًا`;
    $("#sorti-count").textContent = store.getOrders({ status: "Sorti" }).length;
    const orders = store.getOrders({ status: state.dashboardFilter === "all" ? undefined : state.dashboardFilter, search: $("#dashboard-search")?.value });
    $("#dashboard-orders-body").innerHTML = orders.slice(0, 8).map((order) => orderRow(order)).join("") || emptyTable("لا توجد طلبات تطابق البحث");
    $("#company-summary").innerHTML = store.getCompanyStats().map((company) => `<div class="company-summary-row"><div>${companyLogo(company.name)}<strong>${escapeHtml(company.name)}</strong></div><div class="company-rate"><span>${company.deliveredRate}%</span><small>${company.total} طلب</small></div><div class="mini-progress"><i style="width:${company.deliveredRate}%;background:${company.color}"></i></div></div>`).join("");
    const best = store.getCompanyStats().sort((a, b) => b.deliveredRate - a.deliveredRate)[0];
    $("#smart-insight").textContent = `${best.name} تحقق أفضل نسبة تسليم (${best.deliveredRate}%) هذا الشهر.`;
  }
  function emptyTable(message) { return `<tr><td colspan="7" class="empty-table">${message}</td></tr>`; }
  function renderOrders() {
    const filters = { search: $("#orders-search")?.value, status: $("#orders-status-filter")?.value, company: $("#orders-company-filter")?.value };
    const orders = store.getOrders(filters);
    $("#all-orders-body").innerHTML = orders.map((order) => orderRow(order, true)).join("") || emptyTable("لا توجد طلبات مطابقة للفلاتر");
    $("#all-orders-count").textContent = store.getStats().total;
    $("#orders-result-count").textContent = `عرض ${orders.length} طلبًا`;
  }
  function renderAlerts() {
    const alerts = store.getStuckOrders();
    $("#alerts-heading-count").textContent = alerts.length;
    $("#alert-list-subtitle").textContent = `${alerts.length} طلبًا تجاوزت مدة الانتظار`;
    $("#alert-threshold-copy").textContent = `${store.getThreshold()} أيام`;
    $("#alerts-list").innerHTML = alerts.length ? alerts.map((order) => `<div class="alert-item"><div class="alert-item-mark">!</div><div class="alert-order-main"><button class="order-link" data-order="${escapeHtml(order.barcode)}"><strong>${escapeHtml(order.barcode)}</strong><small>${companyLogo(order.deliveryCompany)} ${escapeHtml(order.deliveryCompany)} · ${escapeHtml(order.city)}</small></button></div><div class="alert-age"><strong>${store.getDaysInStatus(order)} أيام</strong><small>منذ آخر تحديث</small></div><div class="alert-dispatch"><span>خرج في</span><strong>${formatDate(order.dispatchDate)}</strong></div><div class="alert-actions"><button class="button button-ghost resolve-alert" data-barcode="${escapeHtml(order.barcode)}">✓ تمت المراجعة</button><button class="icon-button" data-order="${escapeHtml(order.barcode)}">↗</button></div></div>`).join("") : `<div class="empty-state"><span>✓</span><h3>لا توجد تنبيهات نشطة</h3><p>ممتاز، كل طلباتك ضمن المدة المحددة.</p></div>`;
  }
  function renderAnalytics() {
    const stats = store.getStats();
    $("#analytics-total").textContent = stats.total;
    const points = [72, 74, 73, 77, 76, 78, 79, 77, 80, 81, 79, 82, 81, 83, 82, 84, 83, 82, 84, 85, 84, 86, 85, 84, 86, 87, 86, 88, 87, 89];
    const returns = [12, 11, 13, 11, 12, 10, 11, 9, 10, 9, 10, 8, 9, 8, 9, 8, 7, 8, 7, 8, 7, 6, 7, 6, 7, 6, 6, 5, 6, 5];
    const chart = $("#performance-chart");
    const x = (index) => 20 + (index * 720) / (points.length - 1);
    const y = (value) => 270 - (value * 2.45);
    const line = (values) => values.map((value, index) => `${index ? "L" : "M"} ${x(index)} ${y(value)}`).join(" ");
    chart.innerHTML = `<defs><linearGradient id="fill-teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d9488" stop-opacity=".18"/><stop offset="100%" stop-color="#0d9488" stop-opacity="0"/></linearGradient></defs>${[0, 25, 50, 75, 100].map((n) => `<line x1="20" y1="${y(n)}" x2="740" y2="${y(n)}" class="chart-gridline"/><text x="750" y="${y(n) + 4}" class="chart-label">${n}%</text>`).join("")}<path d="${line(points)} L 740 270 L 20 270 Z" class="chart-area"/><path d="${line(points)}" class="chart-line teal-line"/><path d="${line(returns)}" class="chart-line red-line"/>`;
    $("#company-chart").innerHTML = store.getCompanyStats().map((company) => `<div class="company-chart-row"><div class="company-chart-label">${companyLogo(company.name)}<strong>${escapeHtml(company.name)}</strong></div><div class="company-bar-track"><i style="width:${company.deliveredRate}%;background:${company.color}"></i></div><strong class="company-chart-value">${company.deliveredRate}%</strong></div>`).join("");
  }
  function renderSettings() {
    $("#stuck-threshold").value = store.getThreshold();
    $("#settings-companies").innerHTML = store.getCompanies().map((company) => `<div class="settings-company"><div>${companyLogo(company.name)}<strong>${escapeHtml(company.name)}</strong></div><span class="company-enabled"><i></i> مفعّلة</span><button class="icon-button">⋮</button></div>`).join("");
  }
  function showView(view) {
    if (!labels[view]) return;
    state.currentView = view;
    $$(".view").forEach((section) => section.classList.toggle("active-view", section.id === `view-${view}`));
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
    $("#breadcrumb-current").textContent = labels[view];
    if (view === "dashboard") renderDashboard();
    if (view === "orders") renderOrders();
    if (view === "alerts") renderAlerts();
    if (view === "analytics") renderAnalytics();
    if (view === "settings") renderSettings();
    if (view === "scan") setTimeout(startScanner, 100);
    $("#sidebar").classList.remove("open");
    $("#sidebar-backdrop")?.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openOrder(barcode) {
    const order = store.findOrder(barcode);
    if (!order) return toast("لم يتم العثور على الطلب.", "error");
    const days = store.getDaysInStatus(order);
    $("#order-modal-content").innerHTML = `<div class="modal-kicker">${statusBadge(order.status)} <span>طلب ${escapeHtml(order.barcode)}</span></div><h2 id="modal-order-title">${escapeHtml(order.barcode)}</h2><p class="modal-subtitle">${companyLogo(order.deliveryCompany)} ${escapeHtml(order.deliveryCompany)} · ${escapeHtml(order.city)}</p><div class="modal-summary"><div><span>تاريخ الخروج</span><strong>${formatDate(order.dispatchDate)}</strong></div><div><span>المدة الحالية</span><strong>${days} ${days === 1 ? "يوم" : "أيام"}</strong></div><div><span>آخر تحديث</span><strong>${formatDate(order.lastUpdated)}</strong></div></div><div class="timeline"><h3>سجل الحالة</h3>${order.statusHistory.map((event, index) => `<div class="timeline-item ${index === order.statusHistory.length - 1 ? "current" : ""}"><span class="timeline-dot"></span><div><strong>${event.status === "Sorti" ? "Sorti · خرج للتوصيل" : event.status === "Livré" ? "Livré · تم التسليم" : "Retour · تم الإرجاع"}</strong><small>${formatDate(event.timestamp)} · ${formatTime(event.timestamp)}</small><p>${escapeHtml(event.note || "")}</p></div></div>`).join("")}</div><div class="modal-note"><label>ملاحظات الطلب</label><textarea placeholder="أضف ملاحظة لفريقك...">${escapeHtml(order.note || "")}</textarea></div>${order.status === "Sorti" ? `<button class="button button-primary button-full modal-scan-trigger" data-barcode="${escapeHtml(order.barcode)}">مسح هذا الطلب كمرتجع</button>` : ""}`;
    $("#order-modal").classList.remove("hidden");
  }
  function closeModal() { $("#order-modal").classList.add("hidden"); }
  function updateScanStatus(message, type = "ready") {
    const status = $("#scan-status");
    if (!status) return;
    const pulseClass = type === "error" ? "status-pulse status-pulse-error" : type === "success" ? "status-pulse status-pulse-success" : "status-pulse";
    status.innerHTML = `<span class="${pulseClass}"></span><span>${escapeHtml(message)}</span>`;
  }
  function processScan(barcode, mode = state.scanMode) {
    const clean = String(barcode).trim().toUpperCase();
    if (!clean) return toast("أدخل رقم الباركود أولًا.", "error");
    const now = Date.now();
    if (clean === state.lastScanned && now - state.lastScannedAt < 2500) return;
    state.lastScanned = clean;
    state.lastScannedAt = now;
    const result = store.scanOrder(clean, mode);
    if (result.ok) {
      $("#last-scan-value").textContent = result.order.barcode;
      $("#last-scan-time").textContent = "الآن";
      if (result.type === "dispatched") {
        updateScanStatus(`${clean} تم تسجيله كطلب خارج · Sorti`, "success");
        toast(`تم إرسال ${clean} إلى شركة التوصيل. الحالة: Sorti.`, "success");
      } else {
        updateScanStatus(`${clean} تم تسجيله كمرتجع · Retour`, "success");
        toast(`تم تسجيل استلام المرتجع ${clean}.`, "success");
      }
      renderAll();
      return;
    }
    const existing = result.order;
    if (result.type === "not-found") {
      updateScanStatus(`لم يتم العثور على ${clean} ضمن الطلبات المرسلة`, "error");
      toast("لا يمكن تسجيل مرتجع لباركود غير موجود. أرسل الطلب أولًا.", "error");
    } else if (result.type === "duplicate") {
      updateScanStatus(`${clean} مسجل مسبقًا كـ Sorti — لم يتم التكرار`, "error");
      toast("هذا الطلب مسجل مسبقًا كخارج. لم يتم احتساب المسح مرة ثانية.", "warning");
    } else if (result.type === "closed") {
      updateScanStatus(`${clean} مغلق بحالة ${existing.status} — لا تعديل`, "error");
      toast(`هذا الطلب مغلق بالفعل بحالة ${existing.status}. لا يمكن تغييره.`, "warning");
    }
    $("#last-scan-value").textContent = clean;
    $("#last-scan-time").textContent = "الآن";
    renderDashboard();
    renderAlerts();
  }
  function setScanMode(mode) {
    state.scanMode = mode;
    $$(".scan-mode").forEach((button) => button.classList.toggle("active", button.dataset.scanMode === mode));
    const explanation = $("#mode-explanation");
    if (!explanation) return;
    const isReturn = mode === "return";
    explanation.innerHTML = `<span class="mode-explanation-icon">${isReturn ? "↩" : "i"}</span><p><strong>${isReturn ? "وضع استقبال المرتجعات فعال" : "وضع إرسال الطلبات فعال"}</strong><br /><span>${isReturn ? "لا يُقبل إلا باركود موجود بحالة Sorti، وسيتم تحويله مباشرة إلى Retour." : "باركود جديد يُسجّل تلقائيًا كطلب خارج. الباركود المسجل مسبقًا يمنع التكرار."}</span></p>`;
    updateScanStatus(isReturn ? "في انتظار باركود مرتجع..." : "في انتظار باركود للإرسال...", "ready");
  }
  function exportCsv(rows, filename) {
    const headers = Object.keys(rows[0] || {});
    const csv = [headers, ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`))].map((row) => row.join(",")).join("\ufeff\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
    toast(`تم تجهيز ${filename} للتحميل.`, "success");
  }
  function toast(message, type = "info") {
    const node = document.createElement("div");
    node.className = `toast toast-${type}`;
    node.innerHTML = `<span class="toast-icon">${type === "success" ? "✓" : type === "warning" ? "!" : type === "error" ? "×" : "i"}</span><span>${escapeHtml(message)}</span><button>×</button>`;
    $("#toast-region").appendChild(node);
    node.querySelector("button").onclick = () => node.remove();
    setTimeout(() => node.remove(), 5000);
  }
  let deferredInstallPrompt = null;
  function setupPwaInstall() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    const installButton = $("#install-button");
    if (!installButton) return;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButton.classList.remove("hidden");
    });
    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      installButton.classList.add("hidden");
      toast("تم تثبيت راصد على هاتفك.", "success");
    });
    installButton.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === "accepted") installButton.classList.add("hidden");
        deferredInstallPrompt = null;
        return;
      }
      const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      if (isIos) {
        toast("في Safari اضغط مشاركة ثم «إضافة إلى الصفحة الرئيسية».", "info");
      } else {
        toast("افتح قائمة المتصفح واختر «تثبيت التطبيق».", "info");
      }
    });
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      installButton.classList.add("hidden");
    } else if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
      installButton.classList.remove("hidden");
    }
  }
  function bindEvents() {
    $("#login-form").addEventListener("submit", (event) => { event.preventDefault(); $("#login-screen").classList.add("hidden"); $("#app-shell").classList.remove("hidden"); showView("dashboard"); toast("مرحبًا بك في مساحة عمل Atlas Store.", "success"); });
    $("#password-toggle").addEventListener("click", () => { const input = $("#workspace-password"); input.type = input.type === "password" ? "text" : "password"; $("#password-toggle").textContent = input.type === "password" ? "إظهار" : "إخفاء"; });
    $("#logout-button").addEventListener("click", () => { $("#app-shell").classList.add("hidden"); $("#login-screen").classList.remove("hidden"); });
    $$(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    $$("[data-view-target]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewTarget)));
    $("#sidebar-open").addEventListener("click", () => {
      $("#sidebar").classList.add("open");
      $("#sidebar-backdrop")?.classList.remove("hidden");
    });
    const closeSidebar = () => {
      $("#sidebar").classList.remove("open");
      $("#sidebar-backdrop")?.classList.add("hidden");
    };
    $("#sidebar-close").addEventListener("click", closeSidebar);
    $("#sidebar-backdrop")?.addEventListener("click", closeSidebar);
    $("#dashboard-search").addEventListener("input", renderDashboard);
    $$(".filter-pill[data-dashboard-filter]").forEach((button) => button.addEventListener("click", () => { state.dashboardFilter = button.dataset.dashboardFilter; $$(".filter-pill[data-dashboard-filter]").forEach((item) => item.classList.toggle("active", item === button)); renderDashboard(); }));
    $("#orders-search").addEventListener("input", renderOrders); $("#orders-status-filter").addEventListener("change", renderOrders); $("#orders-company-filter").addEventListener("change", renderOrders);
    $("#reset-filters").addEventListener("click", () => { $("#orders-search").value = ""; $("#orders-status-filter").value = "all"; $("#orders-company-filter").value = "all"; renderOrders(); });
    $("#manual-scan-form").addEventListener("submit", (event) => { event.preventDefault(); processScan($("#manual-barcode").value, state.scanMode); $("#manual-barcode").value = ""; });
    $$(".scan-mode").forEach((button) => button.addEventListener("click", () => setScanMode(button.dataset.scanMode)));
    $("#modal-close").addEventListener("click", closeModal);
    $("#save-settings-button").addEventListener("click", () => { store.setThreshold($("#stuck-threshold").value); renderAll(); toast("تم حفظ إعدادات التنبيهات.", "success"); });
    $("#resolve-all-button").addEventListener("click", () => { store.getStuckOrders().forEach((order) => store.resolveAlert(order.barcode)); renderAll(); toast("تم تحديد كل التنبيهات كمُراجعة.", "success"); });
    $("#export-orders-button").addEventListener("click", () => exportCsv(store.exportRows(), "orders-2026-08-03.csv")); $("#export-all-button").addEventListener("click", () => exportCsv(store.exportRows(), "orders-2026-08-03.csv")); $("#export-report-button").addEventListener("click", () => exportCsv(store.getCompanyStats().map((c) => ({ company: c.name, totalOrders: c.total, delivered: c.delivered, returned: c.returned, deliveredRate: `${c.deliveredRate}%`, returnedRate: `${c.returnedRate}%` })), "performance-august-2026.csv"));
    document.addEventListener("click", (event) => { const orderButton = event.target.closest("[data-order]"); if (orderButton) openOrder(orderButton.dataset.order); const resolve = event.target.closest(".resolve-alert"); if (resolve) { store.resolveAlert(resolve.dataset.barcode); renderAll(); toast("تمت مراجعة الطلب.", "success"); } const scanTrigger = event.target.closest(".modal-scan-trigger"); if (scanTrigger) { closeModal(); showView("scan"); setScanMode("return"); } });
    document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); showView("scan"); $("#manual-barcode").focus(); } if (event.key === "Escape") { closeModal(); closeSidebar(); } });
    $("#orders-company-filter").innerHTML = `<option value="all">كل شركات التوصيل</option>${store.getCompanies().map((company) => `<option value="${escapeHtml(company.name)}">${escapeHtml(company.name)}</option>`).join("")}`;
  }
  function startScanner() {
    if (!window.Html5Qrcode || state.scanner) return;
    try {
      state.scanner = new Html5Qrcode("reader");
      state.scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 130 } }, (decodedText) => { processScan(decodedText, state.scanMode); }, () => {}).catch(() => { updateScanStatus("تعذر تشغيل الكاميرا — استخدم الإدخال اليدوي", "error"); });
    } catch (error) { updateScanStatus("تعذر تشغيل الكاميرا — استخدم الإدخال اليدوي", "error"); }
  }
  function renderAll() { renderDashboard(); renderOrders(); renderAlerts(); renderAnalytics(); renderSettings(); }
  window.RassedApp = { toast, processScan };
  setupPwaInstall(); bindEvents(); renderAll();
})();