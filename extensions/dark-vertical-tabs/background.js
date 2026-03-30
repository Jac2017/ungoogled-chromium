// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Enable side panel on all pages
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
