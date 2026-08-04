(function () {
  const variant = new URLSearchParams(window.location.search).get("variant");
  if (["light", "operations", "analytics"].includes(variant)) document.documentElement.dataset.variant = variant;
  const data = window.RassedData;
  const labels = { dashboard: "نظرة عامة", scan: "تسجيل Scan", orders: "سجل الطلبات", alerts: "مركز التنبيهات", analytics: "التحليلات", reports: "التقارير", settings: "الإعدادات" };
  const state = { view: "dashboard", scanMode: "dispatch", dashboardStatus: "all", log: [] };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const statusText = { Sortie: "Sortie · خارج", Livrée: "Livrée · تم التسليم", Retour: "Retour · راجع" };
  const statusClass = { Sortie: "status-out", Livrée: "status-delivered", Retour: "status-return" };
  function statusBadge(status) { return `<span class="status-badge ${statusClass[status] || "status-unknown"}"><i></i>${statusText[status] || "غير معروف"}</span>`; }
  function orderRow(order, full = false) {
    const stale = order.status === "Sortie" && order.days >= 5 && !order.reviewed;
    return `<tr class="${stale ? "stale-row" : ""}"><td><button class="order-link" data-order="${escape(order.barcode)}"><span class="barcode-box">▥</span><span><strong>${escape(order.barcode)}</strong><small>${escape(order.id)}</small></span></button></td>${full ? `<td>${order.date}</td>` : ""}<td>${escape(order.city)}</td><td>${statusBadge(order.status)}</td><td><span class="courier-name"><i style="background:${order.courierColor}"></i>${escape(order.courier)}</span></td><td><span class="last-action">${escape(order.lastAction)}<small>${order.time}</small></span></td>${full ? `<td><span class="${stale ? "duration late" : "duration"}">${order.days === 0 ? "اليوم" : `${order.days} أيام`}${stale ? " !" : ""}</span></td>` : ""}<td><button class="row-more" data-order="${escape(order.barcode)}">⋮</button></td></tr>`;
  }
  function renderDashboard() {
    const stats = data.stats();
    $("#metric-total").textContent = stats.total;
    $("#metric-out").textContent = stats.out;
    $("#metric-delivered").textContent = stats.delivered;
    $("#metric-returned").textContent = stats.returned;
    $("#side-total").textContent = stats.total;
    $("#side-alerts").textContent = stats.overdue;
    $("#mobile-alerts").textContent = stats.overdue;
    $("#sortie-count").textContent = stats.out;
    const query = $("#dashboard-search")?.value.toLowerCase() || "";
    const rows = data.all().filter((o) => (state.dashboardStatus === "all" || o.status === state.dashboardStatus) && `${o.barcode} ${o.city} ${o.courier}`.toLowerCase().includes(query));
    $("#dashboard-table").innerHTML = rows.slice(0, 8).map((order) => orderRow(order)).join("") || emptyRow("لا توجد طلبات مطابقة");
    $("#courier-list").innerHTML = data.couriers.map((courier) => `<div class="courier-row"><span class="courier-dot" style="background:${courier.color}"></span><strong>${courier.name}</strong><div class="courier-bar"><i style="width:${courier.rate}%;background:${courier.color}"></i></div><b>${courier.rate}%</b></div>`).join("");
  }
  function renderOrders() {
    const query = $("#orders-search")?.value.toLowerCase() || "";
    const status = $("#status-filter")?.value || "all";
    const company = $("#company-filter")?.value || "all";
    const rows = data.all().filter((o) => (status === "all" || o.status === status) && (company === "all" || o.courier === company) && `${o.barcode} ${o.city} ${o.courier}`.toLowerCase().includes(query));
    $("#orders-table").innerHTML = rows.map((order) => orderRow(order, true)).join("") || emptyRow("لا توجد طلبات مطابقة للفلاتر");
    $("#orders-result").textContent = `${rows.length} طلبًا`;
  }
  function renderAlerts() {
    const overdue = data.all().filter((o) => o.status === "Sortie" && o.days >= 5 && !o.reviewed);
    $("#alert-count").textContent = overdue.length;
    $("#alerts-list").innerHTML = overdue.map((order) => `<div class="alert-row"><span class="alert-priority">!</span><div class="alert-order"><strong>${escape(order.barcode)}</strong><small>${escape(order.city)} · ${escape(order.courier)}</small></div><div class="alert-reason"><strong>بدون تحديث منذ ${order.days} أيام</strong><small>آخر حركة: ${escape(order.lastAction)}</small></div><button class="outline-btn small-btn resolve-alert" data-order="${escape(order.barcode)}">تحديد كمُراجع</button><button class="ghost-icon" data-order="${escape(order.barcode)}">⋮</button></div>`).join("") || `<div class="empty-state">لا توجد تنبيهات مفتوحة. سجلّك متوازن.</div>`;
  }
  function renderAnalytics() {
    $("#performance-list").innerHTML = data.couriers.map((courier) => `<div class="performance-row"><div><span class="courier-dot" style="background:${courier.color}"></span><strong>${courier.name}</strong></div><div class="performance-track"><i style="width:${courier.rate}%;background:${courier.color}"></i></div><b>${courier.rate}%</b><small>${courier.total} طلبًا</small></div>`).join("");
  }
  function renderScanLog() {
    $("#scan-log").innerHTML = state.log.length ? state.log.slice().reverse().map((entry) => `<div class="scan-log-row"><span class="scan-log-icon ${entry.ok ? "ok" : "bad"}">${entry.ok ? "✓" : "!"}</span><div><strong>${escape(entry.barcode)}</strong><small>${entry.message}</small></div><time>${entry.time}</time></div>`).join("") : `<div class="empty-state compact-empty">ستظهر عمليات المسح هنا مباشرة.</div>`;
  }
  function emptyRow(message) { return `<tr><td colspan="8" class="empty-table">${message}</td></tr>`; }
  function showView(view) {
    if (!labels[view]) return;
    state.view = view;
    $$(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
    $$(".nav-link, .mobile-bottom button").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
    $("#page-label").textContent = labels[view];
    $("#sidebar").classList.remove("open");
    if (view === "dashboard") renderDashboard();
    if (view === "orders") renderOrders();
    if (view === "alerts") renderAlerts();
    if (view === "analytics") renderAnalytics();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toast(message, tone = "info") { const node = document.createElement("div"); node.className = `toast ${tone}`; node.innerHTML = `<b>${tone === "success" ? "✓" : tone === "error" ? "!" : "i"}</b><span>${escape(message)}</span>`; $("#toast-region").appendChild(node); setTimeout(() => node.remove(), 4200); }
  function processScan() {
    const barcode = $("#manual-barcode").value.trim();
    if (!barcode) return toast("أدخل رقم الطلب أولًا.", "error");
    const next = state.scanMode === "return" ? "Retour" : "Sortie";
    const result = data.update(barcode, next);
    const time = new Date().toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" });
    if (!result.ok) {
      const message = result.reason === "unknown" ? "لم يتم العثور على الطلب في السجل" : `الطلب مسجل مسبقًا كـ ${statusText[result.order.status]}`;
      state.log.push({ barcode, ok: false, message, time });
      toast(message, "error");
    } else {
      state.log.push({ barcode, ok: true, message: `تم تسجيل ${statusText[next]}`, time });
      $("#last-scan").innerHTML = `<span class="last-scan-icon success">✓</span><div><small>آخر عملية · ${time}</small><strong>${escape(barcode)} · ${statusText[next]}</strong></div>`;
      toast(`تم تحديث ${barcode} بنجاح.`, "success");
      renderDashboard();
    }
    $("#manual-barcode").value = "";
    renderScanLog();
    renderAlerts();
  }
  function openOrder(barcode) {
    const order = data.find(barcode);
    if (!order) return toast("لم يتم العثور على الطلب.", "error");
    $("#modal-content").innerHTML = `<div class="modal-kicker">${statusBadge(order.status)} <span>تفاصيل الطلب</span></div><h2>${escape(order.barcode)}</h2><p class="modal-subtitle">${escape(order.city)} · ${escape(order.courier)}</p><div class="modal-facts"><div><small>الحالة</small><strong>${statusText[order.status]}</strong></div><div><small>آخر تحديث</small><strong>${order.date} · ${order.time}</strong></div><div><small>مدة الحالة</small><strong>${order.days} أيام</strong></div></div><div class="modal-timeline"><span class="done"></span><div><strong>تم إنشاء الطلب</strong><small>03 أغسطس · 08:10</small></div><span class="${order.status !== "Livrée" ? "done" : "done"}"></span><div><strong>${escape(order.lastAction)}</strong><small>${order.date} · ${order.time}</small></div></div>${order.status === "Sortie" ? `<button class="primary-btn full modal-return" data-order="${escape(order.barcode)}">تسجيله كـ Retour</button>` : ""}`;
    $("#order-modal").classList.remove("hidden");
  }
  function exportCsv() { const rows = data.all(); const csv = ["barcode,city,courier,status,date,time", ...rows.map((o) => [o.barcode, o.city, o.courier, o.status, o.date, o.time].map((v) => `"${v}"`).join(","))].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); link.download = "rassed-delivery-audit.csv"; link.click(); URL.revokeObjectURL(link.href); toast("تم تجهيز ملف التصدير.", "success"); }
  function bind() {
    $$("[data-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    $$(".nav-link").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    $("#dashboard-search").addEventListener("input", renderDashboard);
    $$(".filter-chip").forEach((button) => button.addEventListener("click", () => { state.dashboardStatus = button.dataset.status; $$(".filter-chip").forEach((item) => item.classList.toggle("active", item === button)); renderDashboard(); }));
    $("#orders-search").addEventListener("input", renderOrders); $("#status-filter").addEventListener("change", renderOrders); $("#company-filter").addEventListener("change", renderOrders);
    $("#clear-filters").addEventListener("click", () => { $("#orders-search").value = ""; $("#status-filter").value = "all"; $("#company-filter").value = "all"; renderOrders(); });
    $$(".scan-tab").forEach((button) => button.addEventListener("click", () => { state.scanMode = button.dataset.scanMode; $$(".scan-tab").forEach((item) => item.classList.toggle("active", item === button)); $("#scan-status").innerHTML = `<span class="status-dot"></span><span>جاهز لـ ${state.scanMode === "return" ? "Retour" : "Sortie"}</span>`; }));
    $("#submit-scan").addEventListener("click", processScan); $("#manual-barcode").addEventListener("keydown", (event) => { if (event.key === "Enter") processScan(); }); $("#manual-focus").addEventListener("click", () => $("#manual-barcode").focus());
    $("#camera-btn").addEventListener("click", () => { $("#scanner-viewport").classList.toggle("camera-on"); $("#scan-status").innerHTML = `<span class="status-dot live"></span><span>الكاميرا جاهزة — وجّهها نحو الباركود</span>`; toast("تم تشغيل الكاميرا.", "success"); });
    $("#close-banner").addEventListener("click", () => $("#audit-banner").remove());
    $("#resolve-all").addEventListener("click", () => { data.all().filter((o) => o.status === "Sortie" && o.days >= 5).forEach((o) => { const item = data.find(o.barcode); item.reviewed = true; }); data.save(); renderAlerts(); renderDashboard(); toast("تم تحديد التنبيهات كمُراجعة.", "success"); });
    $("#save-settings").addEventListener("click", () => toast("تم حفظ قواعد التدقيق.", "success")); $("#export-orders").addEventListener("click", exportCsv); $("#export-csv").addEventListener("click", exportCsv); $("#export-performance").addEventListener("click", exportCsv);
    $("#mobile-menu").addEventListener("click", () => $("#sidebar").classList.toggle("open")); $("#modal-close").addEventListener("click", () => $("#order-modal").classList.add("hidden"));
    document.addEventListener("click", (event) => { const orderButton = event.target.closest("[data-order]"); if (orderButton && !event.target.closest(".resolve-alert")) openOrder(orderButton.dataset.order); const resolve = event.target.closest(".resolve-alert"); if (resolve) { const item = data.find(resolve.dataset.order); if (item) item.reviewed = true; data.save(); renderAlerts(); renderDashboard(); toast("تمت مراجعة الطلب.", "success"); } const modalReturn = event.target.closest(".modal-return"); if (modalReturn) { $("#order-modal").classList.add("hidden"); showView("scan"); state.scanMode = "return"; $("#manual-barcode").value = modalReturn.dataset.order; processScan(); } });
    document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); showView("scan"); $("#manual-barcode").focus(); } if (event.key === "Escape") $("#order-modal").classList.add("hidden"); });
  }
  bind(); renderDashboard(); renderOrders(); renderAlerts(); renderAnalytics(); renderScanLog();
})();