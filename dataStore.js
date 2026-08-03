/* Rassed data layer
 * ------------------
 * The UI only talks to this module. To connect Google Sheets later, replace
 * the implementations inside this object with async API calls while keeping
 * the public method names and returned shapes stable.
 */
(function (global) {
  const companies = [
    { name: "Amana", color: "#0d9488" },
    { name: "Cathedis", color: "#496b93" },
    { name: "Ozone Express", color: "#d97706" },
    { name: "Jibli", color: "#7c5ac2" }
  ];

  const today = new Date("2026-08-03T14:00:00");
  const seed = [
    ["AMN-2026-00847", "Livré", 0, "Amana", "الدار البيضاء", "تم التسليم للعميل في العنوان"],
    ["CAT-2026-00792", "Sorti", 1, "Cathedis", "الرباط", "في الطريق إلى العميل"],
    ["OZN-2026-00631", "Retour", 2, "Ozone Express", "مراكش", "العميل لم يجب على الاتصال"],
    ["AMN-2026-00846", "Livré", 1, "Amana", "طنجة", "تم التسليم بنجاح"],
    ["JBL-2026-00519", "Sorti", 6, "Jibli", "فاس", "تأخر تحديث الناقل"],
    ["CAT-2026-00788", "Livré", 2, "Cathedis", "الدار البيضاء", "تم التسليم"],
    ["AMN-2026-00842", "Sorti", 7, "Amana", "أكادير", "تجاوز الحد المحدد"],
    ["OZN-2026-00628", "Livré", 3, "Ozone Express", "مكناس", "تم التسليم"],
    ["CAT-2026-00785", "Sorti", 5, "Cathedis", "سلا", "بانتظار التحديث"],
    ["AMN-2026-00839", "Retour", 4, "Amana", "الدار البيضاء", "رفض العميل الاستلام"],
    ["JBL-2026-00512", "Livré", 1, "Jibli", "الرباط", "تم التسليم"],
    ["OZN-2026-00619", "Sorti", 9, "Ozone Express", "الدار البيضاء", "لا يوجد تحديث منذ الخروج"],
    ["AMN-2026-00831", "Livré", 2, "Amana", "وجدة", "تم التسليم"],
    ["CAT-2026-00776", "Sorti", 0, "Cathedis", "القنيطرة", "في الطريق"],
    ["JBL-2026-00503", "Retour", 3, "Jibli", "تطوان", "عنوان غير مكتمل"],
    ["OZN-2026-00608", "Livré", 1, "Ozone Express", "الرباط", "تم التسليم"],
    ["AMN-2026-00827", "Sorti", 6, "Amana", "الدار البيضاء", "تجاوز الحد المحدد"],
    ["CAT-2026-00769", "Livré", 4, "Cathedis", "مراكش", "تم التسليم"],
    ["JBL-2026-00498", "Sorti", 8, "Jibli", "فاس", "تأخر تحديث الناقل"],
    ["OZN-2026-00597", "Retour", 2, "Ozone Express", "أكادير", "طلب العميل الإرجاع"]
  ];

  let orderSequence = 128;
  let thresholdDays = 5;
  let orderList = seed.map((item, index) => {
    const [barcode, status, days, deliveryCompany, city, note] = item;
    const dispatchDate = new Date(today);
    dispatchDate.setDate(dispatchDate.getDate() - (days + (status === "Livré" ? 1 : 0)));
    const history = [{ status: "Sorti", timestamp: new Date(dispatchDate), note: "تم إنشاء الشحنة وتسليمها للناقل" }];
    if (status !== "Sorti") {
      const updateDate = new Date(today);
      updateDate.setDate(updateDate.getDate() - Math.max(days - 1, 0));
      history.push({ status, timestamp: updateDate, note });
    }
    return { id: `ord-${index + 1}`, barcode, status, dispatchDate, deliveryCompany, city, note, statusHistory: history, lastUpdated: history[history.length - 1].timestamp, resolved: false };
  });

  function cloneOrder(order) {
    return { ...order, statusHistory: order.statusHistory.map((event) => ({ ...event, timestamp: new Date(event.timestamp) })) };
  }
  function findOrder(barcode) {
    return orderList.find((order) => order.barcode.toLowerCase() === String(barcode).trim().toLowerCase());
  }
  function getOrders(filters = {}) {
    let result = orderList.slice();
    if (filters.status && filters.status !== "all") result = result.filter((order) => order.status === filters.status);
    if (filters.company && filters.company !== "all") result = result.filter((order) => order.deliveryCompany === filters.company);
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter((order) => `${order.barcode} ${order.deliveryCompany} ${order.city}`.toLowerCase().includes(query));
    }
    return result.map(cloneOrder);
  }
  function addOrder(barcode, deliveryCompany = "Amana") {
    const cleanBarcode = String(barcode).trim().toUpperCase();
    if (!cleanBarcode) throw new Error("barcode-required");
    const existing = findOrder(cleanBarcode);
    if (existing) return { order: cloneOrder(existing), created: false };
    const dispatchDate = new Date(today);
    const order = { id: `ord-${++orderSequence}`, barcode: cleanBarcode, status: "Sorti", dispatchDate, deliveryCompany, city: "غير محدد", note: "تمت إضافته عبر الماسح", statusHistory: [{ status: "Sorti", timestamp: dispatchDate, note: "تم إنشاء الطلب عبر مسح الباركود" }], lastUpdated: dispatchDate, resolved: false };
    orderList.unshift(order);
    return { order: cloneOrder(order), created: true };
  }
  function updateOrderStatus(barcode, nextStatus, note) {
    const order = findOrder(barcode);
    if (!order) return null;
    const timestamp = new Date();
    order.status = nextStatus;
    order.lastUpdated = timestamp;
    order.resolved = false;
    order.note = note || (nextStatus === "Livré" ? "تم التسليم للعميل" : "تم تسجيل الإرجاع");
    order.statusHistory.push({ status: nextStatus, timestamp, note: order.note });
    return cloneOrder(order);
  }
  function resolveAlert(barcode) {
    const order = findOrder(barcode);
    if (order) order.resolved = true;
    return order ? cloneOrder(order) : null;
  }
  function getStuckOrders() {
    return orderList.filter((order) => order.status === "Sorti" && !order.resolved && getDaysInStatus(order) >= thresholdDays).map(cloneOrder);
  }
  function getDaysInStatus(order) {
    const start = new Date(order.lastUpdated || order.dispatchDate);
    const diff = Math.max(0, today.getTime() - start.getTime());
    return Math.floor(diff / 86400000);
  }
  function getCompanies() { return companies.map((company) => ({ ...company })); }
  function getThreshold() { return thresholdDays; }
  function setThreshold(days) { thresholdDays = Math.max(1, Number(days) || 5); return thresholdDays; }
  function getStats() {
    const all = orderList.length;
    const delivered = orderList.filter((o) => o.status === "Livré").length;
    const returned = orderList.filter((o) => o.status === "Retour").length;
    return { total: all, dispatchedToday: 34, delivered, returned, deliveredRate: ((delivered / all) * 100).toFixed(1), returnedRate: ((returned / all) * 100).toFixed(1), stuck: getStuckOrders().length };
  }
  function getCompanyStats() {
    return companies.map((company) => {
      const list = orderList.filter((order) => order.deliveryCompany === company.name);
      const delivered = list.filter((order) => order.status === "Livré").length;
      const returned = list.filter((order) => order.status === "Retour").length;
      return { ...company, total: list.length, delivered, returned, deliveredRate: list.length ? Math.round((delivered / list.length) * 100) : 0, returnedRate: list.length ? Math.round((returned / list.length) * 100) : 0 };
    });
  }
  function exportRows() {
    return orderList.map((order) => ({ barcode: order.barcode, status: order.status, dispatchDate: order.dispatchDate.toISOString().slice(0, 10), deliveryCompany: order.deliveryCompany, city: order.city, daysInStatus: getDaysInStatus(order), lastUpdated: order.lastUpdated.toISOString().slice(0, 16).replace("T", " "), notes: order.note }));
  }

  global.RassedStore = { getOrders, findOrder: (barcode) => { const order = findOrder(barcode); return order ? cloneOrder(order) : null; }, addOrder, updateOrderStatus, resolveAlert, getStuckOrders, getDaysInStatus, getCompanies, getThreshold, setThreshold, getStats, getCompanyStats, exportRows };
})(window);