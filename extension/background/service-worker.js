// Service worker — mainly a placeholder for future features.
// Popup communicates with content scripts directly via chrome.tabs.sendMessage.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return false;
});
