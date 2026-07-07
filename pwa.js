(function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service Worker registration failed:", error);
    });
  });
})();
