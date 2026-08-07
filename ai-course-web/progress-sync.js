(() => {
  "use strict";

  if (location.protocol === "file:") return;

  const endpoint = "/api/progress";
  const initializedKey = "ai-course-progress-sync-initialized-v1";
  const keyPatterns = [
    /^ai-course(?:-|$)/,
    /^(?:llmFundamentalsModuleProgress|engineerAiPatternsModuleProgress|designResearchPracticeModuleProgress|logAnalysisPracticeModuleProgress|codeRefactorPracticeModuleProgress|promptImprovementModuleProgress|aiOutputVerificationRiskModuleProgress|securityInformationManagementModuleProgress|courseCompletionAssessmentProgress)$/
  ];
  let applyingRemote = false;
  let pending = {};
  let timer;

  const isTracked = (key) => keyPatterns.some((pattern) => pattern.test(key));
  const snapshot = () => {
    const values = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && isTracked(key)) values[key] = localStorage.getItem(key);
    }
    return values;
  };
  const hasValues = (values) => Object.keys(values).length > 0;

  async function post(changes) {
    if (!hasValues(changes)) return;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
      keepalive: true
    });
    if (!response.ok) throw new Error("progress_sync_failed");
    const saved = await response.json();
    if (saved.updatedAt) sessionStorage.setItem(initializedKey, saved.updatedAt);
    return saved;
  }

  function queue(key, value) {
    pending[key] = value;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const changes = pending;
      pending = {};
      post(changes).catch(() => {});
    }, 350);
  }

  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function setItem(key, value) {
    const result = nativeSetItem.call(this, key, value);
    if (this === localStorage && !applyingRemote && isTracked(String(key))) queue(String(key), String(value));
    return result;
  };
  Storage.prototype.removeItem = function removeItem(key) {
    const result = nativeRemoveItem.call(this, key);
    if (this === localStorage && !applyingRemote && isTracked(String(key))) queue(String(key), null);
    return result;
  };

  async function initialize() {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const remote = payload.storage || {};
      const remoteMarker = payload.updatedAt || "empty";
      const alreadyInitialized = sessionStorage.getItem(initializedKey) === remoteMarker;
      if (!alreadyInitialized && hasValues(remote)) {
        applyingRemote = true;
        Object.entries(remote).forEach(([key, value]) => nativeSetItem.call(localStorage, key, value));
        applyingRemote = false;
        sessionStorage.setItem(initializedKey, remoteMarker);
        location.reload();
        return;
      }
      if (!hasValues(remote)) {
        const local = snapshot();
        if (hasValues(local)) await post(local);
        else sessionStorage.setItem(initializedKey, remoteMarker);
      } else {
        sessionStorage.setItem(initializedKey, remoteMarker);
        const local = snapshot();
        const missingFromServer = Object.fromEntries(Object.entries(local).filter(([key]) => !(key in remote)));
        if (hasValues(missingFromServer)) await post(missingFromServer);
      }
    } catch {
      // The preview remains usable when the local server is unavailable.
    }
  }

  window.addEventListener("pagehide", () => {
    const changes = pending;
    pending = {};
    if (hasValues(changes)) post(changes).catch(() => {});
  });

  initialize();
})();
