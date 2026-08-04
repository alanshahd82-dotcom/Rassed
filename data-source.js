/* Rassed data source
 * This in-memory adapter mirrors the future Google Sheets contract.
 * Replace the methods here with fetch calls later; the UI does not change.
 */
(function () {
  const cities = ["الدار البيضاء", "الرباط", "مراكش", "طنجة", "فاس", "أكادير", "مكناس", "وجدة", "تطوان", "القنيطرة", "سلا", "الجديدة"];
  const couriers = [
    { name: "Amana", color: "#20b89f", total: 18, rate: 88 },
    { name: "Cathedis", color: "#5789dd", total: 15, rate: 81 },
    { name: "Jibli", color: "#a070e8", total: 11, rate: 76 },
    { name: "Aramex", color: "#e4a04b", total: 8, rate: 69 },
  ];
  const statuses = ["Livrée", "Sortie", "Livrée", "Retour", "Livrée", "Sortie", "Livrée"];
  const orders = Array.from({ length: 52 }, (_, index) => {
    const courier = couriers[index % couriers.length];
    const status = statuses[index % statuses.length];
    const days = status === "Sortie" ? (index % 9) + 1 : index % 4;
    const day = String((index % 28) + 1).padStart(2, "0");
    const hour = String(8 + (index % 10)).padStart(2, "0");
    return {
      id: `ord-${index + 1}`,
      barcode: `${index % 4 === 0 ? "AMN" : index % 4 === 1 ? "CAT" : index % 4 === 2 ? "JBL" : "ARM"}-2608${day}-${String(847 - index).padStart(4, "0")}`,
      city: cities[index % cities.length],
      courier: courier.name,
      courierColor: courier.color,
      status,
      days,
      date: `2026-08-${day}`,
      time: `${hour}:${String((index * 7) % 60).padStart(2, "0")}`,
      lastAction: status === "Livrée" ? "تأكيد التسليم للعميل" : status === "Retour" ? "استلام المرتجع من الشركة" : "تسليم الطلب للشركة",
      reviewed: false,
    };
  });

  const known = JSON.parse(localStorage.getItem("rassed-orders") || "null");
  if (Array.isArray(known) && known.length === orders.length) known.forEach((saved, index) => Object.assign(orders[index], saved));

  function save() { localStorage.setItem("rassed-orders", JSON.stringify(orders)); }
  function all() { return orders.map((order) => ({ ...order })); }
  function find(query) { return orders.find((order) => order.barcode.toLowerCase() === String(query || "").trim().toLowerCase()); }
  function update(barcode, nextStatus) {
    const order = find(barcode);
    if (!order) return { ok: false, reason: "unknown" };
    if (order.status === nextStatus) return { ok: false, reason: "duplicate", order: { ...order } };
    order.status = nextStatus;
    order.days = 0;
    order.time = "14:32";
    order.lastAction = nextStatus === "Retour" ? "استلام المرتجع من الشركة" : "تسليم الطلب للشركة";
    order.reviewed = false;
    save();
    return { ok: true, order: { ...order } };
  }
  function stats() {
    return {
      total: orders.length,
      out: orders.filter((o) => o.status === "Sortie").length,
      delivered: orders.filter((o) => o.status === "Livrée").length,
      returned: orders.filter((o) => o.status === "Retour").length,
      overdue: orders.filter((o) => o.status === "Sortie" && o.days >= 5 && !o.reviewed).length,
      unknown: 2,
      mismatch: 3,
    };
  }
  window.RassedData = { all, find, update, stats, couriers, save };
})();