(function () {
  const mobileNavItems = [...document.querySelectorAll(".mobile-nav-item, .mobile-nav-scan")];
  const ordersCount = document.querySelector("#orders-nav-count");
  const alertsCount = document.querySelector("#alerts-nav-count");
  const mobileOrdersCount = document.querySelector("#mobile-orders-count");
  const mobileAlertsCount = document.querySelector("#mobile-alerts-count");

  function syncMobileCounts() {
    if (mobileOrdersCount && ordersCount) mobileOrdersCount.textContent = ordersCount.textContent;
    if (mobileAlertsCount && alertsCount) mobileAlertsCount.textContent = alertsCount.textContent;
  }

  function syncMobileActive(view) {
    mobileNavItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  }

  mobileNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (window.RassedApp?.showView) window.RassedApp.showView(item.dataset.view);
    });
  });

  syncMobileCounts();
  window.RassedMobileShell = { syncMobileActive, syncMobileCounts };
})();