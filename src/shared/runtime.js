export function sendMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

export function requestRouteSnapshot(tabId) {
  if (!tabId && tabId !== 0) {
    return Promise.resolve(null);
  }

  return sendMessage("REQUEST_ROUTE_SNAPSHOT", { tabId });
}
